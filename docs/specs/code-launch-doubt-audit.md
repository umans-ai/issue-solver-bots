# Audit des formulations "doute sur l'ouverture du service"

## Contexte (mis à jour)

**Statut actuel confirmé :**
- ✅ Code reste en **public beta** (c'est intentionnel)
- ✅ **Founding price toujours d'actualité** mais indépendant de l'ouverture du service
- ✅ L'essai gratuit avant mars est terminé
- ✅ Envs est un produit séparé, pas concerné par cet audit
- ✅ **Option B retenue** : On garde `pledge` dans le code technique, on change uniquement le wording utilisateur

**Objectif :**
1. Retirer tout message qui suggère que le service pourrait ne pas être lancé
2. Remplacer "pledge" par "membership"/"subscription" dans tous les textes utilisateur
3. Supprimer les références à une date d'activation ou de lancement

---

## Plan de modification détaillé

### 1. Changements de wording (user-facing uniquement)

| Terme actuel | Nouveau terme | Contexte |
|--------------|---------------|----------|
| "Founding pledge" | "Founding membership" | Emails, UI |
| "Your pledge is confirmed" | "Your subscription is confirmed" | Emails |
| "Manage your pledge" | "Get started" / "Manage subscription" | Boutons |
| "No active pledge" | "No active subscription" | État vide |
| "Pledge plan" | "Plan" | Labels |
| "seats left at founding price" | "founding spots remaining" | Compteur |
| "Activates March 1" | "Founding rate secured" | Landing |
| "Activation starts..." | "Secure the founding member rate" | Landing |

### 2. Suppressions de messages conditionnels

| Fichier | Texte à supprimer |
|---------|-------------------|
| `billing-client.tsx` | "If we do not launch by {date}, you will not be charged" |
| `email.ts` | "The launch window closes February 28, 2026" |
| `email.ts` | "Billing starts March 1, 2026" (dans le corps principal) |
| `code-landing-content.tsx` | "Activates March 1" |

### 3. Ajouts pour renforcer l'accès immédiat

| Fichier | Nouveau texte |
|---------|---------------|
| `email.ts` | "You can start using Umans Code immediately" |
| `email.ts` | "Your founding member rate is locked in" |

---

## Modifications par fichier

### 🔴 `conversational-ui/lib/email.ts`

#### Fonction `sendPledgeConfirmationEmail`

**Sujet actuel :** `Your Founding pledge is confirmed`
**Nouveau sujet :** `Your Founding membership is confirmed`

**Contenu actuel :**
```tsx
const content = `
  <p style="...">
    Your Founding pledge is confirmed. We've saved your plan details.
  </p>
  ...
  <p style="...">
    Billing starts March 1, 2026. The launch window closes February 28, 2026.
    You can cancel anytime before then from your billing dashboard.
  </p>
  ${createButton(billingUrl, 'Manage your pledge', 'primary')}
`;
```

**Nouveau contenu :**
```tsx
const content = `
  <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #475569; text-align: center;">
    Your Founding membership is confirmed at the exclusive founding member rate.
  </p>

  ${createInfoBox(
    `
      <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">Plan</p>
      <p style="margin: 0; font-size: 14px;">${planLabel} · ${billingCycleLabel}</p>
      <p style="margin: 8px 0 0 0; font-size: 14px;">${priceLabel}</p>
    `,
    'info',
  )}

  <p style="margin: 24px 0; font-size: 14px; line-height: 1.6; color: #64748b; text-align: center;">
    You can start using Umans Code immediately. Your founding member rate is locked in.
  </p>

  ${createButton(billingUrl, 'Get started', 'primary')}
`;
```

**Titre email :** `Founding pledge confirmed` → `Founding membership confirmed`

---

### 🔴 `conversational-ui/app/billing/billing-client.tsx`

#### Section "Get Started" (lignes ~720-724)

**Actuel :**
```tsx
<p className="mt-4 text-sm text-[#0b0d10]/60 dark:text-white/60">
  Billing starts {PLEDGE_CHARGE_START_LABEL}. If we do
  not launch by {PLEDGE_DEADLINE_LABEL}, you will not be
  charged.
</p>
```

**Nouveau :**
```tsx
<p className="mt-4 text-sm text-[#0b0d10]/60 dark:text-white/60">
  Billing starts {PLEDGE_CHARGE_START_LABEL}.
</p>
```

#### Section "No active pledge" (lignes ~727-734)

**Actuel :**
```tsx
<h2 className="text-2xl font-semibold text-[#0b0d10] dark:text-white">
  No active pledge
</h2>
<p className="mt-2 text-sm text-[#0b0d10]/60 dark:text-white/60">
  Choose a plan to reserve your Founding seat.
</p>
```

**Nouveau :**
```tsx
<h2 className="text-2xl font-semibold text-[#0b0d10] dark:text-white">
  No active subscription
</h2>
<p className="mt-2 text-sm text-[#0b0d10]/60 dark:text-white/60">
  Choose a plan to become a founding member.
</p>
```

---

### 🔴 `conversational-ui/app/offers/code/code-landing-content.tsx`

#### Constantes et variables (lignes ~17-18)

**Actuel :**
```tsx
const ACTIVATION_DATE_LABEL = 'March 1';
```

**Action :** Variable à supprimer si non utilisée ailleurs, ou garder uniquement pour référence interne.

#### Section Founding Members (lignes ~1270-1283)

**Actuel :**
```tsx
<p className="text-sm text-black/60 dark:text-white/60">
  Activation starts {ACTIVATION_DATE_LABEL}. No charge until then.
</p>
...
<div className="mt-4 text-xs text-black/50 dark:text-white/50">
  <span>Activates {ACTIVATION_DATE_LABEL}</span>
</div>
```

**Nouveau :**
```tsx
<p className="text-sm text-black/60 dark:text-white/60">
  Secure the founding member rate. Limited spots available.
</p>
...
<div className="mt-4 text-xs text-black/50 dark:text-white/50">
  <span>Founding rate secured</span>
</div>
```

---

### 🟡 `conversational-ui/lib/pledge.ts`

**Vérifications à faire :**
- `PLEDGE_DEADLINE_LABEL` : Supprimer si non utilisé ailleurs
- `PLEDGE_DEADLINE_TIMESTAMP` : Supprimer si non utilisé
- Garder `PLEDGE_CHARGE_START_LABEL` (encore pertinent pour la facturation)

---

## Checklist d'implémentation

### Phase 1 : Préparation
- [x] Mettre à jour la spec
- [ ] Commit la spec

### Phase 2 : Modifications code
- [ ] `lib/email.ts` - Renommer "pledge" → "membership", nouveau contenu email
- [ ] `app/billing/billing-client.tsx` - Supprimer conditionnel, renommer labels
- [ ] `app/offers/code/code-landing-content.tsx` - Remplacer "Activates" par "Founding rate secured"
- [ ] `lib/pledge.ts` - Nettoyer constantes obsolètes si besoin

### Phase 3 : Vérification
- [ ] Build Next.js (`just build`)
- [ ] Tests si existants
- [ ] Vérification visuelle en local (`just dev`)
  - [ ] Page billing (avec et sans subscription)
  - [ ] Landing page /offers/code (section Founding)
  - [ ] Preview email (si possible)

### Phase 4 : Validation
- [ ] Review avec utilisateur
- [ ] Push en prod (sur demande)

---

## Notes de mise en œuvre

### Dates hardcodées
Les dates sont dans `lib/pledge.ts` :
- `PLEDGE_DEADLINE_LABEL = 'February 28, 2026'`
- `PLEDGE_CHARGE_START_LABEL = 'March 1, 2026'`

On est le 28 février 2026. La mention "Billing begins March 1" est encore techniquement valide mais on la retire du corps de l'email pour simplifier.

### Pourquoi supprimer "Cancel anytime"
Cette mention dans l'email de bienvenue donne une excuse cognitive de sortie immédiate. On garde l'option dans le dashboard (c'est important), mais on ne la met pas en avant dans le premier contact.

### Terminologie retenue
- **Membership** : Pour le statut Founding (privilège, appartenance)
- **Subscription** : Pour l'état facturation (actif/inactif)
- **Plan** : Pour les offres (Pro/Max)

Cette distinction :
- "Membership" = valeur émotionnelle (founding member)
- "Subscription" = valeur transactionnelle (état du compte)
