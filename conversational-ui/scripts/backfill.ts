#!/usr/bin/env tsx
/**
 * Billing Gateway Backfill Script
 *
 * Backfills existing canceled/past_due pledges to the llm-gateway
 * so they are properly suspended in the account status cache.
 *
 * Runbook: docs/runbooks/billing-gateway-transition.md (Phase 2)
 *
 * Usage:
 *   DRY_RUN=true pnpm tsx backfill.ts    # Preview what will be sent
 *   pnpm tsx backfill.ts                 # Execute for real
 */

import postgres from 'postgres';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';
import { join } from 'path';

config({ path: '.env.local' });

const DRY_RUN = process.env.DRY_RUN === 'true';
const BATCH_SIZE = 10;
const DELAY_MS = 100;

interface PledgeRow {
  user_id: string;
  email: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: 'canceled' | 'past_due';
}

interface Result {
  timestamp: string;
  dry_run: boolean;
  total: number;
  succeeded: number;
  failed: number;
  duration_ms: number;
  details: Array<{
    user_id: string;
    email: string;
    status: string;
    reason: string;
    success: boolean;
    http_status?: number;
    error?: string;
  }>;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function notifyGateway(payload: {
  principal_id: string;
  account_id: string;
  status: 'suspended';
  reason: 'payment_failed' | 'cancellation_effective';
}): Promise<{ success: boolean; http_status?: number; error?: string }> {
  const baseUrl = process.env.CODE_GATEWAY_URL;
  const secret = process.env.CODE_GATEWAY_WEBHOOK_SECRET;

  if (!baseUrl || !secret) {
    throw new Error('CODE_GATEWAY_URL or CODE_GATEWAY_WEBHOOK_SECRET not configured');
  }

  try {
    const res = await fetch(`${baseUrl}/webhooks/account`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-webhook-secret': secret,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      return { success: true, http_status: res.status };
    }

    return {
      success: false,
      http_status: res.status,
      error: `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  const startTime = Date.now();

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No webhooks will be sent\n');
  } else {
    console.log('🚀 EXECUTION MODE - Webhooks will be sent\n');
  }

  // Verify required env vars
  if (!process.env.POSTGRES_URL) {
    console.error('❌ POSTGRES_URL not configured');
    process.exit(1);
  }

  // Connect to database
  const sql = postgres(process.env.POSTGRES_URL);

  try {
    // Query pledges to backfill
    const pledges = await sql<PledgeRow[]>`
      SELECT
        u.id as user_id,
        u.email,
        p."stripeCustomerId" as stripe_customer_id,
        p."stripeSubscriptionId" as stripe_subscription_id,
        p.status
      FROM "Pledge" p
      JOIN "User" u ON p."userId" = u.id
      WHERE p.status IN ('canceled', 'past_due')
        AND p."userId" IS NOT NULL
      ORDER BY p."updatedAt" DESC
    `;

    console.log(`Found ${pledges.length} pledges to backfill\n`);

    if (pledges.length === 0) {
      console.log('✅ Nothing to backfill');
      return;
    }

    // Preview first 5
    console.log('Preview (first 5):');
    pledges.slice(0, 5).forEach((p) => {
      console.log(`  - ${p.email} (${p.status})`);
    });
    if (pledges.length > 5) {
      console.log(`  ... and ${pledges.length - 5} more\n`);
    }

    if (DRY_RUN) {
      console.log('\n🛑 Dry run complete. Set DRY_RUN=false to execute.');
      return;
    }

    // Confirm before execution
    console.log('\n⚠️  About to send webhooks to:', process.env.CODE_GATEWAY_URL);
    console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
    await sleep(3000);

    // Execute backfill
    const results: Result = {
      timestamp: new Date().toISOString(),
      dry_run: false,
      total: pledges.length,
      succeeded: 0,
      failed: 0,
      duration_ms: 0,
      details: [],
    };

    for (let i = 0; i < pledges.length; i++) {
      const p = pledges[i];
      const reason = p.status === 'canceled' ? 'cancellation_effective' : 'payment_failed';

      process.stdout.write(`[${i + 1}/${pledges.length}] ${p.email} ... `);

      const result = await notifyGateway({
        principal_id: p.user_id,
        account_id: p.stripe_customer_id || p.user_id,
        status: 'suspended',
        reason,
      });

      results.details.push({
        user_id: p.user_id,
        email: p.email,
        status: p.status,
        reason,
        success: result.success,
        http_status: result.http_status,
        error: result.error,
      });

      if (result.success) {
        results.succeeded++;
        console.log('✅');
      } else {
        results.failed++;
        console.log(`❌ ${result.error}`);
      }

      // Rate limiting
      if (i < pledges.length - 1) {
        await sleep(DELAY_MS);
      }
    }

    results.duration_ms = Date.now() - startTime;

    // Save results
    const resultsPath = join(__dirname, '../operations/executed-runbooks/2026-03-06-backfill-suspended-accounts/results.json');
    writeFileSync(resultsPath, JSON.stringify(results, null, 2));

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('BACKFILL COMPLETE');
    console.log('='.repeat(50));
    console.log(`Total:    ${results.total}`);
    console.log(`Success:  ${results.succeeded} ✅`);
    console.log(`Failed:   ${results.failed} ❌`);
    console.log(`Duration: ${results.duration_ms}ms`);
    console.log(`\nResults saved to: results.json`);

    if (results.failed > 0) {
      console.log('\n⚠️  Some webhooks failed. Check results.json for details.');
      process.exit(1);
    }
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
