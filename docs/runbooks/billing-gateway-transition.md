# Billing → Gateway Transition Runbook

**Status:** In Progress
**Goal:** Enable account status enforcement (suspended/active) in the Gateway for Code customers.

---

## Context

- **Before:** Gateway only checked API key existence (auth). No account status verification.
- **After:** Gateway also checks status in Redis (active/suspended/banned).
- **Problem:** Currently everyone is in "cache miss" (unknown status) → fail-open → everyone passes through.

---

## Transition Phases

### Phase 1: Immediate Backfill (Priority: CRITICAL)

**Objective:** Mark existing canceled or payment-failed customers as "suspended".

#### 1.1 Identify accounts to suspend

```sql
-- In conversational-ui (Postgres)
-- Customers with canceled or past_due pledge
SELECT
    u.id as user_id,
    p.stripe_customer_id,
    p.status,
    CASE
        WHEN p.status = 'canceled' THEN 'cancellation_effective'
        WHEN p.status = 'past_due' THEN 'payment_failed'
    END as reason
FROM pledge p
JOIN "User" u ON p.user_id = u.id
WHERE
    p.status IN ('canceled', 'past_due');
```

#### 1.2 Send webhooks to Gateway

```bash
# For each user found
# Replace WEBHOOK_SECRET with CODE_GATEWAY_WEBHOOK_SECRET value

curl -X POST https://api.code.umans.ai/webhooks/account \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $WEBHOOK_SECRET" \
  -d '{
    "principal_id": "USER_UUID_HERE",
    "account_id": "cus_STRIPE_ID_HERE",
    "status": "suspended",
    "reason": "cancellation_effective"
  }'
```

**Checklist:**
- [ ] Run SQL query to list accounts
- [ ] Send webhooks for `canceled` accounts
- [ ] Send webhooks for `past_due` accounts
- [ ] Verify keys exist in Redis: `redis-cli KEYS "account_status:*"`

---

### Phase 2: Verification (Before activation)

**Objective:** Ensure active customers are not blocked.

#### 2.1 Test suspended customer (should be blocked)

```bash
# Get an API key from a customer who canceled
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

#### 2.2 Test active customer (should pass)

```bash
# Get an API key from an active customer (e.g. your account)
curl -X POST https://api.code.umans.ai/v1/messages \
  -H "Authorization: Bearer ACTIVE_CUSTOMER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "umans-kimi-k2.5",
    "messages": [{"role": "user", "content": "hi"}],
    "max_tokens": 10
  }'

# Expected: 200 OK (even if not in cache yet - fail-open)
```

**Checklist:**
- [ ] Test suspended customer → 403
- [ ] Test active customer → 200
- [ ] Verify error message contains correct link: https://app.umans.ai/billing

---

### Phase 3: Enable Real-Time Webhooks

**Objective:** Billing automatically sends changes to the gateway.

#### 3.1 Update Stripe webhook handler

In `conversational-ui/app/api/billing/webhook/route.ts`, add:

```typescript
case 'customer.subscription.deleted': {
  // Effective cancellation
  const sub = event.data.object;
  await notifyGatewayForSubscription(sub.id, 'suspended', 'cancellation_effective');
  break;
}

case 'invoice.payment_failed': {
  // Payment problem
  const invoice = event.data.object;
  if (invoice.subscription) {
    await notifyGatewayForSubscription(
      invoice.subscription as string,
      'suspended',
      'payment_failed'
    );
  }
  break;
}

case 'invoice.payment_succeeded': {
  // Successful payment (recovery)
  const invoice = event.data.object;
  if (invoice.billing_reason === 'subscription_cycle' && invoice.subscription) {
    await notifyGatewayForSubscription(
      invoice.subscription as string,
      'active',
      null
    );
  }
  break;
}
```

#### 3.2 Deploy

```bash
# conversational-ui
git push origin main
# Wait for deployment to app.umans.ai
```

**Checklist:**
- [ ] Code updated with new handlers
- [ ] Deployed to production
- [ ] Test with Stripe CLI: `stripe trigger customer.subscription.deleted`

---

### Phase 4: Monitoring

**Objective:** Detect problems in production.

#### 4.1 Logs to watch

In Gateway logs (CloudWatch/Datadog):
```
# WARNING: Cache miss = normal for new users
"Account status cache miss for principal xxx"

# ERROR: Webhook failed
"Gateway webhook failed after 5 attempts"

# INFO: Suspension effective
"Account status updated: principal=xxx status=suspended"
```

#### 4.2 Alerts

- **Too many unexpected 403s:** If active customers get blocked
- **Webhook failures:** If billing cannot notify gateway

**Checklist:**
- [ ] Monitoring dashboard created
- [ ] Alert configured for "gateway webhook failed"
- [ ] Alert configured for "abnormally high 403 rate"

---

## Important URLs

| Service | URL |
|---------|-----|
| Gateway API | `https://api.code.umans.ai` |
| Billing Dashboard | `https://app.umans.ai/billing` |
| Webhook endpoint | `POST https://api.code.umans.ai/webhooks/account` |

---

## Rollback Plan

If problems occur in production:

1. **Disable enforcement:** Set `account_status_service = None` in gateway
2. **Clear Redis cache:** `redis-cli DEL account_status:*`
3. **Investigate:** Check billing logs (why was wrong status sent?)

---

## Notes

- **Fail-open:** As long as a user is not in the cache, they pass through. This is intentional to avoid breaking existing customers.
- **Idempotency:** We can re-send webhooks without risk (gateway upserts).
- **Performance:** The check is in Redis (~1ms), no Postgres query on the hot path.

---

## Questions/Risks

| Question | Answer |
|----------|--------|
| What happens if Redis goes down? | Fail-open (no cache = allow). Customers won't be blocked. |
| What if the billing→gateway webhook fails? | Retry 5x, then log. Customer stays in current state (no change). |
| Can a customer bypass? | No, the gateway is the source of truth for inference. |
