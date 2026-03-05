# Billing → Gateway Integration Spec

Integration between the conversational-ui billing system and the llm-gateway for account status enforcement.

## Goals

- Gateway enforces billing decisions (suspend/allow inference)
- Billing notifies gateway of status changes via webhook
- No custom grace period (leverages Stripe Smart Retries)
- Support future orgs/teams (multi-seat) model

## Non-goals

- Gateway querying billing database directly
- Real-time synchronization (eventual consistency via webhooks)
- Usage-based limiting in this integration (covered by plans/quotas separately)

## Background: Stripe Concepts

### Payment Failure & Smart Retries

Stripe handles payment failures via **Smart Retries** (AI-driven, configurable in Dashboard → Subscriptions → Dunning):

- **8 attempts over 2 weeks** (recommended by Stripe)
- Timing optimized by AI based on customer's timezone
- Configurable from 1 week to 2 months

**Failure lifecycle:**
```
Payment fails
    ↓
invoice.payment_failed (attempt 1) → Subscription: active (still)
    ↓
Smart Retries: days 1, 3, 5, 7, 14...
    ↓
Subscription status: past_due (after first retry)
    ↓
Final failure → unpaid OR canceled (depending on Stripe settings)
```

**Key events:**
- `invoice.payment_failed` → On each failure (suspend immediately)
- `invoice.payment_succeeded` (billing_reason = "subscription_cycle") → Reactivate
- `customer.subscription.deleted` → Cancellation effective

**Decision:** No custom grace period. React to Stripe events immediately.

### Two Models: Individuals vs Organizations

#### A. Individuals (today)

A single user with a personal subscription.

```javascript
// Stripe
const customer = await stripe.customers.create({
  email: "alice@example.com",
  metadata: { user_id: "user-alice-uuid" }
});

const subscription = await stripe.subscriptions.create({
  customer: customer.id,
  items: [{ price: "price_code_pro" }],  // No quantity = 1 seat
  metadata: { user_id: "user-alice-uuid" }
});
```

**Webhook payload:**
```json
{
  "principal_id": "user-alice-uuid",
  "account_id": "cus_abc123",
  "status": "suspended",
  "reason": "payment_failed"
}
```

| Field | Individual value |
|-------|------------------|
| `principal_id` | `user.id` (the user making API calls) |
| `account_id` | `stripe_customer_id` (same as principal_id logically) |

#### B. Organizations (future)

A company with 20 employees on a single subscription.

```javascript
// Stripe - One customer, multiple seats via quantity
const customer = await stripe.customers.create({
  email: "billing@company.com",
  name: "Acme Corp",
  metadata: { org_id: "org-acme-uuid" }
});

const subscription = await stripe.subscriptions.create({
  customer: customer.id,
  items: [{
    price: "price_code_team",  // Per-seat pricing
    quantity: 20               // 20 employees
  }],
  metadata: { org_id: "org-acme-uuid" }
});
```

**Our DB:**
```sql
-- Organization
org:
  id: "org-acme-uuid"
  name: "Acme Corp"
  stripe_customer_id: "cus_xyz789"

-- Members (just the link, no Stripe data here)
org_membership:
  user_id: "user-bob-uuid"    → org_id: "org-acme-uuid", role: "member"
  user_id: "user-carol-uuid"  → org_id: "org-acme-uuid", role: "member"
  user_id: "user-dave-uuid"   → org_id: "org-acme-uuid", role: "admin"

-- Subscription (stripe_subscription_id lives here!)
pledge:
  org_id: "org-acme-uuid"
  user_id: null              -- null because it's an org subscription
  stripe_subscription_id: "sub_team_abc123"
  stripe_customer_id: "cus_xyz789"
  quantity: 20
  status: "active"
```

**Important:** `stripe_subscription_id` is in `pledge`, not in `org` nor `org_membership`. When a Stripe webhook arrives for `sub_team_abc123`, we look up the pledge, then find members via `org_membership.org_id`.

