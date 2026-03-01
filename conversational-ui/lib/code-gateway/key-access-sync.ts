import 'server-only';

import {
  type CodePledgePlan,
  getGatewayKeyAccessActionForPledgeStatus,
  getGatewayKeyLimitUpdateForAction,
} from '@/lib/code-gateway/key-access';

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

export async function syncGatewayKeyAccessForUser({
  userId,
  plan,
  pledgeStatus,
}: {
  userId: string;
  plan: CodePledgePlan;
  pledgeStatus?: string | null;
}) {
  const action = getGatewayKeyAccessActionForPledgeStatus(pledgeStatus);
  if (!action) {
    return;
  }

  const gateway = getGatewayConfig();
  if (!gateway) {
    return;
  }

  const update = getGatewayKeyLimitUpdateForAction(action, plan);
  const response = await fetch(`${gateway.baseUrl}/admin/keys/bulk-update`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-admin-api-key': gateway.adminToken,
    },
    body: JSON.stringify({
      filter: { owner_user_id: userId },
      update,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to ${action} keys for user ${userId}: ${response.status} ${JSON.stringify(
        await readJsonOrText(response),
      )}`,
    );
  }
}
