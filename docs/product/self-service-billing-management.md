# Self-service billing management

Status: Implemented through Stripe-hosted customer billing management.

## Purpose

Customers must be able to manage billing without manual operator intervention after checkout has linked their account to billing-provider customer state.

The production product uses the authenticated dashboard as the customer entry point and redirects eligible customers to Stripe-hosted billing management.

## Current implementation

Self-service billing management is implemented through these surfaces:

- authenticated dashboard billing section
- Manage subscription action
- `/api/v1/checkout/portal`
- Stripe-hosted billing management session
- return URL back to the dashboard
- customer-facing copy explaining when billing management is available

## Customer capabilities

The billing management surface is intended to cover:

- payment method management
- invoice access
- receipt access where supported by the billing provider
- cancellation
- plan changes when configured in the billing provider portal
- billing details maintained by the billing provider

The exact set of customer actions is controlled by the billing provider portal configuration.

## Access requirements

The portal flow must require:

- authenticated customer session
- same-origin request validation
- pre-auth request rate limit
- linked billing customer id
- no-store response behavior
- redirect only to provider-hosted billing management or safe dashboard return URL

If the customer has no linked billing customer id, the dashboard should explain that billing management becomes available after checkout links billing state.

## Product boundary

Urd Atlas does not collect or display payment instrument data inside the application.

Billing self-service should not expose:

- full payment instrument details
- raw billing-provider payload bodies
- full operational logs
- customer API access values
- browser session material
- unrelated account records

The billing provider remains the source of truth for payment method, invoice, receipt, and hosted billing-management actions.

## Dashboard requirements

The dashboard billing section should show:

- current subscription status
- plan/tier
- entitlement scope
- billing management availability
- clear Manage subscription entry point when linked
- safe fallback copy when billing is not linked
- support guidance for cases where portal access fails

The dashboard should not imply that all billing state is edited locally.

## Error handling

Expected customer-safe states:

- not signed in
- billing not linked yet
- portal not configured
- provider portal session failed
- rate limited
- same-origin validation failed

The user-facing response should be actionable but should not expose provider internals.

## Operational fallback

If self-service billing fails, operator support should use:

- customer cancellation runbook
- customer refund runbook
- paid-but-no-access runbook
- Stripe webhook recovery runbook
- admin reconciliation dashboard design
- automated refund workflow design

Manual support must verify billing state and Urd Atlas account state before changing access.

## Verification checklist

Self-service billing management is ready when:

- dashboard exposes billing management only for eligible authenticated customers
- portal route requires signed-in customer context
- portal route requires linked billing customer id
- portal route creates a provider-hosted billing management link
- portal route redirects with no-store behavior
- customer copy explains cancellation, plan changes, payment methods, and invoices are handled through the billing provider portal
- support runbooks exist for fallback paths
- tests cover unauthenticated, unlinked, unconfigured, and successful portal session paths
- evidence records the current implementation and boundaries

## Current launch posture

The current product is ready for self-service billing management through the provider-hosted portal.

Remaining future improvements are optional:

- clearer portal-return success/failure banners
- customer-facing billing history summary on dashboard, if safe
- team billing owner role when team accounts are implemented
- reconciliation task creation when provider state and local state disagree

## Decision

Full self-service billing management is complete for the current single-account subscription product.

The customer-facing billing action remains provider-hosted, authenticated, rate-limited, and separated from local entitlement enforcement.
