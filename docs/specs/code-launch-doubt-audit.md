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
4. **Supprimer toutes les constantes de date obsolètes (PLEDGE_CHARGE_START_*, PLEDGE_DEADLINE_*)**

---

## Modifications complémentaires (dernier passage)

### Landing page - phrase principale

**Actuel :** "Join now, start coding immediately, and pay nothing until billing starts."

**Nouveau :** "Join now and start building immediately."

*Note : On retire la mention du paiement différé car elle n'est plus pertinente post-launch.*

### Stripe checkout custom text

**Actuel :** `Founding membership. No charge today. You'll be billed ${PLEDGE_CHARGE_START_LABEL}.`

**Nouveau :** `"Your founding member rate is locked in. Start using immediately."`

### Suppression des constantes de date

**Fichier :** `lib/pledge.ts`

**À supprimer :**
- `PLEDGE_DEADLINE_LABEL` (déjà commenté, à supprimer définitivement)
- `PLEDGE_DEADLINE_TIMESTAMP` (déjà commenté, à supprimer définitivement)
- `PLEDGE_CHARGE_START_LABEL` (date hardcodée, plus pertinente)
- `PLEDGE_CHARGE_START_TIMESTAMP` (timestamp hardcodé, plus pertinent)

**Vérification d'usage avant suppression :**
- [ ] Vérifier si `PLEDGE_CHARGE_START_TIMESTAMP` est utilisé dans `app/api/billing/pledge/route.ts` pour `trial_end`

---

## Modifications par fichier (final)

### 🔴 `conversational-ui/app/offers/code/code-landing-content.tsx`

**Ligne ~1260 :**
```tsx
// AVANT :
<p className="text-base text-black/70 leading-relaxed dark:text-white/70">
  Join now, start coding immediately, and pay nothing until billing starts.
  <br />
  You'll also secure the founding member rate.
</p>

// APRÈS :
<p className="text-base text-black/70 leading-relaxed dark:text-white/70">
  Join now and start building immediately.
  <br />
  You'll also secure the founding member rate.
</p>
```

### 🔴 `conversational-ui/app/api/billing/pledge/route.ts`

**Lignes ~118-124 :**
```tsx
// AVANT :
custom_text: {
  submit: {
    message: `Founding membership. No charge today. You'll be billed ${PLEDGE_CHARGE_START_LABEL}.`,
  },
  after_submit: {
    message: 'Start using Umans Code immediately.',
  },
},

// APRÈS :
custom_text: {
  submit: {
    message: 'Your founding member rate is locked in. Start using immediately.',
  },
},
```

**Import à nettoyer :**
- Retirer `PLEDGE_CHARGE_START_TIMESTAMP` et `PLEDGE_CHARGE_START_LABEL` des imports
- Remplacer `trial_end` par une logique sans date hardcodée (ex: `trial_period_days` ou calcul dynamique)

### 🔴 `conversational-ui/lib/pledge.ts`

**Suppression complète des constantes obsolètes :**
```ts
// SUPPRIMER TOUT :
// Deprecated: PLEDGE_DEADLINE_* constants removed as service is now open
// export const PLEDGE_DEADLINE_LABEL = 'February 28, 2026';
// export const PLEDGE_DEADLINE_TIMESTAMP = ...

export const PLEDGE_CHARGE_START_LABEL = 'March 1, 2026';
export const PLEDGE_CHARGE_START_TIMESTAMP = Math.floor(
  new Date('2026-03-01T00:00:00Z').getTime() / 1000,
);
```

---

## Checklist d'implémentation (dernier passage)

### Phase 1 : Préparation
- [x] Mettre à jour la spec
- [ ] Commit la spec

### Phase 2 : Modifications code
- [ ] `app/offers/code/code-landing-content.tsx` - Nouvelle phrase landing
- [ ] `app/api/billing/pledge/route.ts` - Nouveau texte Stripe + gestion trial sans date
- [ ] `lib/pledge.ts` - Suppression constantes obsolètes

### Phase 3 : Vérification
- [ ] Build Next.js (`just build`)
- [ ] Tests (`just test` ou `pnpm test`)
- [ ] Vérification visuelle en local (`just dev`)
  - [ ] Landing page /offers/code (nouvelle phrase)
  - [ ] Process de checkout Stripe (texte submit)

### Phase 4 : Validation
- [ ] Review avec utilisateur
- [ ] Push en prod (sur demande)

---

## Notes importantes

### Gestion du trial Stripe sans date hardcodée

Si `PLEDGE_CHARGE_START_TIMESTAMP` est utilisé pour `trial_end`, il faut remplacer par :
- Option A : `trial_period_days: 2` (essai technique de 2 jours)
- Option B : Calcul dynamique basé sur la date actuelle
- Option C : Supprimer le trial complètement

**À vérifier dans `app/api/billing/pledge/route.ts`**
