# Admin reconciliation dashboard design

Status: Design-ready. Not enabled in the current production product.

## Purpose

The admin reconciliation dashboard is the internal operator surface for comparing billing, subscription, entitlement, API access, and delivery evidence.

It must not be implemented as a partially protected public page. It requires a first-class admin authorization model before it is exposed.

## Current state

The current production product already has several reconciliation inputs:

- checkout session creation
- customer portal session creation
- Stripe webhook subscription sync
- webhook replay tracking
- account-linked subscription rows
- account-linked API access rows
- authenticated file delivery audit events
- dashboard account state
- public status and data freshness pages

The current product does not have a dedicated admin reconciliation dashboard.

## Decision

Do not add a production admin dashboard until admin authorization is explicit.

A full admin dashboard must be protected by:

- allowlisted admin identities or an equivalent operator role
- server-side authorization
- no client-side-only protection
- no public indexing
- no cacheable customer/account views
- redacted customer and billing identifiers by default
- explicit audit logging for admin views and actions

## Reconciliation goals

The dashboard should answer:

- Which account owns the subscription?
- Which billing customer is linked to the account?
- Which subscription is current?
- Which plan and entitlement are active?
- Which API access values are active or revoked?
- Which API access values have recent delivery usage?
- Which webhook events changed subscription state?
- Which billing portal actions may have changed customer state?
- Which accounts have mismatched billing and entitlement state?
- Which accounts need support follow-up?

## Required dashboard sections

### 1. Account lookup

Inputs:

- account id
- auth provider user id
- billing customer id
- billing subscription id
- email lookup if available through the authenticated account source

Output:

- account row
- subscription rows
- API access rows
- recent audit events
- reconciliation status

### 2. Billing reconciliation

Compare:

- account subscription state
- billing customer id
- billing subscription id
- plan tier
- subscription status
- current period end
- entitlement chain
- history access flag

Flag:

- account without subscription
- subscription without account
- inactive subscription with active API access
- active subscription with suspended delivery
- plan mismatch
- missing billing customer id
- missing billing subscription id

### 3. Webhook reconciliation

Show:

- most recent webhook events
- event type
- processing status
- received time
- processed time
- failure code
- duplicate/replay handling status

Flag:

- stuck processing event
- repeated failure
- subscription update not reflected in account state
- deletion event that did not revoke access
- missing event for expected billing state change

### 4. API access reconciliation

Show:

- prefix and last four only
- status
- created time
- last used time
- revoked time
- creating account if available

Flag:

- active access without active subscription
- revoked access with recent usage
- excessive active access count
- stale access values that should be rotated
- delivery usage without entitlement

### 5. Delivery usage reconciliation

Show:

- recent file-delivery audit events
- request id
- account id
- chain
- genre
- window
- response status
- latency bucket
- rate-limit or quota result

Flag:

- repeated forbidden responses
- repeated not found responses
- quota exceeded
- unexpected window request
- entitlement mismatch

### 6. Support action log

Show:

- operator notes
- support status
- customer-reported issue
- reconciliation finding
- next action
- reviewed at

This should be a structured admin-only record, not free-form customer data collection.

## Redaction rules

The dashboard must never display:

- full API access values
- key hashes
- billing-provider payload bodies
- raw webhook bodies
- full browser session data
- full request headers
- unbounded operational logs

Default visible identifiers should be shortened or booleanized when full values are not needed.

## Admin actions

Allowed initial actions:

- mark reconciliation reviewed
- add operator note
- copy safe account identifier
- link to runbooks

Do not add these actions until role control and audit logging exist:

- manually change subscription state
- manually change plan tier
- manually revoke API access
- manually grant entitlement
- issue refund
- resend onboarding email
- retry webhook event

## Audit logging requirements

Every admin dashboard access should record:

- admin actor id
- viewed account id or billing customer reference
- action
- timestamp
- request id
- outcome

Every admin mutation should record:

- before state
- after state
- reason
- linked support note or incident id
- admin actor id
- timestamp

## Safety model

The dashboard is read-only first.

The first implementation should not mutate customer state. It should only help the operator see inconsistencies and decide which runbook to follow.

Mutation support should be added only after:

- role model exists
- admin audit log exists
- support-action reason is required
- rollback path is documented
- tests cover every mutation

## Minimum implementation phases

### Phase A â€” Design and evidence

- document data sources
- document reconciliation checks
- document redaction rules
- document admin authorization requirement
- document mutation exclusion

### Phase B â€” Read-only local/admin prototype

- server-only admin route
- allowlisted operator check
- no-store response
- account lookup
- subscription/API access summary
- webhook event summary
- audit event summary

### Phase C â€” Production read-only dashboard

- hardened admin auth
- audit logging for views
- safe search
- pagination
- status flags
- no mutation controls

### Phase D â€” Controlled admin actions

- reviewed marker
- operator notes
- support action linking
- later manual remediation only if required

## Acceptance criteria

A full admin reconciliation dashboard is ready only when all are true:

- admin authorization exists server-side
- no unauthenticated access path exists
- responses are no-store
- dashboard is excluded from public navigation
- full access values are never displayed
- billing-provider raw payloads are never displayed
- webhook body storage is not exposed
- dashboard displays account, subscription, API access, webhook, and delivery usage reconciliation
- every view is audit logged
- mutations are absent or separately role-gated and audit logged
- tests cover unauthorized access, authorized read, redaction, and reconciliation flags
- runbook links are present for each flag type

## Current launch posture

The current open-market launch remains acceptable without a production admin dashboard because:

- customer portal exists for self-service billing
- webhook sync exists for subscription state
- API access is account-scoped
- usage dashboard exists for the customer view
- operational runbooks exist for support and recovery

The admin reconciliation dashboard should be built before scaling support load, adding team accounts, or offering enterprise operational guarantees.
