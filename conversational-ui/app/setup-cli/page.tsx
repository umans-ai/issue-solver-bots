import { redirect } from 'next/navigation';
import { auth } from '@/app/(auth)/auth';
import { getLatestPledgeForUser } from '@/lib/code-gateway/api-keys-db';
import { SetupCliClient } from './client';

interface SetupCliPageProps {
  searchParams: Promise<{ callback?: string }>;
}

interface GatewayKeyResponse {
  id: string;
  key: string;
  key_prefix: string;
}

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

function isPledgeActive(status?: string | null): boolean {
  return Boolean(status && status !== 'canceled' && status !== 'expired');
}

export default async function SetupCliPage({ searchParams }: SetupCliPageProps) {
  // Await searchParams in Next.js 15
  const { callback } = await searchParams;

  // Validate callback URL
  if (!callback) {
    return (
      <SetupCliClient
        error="Missing callback URL. Please try again from the CLI."
        token={null}
        callbackUrl={null}
      />
    );
  }

  // Only allow localhost callbacks for security
  let callbackUrl: URL;
  try {
    callbackUrl = new URL(callback);
    if (!callbackUrl.hostname.match(/^localhost$|^127\.[0-9]+\.[0-9]+\.[0-9]+$/)) {
      return (
        <SetupCliClient
          error="Invalid callback URL. Only localhost callbacks are allowed."
          token={null}
          callbackUrl={null}
        />
      );
    }
  } catch {
    return (
      <SetupCliClient
        error="Invalid callback URL format."
        token={null}
        callbackUrl={null}
      />
    );
  }

  // Check authentication
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    // Redirect to login with return_to
    const returnTo = encodeURIComponent(`/setup-cli?callback=${encodeURIComponent(callback)}`);
    redirect(`/login?next=${returnTo}`);
  }

  // Get gateway config
  const gateway = getGatewayConfig();
  if (!gateway) {
    return (
      <SetupCliClient
        error="Code gateway is not configured. Please contact support."
        token={null}
        callbackUrl={callback}
      />
    );
  }

  // Check subscription
  const pledge = await getLatestPledgeForUser(userId);
  if (!isPledgeActive(pledge?.status)) {
    return (
      <SetupCliClient
        error="Active subscription required. Please subscribe to use the CLI."
        token={null}
        callbackUrl={callback}
        showSubscribeButton
      />
    );
  }

  // Create API key via gateway
  try {
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
      const errorText = await upstreamResponse.text();
      console.error('Gateway error:', errorText);
      return (
        <SetupCliClient
          error="Failed to create API key. Please try again."
          token={null}
          callbackUrl={callback}
        />
      );
    }

    const data = await upstreamResponse.json() as GatewayKeyResponse;

    // Redirect to callback with token
    const redirectUrl = new URL(callback);
    redirectUrl.searchParams.set('token', data.key);

    // Return client component with auto-redirect and fallback
    return (
      <SetupCliClient
        token={data.key}
        callbackUrl={redirectUrl.toString()}
        error={null}
      />
    );
  } catch (error) {
    console.error('Error creating API key:', error);
    return (
      <SetupCliClient
        error="An unexpected error occurred. Please try again."
        token={null}
        callbackUrl={callback}
      />
    );
  }
}
