# Billing → Gateway Transition Runbook

**Status:** In Progress
**Goal:** Enable account status enforcement (suspended/active) in the Gateway for Code customers with zero event loss.

---

## Context

- **Before:** Gateway only checked API key existence (auth). No account status verification.
- **After:** Gateway also checks status in Redis (active/suspended/banned).
- **Problem:** Currently everyone is in "cache miss" (unknown status) → fail-open → everyone passes through.

---

## Critical Design Decision: Order Matters

**OLD (dangerous):** Backfill → Deploy webhooks → Activation
**NEW (safe):** Deploy webhooks → Backfill → Consistency check → Activation

The old order created a **window of loss**: events between backfill and deployment were missed.
The new order ensures **all events are captured** from the moment webhooks are deployed.

---

## Transition Phases

### Phase 1: Deploy Real-Time Webhooks (Fail-Open) [CRITICAL - FIRST]

**Objective:** Capture all Stripe events immediately, before any backfill.

**Why first?** Any event between backfill and deployment would be permanently lost. Deploying webhooks first ensures we don't miss cancellations or payment failures during the transition.

#### 1.1 Add Required Environment Variables

**Local Development** (`conversational-ui/.env.example`):
```bash
CODE_GATEWAY_WEBHOOK_SECRET=whsec_xxx
```

**Terraform Configuration** (`operations/02-deploy/variables.tf`):
```hcl
variable "code_gateway_webhook_secret" {
  description = "Webhook secret for llm-gateway authentication"
  type        = string
  sensitive   = true
  default     = ""
}
```

**Production Secret** (GitHub Actions):

The secret is passed via GitHub Secrets (same pattern as `CODE_GATEWAY_ADMIN_TOKEN`):

1. Go to **GitHub Repository → Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `TF_VAR_CODE_GATEWAY_WEBHOOK_SECRET`
4. Value: The webhook secret provided by the llm-gateway team (format: `whsec_...`)
5. Click **Add secret**

The secret is automatically picked up by the CD workflow in `.github/workflows/cd-workflow.yml`:
```yaml
TF_VAR_code_gateway_webhook_secret: ${{ secrets.TF_VAR_CODE_GATEWAY_WEBHOOK_SECRET }}
```

Add to `operations/02-deploy/conversational-ui.tf` (runtime_environment_variables):
```hcl
CODE_GATEWAY_WEBHOOK_SECRET = var.code_gateway_webhook_secret
```

Create the secret in GitHub: `TF_VAR_code_gateway_webhook_secret`

#### 1.2 Implement Gateway Notification Client

Create `conversational-ui/lib/code-gateway/account-status.ts`:

```typescript
import 'server-only';

const MAX_RETRIES = 5;
const TIMEOUT_MS = 5000;

interface NotifyPayload {
  principal_id: string;
  account_id: string;
  status: 'active' | 'suspended' | 'banned';
  reason: 'payment_failed' | 'cancellation_effective' | 'terms_of_service' | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function exponentialBackoff(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 30000);
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
      console.log(`[Gateway] Notified: ${payload.principal_id} → ${payload.status}`);
      return;
    }

    // Retry on 5xx or 429
    if ((res.status >= 500 || res.status === 429) && attempt < MAX_RETRIES) {
      await sleep(exponentialBackoff(attempt));
      return notifyGateway(payload, attempt + 1);
    }

    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
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
```

#### 1.3 Update Stripe Webhook Handler

Update `conversational-ui/app/api/billing/webhook/route.ts`:

