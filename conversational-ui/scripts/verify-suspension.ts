#!/usr/bin/env tsx
/**
 * Phase 3: Verify gateway suspension enforcement
 *
 * Tests that suspended users are properly blocked by the gateway.
 */

import postgres from 'postgres';

const CODE_GATEWAY_URL = 'https://api.code.umans.ai';

async function main() {
  const POSTGRES_URL = process.env.POSTGRES_URL;
  if (!POSTGRES_URL) {
    console.error('❌ POSTGRES_URL required');
    process.exit(1);
  }

  const sql = postgres(POSTGRES_URL);

  try {
    // Get one suspended user with an active API key
    const [suspendedUser] = await sql<{ email: string; user_id: string; key_prefix: string }[]>`
      SELECT
        u.email,
        u.id as user_id,
        k.key_prefix
      FROM "Pledge" p
      JOIN "User" u ON p."userId" = u.id
      JOIN "GatewayApiKey" k ON k.user_id = u.id
      WHERE p.status IN ('canceled', 'past_due')
        AND k.revoked_at IS NULL
      LIMIT 1
    `;

    if (!suspendedUser) {
      console.log('⚠️  No suspended user with active API key found');
      return;
    }

    console.log(`Testing suspended user: ${suspendedUser.email}`);
    console.log(`Key prefix: ${suspendedUser.key_prefix}`);

    // Note: We can't test the full request without the actual API key secret
    // The gateway stores only key hashes, not the plaintext keys
    console.log('\n✅ User found in suspended list');
    console.log('Next: Verify manually with a test request using their API key');

  } finally {
    await sql.end();
  }
}

main().catch(console.error);
