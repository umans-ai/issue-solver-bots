#!/usr/bin/env tsx
/**
 * Pre-Suspension Email Notification Script
 *
 * Sends emails to users with canceled/past_due pledges to inform them
 * that their API access will be suspended. Uses the same email templates
 * as the billing webhook flow for consistency.
 *
 * Usage:
 *   DRY_RUN=true pnpm tsx notify-suspension-pending.ts    # Preview recipients
 *   pnpm tsx notify-suspension-pending.ts                 # Send emails for real
 */

import postgres from 'postgres';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Import existing email functions to ensure consistency
import { sendPaymentFailedEmail, sendSubscriptionEndedEmail } from '@/lib/email';

config({ path: '.env.local' });

const DRY_RUN = process.env.DRY_RUN === 'true';
const DELAY_MS = 500;

interface SuspendedUser {
  user_id: string;
  email: string;
  status: 'canceled' | 'past_due';
  stripe_customer_id: string | null;
}

interface NotificationResult {
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
    success: boolean;
    error?: string;
  }>;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const startTime = Date.now();

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No emails will be sent\n');
  } else {
    console.log('🚀 EXECUTION MODE - Emails will be sent\n');
  }

  if (!process.env.POSTGRES_URL) {
    console.error('❌ POSTGRES_URL not configured');
    process.exit(1);
  }

  const sql = postgres(process.env.POSTGRES_URL);

  try {
    const users = await sql<SuspendedUser[]>`
      SELECT
        u.id as user_id,
        u.email,
        p.status,
        p."stripeCustomerId" as stripe_customer_id
      FROM "Pledge" p
      JOIN "User" u ON p."userId" = u.id
      WHERE p.status IN ('canceled', 'past_due')
        AND p."userId" IS NOT NULL
      ORDER BY p."updatedAt" DESC
    `;

    console.log(`Found ${users.length} users to notify\n`);

    if (users.length === 0) {
      console.log('✅ No users to notify');
      return;
    }

    console.log('Preview (first 5):');
    users.slice(0, 5).forEach((u) => {
      console.log(`  - ${u.email} (${u.status})`);
    });
    if (users.length > 5) {
      console.log(`  ... and ${users.length - 5} more\n`);
    }

    if (DRY_RUN) {
      console.log('\n🛑 Dry run complete. Set DRY_RUN=false to send emails.');
      return;
    }

    console.log('\n⚠️  About to send pre-suspension emails to', users.length, 'users');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await sleep(5000);

    const results: NotificationResult = {
      timestamp: new Date().toISOString(),
      dry_run: false,
      total: users.length,
      succeeded: 0,
      failed: 0,
      duration_ms: 0,
      details: [],
    };

    const billingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/billing`;

    for (let i = 0; i < users.length; i++) {
      const u = users[i];

      process.stdout.write(`[${i + 1}/${users.length}] ${u.email} ... `);

      let success = false;
      let error: string | undefined;

      try {
        // Use existing email functions for consistency with billing flow
        if (u.status === 'past_due') {
          await sendPaymentFailedEmail(u.email, { billingUrl });
        } else {
          await sendSubscriptionEndedEmail(u.email, {
            billingUrl,
            reactivateUrl: billingUrl,
          });
        }
        success = true;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }

      results.details.push({
        user_id: u.user_id,
        email: u.email,
        status: u.status,
        success,
        error,
      });

      if (success) {
        results.succeeded++;
        console.log('✅');
      } else {
        results.failed++;
        console.log(`❌ ${error}`);
      }

      if (i < users.length - 1) {
        await sleep(DELAY_MS);
      }
    }

    results.duration_ms = Date.now() - startTime;

    const resultsPath = join(
      __dirname,
      '../../operations/executed-runbooks/2026-03-06-backfill-suspended-accounts/email-results.json'
    );
    writeFileSync(resultsPath, JSON.stringify(results, null, 2));

    console.log('\n' + '='.repeat(50));
    console.log('EMAIL NOTIFICATION COMPLETE');
    console.log('='.repeat(50));
    console.log(`Total:    ${results.total}`);
    console.log(`Success:  ${results.succeeded} ✅`);
    console.log(`Failed:   ${results.failed} ❌`);
    console.log(`Duration: ${results.duration_ms}ms`);
    console.log(`\nResults saved to: email-results.json`);

    if (results.failed > 0) {
      console.log('\n⚠️  Some emails failed. Check email-results.json for details.');
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
