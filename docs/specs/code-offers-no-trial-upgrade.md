# Plan Technique : Suppression du Trial et Ajout de l'Upgrade pour Umans Code

## Contexte

Les offres Umans Code (`/offers/code`) ont actuellement une période d'essai de 2 jours obligatoire. Nous voulons :
1. **Supprimer la période d'essai** - les utilisateurs paient immédiatement
2. **Améliorer l'upgrade** - proposer clairement l'upgrade dès qu'un plan upgradable est actif

## Analyse Actuelle

### Trial (période d'essai)
- **Localisation** : `conversational-ui/app/api/billing/pledge/route.ts:107`
- **Implémentation** : `trial_period_days: MIN_TRIAL_DAYS` (2 jours minimum)
- **Raison** : Stripe "requires" minimum 2 jours, mais c'est probablement une confusion - on peut avoir 0 jours

### Upgrade Existant
- **User Nav** : `code-user-nav.tsx:130-137` - bouton "Upgrade" visible si `plan !== 'code_max'`
- **Billing Tab** : Pas de section upgrade visible, juste "Manage billing" qui redirige vers Stripe

## Changements Proposés

### 1. Suppression du Trial

**Fichier** : `conversational-ui/app/api/billing/pledge/route.ts`

```typescript
// AVANT (lignes 105-109)
subscription_data: {
  // 2-day trial to comply with Stripe's minimum trial period requirement
  trial_period_days: MIN_TRIAL_DAYS,
  metadata,
},

// APRÈS
subscription_data: {
  metadata,
},
```

**Notes** :
- Supprimer la constante `MIN_TRIAL_DAYS` si elle devient inutilisée
- Le statut Stripe sera directement `active` au lieu de `trialing`
- Les webhooks et la logique métier continuent de fonctionner (déjà gère `active`)

### 2. Amélioration de l'Upgrade

#### 2.1 Badge "Upgradable" dans le User Nav (déjà présent)

Le bouton existe déjà dans `code-user-nav.tsx`. Pas de changement nécessaire.

#### 2.2 Section Upgrade dans le Billing Tab

**Fichier** : `conversational-ui/app/billing/billing-client.tsx`

Ajouter une section "Upgrade" visible dans l'onglet Billing quand l'utilisateur a un plan upgradable (`code_pro` → peut upgrader vers `code_max`).

**UI Proposée** (similaire à l'app principale) :
- Carte "Vous êtes sur le plan Pro"
- CTA "Passer au plan Max" avec avantages listés
- Prix et bouton d'action vers Stripe Checkout

```typescript
// Nouvelle section dans le tab 'billing', après "Manage billing"
// Si activePledge.plan === 'code_pro', afficher:
// - Titre: "Upgrade to Max"
// - Description: avantages du plan Max vs Pro
// - Bouton: "Upgrade to Max" → startPledge('code_max', currentCycle)
```

**Logique de détection** :
```typescript
const canUpgrade = activePledge?.plan === 'code_pro';
const upgradePlan: PledgePlanKey = 'code_max';
```

**Flow d'upgrade** :
1. Utilisateur clique "Upgrade"
2. `startPledge('code_max', currentBillingCycle)`
3. Stripe Checkout avec mode `subscription`
4. Stripe gère le prorata automatiquement (même customer, upgrade de souscription)

### 3. Webhook Stripe

Vérifier que le webhook gère correctement les changements de plan. Déjà implémenté via `previous_attributes` pour détecter les changements de status.

### 4. Copy/UX

**Textes suggérés** :

Dans Billing Tab (section upgrade):
```
Title: Upgrade to Umans Code Max
Description: Get unlimited prompts and up to 4 parallel agent sessions.
Current: Pro at $20/month
New: Max at $50/month
Button: Upgrade now
```

## Fichiers Modifiés

1. `conversational-ui/app/api/billing/pledge/route.ts` - Supprimer trial
2. `conversational-ui/app/billing/billing-client.tsx` - Ajouter section upgrade

## Tests à Valider

1. **Nouvelle souscription** : Checkout Stripe sans trial → statut `active` immédiat
2. **Upgrade Pro → Max** : Checkout Stripe upgrade → prorata appliqué
3. **User Nav** : Bouton upgrade visible pour Pro, caché pour Max
4. **Billing Tab** : Section upgrade visible pour Pro, cachée pour Max

## Non-Goals

- Pas de changement sur les plans existants (Pro/Max restent identiques)
- Pas de changement sur les prix
- Pas de changement sur le système d'API keys
- Pas de migration de données nécessaire (les pledges trialing existants continuent de fonctionner)