```typescript
// Add import at top
import { notifyGatewayForPledge } from '@/lib/code-gateway/account-status';

// Add to switch statement

case 'invoice.payment_failed': {
  const invoice = event.data.object;
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) break;

  const p = await db.query.pledge.findFirst({
    where: eq(pledge.stripeSubscriptionId, subscriptionId as string),
  });

  if (p) {
    // Update local DB
    await db
      .update(pledge)
      .set({ status: 'past_due', updatedAt: new Date() })
      .where(eq(pledge.stripeSubscriptionId, subscriptionId as string));

    // Notify gateway
    await notifyGatewayForPledge(p, 'suspended', 'payment_failed');
  }
  break;
}

case 'invoice.payment_succeeded': {
  const invoice = event.data.object;
  // Only reactivate if it's a recovery (subscription_cycle), not first payment
  if (invoice.billing_reason !== 'subscription_cycle') break;

  const subscriptionId = invoice.subscription;
  if (!subscriptionId) break;

  const p = await db.query.pledge.findFirst({
    where: eq(pledge.stripeSubscriptionId, subscriptionId as string),
  });

  if (p) {
    await db
      .update(pledge)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(pledge.stripeSubscriptionId, subscriptionId as string));

    await notifyGatewayForPledge(p, 'active', null);
  }
  break;
}

// Update existing case to add gateway notification
case 'customer.subscription.deleted': {
  const sub = event.data.object;
  const p = await db.query.pledge.findFirst({
    where: eq(pledge.stripeSubscriptionId, sub.id),
  });

  if (p) {
    await db
      .update(pledge)
      .set({ status: 'canceled', updatedAt: new Date() })
      .where(eq(pledge.stripeSubscriptionId, sub.id));

    // ADD THIS: Notify gateway
    await notifyGatewayForPledge(p, 'suspended', 'cancellation_effective');
  }
  break;
}
```

#### 1.4 Deploy to Production

```bash
git push origin main
# Wait for deployment to app.umans.ai
```

**Important:** Gateway must be in **fail-open** mode (cache miss = allow).

**Checklist:**
- [ ] `CODE_GATEWAY_WEBHOOK_SECRET` configured in production
- [ ] Code deployed
- [ ] Logs verified: no 401 errors on webhooks
- [ ] Note deployment timestamp: `DEPLOY_TIME`

---

### Phase 2: Backfill Existing Accounts

**Objective:** Catch up accounts already in canceled/past_due state.

#### 2.1 Count Target Population

```sql
-- Note: Use DEPLOY_TIME to avoid duplicates if events arrived during deployment
SELECT
    COUNT(*) as total_to_suspend,
    COUNT(CASE WHEN p.status = 'canceled' THEN 1 END) as canceled,
    COUNT(CASE WHEN p.status = 'past_due' THEN 1 END) as past_due
FROM pledge p
JOIN "User" u ON p.user_id = u.id
WHERE p.status IN ('canceled', 'past_due');
```

#### 2.2 Get Detailed List

```sql
SELECT
    u.id as user_id,
    u.email,
    p.stripe_customer_id,
    p.status,
    CASE
        WHEN p.status = 'canceled' THEN 'cancellation_effective'
        WHEN p.status = 'past_due' THEN 'payment_failed'
    END as reason
FROM pledge p
JOIN "User" u ON p.user_id = u.id
WHERE p.status IN ('canceled', 'past_due');
```

#### 2.3 Send Backfill Webhooks

```bash
# For each user found (rate limit: one every 100ms)
for user in $(cat users_to_suspend.json | jq -c '.[]'); do
  user_id=$(echo $user | jq -r '.user_id')
  customer_id=$(echo $user | jq -r '.stripe_customer_id')
  reason=$(echo $user | jq -r '.reason')

  curl -X POST https://api.code.umans.ai/webhooks/account \
    -H "Content-Type: application/json" \
    -H "X-Webhook-Secret: $CODE_GATEWAY_WEBHOOK_SECRET" \
    -d "{
      \"principal_id\": \"$user_id\",
      \"account_id\": \"$customer_id\",
      \"status\": \"suspended\",
      \"reason\": \"$reason\"
    }"

  sleep 0.1
done
```

**Note deployment timestamp:** `BACKFILL_TIME`

**Checklist:**
- [ ] SQL executed, count noted
- [ ] All webhooks sent (with rate limiting)
- [ ] Redis verified: `redis-cli KEYS "account_status:*"`

---

### Phase 3: Consistency Check [NEW]

