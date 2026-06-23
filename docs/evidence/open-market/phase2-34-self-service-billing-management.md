# Phase 2 item 34 â€” Full self-service billing management

Status: Complete for the current single-account subscription product.

## Readiness item

Full self-service billing management.

## Current-state finding

The repository already includes the main billing-management controls:

- checkout readiness evidence
- active billing copy evidence
- authenticated customer portal route
- dashboard Manage subscription entry point
- customer portal evidence
- same-origin and rate-limit protection around billing routes
- Stripe webhook boundary evidence
- subscription and entitlement support runbooks
- cancellation and refund runbooks
- admin reconciliation dashboard design
- automated refund workflow design

## Implemented self-service model

The current product uses Stripe-hosted customer billing management.

The dashboard exposes billing management after checkout links the account to a billing customer record. The portal route requires authenticated customer context, validates the request boundary, creates a provider-hosted portal session, and redirects the customer to billing management.

## Supported customer actions

The portal model supports customer billing management through the billing provider, including the configured provider actions for:

- payment method management
- invoice access
- cancellation
- plan changes where configured
- billing details maintained by the provider

## Product boundary

Urd Atlas does not expose payment instrument details, raw billing-provider payloads, or full operational logs inside the product.

The billing provider remains the source of truth for hosted billing-management actions.

## Fallback paths

If self-service billing fails or billing state and account state disagree, operators should use:

- customer cancellation runbook
- customer refund runbook
- paid-but-no-access runbook
- Stripe webhook recovery runbook
- admin reconciliation dashboard design

## Implemented document

- docs/product/self-service-billing-management.md

## Verification

Local validation performed:

- repository search confirmed active checkout and billing portal evidence
- repository search confirmed dashboard Manage subscription and customer portal evidence
- repository search confirmed cancellation, refund, and webhook fallback runbooks
- product document created
- evidence file created
- temporary inventory file removed before commit
- sensitive-pattern scan returned no findings
- diff check returned no errors

## Result

Phase 2 item 34 is complete.

The current single-account subscription product has full self-service billing management through the provider-hosted portal, with documented operational fallback paths.
