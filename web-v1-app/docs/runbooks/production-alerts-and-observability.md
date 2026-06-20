# Production alerts and observability runbook

Status: active
Owner: operator
Applies to: Urd Atlas production monitoring, alert review, and incident routing

## Purpose

This runbook defines alert coverage and explicit review processes for launch-critical production failures.

An alert path may be automated, manual, or provider-dashboard based, but every launch-critical failure class must have a defined detection method, owner, review cadence, and recovery path.

## Alert coverage table

| Failure class | Detection | Alert target | Runbook / recovery path | Verified |
|---|---|---|---|---|
| Stripe webhook 500 | Stripe Workbench Events, Stripe Workbench Logs, webhook delivery status | Operator | Stripe Workbench review, replay failed events only after underlying issue is fixed | Yes - manual Workbench review completed |
| Checkout route 500 | Stripe checkout-start test, Vercel function logs, customer report | Operator | Check Vercel logs, Stripe session creation, auth state, and environment variables | Yes - checkout redirect tested after fix |
| Billing portal 500 | Dashboard portal button test, Vercel function logs, customer report | Operator | Check portal route, Stripe customer mapping, and Stripe environment configuration | Manual review required during support case |
| API file delivery 500 | API smoke test, production healthcheck, Vercel function logs, customer report | Operator | Check API route logs, storage path, entitlement lookup, and dataset availability | Covered by production healthcheck path |
| Stale or missing data | Production healthcheck, dataset as-of review, dashboard freshness indicators | Operator | Use stale/missing data recovery process and verify dataset publication state | Covered by production healthcheck path |
| Vercel deployment failure | GitHub Actions workflow result, Vercel deployment status, production healthcheck | Operator | Use Vercel deployment logs, rollback or hotfix decision path | Covered by deployment workflow review |
| Supabase/database connection failure | Production healthcheck, Vercel logs, provider dashboard, failed DB-backed routes | Operator | Check provider status, database connectivity, Prisma errors, and fallback customer messaging | Manual/provider review required |
| Stripe checkout misconfiguration | Checkout route response, Stripe Dashboard products/prices, billing launch gate | Operator | Verify live price IDs, live key mode, checkout route, and plan metadata | Covered by checkout tests |
| API quota/rate-limit failure | API response status, Vercel logs, Upstash dashboard if configured | Operator | Verify rate-limit backend, quota counters, and expected 429 behavior | Manual review required |
| Authentication/session failure | Dashboard login flow, Clerk dashboard, Vercel logs, customer report | Operator | Verify auth provider status, callback URLs, and account linkage | Covered by dashboard/incognito checks |

## Minimum review cadence

| Surface | Cadence before public launch | Cadence after public launch |
|---|---|---|
| Production healthcheck | Before each launch decision and after relevant deploys | Daily or after deploys |
| Stripe Workbench Events/Logs | Before launch and after checkout/webhook changes | Daily during first launch week, then weekly or after incidents |
| Vercel deployments/logs | After each deployment | After each deployment and on customer reports |
| Dataset freshness/as-of | Before launch and after pipeline runs | Daily after pipeline runs |
| Database/provider dashboard | Before launch and after migration/billing changes | On incident or billing/account anomalies |

## Operator response rules

1. Treat checkout, billing portal, subscription sync, entitlement, API delivery, and stale data failures as launch-critical.
2. Do not assume a historical 500 is resolved unless a later clean test proves the current path is healthy.
3. Do not paste secrets, browser authentication material, customer identifiers, checkout redirect URLs, webhook payloads, or provider correlation identifiers into evidence.
4. Record only sanitized evidence: failure class, timestamp window, surface, status, decision, and recovery action.
5. Escalate from manual review to incident handling if the same failure class repeats or affects a paying customer.

## Current verified alert/review coverage

- Production healthcheck exists and is used as a launch gate.
- Stripe Workbench Events and Logs were reviewed for current unresolved 500-class failures.
- Checkout redirect was tested after the mobile checkout fix.
- Dashboard and API entitlement states were tested through live checkout, cancellation, and API-key revocation.
- Incognito/new-browser behavior was tested for unauthenticated public, dashboard, checkout, and sign-in-return flows.

## Evidence requirements

Each alert or review evidence file should record:

- date/time UTC,
- failure class,
- detection source,
- result,
- whether the issue is current or historical,
- whether customer access is affected,
- action taken,
- follow-up owner,
- secret scan result.

Evidence must not include raw provider secrets, database URLs, browser authentication material, full API keys, raw Stripe webhook payloads, full customer IDs, or checkout redirect URLs.

## Related runbooks

- docs/runbooks/production-migrations.md
- docs/stripe-webhook-deployment-runbook.md
- docs/stripe-webhook-operational-verification.md
- docs/billing-launch-checklist.md

## Completion criteria

This alert coverage runbook is complete when every launch-critical failure class has a detection source, alert target, recovery path, and verification status.

