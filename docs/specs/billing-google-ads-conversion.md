# Billing: Google Ads Conversion Tracking

This spec defines how the conversational UI tracks Google Ads purchase conversions without counting non-subscription traffic.

## Goal

- Track only successful Umans Code pledge subscriptions as Google Ads conversions.

## Non-goals

- Track generic billing page visits.
- Track cancelled checkout flows.
- Emit conversion events from webhook-only backends.

## Conversion flow

1. Billing checkout is created by `POST /api/billing/pledge`.
2. Stripe returns to `/billing?pledge=success&session_id={CHECKOUT_SESSION_ID}`.
3. The billing client calls `POST /api/billing/pledge/conversion` with that session id.
4. The server verifies the Stripe checkout session is:
   - owned by the authenticated user,
   - `mode=subscription`,
   - `status=complete`,
   - sourced from `umans-code-pledge`, and
   - linked to a subscription in an eligible status (`trialing`, `active`, `past_due`).
5. Only when verification returns `eligible: true`, the client sends:
   - `gtag('event', 'conversion', { send_to: 'AW-.../<label>', transaction_id: sessionId })`.
6. The client de-duplicates by checkout session id in local storage.

## Configuration

Frontend server env vars:

- `GOOGLE_ADS_ID`
- `GOOGLE_ADS_PURCHASE_LABEL`

Terraform wiring (`operations/02-deploy`):

- Variables:
  - `google_ads_id`
  - `google_ads_purchase_label`
- App Runner env:
  - `GOOGLE_ADS_ID = var.google_ads_id`
  - `GOOGLE_ADS_PURCHASE_LABEL = var.google_ads_purchase_label`

## Verification

- Local:
  - Set `GOOGLE_ADS_ID` and `GOOGLE_ADS_PURCHASE_LABEL` in `conversational-ui/.env`.
  - Complete a pledge checkout.
  - Confirm browser network includes `POST /api/billing/pledge/conversion` with `eligible: true`.
  - Confirm Google tag conversion event fires once per Stripe checkout session id.
- Negative path:
  - Open `/billing?pledge=cancelled` and verify no conversion event fires.
  - Re-open the same success URL and verify no duplicate conversion is emitted.
