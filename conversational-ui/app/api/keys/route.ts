import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import {
  createUserGatewayApiKeyMetadata,
  getLatestPledgeForUser,
  listUserGatewayApiKeys,
} from '@/lib/code-gateway/api-keys-db';

const gatewayCreateKeyResponseSchema = z.object({
  id: z.string().uuid(),
  key: z.string().min(1),
  key_prefix: z.string().min(1),
});

function getGatewayConfig(): { baseUrl: string; adminToken: string } | null {
  const baseUrlRaw = process.env.CODE_GATEWAY_URL;
  const adminToken = process.env.CODE_GATEWAY_ADMIN_TOKEN;

  if (!baseUrlRaw || !adminToken) {
    return null;
  }

  return {
    baseUrl: baseUrlRaw.replace(/\/+$/, ''),
    adminToken,
  };
}

function isPledgeActive(status?: string | null) {
  return Boolean(status && status !== 'canceled' && status !== 'expired');
}

async function readJsonOrText(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json().catch(() => null);
  }
  return await response.text().catch(() => null);
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keys = await listUserGatewayApiKeys(userId);
  return NextResponse.json({ keys });
}

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const gateway = getGatewayConfig();
  if (!gateway) {
    return NextResponse.json(
      { error: 'Code gateway is not configured' },
      { status: 503 },
    );
  }

  const pledge = await getLatestPledgeForUser(userId);
  if (!isPledgeActive(pledge?.status)) {
    return NextResponse.json(
      { error: 'subscription_required' },
      { status: 403 },
    );
  }

  const upstreamResponse = await fetch(`${gateway.baseUrl}/admin/keys`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-admin-api-key': gateway.adminToken,
    },
    body: JSON.stringify({
      owner_user_id: userId,
      policy: pledge?.plan ? { plan: pledge.plan } : undefined,
    }),
  });

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      {
        error: 'gateway_error',
        status: upstreamResponse.status,
        details: await readJsonOrText(upstreamResponse),
      },
      { status: 502 },
    );
  }

  const upstreamJson = await upstreamResponse.json().catch(() => null);
  const parsed = gatewayCreateKeyResponseSchema.safeParse(upstreamJson);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Unexpected response from gateway' },
      { status: 502 },
    );
  }

  const created = parsed.data;

  try {
    await createUserGatewayApiKeyMetadata({
      userId,
      gatewayKeyId: created.id,
      keyPrefix: created.key_prefix,
    });
  } catch {
    // Best-effort cleanup: if we can’t persist metadata, revoke the key.
    try {
      await fetch(`${gateway.baseUrl}/admin/keys/${created.id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-api-key': gateway.adminToken,
        },
      });
    } catch {
      // Ignore cleanup failures.
    }

    return NextResponse.json(
      { error: 'Failed to persist API key metadata' },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      id: created.id,
      key: created.key,
      key_prefix: created.key_prefix,
    },
    { status: 201 },
  );
}
