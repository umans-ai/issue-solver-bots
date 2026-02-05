# Umans Code: Dashboard API Keys

This spec describes how the Umans Code dashboard (conversational-ui) lets authenticated users create/list/revoke their own API keys for the Umans Code gateway (llm-gateway) without ever exposing the gateway admin credential to the browser.

## Goals

- Self-serve API keys from the dashboard.
- Never store plaintext keys in the dashboard database.
- Keep the gateway admin token server-only.

## Non-goals

- Enforcement of plan limits in the dashboard UI (enforcement happens in the gateway).
- Team keys / RBAC / key rotation UX.

## Architecture

### High-level flow

- Browser calls dashboard routes under `/api/keys`.
- Dashboard server routes call the gateway `/admin/keys` endpoints using `CODE_GATEWAY_ADMIN_TOKEN`.
- Dashboard stores only key metadata (prefix + ids) linked to the authenticated user.

### Data model (dashboard DB)

- Table: `GatewayApiKey`
  - `userId` (UUID; references `User.id`)
  - `gatewayKeyId` (UUID; gateway key id)
  - `keyPrefix` (string)
  - `createdAt`, `revokedAt`

Plaintext `key` is never persisted.

### Dashboard API routes

- `GET /api/keys`
  - Auth required.
  - Returns the current user's key metadata.

- `POST /api/keys`
  - Auth required.
  - Requires an "active" pledge (status is not `canceled` or `expired`).
  - Calls gateway: `POST {CODE_GATEWAY_URL}/admin/keys` with body `{ owner_user_id, policy }`.
  - Returns `{ id, key, key_prefix }` (plaintext `key` shown once).

- `DELETE /api/keys/{gatewayKeyId}`
  - Auth required.
  - Ownership enforced via `GatewayApiKey.userId`.
  - Calls gateway: `DELETE {CODE_GATEWAY_URL}/admin/keys/{gatewayKeyId}`.
  - Marks the dashboard record revoked.

## Configuration

Dashboard server-only env vars:

- `CODE_GATEWAY_URL`
- `CODE_GATEWAY_ADMIN_TOKEN`

Deployment wiring (Terraform `operations/02-deploy`):

- Variables:
  - `code_gateway_url`
  - `code_gateway_admin_token`
- App Runner env:
  - `CODE_GATEWAY_URL = var.code_gateway_url`
  - `CODE_GATEWAY_ADMIN_TOKEN = var.code_gateway_admin_token`

## Security

- The gateway admin token is never sent to the browser (only used in server routes).
- Plaintext keys are returned once to the browser and are never stored in the dashboard DB.

## Verification

- Preview:
  - Log into the preview app.
  - Go to Billing -> API keys.
  - Create a key, copy it, and verify it works against the gateway `/v1/messages` endpoint.
  - Revoke the key and verify the gateway rejects it.
