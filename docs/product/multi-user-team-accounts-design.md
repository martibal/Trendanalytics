# Multi-user and team accounts design

Status: Design-ready. Not enabled in the current production product.

## Purpose

The current product is a single-account subscription product. Multi-user and team accounts must not be introduced by asking customers to share logins or access values.

This document defines the target model before implementation.

## Current state

Current production behavior is account-scoped:

- one authenticated user resolves to one account
- subscriptions are linked to an account
- API access values are linked to an account
- dashboard usage is shown for the linked account
- support and billing traceability use account, subscription, and API key records

This is acceptable for single-user subscriptions.

## Product decision

Team accounts require a real team model before they are sold or enabled.

Do not support teams by:

- shared logins
- shared access values
- manually copying account records
- reusing one personal API key across a team
- adding billing seats without team ownership rules
- adding invitation emails without role and audit semantics

## Target domain model

### Team

Represents the commercial and operational workspace.

Suggested fields:

- id
- displayName
- status
- createdAt
- updatedAt

### TeamMembership

Connects an account to a team.

Suggested fields:

- id
- teamId
- accountId
- role
- status
- createdAt
- updatedAt

Suggested roles:

- owner
- admin
- billing
- developer
- viewer

### TeamInvitation

Represents an invitation that has not yet been accepted.

Suggested fields:

- id
- teamId
- invitedEmail
- invitedByAccountId
- role
- tokenHash
- status
- expiresAt
- acceptedAt
- createdAt
- updatedAt

### TeamSubscription

Links billing entitlement to a team.

Suggested fields:

- id
- teamId
- stripeCustomerId
- stripeSubscriptionId
- tier
- status
- entitledChain
- historyUnlocked
- seatLimit
- currentPeriodEnd
- createdAt
- updatedAt

### TeamApiKey

Team-owned API access values.

Suggested fields:

- id
- teamId
- createdByAccountId
- label
- keyHash
- keyPrefix
- keyLast4
- status
- lastUsedAt
- createdAt
- revokedAt

## Permission model

Owner:

- manage team settings
- manage billing
- invite members
- remove members
- create and revoke team API access values
- view team usage

Admin:

- invite members except owner
- remove non-owner members
- create and revoke team API access values
- view team usage

Billing:

- manage billing
- view plan and invoices
- no API key creation by default

Developer:

- create team API access values if enabled by team policy
- view own created keys
- view API docs and usage

Viewer:

- read dashboard and docs
- no billing changes
- no API access value creation

## API key ownership rules

Team API access values must belong to the team, not to a shared user.

Required behavior:

- every team key records the creating account
- key prefix and last4 are display-only identifiers
- full access value is shown only once when created
- revoked keys cannot be reactivated
- member removal does not expose existing values
- owner/admin can revoke any team key
- audit logs record actor account and team id

## Usage dashboard rules

Team usage dashboard should aggregate by team.

Required fields:

- team total requests today
- daily quota
- remaining quota estimate
- rate-limit tier
- last used time
- recent status summary
- per-key display rows with prefix and last4 only
- no full access values

## Billing rules

Billing entitlement should attach to the team.

Required behavior:

- team plan controls team access
- seat count controls membership count
- cancelling the subscription suspends team API delivery
- plan downgrade updates chain/window entitlement
- billing role can manage billing without broad API privileges

## Migration plan

When implemented, migration should use this sequence:

1. Add team tables without changing current user behavior.
2. Create one default team per existing account.
3. Make the existing account the owner of that default team.
4. Attach existing subscriptions to the default team.
5. Attach existing API keys to the default team while preserving account ownership metadata.
6. Update dashboard reads to use default team context.
7. Add team switcher only after default-team reads are stable.
8. Add invitations and role management.
9. Add team usage dashboard.
10. Add team billing and seat controls.
11. Run compatibility tests for all existing single-account customers.

## Acceptance criteria before launch

Team accounts are ready only when all of these are true:

- data model exists and is migrated
- every existing account has a default team
- dashboard can read team context
- API delivery evaluates team entitlement
- team keys are scoped to a team
- role permissions are tested
- invitation flow is tested
- member removal is tested
- billing owner flow is tested
- subscription cancellation suspends team delivery
- docs explain single-user versus team accounts
- support runbook explains team issue tracing
- audit logs include actor and team context

## Explicit non-goals for current launch

The current product should not advertise team accounts as available.

Current accepted state:

- single-user accounts are supported
- team account design is documented
- implementation is deferred until the full model can be built safely

## Open implementation questions

- Whether seat billing is required at launch or can be introduced later.
- Whether developer role can create API access values by default.
- Whether API keys should be team-wide only or optionally personal-within-team.
- Whether organization support should use Clerk Organizations or an application-native team model.
- Whether team invitations should be email-based only or also account-discovery based.

## Decision

Do not implement partial team accounts.

The minimum safe path is a first-class team model with roles, invitations, team-owned API access values, team entitlement, and team usage reporting.