**Objective:** Ensure zero events were lost during the transition window.

#### 3.1 Check Transition Window

```sql
-- Accounts that changed status BETWEEN deployment and backfill
SELECT
    u.id,
    u.email,
    p.status,
    p.updated_at
FROM pledge p
JOIN "User" u ON p.user_id = u.id
WHERE p.status IN ('canceled', 'past_due')
  AND p.updated_at > 'DEPLOY_TIME'
  AND p.updated_at < 'BACKFILL_TIME'
ORDER BY p.updated_at;
```

#### 3.2 Compare with Gateway Logs

Check gateway logs for these `principal_id`s:

```bash
# If logs are in CloudWatch
aws logs filter-log-events \
  --log-group-name "/aws/lambda/llm-gateway" \
  --filter-pattern "account_status" \
  --start-time $(date -d "DEPLOY_TIME" +%s)000 \
  --end-time $(date -d "BACKFILL_TIME" +%s)000
```

#### 3.3 Manual Redelivery (if needed)

If any events were missed, use Stripe Dashboard to redeliver:

1. Go to **Developers → Events** in Stripe Dashboard
2. Filter by `customer.subscription.deleted` or `invoice.payment_failed`
3. Find missing events (within 15 days of creation)
4. Click **"Resend"** or **"Renvoyer"**

**Fallback:** Use the backfill curl command above for any missed accounts.

**Checklist:**
- [ ] Transition window query executed (should return 0 or already-handled accounts)
- [ ] Gateway logs cross-checked
- [ ] Any missed events manually redelivered via Stripe Dashboard

---

### Phase 4: Verification (Before Activation)

**Objective:** Ensure enforcement will work correctly.

#### 4.1 Test Suspended Customer

```bash
# Get an API key from a customer who is suspended
curl -X POST https://api.code.umans.ai/v1/messages \
  -H "Authorization: Bearer SUSPENDED_CUSTOMER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "umans-kimi-k2.5",
    "messages": [{"role": "user", "content": "hi"}],
    "max_tokens": 10
  }'

# Expected: 403 Forbidden
# Body: {"type": "billing_error", "error": {"type": "account_suspended", "message": "...", "reason": "..."}}
```

#### 4.2 Test Active Customer

```bash
# Get an API key from an active customer
curl -X POST https://api.code.umans.ai/v1/messages \
  -H "Authorization: Bearer ACTIVE_CUSTOMER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "umans-kimi-k2.5",
    "messages": [{"role": "user", "content": "hi"}],
    "max_tokens": 10
  }'

# Expected: 200 OK
```

#### 4.3 Test Reactivation Flow

```bash
# Simulate payment recovery with Stripe CLI
stripe trigger invoice.payment_succeeded

# Verify customer can access API again
```

**Checklist:**
- [ ] Suspended customer → 403 with billing link
- [ ] Active customer → 200
- [ ] Error message contains: https://app.umans.ai/billing
- [ ] Reactivation flow tested

---

### Phase 5: Enable Enforcement

**Objective:** Activate blocking for suspended accounts.

In gateway configuration:
```python
account_status_service = "redis"  # Instead of None
```

**Checklist:**
- [ ] Enforcement enabled
- [ ] Monitor for 5 minutes: no spike in errors

---

### Phase 6: Monitoring

**Objective:** Detect problems in production.

#### 6.1 Logs to Watch

In Gateway logs:
```
# WARNING: Cache miss = normal for new users
"Account status cache miss for principal xxx"

# ERROR: Webhook failed after retries
"Gateway webhook failed after 5 attempts"

# INFO: Status update
"Account status updated: principal=xxx status=suspended"
```

#### 6.2 Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| High 403 rate | > 5% of requests in 5min | Check for false positives |
| Webhook failures | Any failure after 5 retries | Investigate gateway health |
| Cache miss spike | > 50% misses | Redis connection issue? |

**Checklist:**
- [ ] Dashboard created
- [ ] Alert: "gateway webhook failed"
- [ ] Alert: "abnormally high 403 rate"

