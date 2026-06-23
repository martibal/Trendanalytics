# Automated refund workflow design

Status: Design-ready. Current production posture remains operator-approved refund handling through the billing provider.

## Purpose

Refund handling affects money, access state, customer expectations, and support traceability.

The safe automation goal is not to let software issue refunds without review. The safe automation goal is to make approved refunds traceable and to verify that access state does not remain active when it should stop.

## Current state

The current product already has refund-adjacent controls:

- customer refund runbook
- customer cancellation runbook
- paid-but-no-access runbook
- webhook recovery runbook
- API access revoke evidence
- cancellation and refund checks in live-readiness evidence
- customer portal for self-service billing management
- webhook sync for subscription cancellation and update events
- admin reconciliation dashboard design
- SOC2-style process documentation

The current product does not include a fully automated refund approval and remediation system.

## Product boundary

Refunds must remain a controlled operational action unless a later policy explicitly approves automation.

Do not implement:

- automatic refund approval
- automatic refund issuance
- automatic customer compensation
- automatic entitlement extension as refund substitute
- silent access reactivation after refund

Allowed automation:

- detect refund-related billing events
- record safe refund metadata
- classify whether access should be reviewed
- verify dashboard and delivery state after refund
- create an operator review task
- show a customer-safe status message
- produce support evidence

## Refund workflow states

A future workflow should use explicit states:

- requested
- needs_review
- approved
- denied
- processed
- access_review_required
- access_verified
- closed

A refund request should never skip directly from requested to processed without an approval record unless a signed policy explicitly allows that path.

## Required workflow

### 1. Intake

Capture:

- customer account reference
- support request reference
- reason category
- whether cancellation is also requested
- whether duplicate charge is alleged
- whether service failure is alleged
- request timestamp

Do not capture payment instrument data.

### 2. Billing lookup

Operator or future workflow verifies:

- customer exists in billing provider
- successful charge or invoice exists
- refund already exists or does not exist
- active subscription exists or does not exist
- cancellation state is understood

### 3. Urd Atlas state lookup

Verify:

- account exists
- subscription row exists
- entitlement tier and scope
- active access values
- recent delivery usage if needed
- dashboard state

### 4. Decision

Allowed outcomes:

- refund denied
- refund approved
- cancellation only
- duplicate-charge refund
- immediate cancellation plus refund
- refund while keeping access until period end, only if explicitly approved

Decision evidence must include:

- approver
- reason
- billing reference
- account reference
- expected access result

### 5. Processing

Refund processing remains inside the billing provider until a later approved automation exists.

After processing, record:

- refund reference
- amount and currency
- processed time
- processor
- associated charge or invoice reference
- cancellation timing

### 6. Post-refund access verification

Verify:

- refund did not re-enable entitlement
- active access state matches cancellation policy
- if immediate cancellation applies, paid file delivery is blocked
- if period-end access remains approved, access still matches the paid period
- dashboard displays expected state

### 7. Closure

Close only when:

- refund decision is documented
- billing state is verified
- Urd Atlas subscription state is verified
- access behavior is verified
- customer reply is sent if applicable

## Event handling model

A future event listener may observe refund-related provider events.

Safe event handling should:

- record event id, type, created time, and processing status
- avoid storing raw provider payload bodies in ordinary evidence
- mark account for access review
- avoid issuing a second refund
- avoid changing entitlement without a policy decision
- link to refund runbook and reconciliation dashboard

## Automation tiers

### Tier 0 â€” Manual with documented verification

Current safe state.

- refunds processed through billing provider
- refund runbook used
- entitlement verified manually
- evidence retained

### Tier 1 â€” Assisted automation

Recommended first implementation.

- refund event observed
- review task created
- safe metadata stored
- dashboard shows access verification checklist
- no automatic refund issuance

### Tier 2 â€” Policy-driven automation

Only later.

- low-risk duplicate-charge cases may be auto-classified
- automatic processing requires explicit policy
- every action is audit logged
- customer notification is templated
- access verification still runs

### Tier 3 â€” Fully automated remediation

Only after proven operational maturity.

- automatic refund and access action
- rollback path
- event replay protection
- operator override
- rate and abuse controls
- formal evidence retention

## Data model proposal

Suggested future records:

### RefundCase

- id
- account id
- billing customer reference
- billing subscription reference
- status
- reason category
- requested at
- decided at
- processed at
- closed at
- decision
- expected access result
- operator reference

### RefundEvent

- id
- provider event reference
- event type
- received at
- processed at
- status
- linked refund case id
- failure code

### RefundAccessCheck

- id
- refund case id
- checked at
- subscription status
- entitlement status
- active access count
- delivery check result
- dashboard check result
- reviewer

## Dashboard requirements

The future admin reconciliation dashboard should show:

- open refund cases
- refund events needing review
- refund cases with active access still present
- refund cases where subscription state and entitlement disagree
- refund cases with failed event processing
- refund cases closed without access verification

## Customer communication requirements

Customer replies must avoid promising results before review.

Allowed messages:

- refund request received
- refund approved
- refund denied under terms
- refund processed through billing provider
- access status after cancellation or refund
- expected billing provider processing time, if known from provider documentation

Do not promise:

- guaranteed processing time
- refund before review
- access extension unless approved
- compensation beyond approved refund

## Testing requirements

Before enabling assisted automation, test:

- refund event creates review state
- duplicate event does not duplicate review state
- processed refund cannot re-enable access
- immediate cancellation plus refund blocks paid delivery
- period-end access remains only when approved
- denied refund does not change access
- customer-facing messages do not include provider payloads
- operator evidence excludes payment instrument data
- failed event processing is visible in reconciliation
- replayed event is idempotent

## Acceptance criteria

This item is ready when all are true:

- current refund runbook is inventoried
- cancellation and refund are documented as separate actions
- post-refund access verification is documented
- future automation states are documented
- automatic refund issuance is gated behind explicit policy
- event-handling boundary is documented
- evidence file records the design decision
- temporary inventory file is not committed

## Decision

Automated refund workflow is design-ready.

Current production behavior should remain operator-approved. A future implementation should begin with assisted automation and post-refund access verification, not automatic refund issuance.