**Webhooks sent (N calls for N employees):**
```json
// Bob tries to use the API
{
  "principal_id": "user-bob-uuid",
  "account_id": "org-acme-uuid",
  "status": "suspended",
  "reason": "payment_failed"
}

// Carol too
{
  "principal_id": "user-carol-uuid",
  "account_id": "org-acme-uuid",
  "status": "suspended",
  "reason": "payment_failed"
}
```

| Field | Organization value |
|-------|-------------------|
| `principal_id` | `user.id` of the employee making the API call |
| `account_id` | `org.id` (the entity paying) |

**Why separate?** The gateway doesn't know about org structure. It just receives "can Bob use the API?" and checks cache for `principal_id = user-bob-uuid`.

### Mapping Summary

| Case | principal_id | account_id | Stripe Customer |
|------|--------------|------------|-----------------|
| Individual today | `user.id` | `stripe_customer_id` | 1 customer = 1 user |
| Organization future | `user.id` (employee) | `org.id` | 1 customer = N users |

`account_id` is mainly used for debugging and logging on the gateway side.

## Architecture

### Flow

```
Stripe Event
    |
    v
Billing Webhook (/api/billing/webhook)
    |
    +-- Update local DB (pledge status)
    |
    +-- Send to Gateway (/webhooks/account)
            |
            v
        Gateway Redis Cache
            |
            v
        Inference Check (hot path)
```

### Data Model

#### conversational-ui DB

```sql
-- Organization (future)
CREATE TABLE org (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,        -- e.g. acme-corp
    billing_email VARCHAR(255),
    stripe_customer_id VARCHAR(255),          -- Stripe customer for the org
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Org membership (future) - who belongs to which org
CREATE TABLE org_membership (
    user_id UUID REFERENCES "User"(id),
    org_id UUID REFERENCES org(id),
    role VARCHAR(32) NOT NULL DEFAULT 'member',  -- member, admin, owner
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, org_id)
);

-- Pledge table (exists + future org support)
-- A pledge = a subscription (individual or org)
CREATE TABLE pledge (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES "User"(id),        -- CASE A: individual (not null, org_id null)
    org_id UUID REFERENCES org(id),            -- CASE B: organization (not null, user_id null)
    stripe_customer_id VARCHAR(255),           -- Stripe customer (user or org)
    stripe_subscription_id VARCHAR(255),       -- Stripe subscription (individual or org)
    status VARCHAR(32),                        -- active, past_due, canceled, etc.
    plan VARCHAR(32),                          -- code_pro, code_max, code_team...
    quantity INTEGER DEFAULT 1,                -- 1 for individual, N for org
    -- ...
);

-- Useful indexes
CREATE INDEX idx_pledge_org_id ON pledge(org_id);
CREATE INDEX idx_pledge_stripe_subscription ON pledge(stripe_subscription_id);
CREATE INDEX idx_org_membership_org_id ON org_membership(org_id);

-- GatewayWebhookQueue (new, optional for retry)
CREATE TABLE gateway_webhook_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    principal_id UUID NOT NULL,
    account_id VARCHAR(255),
    status VARCHAR(32) NOT NULL,                -- active, suspended, banned
    reason VARCHAR(64),                         -- payment_failed, cancellation_effective
    attempts INT DEFAULT 0,
    last_error TEXT,
    next_attempt_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    sent_at TIMESTAMP
);
```

#### llm-gateway Cache

Redis key: `account_status:{principal_id}`
Value: JSON `{"status": "suspended", "reason": "payment_failed"}`

### Webhook Payload

```typescript
interface AccountStatusWebhook {
  principal_id: string;   // user.id (who makes the API call)
  account_id: string;     // stripe_customer_id (individual) or org.id (organization)
  status: "active" | "suspended" | "banned";
  reason: "payment_failed" | "cancellation_effective" | "terms_of_service" | null;
}
```

**Concrete examples:**

