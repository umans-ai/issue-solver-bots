# Code Welcome Email Redirect

## Goal

When account creation starts from the Code product flow, send a welcome email whose CTA points to the Code entrypoint instead of the workspace default.

## Scope

- Pass signup redirect intent (`next`) through verification email links.
- Forward redirect intent to `/api/auth/verify` and `/api/auth/resend-verification`.
- Flag welcome-email destination as Code when redirect intent is Code-related (`/billing`, `/offers/code`, `/setup-cli`).
- Use Code-specific welcome copy/subject for Code-origin verifications.
- Keep existing default welcome destination for non-Code flows.

## Out of Scope

- Any billing entitlement or subscription state changes.
- Broad email redesign beyond the scoped Code-vs-default welcome variant.
- Infrastructure/domain changes.

## Verification

1. Register from Code flow and verify email from the received link.
2. Confirm welcome email CTA goes to the Code domain (`code.*` in envs using `app.*` hosts).
3. Register from non-Code flow and confirm welcome email CTA stays on default app destination.
4. Trigger resend verification and confirm the redirect intent is preserved.
