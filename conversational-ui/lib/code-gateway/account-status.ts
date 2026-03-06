import 'server-only';

const MAX_RETRIES = 5;
const TIMEOUT_MS = 5000;

interface NotifyPayload {
  principal_id: string;
  account_id: string;
  status: 'active' | 'suspended' | 'banned';
  reason: 'payment_failed' | 'cancellation_effective' | 'terms_of_service' | 'manual_reactivation' | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function exponentialBackoff(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 30000);
}

class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

export async function notifyGateway(
  payload: NotifyPayload,
  attempt = 1,
): Promise<void> {
  const baseUrl = process.env.CODE_GATEWAY_URL;
  const secret = process.env.CODE_GATEWAY_WEBHOOK_SECRET;

  if (!baseUrl || !secret) {
    console.warn('[Gateway] Not configured, skipping notification');
    return;
  }

  try {
    const res = await fetch(`${baseUrl}/webhooks/account`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-webhook-secret': secret,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.ok) {
      console.log(
        `[Gateway] Notified: ${payload.principal_id} → ${payload.status}`,
      );
      return;
    }

    // Retry on 429 rate limit
    if (res.status === 429 && attempt < MAX_RETRIES) {
      await sleep(exponentialBackoff(attempt));
      return notifyGateway(payload, attempt + 1);
    }

    // Don't retry on 4xx client errors (bug in payload or config)
    if (res.status >= 400 && res.status < 500) {
      throw new NonRetryableError(`HTTP ${res.status}`);
    }

    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    // Don't retry non-retryable errors
    if (err instanceof NonRetryableError) {
      console.error('[Gateway] Failed (non-retryable):', err);
      return;
    }
    // Retry network/timeout errors
    if (attempt < MAX_RETRIES) {
      await sleep(exponentialBackoff(attempt));
      return notifyGateway(payload, attempt + 1);
    }
    console.error('[Gateway] Failed after retries:', err);
    // TODO: Insert into gateway_webhook_queue if implemented
  }
}

interface PledgeInfo {
  userId: string | null;
  stripeCustomerId: string | null;
}

export async function notifyGatewayForPledge(
  pledge: PledgeInfo,
  status: 'active' | 'suspended',
  reason: string | null,
): Promise<void> {
  // CASE A: Individual (user_id present)
  if (pledge.userId) {
    await notifyGateway({
      principal_id: pledge.userId,
      account_id: pledge.stripeCustomerId ?? pledge.userId,
      status,
      reason: reason as NotifyPayload['reason'],
    });
    return;
  }

  // CASE B: Organization (future - not implemented yet)
  // Will need to lookup org members and send N webhooks for N employees
  console.warn('[Gateway] Org pledges not yet supported');
}
