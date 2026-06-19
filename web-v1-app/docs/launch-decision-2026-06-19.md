# Launch Decision Record - 2026-06-19

## Decision

Urd Atlas is cleared for soft launch / limited live testing.

This is not a full public marketing launch decision. It confirms that the production system, billing boundary, API entitlement boundary, publication integrity checks, and production health monitoring passed the required readiness gates at the time of review.

## Verified production state

- Production domain: https://www.urdatlas.com
- Production status endpoint: https://www.urdatlas.com/api/v1/status
- Production healthcheck: passed
- Route failures: 0
- Status failures: 0
- Status summary:
  - ok_count: 4
  - warn_count: 0
  - fail_count: 0
  - unknown_count: 0

## Chain freshness policy

- Bitcoin expected delay: 1 day
- Ethereum expected delay: 1 day
- Arbitrum expected delay: 8 days
- Base expected delay: 8 days

The L2 freshness policy was aligned with the product's weekly-ish data-lag model before this decision.

## Local readiness gates

The following gates passed locally before this decision:

- npm run check:launch-readiness
- npm run check:audit-gates
- npm run check:production-health

Audit gate components passed:

- Product boundary audit
- API contract audit
- Calculation correctness audit
- Publication integrity audit
- Production build

Known audit warnings were non-blocking and accepted by the audit runner.

## Billing and entitlement boundary

The production billing lifecycle was verified before this decision:

- Active subscription grants entitlement.
- API key creation is available only while entitlement is active.
- Immediate subscription cancellation removes entitlement.
- Immediate subscription cancellation auto-revokes non-revoked API keys for the account.
- Refunded payment does not leave entitlement active.

Relevant implementation commits:

- 95fc915a9 Auto revoke API keys on subscription cancellation
- fccb4e1a9 Keep Stripe webhook audit import compatibility
- 99ed406af Record verified billing launch evidence

## Observability and failure alerts

Production healthcheck and daily pipeline failure alert paths were implemented and verified.

Relevant implementation commits:

- 6758e6e20 Add daily pipeline failure issue alert
- fdfd6cdf8 Add daily pipeline failure simulation
- 2d135ca09 Add production healthcheck failure simulation
- e55a73789 Align L2 freshness policy with weekly lag

## Current production readiness conclusion

Urd Atlas may proceed to soft launch / limited live testing with controlled monitoring.

Full public launch should still require:

- Continued successful scheduled pipeline runs.
- Continued successful scheduled production healthchecks.
- No unresolved billing, entitlement, or data-publication incidents.
- Manual review of customer-facing pages after any major UI or copy change.
