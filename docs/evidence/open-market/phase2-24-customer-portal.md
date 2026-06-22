# Phase 2 Item 24 - Fully Automated Customer Portal

Status: PASS
Checked at UTC: 2026-06-22T08:57:39Z
Git HEAD checked: bbb0746a2

## Scope

This evidence covers self-service customer billing management after checkout.

## Verified behavior

- Dashboard exposes Manage subscription when Stripe customer linkage exists.
- Manage subscription posts to /api/v1/checkout/portal.
- Portal route requires same-origin request validation.
- Portal route rate-limits the request path.
- Portal route requires signed-in customer context.
- Portal route requires a linked Stripe customer id.
- Portal route creates a Stripe-hosted billing management link.
- Portal route redirects the customer to Stripe-hosted billing management.
- Dashboard copy explains that cancellation, plan changes, payment-method changes, and invoices are handled through Stripe Customer Portal.
- Dashboard copy explains that billing management becomes available after checkout links a Stripe customer.

## Verification performed

- Updated stale portal route test that still expected portal-disabled behavior.
- Targeted portal and dashboard tests passed.
- Commit bbb0746a2 added active Customer Portal route coverage.
- Working tree was clean before this evidence was created.

## Result

PASS.

Customer self-service billing management is implemented through Stripe-hosted billing management and exposed from the dashboard after Stripe customer linkage exists.
