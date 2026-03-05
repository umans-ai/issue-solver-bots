# Billing → Gateway Integration Spec

Integration between the conversational-ui billing system and the llm-gateway for account status enforcement.

## Goals

- Gateway enforces billing decisions (suspend/allow inference)
- Billing notifies gateway of status changes via webhook
- Grace period for payment failures before suspension
- Support future orgs/teams (multi-seat) model

## Non-goals

- Gateway querying billing database directly
- Real-time synchronization (eventual consistency via webhooks)
- Usage-based limiting in this integration (covered by plans/quotas separately)

## Background: Stripe Concepts

### Payment Failure & Smart Retries

Stripe gère les échecs de paiement via **Smart Retries** (AI-driven, configurable dans Dashboard → Subscriptions → Dunning):

- **8 tentatives en 2 semaines** (recommandé par Stripe)
- Timing optimisé par AI selon le fuseau horaire du client
- Configurable de 1 semaine à 2 mois

**Lifecycle d'un échec:**
```
Payment fails
    ↓
invoice.payment_failed (attempt 1) → Subscription: active (still)
    ↓
Smart Retries: jours 1, 3, 5, 7, 14...
    ↓
Subscription status: past_due (after first retry)
    ↓
Échec final → unpaid OU canceled (selon settings Stripe)
```

**Events clés:**
- `invoice.payment_failed` → À chaque échec (suspendre immédiatement)
- `invoice.payment_succeeded` (billing_reason = "subscription_cycle") → Réactiver
- `customer.subscription.deleted` → Cancellation effective

**Decision:** Pas de grace period custom. On réagit aux événements Stripe immédiatement.

### Deux Modèles: Particuliers vs Organisations

#### A. Particuliers (aujourd'hui)

Un utilisateur individuel avec un abonnement personnel.

```javascript
// Stripe
const customer = await stripe.customers.create({
  email: "alice@example.com",
  metadata: { user_id: "user-alice-uuid" }
});

const subscription = await stripe.subscriptions.create({
  customer: customer.id,
  items: [{ price: "price_code_pro" }],  // Pas de quantity = 1 seat
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

| Champ | Valeur particulier |
|-------|-------------------|
| `principal_id` | `user.id` (l'utilisateur qui fait les API calls) |
| `account_id` | `stripe_customer_id` (même que principal_id logiquement) |

#### B. Organisations (futur)

Une entreprise avec 20 employés sur un même abonnement.

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
    quantity: 20               // 20 employés
  }],
  metadata: { org_id: "org-acme-uuid" }
});
```

**Notre DB:**
```sql
-- L'organisation
org:
  id: "org-acme-uuid"
  name: "Acme Corp"
  stripe_customer_id: "cus_xyz789"

-- Les membres (juste la liaison, pas de données Stripe ici)
org_membership:
  user_id: "user-bob-uuid"    → org_id: "org-acme-uuid", role: "member"
  user_id: "user-carol-uuid"  → org_id: "org-acme-uuid", role: "member"
  user_id: "user-dave-uuid"   → org_id: "org-acme-uuid", role: "admin"

-- L'abonnement (stripe_subscription_id est ici!)
pledge:
  org_id: "org-acme-uuid"
  user_id: null              -- null car c'est un abo org
  stripe_subscription_id: "sub_team_abc123"
  stripe_customer_id: "cus_xyz789"
  quantity: 20
  status: "active"
```

**Important:** `stripe_subscription_id` est dans `pledge`, pas dans `org` ni `org_membership`. Quand un webhook Stripe arrive pour `sub_team_abc123`, on cherche le pledge correspondant, puis on trouve les membres via `org_membership.org_id`.

**Webhooks envoyés (N calls pour N employés):**
```json
// Bob essaie d'utiliser l'API
{
  "principal_id": "user-bob-uuid",
  "account_id": "org-acme-uuid",
  "status": "suspended",
  "reason": "payment_failed"
}

// Carol aussi
{
  "principal_id": "user-carol-uuid",
  "account_id": "org-acme-uuid",
  "status": "suspended",
  "reason": "payment_failed"
}
```

