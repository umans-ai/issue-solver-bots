# Backfill: Suspended Accounts → Gateway

**Date:** 2026-03-06
**Runbook:** [billing-gateway-transition.md](../../docs/runbooks/billing-gateway-transition.md) Phase 2
**Operator:** _to be filled_
**Status:** ⏳ Pending execution

## Context

Backfill existing `canceled` and `past_due` pledges to the llm-gateway account status cache.

## Prerequisites

- [ ] Deployment of webhook handlers complete (Phase 1)
- [ ] `CODE_GATEWAY_URL` and `CODE_GATEWAY_WEBHOOK_SECRET` configured
- [ ] Database access configured (`POSTGRES_URL`)

## Execution

### 1. Dry Run (Preview)

```bash
cd operations/executed-runbooks/2026-03-06-backfill-suspended-accounts
DRY_RUN=true pnpm tsx backfill.ts
```

### 2. Execute

```bash
pnpm tsx backfill.ts
```

### 3. Verify Results

Check `results.json` was created and contains expected data.

## Artifacts

| File | Description |
|------|-------------|
| `backfill.ts` | Script used for the operation |
| `results.json` | Execution results (generated) |

## Post-Execution Checklist

- [ ] `results.json` committed to this directory
- [ ] Gateway Redis verified: `KEYS "account_status:*"`
- [ ] Phase 3 (consistency check) completed
