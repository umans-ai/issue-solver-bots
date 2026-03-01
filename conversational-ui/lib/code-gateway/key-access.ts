export type CodePledgePlan = 'code_pro' | 'code_max';

type GatewayKeyAccessAction = 'pause' | 'resume';

type GatewayKeyLimitUpdate = {
  requests_limit: number | null;
  window_seconds: number | null;
  max_concurrency: number;
  plan_slug: string;
};

const ACTIVE_KEY_ACCESS_STATUSES = new Set(['trialing', 'active']);
const PAUSED_KEY_ACCESS_STATUSES = new Set([
  'past_due',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'canceled',
  'expired',
]);

const CODE_PLAN_LIMIT_UPDATES: Record<CodePledgePlan, GatewayKeyLimitUpdate> = {
  code_pro: {
    requests_limit: 200,
    window_seconds: 18_000,
    max_concurrency: 0,
    plan_slug: 'code_pro',
  },
  code_max: {
    requests_limit: null,
    window_seconds: null,
    max_concurrency: 4,
    plan_slug: 'code_max',
  },
};

const PAUSED_LIMIT_UPDATE: GatewayKeyLimitUpdate = {
  requests_limit: 0,
  window_seconds: 18_000,
  max_concurrency: 0,
  plan_slug: 'code_paused',
};

export function asCodePledgePlan(plan?: string | null): CodePledgePlan | null {
  if (plan === 'code_pro' || plan === 'code_max') {
    return plan;
  }
  return null;
}

export function isPledgeStatusWithKeyAccess(status?: string | null): boolean {
  return Boolean(status && ACTIVE_KEY_ACCESS_STATUSES.has(status));
}

export function getGatewayKeyAccessActionForPledgeStatus(
  status?: string | null,
): GatewayKeyAccessAction | null {
  if (!status) return null;
  if (ACTIVE_KEY_ACCESS_STATUSES.has(status)) return 'resume';
  if (PAUSED_KEY_ACCESS_STATUSES.has(status)) return 'pause';
  return null;
}

export function getGatewayKeyLimitUpdateForAction(
  action: GatewayKeyAccessAction,
  plan: CodePledgePlan,
): GatewayKeyLimitUpdate {
  if (action === 'pause') {
    return PAUSED_LIMIT_UPDATE;
  }
  return CODE_PLAN_LIMIT_UPDATES[plan];
}