| Champ | Valeur org |
|-------|-----------|
| `principal_id` | `user.id` de l'employé qui fait l'API call |
| `account_id` | `org.id` (l'entité qui paie) |

**Pourquoi séparer ?** Le gateway ne connaît pas la structure org. Il reçoit juste "est-ce que Bob peut utiliser l'API ?" et vérifie le cache pour `principal_id = user-bob-uuid`.

### Mapping Récap

| Cas | principal_id | account_id | Stripe Customer |
|-----|--------------|------------|-----------------|
| Particulier aujourd'hui | `user.id` | `stripe_customer_id` | 1 customer = 1 user |
| Orga futur | `user.id` (employé) | `org.id` | 1 customer = N users |

Le `account_id` sert principalement pour le debugging et les logs côté gateway.

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
-- Organisation (future)
CREATE TABLE org (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,        -- acme-corp
    billing_email VARCHAR(255),
    stripe_customer_id VARCHAR(255),          -- customer Stripe de l'org
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Org membership (future) - qui fait partie de quelle org
CREATE TABLE org_membership (
    user_id UUID REFERENCES user(id),
    org_id UUID REFERENCES org(id),
    role VARCHAR(32) NOT NULL DEFAULT 'member',  -- member, admin, owner
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, org_id)
);

-- Pledge table (exists + future org support)
-- Un pledge = un abonnement (individuel ou org)
CREATE TABLE pledge (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES user(id),          -- CAS A: particulier (non null, org_id null)
    org_id UUID REFERENCES org(id),            -- CAS B: organisation (non null, user_id null)
    stripe_customer_id VARCHAR(255),           -- Stripe customer (user ou org)
    stripe_subscription_id VARCHAR(255),       -- L'abo Stripe (individuel ou org)
    status VARCHAR(32),                        -- active, past_due, canceled, etc.
    plan VARCHAR(32),                          -- code_pro, code_max, code_team...
    quantity INTEGER DEFAULT 1,                -- 1 pour individuel, N pour org
    -- ...
);

-- Index utiles
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
  principal_id: string;   // user.id (qui fait l'API call)
  account_id: string;     // stripe_customer_id (individu) ou org.id (orga)
  status: "active" | "suspended" | "banned";
  reason: "payment_failed" | "cancellation_effective" | "terms_of_service" | null;
}
```

**Exemples concrets:**

Alice (particulier, Code Pro mensuel) a un échec de paiement :
```json
{
  "principal_id": "user-alice-uuid",
  "account_id": "cus_alice_stripe_id",
  "status": "suspended",
  "reason": "payment_failed"
}
```

Acme Corp (org, 20 sièges) a un échec de paiement → on envoie 20 webhooks :
```json
// Bob (employé)
{
  "principal_id": "user-bob-uuid",
  "account_id": "org-acme-uuid",
  "status": "suspended",
  "reason": "payment_failed"
}

// Carol (employée)
{
  "principal_id": "user-carol-uuid",
  "account_id": "org-acme-uuid",
  "status": "suspended",
  "reason": "payment_failed"
}
// ... etc pour les 20 employés
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
// Helper: déterminer où envoyer selon le type de pledge
async function notifyGatewayForPledge(pledge: Pledge, status: 'active' | 'suspended', reason: string | null) {
  // CAS A: Particulier (user_id présent, org_id null)
  // Ex: Alice a son propre abo Code Pro
  if (pledge.userId && !pledge.orgId) {
    await notifyGateway({
      principal_id: pledge.userId,
      account_id: pledge.stripeCustomerId,  // ou pledge.userId
      status,
      reason,
    });
    return;
  }

  // CAS B: Organisation (org_id présent, user_id null)
  // Ex: Acme Corp a un abo Code Team pour 20 employés
  if (pledge.orgId) {
    // Récupérer tous les membres de l'org
    const members = await db
      .select({ userId: orgMembership.userId })
      .from(orgMembership)
      .where(eq(orgMembership.orgId, pledge.orgId));

    // Envoyer un webhook par employé
    // Le gateway bloque/allow par principal_id (chaque employé)
    for (const member of members) {
      await notifyGateway({
        principal_id: member.userId,    // L'employé qui fait l'API call
        account_id: pledge.orgId,       // L'org qui paie (pour logs/debug)
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
  // Réactiver seulement si c'est un recovery (pas la première invoice)
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

## Décisions

1. **Particuliers vs Orgs**:
   - Aujourd'hui: `principal_id = user.id`, `account_id = stripe_customer_id`
   - Futur orgs: `principal_id = user.id`, `account_id = org.id`
   - Le gateway ne sait pas si c'est un individu ou un employé, il bloque par `principal_id`

2. **Org mapping**:
   - **Decision**: N webhooks pour N employés
   - Pourquoi: Le gateway n'a pas accès à la DB orgs, il ne peut pas résoudre "org → membres"

3. **Banning (ToS violations)**:
   - Admin action manuelle:
   ```typescript
   await notifyGateway({
     principal_id: userId,
     account_id: userId,  // ou org.id si toute l'org est bannie
     status: 'banned',
     reason: 'terms_of_service',
   });
   ```

4. **Pas de grace period custom**:
   - On réagit immédiatement à `invoice.payment_failed`
   - Stripe Smart Retries gère déjà le timing optimal

5. **Retry simple**:
   - DB queue légère + cron Vercel
   - Pas de Bull/Redis externe
