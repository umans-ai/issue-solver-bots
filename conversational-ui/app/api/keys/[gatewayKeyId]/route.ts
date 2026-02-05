import { NextResponse } from 'next/server';

import { auth } from '@/app/(auth)/auth';
import {
  getUserGatewayApiKeyByGatewayId,
  markUserGatewayApiKeyRevoked,
} from '@/lib/code-gateway/api-keys-db';

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

async function readJsonOrText(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json().catch(() => null);
  }
  return await response.text().catch(() => null);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ gatewayKeyId: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { gatewayKeyId } = await params;
  if (!gatewayKeyId) {
    return NextResponse.json(
      { error: 'gatewayKeyId is required' },
      { status: 400 },
    );
  }

  const record = await getUserGatewayApiKeyByGatewayId(userId, gatewayKeyId);
  if (!record) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (record.revokedAt) {
    return new NextResponse(null, { status: 204 });
  }

  const gateway = getGatewayConfig();
  if (!gateway) {
    return NextResponse.json(
      { error: 'Code gateway is not configured' },
      { status: 503 },
    );
  }

  const upstreamResponse = await fetch(
    `${gateway.baseUrl}/admin/keys/${gatewayKeyId}`,
    {
      method: 'DELETE',
      headers: {
        'x-admin-api-key': gateway.adminToken,
      },
    },
  );

  if (!upstreamResponse.ok && upstreamResponse.status !== 404) {
    return NextResponse.json(
      {
        error: 'gateway_error',
        status: upstreamResponse.status,
        details: await readJsonOrText(upstreamResponse),
      },
      { status: 502 },
    );
  }

  await markUserGatewayApiKeyRevoked({ userId, gatewayKeyId });
  return new NextResponse(null, { status: 204 });
}
