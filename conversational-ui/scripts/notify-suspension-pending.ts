#!/usr/bin/env tsx
/**
 * Pre-Suspension Email Notification Script
 *
 * Sends emails to users with canceled/past_due pledges to inform them
 * that their API access will be suspended. Uses Resend directly
 * (same as lib/email.ts) for reliability.
 *
 * Usage:
 *   DRY_RUN=true pnpm tsx notify-suspension-pending.ts    # Preview recipients
 *   pnpm tsx notify-suspension-pending.ts                 # Send emails for real
 */

import postgres from 'postgres';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { Resend } from 'resend';

config({ path: '.env.local' });

const DRY_RUN = process.env.DRY_RUN === 'true';
const DELAY_MS = 500;

// Initialize Resend (same as lib/email.ts)
if (!process.env.EMAIL_API_KEY) {
  throw new Error('EMAIL_API_KEY environment variable is required');
}
if (!process.env.EMAIL_FROM) {
  throw new Error('EMAIL_FROM environment variable is required');
}

const resend = new Resend(process.env.EMAIL_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.umans.ai';

// Email template (copied from lib/email.ts)
const createEmailTemplate = (title: string, content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    <tr>
                        <td align="center" style="padding: 48px 40px 32px 40px; background: linear-gradient(135deg, #1a1a1a 0%, #374151 100%);">
                            <img src="${BASE_URL}/images/umans-logo.png" alt="Umans" width="120" height="39" style="display: block; width: 120px; height: 39px; max-width: 120px; border: none;">
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px 40px 48px 40px;">
                            <h1 style="margin: 0 0 24px 0; font-size: 24px; line-height: 1.3; font-weight: 600; color: #1a1a1a; text-align: center;">${title}</h1>
                            ${content}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b; line-height: 1.5;">
                                            © ${new Date().getFullYear()} Umans. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

const createButton = (href: string, text: string) => `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
        <td align="center" style="padding: 24px 0;">
            <a href="${href}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">${text}</a>
        </td>
    </tr>
</table>
`;

const createInfoBox = (content: string) => `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
        <td style="padding: 20px; border-radius: 8px; margin: 24px 0; background-color: #fefce8; border-left: 4px solid #eab308; color: #a16207;">
            ${content}
        </td>
    </tr>
</table>
`;

// Send payment failed email (same content as lib/email.ts)
const sendPaymentFailedEmail = async (to: string, billingUrl: string): Promise<void> => {
  const content = `
    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #475569; text-align: center;">
      We were unable to process your payment for Umans Code. Your API access has been temporarily suspended.
    </p>
    ${createInfoBox('<p style="margin: 0; font-size: 14px; line-height: 1.5;">Update your payment method to restore access immediately.</p>')}
    ${createButton(billingUrl, 'Update Payment Method')}
  `;

  await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: 'Action required: Update your payment method',
    html: createEmailTemplate('Payment Failed', content),
  });
};

// Send subscription ended email (same content as lib/email.ts)
const sendSubscriptionEndedEmail = async (to: string, billingUrl: string): Promise<void> => {
  const content = `
    <p style="margin: 0 0 16px 0; font-size: 18px; line-height: 1.5; color: #1a1a1a; text-align: center; font-weight: 600;">
      Thanks for being part of Umans Code! 👋
    </p>
    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #475569; text-align: center;">
      Your subscription has ended. Your API keys have been deactivated, but your account settings remain intact.
      We'd love to welcome you back whenever you're ready!
    </p>
    ${createButton(billingUrl, 'Reactivate Subscription')}
  `;

  await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: "You're always welcome back at Umans Code",
    html: createEmailTemplate('See You Soon!', content),
  });
};

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

    const billingUrl = `${BASE_URL}/billing`;

    for (let i = 0; i < users.length; i++) {
      const u = users[i];

      process.stdout.write(`[${i + 1}/${users.length}] ${u.email} ... `);

      let success = false;
      let error: string | undefined;

      try {
        if (u.status === 'past_due') {
          await sendPaymentFailedEmail(u.email, billingUrl);
        } else {
          await sendSubscriptionEndedEmail(u.email, billingUrl);
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