Alice (individual, monthly Code Pro) has a payment failure:
```json
{
  "principal_id": "user-alice-uuid",
  "account_id": "cus_alice_stripe_id",
  "status": "suspended",
  "reason": "payment_failed"
}
```

Acme Corp (org, 20 seats) has a payment failure → send 20 webhooks:
```json
// Bob (employee)
{
  "principal_id": "user-bob-uuid",
  "account_id": "org-acme-uuid",
  "status": "suspended",
  "reason": "payment_failed"
}

// Carol (employee)
{
  "principal_id": "user-carol-uuid",
  "account_id": "org-acme-uuid",
  "status": "suspended",
  "reason": "payment_failed"
}
// ... etc for all 20 employees
```

## Implementation

### 1. Environment Variables

```bash
# conversational-ui .env
CODE_GATEWAY_URL=https://api.code.umans.ai
CODE_GATEWAY_WEBHOOK_SECRET=whsec_xxx  # different from admin token
```

### 2. Gateway Client

`lib/code-gateway/account-status.ts`:

```typescript
import 'server-only';

const MAX_RETRIES = 5;
const TIMEOUT_MS = 5000;

interface Payload {
  principal_id: string;
  account_id: string;
  status: 'active' | 'suspended' | 'banned';
  reason: 'payment_failed' | 'cancellation_effective' | 'terms_of_service' | null;
}

export async function notifyGateway(payload: Payload, attempt = 1): Promise<void> {
  const baseUrl = process.env.CODE_GATEWAY_URL;
  const secret = process.env.CODE_GATEWAY_WEBHOOK_SECRET;

  if (!baseUrl || !secret) {
    console.warn('Gateway not configured, skipping notification');
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

    if (res.ok) return;

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
    // Log to queue for later retry
    await queueForRetry(payload, err);
  }
}
```

### 3. Stripe Webhook Handler

Update `app/api/billing/webhook/route.ts`:

```typescript
// Helper: determine where to send based on pledge type
async function notifyGatewayForPledge(pledge: Pledge, status: 'active' | 'suspended', reason: string | null) {
  // CASE A: Individual (user_id present, org_id null)
  // Ex: Alice has her own Code Pro subscription
  if (pledge.userId && !pledge.orgId) {
    await notifyGateway({
      principal_id: pledge.userId,
      account_id: pledge.stripeCustomerId,  // or pledge.userId
      status,
      reason,
    });
    return;
  }

  // CASE B: Organization (org_id present, user_id null)
  // Ex: Acme Corp has a Code Team subscription for 20 employees
  if (pledge.orgId) {
    // Get all org members
    const members = await db
      .select({ userId: orgMembership.userId })
      .from(orgMembership)
      .where(eq(orgMembership.orgId, pledge.orgId));

    // Send one webhook per employee
    // Gateway blocks/allows by principal_id (each employee)
    for (const member of members) {
      await notifyGateway({
        principal_id: member.userId,    // Employee making the API call
        account_id: pledge.orgId,       // Org paying (for logs/debug)
        status,
        reason,
      });
    }
    return;
  }
}

case 'invoice.payment_failed': {
  const invoice = event.data.object;
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) break;

  const p = await db.query.pledge.findFirst({
    where: eq(pledge.stripeSubscriptionId, subscriptionId),
  });

  if (p) {
    await notifyGatewayForPledge(p, 'suspended', 'payment_failed');
  }
  break;
}

case 'invoice.payment_succeeded': {
  const invoice = event.data.object;
  // Only reactivate if it's a recovery (not the first invoice)
  if (invoice.billing_reason !== 'subscription_cycle') break;

  const subscriptionId = invoice.subscription;
  const p = await db.query.pledge.findFirst({
    where: eq(pledge.stripeSubscriptionId, subscriptionId),
  });

  if (p) {
    await notifyGatewayForPledge(p, 'active', null);
  }
  break;
}

case 'customer.subscription.deleted': {
  const sub = event.data.object;
  const p = await db.query.pledge.findFirst({
    where: eq(pledge.stripeSubscriptionId, sub.id),
  });

  if (p) {
    await notifyGatewayForPledge(p, 'suspended', 'cancellation_effective');
  }
  break;
}
```

