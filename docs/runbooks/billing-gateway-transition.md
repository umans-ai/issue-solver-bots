# Billing → Gateway Transition Runbook

**Status:** In Progress
**Goal:** Activer l'enforcement des statuts de compte (suspended/active) dans le Gateway pour les clients Code.

---

## Contexte

- **Avant:** Le gateway vérifiait uniquement l'existence de la clé API (auth). Pas de vérification de statut de compte.
- **Après:** Le gateway vérifie aussi le statut dans Redis (active/suspended/banned).
- **Problème:** Actuellement, tout le monde est en "cache miss" (statut inconnu) → fail-open → tout le monde passe.

---

## Phases de Transition

### Phase 1: Backfill immédiat (Priorité: CRITIQUE)

**Objectif:** Marquer comme "suspended" les clients qui ont déjà annulé ou ont des problèmes de paiement.

#### 1.1 Identifier les comptes à suspendre

```sql
-- Dans conversational-ui (Postgres)
-- Clients avec pledge annulé effective
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

#### 1.2 Envoyer les webhooks au Gateway

```bash
# Pour chaque utilisateur trouvé
# Remplacer WEBHOOK_SECRET par la valeur de CODE_GATEWAY_WEBHOOK_SECRET

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
- [ ] Exécuter la requête SQL pour lister les comptes
- [ ] Envoyer les webhooks pour les `canceled`
- [ ] Envoyer les webhooks pour les `past_due`
- [ ] Vérifier dans Redis que les clés existent: `redis-cli KEYS "account_status:*"`

---

### Phase 2: Vérification (Avant activation)

**Objectif:** S'assurer que les clients actifs ne sont pas bloqués.

#### 2.1 Test client suspendu (doit être bloqué)

```bash
# Récupérer une clé API d'un client qui a annulé
curl -X POST https://api.code.umans.ai/v1/messages \
  -H "Authorization: Bearer KEY_DU_CLIENT_SUSPENDU" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "umans-kimi-k2.5",
    "messages": [{"role": "user", "content": "hi"}],
    "max_tokens": 10
  }'

# Attendu: 403 Forbidden
# Body: {"type": "billing_error", "error": {"type": "account_suspended", "message": "...", "reason": "..."}}
```

#### 2.2 Test client actif (doit passer)

```bash
# Récupérer une clé API d'un client actif (ex: ton compte)
curl -X POST https://api.code.umans.ai/v1/messages \
  -H "Authorization: Bearer KEY_DU_CLIENT_ACTIF" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "umans-kimi-k2.5",
    "messages": [{"role": "user", "content": "hi"}],
    "max_tokens": 10
  }'

# Attendu: 200 OK (même si pas encore en cache - fail-open)
```

**Checklist:**
- [ ] Test client suspendu → 403
- [ ] Test client actif → 200
- [ ] Vérifier le message d'erreur contient le bon lien: https://app.umans.ai/billing

---

### Phase 3: Activer les webhooks temps réel

**Objectif:** Le billing envoie automatiquement les changements au gateway.

#### 3.1 Mettre à jour le webhook Stripe handler

Dans `conversational-ui/app/api/billing/webhook/route.ts`, ajouter:

```typescript
case 'customer.subscription.deleted': {
  // Annulation effective
  const sub = event.data.object;
  await notifyGatewayForSubscription(sub.id, 'suspended', 'cancellation_effective');
  break;
}

case 'invoice.payment_failed': {
  // Problème de paiement
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
  // Paiement réussi (recovery)
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

#### 3.2 Déployer

```bash
# conversational-ui
git push origin main
# Attendre le déploiement sur app.umans.ai
```

**Checklist:**
- [ ] Code mis à jour avec les nouveaux handlers
- [ ] Déployé en production
- [ ] Test avec Stripe CLI: `stripe trigger customer.subscription.deleted`

---

### Phase 4: Monitoring

**Objectif:** Détecter les problèmes en production.

#### 4.1 Logs à surveiller

Dans le Gateway (logs CloudWatch/datadog):
```
# WARNING: Cache miss = normal pour nouveaux utilisateurs
"Account status cache miss for principal xxx"

# ERROR: Webhook échoué
"Gateway webhook failed after 5 attempts"

# INFO: Suspension effective
"Account status updated: principal=xxx status=suspended"
```

#### 4.2 Alertes

- **Trop de 403 inattendus:** Si des clients actifs se font bloquer
- **Webhook failures:** Si le billing ne peut pas notifier le gateway

**Checklist:**
- [ ] Dashboard de monitoring créé
- [ ] Alerte configurée sur "gateway webhook failed"
- [ ] Alerte configurée sur "taux de 403 anormalement élevé"

---

## URLs Importantes

| Service | URL |
|---------|-----|
| Gateway API | `https://api.code.umans.ai` |
| Billing Dashboard | `https://app.umans.ai/billing` |
| Webhook endpoint | `POST https://api.code.umans.ai/webhooks/account` |

---

## Rollback Plan

Si problème en production:

1. **Désactiver l'enforcement:** Définir `account_status_service = None` dans le gateway
2. **Vider le cache Redis:** `redis-cli DEL account_status:*`
3. **Investiguer:** Vérifier les logs du billing (pourquoi mauvais statut envoyé?)

---

## Notes

- **Fail-open:** Tant qu'un utilisateur n'est pas dans le cache, il passe. C'est volontaire pour ne pas casser les clients existants.
- **Idempotence:** On peut re-envoyer les webhooks sans risque (le gateway upsert).
- **Performance:** La vérification est en Redis (~1ms), pas de requête Postgres sur le hot path.

---

## Questions/Risques

| Question | Réponse |
|----------|---------|
| Que se passe-t-il si Redis tombe? | Fail-open (pas de cache = autoriser). Les clients ne seront pas bloqués. |
| Et si le webhook billing→gateway échoue? | Retry 5x, puis log. Le client reste dans son état actuel (pas de changement). |
| Un client peut-il contourner? | Non, le gateway est la source de vérité pour l'inference. |