---

## User Notifications

When an account is suspended, notify the user via email:

### Payment Failed Email

**Trigger:** `invoice.payment_failed` webhook

```typescript
// In webhook handler
import { sendPaymentFailedEmail } from '@/lib/email';

// After notifying gateway
await sendPaymentFailedEmail(user.email, {
  billingUrl: 'https://app.umans.ai/billing',
  retryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Smart retry estimate
});
```

### Cancellation Effective Email

**Trigger:** `customer.subscription.deleted` webhook

```typescript
import { sendSubscriptionEndedEmail } from '@/lib/email';

await sendSubscriptionEndedEmail(user.email, {
  billingUrl: 'https://app.umans.ai/billing',
  reactivateUrl: 'https://app.umans.ai/billing?action=reactivate',
});
```

---

## Important URLs

| Service | URL |
|---------|-----|
| Gateway API | `https://api.code.umans.ai` |
| Billing Dashboard | `https://app.umans.ai/billing` |
| Webhook endpoint | `POST https://api.code.umans.ai/webhooks/account` |
| Stripe Dashboard | `https://dashboard.stripe.com` |

---

## Rollback Plan

If problems occur in production:

1. **Disable enforcement:** Set `account_status_service = None` in gateway
2. **Clear Redis cache:** `redis-cli DEL account_status:*`
3. **Investigate:** Check billing logs (why was wrong status sent?)
4. **Emergency access:** If a legitimate customer is blocked, manually set their status to active via webhook

---

## Notes

- **Fail-open:** As long as a user is not in the cache, they pass through. This is intentional to avoid breaking existing customers.
- **Idempotency:** We can re-send webhooks without risk (gateway upserts).
- **Performance:** The check is in Redis (~1ms), no Postgres query on the hot path.
- **Stripe redelivery:** Events can be manually resent from Stripe Dashboard within 15 days of creation.

---

## Test Documentation

The behavior of this integration is documented through unit tests:

### Gateway Client Tests (`lib/code-gateway/account-status.test.ts`)

Documents the retry and error handling behavior:

| Behavior | Test Case |
|----------|-----------|
| **Retry on 5xx** | `retries on 5xx errors with exponential backoff` |
| **Retry on 429** | `retries on 429 rate limit errors` |
| **No retry on 4xx** | `does not retry on 4xx client errors` (bug in payload) |
| **Network resilience** | `retries on network errors` |
| **Max retries** | `gives up after 5 retries` |
| **Graceful degradation** | `silently skips notification when CODE_GATEWAY_URL is missing` |
| **Individual mapping** | `notifies the gateway with the user as principal` |
| **Fallback account_id** | `uses userId as fallback when stripeCustomerId is null` |
| **Org not supported** | `warns that org pledges are not yet supported` |

Run tests:
```bash
cd conversational-ui
pnpm test lib/code-gateway/account-status.test.ts
```

### Webhook Handler Behavior

The Stripe webhook handler (`app/api/billing/webhook/route.ts`) implements the following behaviors:

| Event | Behavior |
|-------|----------|
| `invoice.payment_failed` | Suspends pledge → Notifies gateway → Sends email |
| `invoice.payment_succeeded` | Reactivates on `subscription_cycle` → Notifies gateway |
| `customer.subscription.deleted` | Suspends → Notifies gateway → Sends email |
| **Security** | Validates Stripe signature before processing |
| **Resilience** | Continues even if email sending fails |

---

## Questions/Risks

| Question | Answer |
|----------|--------|
| What happens if Redis goes down? | Fail-open (no cache = allow). Customers won't be blocked. |
| What if the billing→gateway webhook fails? | Retry 5x with exponential backoff, then log. Customer stays in current state. |
| Can a customer bypass? | No, the gateway is the source of truth for inference. |
| What if we miss an event during transition? | Stripe Dashboard allows manual redelivery within 15 days. |
| How do we handle org subscriptions (future)? | N webhooks for N employees. Each employee's `principal_id` is checked individually. |
