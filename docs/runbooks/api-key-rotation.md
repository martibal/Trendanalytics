# API Key Rotation Runbook

## Purpose

This runbook describes how to respond when an Urd Atlas API key is exposed, suspected to be compromised, no longer needed, or must be rotated for customer support or security reasons.

## Use this runbook when

- A customer pasted or exposed a full API key in chat, email, screenshot, ticket, or logs.
- A customer suspects that an API key has been shared, leaked, copied, or misused.
- Support needs to revoke an old key and ask the customer to create a new one.
- A key should no longer be active because the customer canceled, refunded, downgraded, or changed plan.
- API traffic, rate-limit behavior, or audit logs suggest unexpected use.

## Safety rules

- Never ask a customer to send a full API key.
- Never paste a full API key into chat, tickets, commits, screenshots, or logs.
- If a full API key is exposed, treat it as compromised.
- Revoke exposed keys instead of trying to hide or redact them afterward.
- Ask the customer to create a new key after revocation.
- Use only the visible prefix, suffix, creation time, account email, or dashboard metadata to identify a key.
- Do not send API keys by email.
- Do not store API keys in local notes, spreadsheets, or support documents.

## Step 1 — Identify the key

Identify the API key without asking for or displaying the full secret.

Use one or more of:

- Customer account email.
- API key prefix or visible suffix shown in the dashboard.
- Key creation time.
- Key label or description, if available.
- Last-used timestamp.
- Recent API request logs or audit trail entries.

If the customer has multiple keys and the exposed key cannot be identified safely, revoke all keys that may have been exposed and ask the customer to create a new one.

## Step 2 — Revoke the key

Revoke the exposed or compromised API key from the account dashboard or admin/database tooling.

Before revocation, document:

- Customer email.
- Key prefix or safe key identifier.
- Reason for revocation.
- Time of revocation.
- Whether the customer was asked to create a replacement key.

After revocation, the old key must no longer authorize API requests.

If revocation cannot be completed through the dashboard, use the database/admin path only after documenting the intended change.

## Step 3 — Create or request a replacement key

After revocation, the customer should create a new API key from the dashboard.

Tell the customer:

- The old key has been revoked.
- They should create a new key from the dashboard.
- The full new key is shown only once and must be stored securely.
- They should update their scripts, clients, or integrations to use the new key.
- They should use the X-API-Key header.

Do not create or transmit a replacement key by email unless the product has a secure key-delivery flow that explicitly supports it.

## Step 4 — Verify rotation

After revocation and replacement, verify:

- The revoked key no longer authorizes API requests.
- The replacement key authorizes a file that should be allowed by the customer's plan.
- The replacement key is denied for chains or windows outside the customer's plan.
- The key last-used timestamp or audit trail updates after a successful request.
- The dashboard shows the expected active/revoked state.

Use X-API-Key for verification. Authorization Bearer is not the documented API authentication method.

## Incident and audit trail

For every key rotation or revocation, record:

- Customer email.
- Safe key identifier, never the full key.
- Reason for rotation or revocation.
- Who performed the action.
- Time the old key was revoked.
- Whether a replacement key was created.
- Verification result for old key and replacement key.
- Any related support ticket, Stripe customer, or account reference.

If suspicious usage is found, preserve relevant request timestamps and paths, but do not copy full keys into the incident record.

## Completion checklist

- [ ] Key was identified without exposing the full secret.
- [ ] Reason for rotation or revocation was documented.
- [ ] Exposed or compromised key was revoked.
- [ ] Customer was told to create a replacement key.
- [ ] Customer was reminded that the full new key is shown only once.
- [ ] Customer was told to use X-API-Key.
- [ ] Old key no longer authorized API requests.
- [ ] Replacement key worked for an allowed file, if tested.
- [ ] Replacement key was denied for out-of-plan access, if tested.
- [ ] Incident/audit record contains no full API keys.