### 4. Retry Queue (Lightweight)

For failed notifications, we have two options:

**Option A: Simple DB Queue** (recommended)
- Insert failed notification into `gateway_webhook_queue`
- Cron job (Vercel Cron) runs every 5 minutes to retry pending items
- Keep it simple: no complex state machine

**Option B: Stripe Events as Source of Truth**
- If notification fails, don't queue
- Rely on Stripe's event replay (Dashboard → Developers → Events → Redeliver)
- Or implement backfill script (see below)

We choose **Option A** for automation, but with minimal complexity.

### 5. Backfill Script

`scripts/backfill-gateway-status.ts`:

```typescript
// Find all pledges that should be suspended
const toSuspend = await db
  .select({ userId: user.id, customerId: pledge.stripeCustomerId, status: pledge.status })
  .from(pledge)
  .innerJoin(user, eq(pledge.userId, user.id))
  .where(or(
    eq(pledge.status, 'past_due'),
    eq(pledge.status, 'canceled')
  ));

for (const row of toSuspend) {
  await notifyGateway({
    principal_id: row.userId,
    account_id: row.customerId,
    status: 'suspended',
    reason: row.status === 'canceled' ? 'cancellation_effective' : 'payment_failed',
  });
  await sleep(100); // Rate limit protection
}
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Gateway timeout | Retry 5x with exponential backoff, then queue |
| Gateway 5xx | Retry 5x, then queue |
| Gateway 4xx (bad request) | Log error, don't retry (bug) |
| Gateway 401 (invalid secret) | Alert immediately, don't retry |
| DB unavailable during Stripe webhook | Let Stripe retry (return 5xx to Stripe) |

## Testing

### Local Testing

1. Use Stripe CLI to forward events:
   ```bash
   stripe listen --forward-to localhost:3000/api/billing/webhook
   ```

2. Trigger test events:
   ```bash
   stripe trigger invoice.payment_failed
   stripe trigger customer.subscription.deleted
   ```

3. Verify gateway receives the webhook:
   ```bash
   curl http://localhost:8000/health  # Check gateway is up
   # Watch gateway logs for webhook receipt
   ```

### Preview/Prod

1. Create test user with active pledge
2. Use Stripe test clock to simulate payment failure
3. Verify user gets 403 on inference after webhook
4. Fix payment in Stripe test clock
5. Verify user can inference again

## Migration Plan

1. Deploy gateway webhook endpoint (already exists)
2. Add `CODE_GATEWAY_WEBHOOK_SECRET` to env
3. Run backfill script to sync existing past_due/canceled subscriptions
4. Enable webhook notifications in Stripe handler
5. Monitor for 48h before enabling enforcement (fail-open mode in gateway)

## Decisions

1. **Individuals vs Orgs**:
   - Today: `principal_id = user.id`, `account_id = stripe_customer_id`
   - Future orgs: `principal_id = user.id`, `account_id = org.id`
   - Gateway doesn't know if it's an individual or employee, it blocks by `principal_id`

2. **Org mapping**:
   - **Decision**: N webhooks for N employees
   - Why: Gateway has no access to org DB, cannot resolve "org → members"

3. **Banning (ToS violations)**:
   - Manual admin action:
   ```typescript
   await notifyGateway({
     principal_id: userId,
     account_id: userId,  // or org.id if entire org is banned
     status: 'banned',
     reason: 'terms_of_service',
   });
   ```

4. **No custom grace period**:
   - React immediately to `invoice.payment_failed`
   - Stripe Smart Retries already handles optimal timing

5. **Simple retry**:
   - Lightweight DB queue + Vercel Cron
   - No Bull/external Redis
