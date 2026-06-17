# Production Alerts and Observability Runbook

## Purpose

This runbook defines the first production alert and observability checks for Urd Atlas.

Use this runbook to detect production failures early, triage them consistently, and route each alert to the correct recovery runbook.

## Scope

This runbook covers alerting for:

- Stripe webhook failures.
- API server failures.
- Authenticated API access failures.
- Rate-limit spikes.
- Daily pipeline failures.
- Stale or missing published data.
- Production database migration drift.
- Unexpected entitlement or subscription mismatch.

## Safety rules

- Do not paste secrets into alerts, logs, tickets, screenshots, or commits.
- Do not include full API keys in alert payloads.
- Do not include Stripe webhook secrets, database URLs, Supabase credentials, Clerk secrets, or Vercel secrets.
- Alert payloads should use safe identifiers only: route, status code, timestamp, event type, account-safe ID, safe key prefix/suffix, chain, genre, and window.
- Alerts should point to runbooks, not contain operational secrets.
- Alerts should distinguish expected lag from actual data failure.

## Minimum alert set

The first production alert set should include:

| Alert | Trigger | Route to |
|---|---|---|
| Stripe webhook 500 | Production webhook returns 500 | Stripe Webhook 500 Runbook |
| Stripe webhook delivery failure | Stripe reports failed delivery | Stripe Webhook 500 Runbook |
| API 5xx spike | Authenticated file API returns repeated 5xx | API 401 and 403 Runbook, then relevant incident runbook |
| API 401 spike | Sudden rise in 401 responses | API 401 and 403 Runbook |
| API 403 spike | Sudden rise in 403 responses | API 401 and 403 Runbook |
| API 429 spike | Sudden rise in 429 responses | API 429 Rate Limit Runbook |
| Daily pipeline failed | Pipeline exits non-zero or fails expected stage | Daily Pipeline Failure Runbook |
| Published data stale | Production as-of exceeds expected lag policy | Data Stale or Missing Runbook |
| Missing published file | Expected production artifact returns 404 | Data Stale or Missing Runbook |
| Migration drift | Production migration status is not up to date | Production Migration Runbook |

## Alert 1 — Stripe webhook 500

Trigger when:

- `/api/v1/stripe/webhook` returns 500 in production.
- Stripe Workbench shows failed delivery for a production event.
- The same event fails repeatedly.
- Vercel logs show an exception in the Stripe webhook route.

Alert payload should include:

- Timestamp.
- Environment.
- Route.
- HTTP status.
- Stripe event type.
- Stripe event ID, if safe and available.
- Vercel request ID, if available.
- Short error class or summary.
- Link or reference to Stripe Webhook 500 Runbook.

Do not include webhook secrets or full customer payment details.

## Alert 2 — API 5xx

Trigger when:

- Authenticated file API returns repeated 500-level responses.
- Multiple customers see API server errors.
- One route begins failing after deploy.

Alert payload should include:

- Timestamp.
- Environment.
- Route pattern.
- HTTP status.
- Chain.
- Genre.
- Window.
- Deployment or commit, if available.
- Short error class or summary.
- Link or reference to the relevant runbook.

If the failure is authentication or entitlement-specific, use the API 401 and 403 Runbook.

If the failure is stale/missing data, use the Data Stale or Missing Runbook.

## Alert 3 — API 401 / 403 spike

Trigger when:

- 401 responses rise above expected baseline.
- 403 responses rise above expected baseline.
- Many customers fail on the same chain, genre, or window.
- A deploy changes authentication or entitlement behavior.

Alert payload should include:

- Timestamp.
- Environment.
- Route pattern.
- Status code.
- Count and time window.
- Chain, genre, and window.
- Safe key identifier only if needed.
- Account-safe identifier only if needed.
- Link or reference to API 401 and 403 Runbook.

Do not include full API keys.

## Alert 4 — API 429 spike

Trigger when:

- 429 responses rise above expected baseline.
- One key or account generates abnormal request volume.
- Many customers are rate limited unexpectedly.
- Rate-limit storage or logic appears unhealthy.

Alert payload should include:

- Timestamp.
- Environment.
- Route pattern.
- Count and time window.
- Safe key identifier, if scoped to one key.
- Account-safe identifier, if scoped to one account.
- Chain, genre, and window.
- Link or reference to API 429 Rate Limit Runbook.

Do not include internal thresholds unless they are intentionally public.

## Alert 5 — Daily pipeline failure

Trigger when:

- Pipeline exits non-zero.
- Pipeline fails any expected stage.
- Pipeline does not create expected output.
- Pipeline does not run by the expected operational window.
- Publish step fails.

Alert payload should include:

- Timestamp.
- Pipeline run ID or safe run reference.
- Stage that failed.
- Chain.
- Genre.
- Date range.
- First error summary.
- Last successful stage.
- Link or reference to Daily Pipeline Failure Runbook.

Do not include secrets or raw credentials from environment variables.

## Alert 6 — Published data stale

Trigger when production data exceeds expected lag policy.

Initial lag policy:

- Bitcoin and Ethereum should normally be near-daily.
- Base and Arbitrum may lag by about one week because upstream delivery is slower.

Alert payload should include:

- Timestamp.
- Chain.
- Genre.
- Expected as-of.
- Actual as-of.
- Observed lag days.
- Expected lag policy.
- Production URL checked.
- Link or reference to Data Stale or Missing Runbook.

If observed lag is within expected policy, do not alert as a failure. Surface it as freshness context.

## Alert 7 — Missing published file

Trigger when:

- `dataset.json` references a file that returns 404.
- Manifest references a missing artifact.
- Expected latest/window file is absent.
- Authenticated API returns 404 for a file that should exist.

Alert payload should include:

- Timestamp.
- Public or API path.
- Chain.
- Genre.
- Window.
- Whether the path is public or authenticated.
- Dataset/index reference that pointed to the file, if available.
- Link or reference to Data Stale or Missing Runbook.

## Alert 8 — Migration drift

Trigger when:

- Production `npx prisma migrate status` is not up to date.
- A production route fails because a table, column, or index is missing.
- A migration exists in code but has not been applied to production.
- Manual SQL was used and Prisma migration history may not match production.

Alert payload should include:

- Timestamp.
- Environment.
- Migration name, if known.
- Failing route, if any.
- Error summary.
- Link or reference to Production Migration Runbook.

Do not include database URLs or credentials.

## Initial monitoring cadence

Until automated alerting is fully implemented, use manual or scheduled checks:

- Stripe webhook health: daily and after billing deployments.
- API 5xx/401/403/429: daily and after API deployments.
- Pipeline status: after every scheduled pipeline run.
- Published data freshness: daily.
- Migration status: before and after any production schema change.
- Entitlement/customer access: after billing, webhook, or auth changes.

## Incident routing

Use this routing table:

| Observation | Primary runbook |
|---|---|
| Stripe webhook returns 500 | Stripe Webhook 500 |
| Customer paid but no access | Paid but No Access |
| API 401 or 403 | API 401 and 403 |
| API 429 | API 429 Rate Limit |
| API key exposed | API Key Rotation |
| Data stale or missing | Data Stale or Missing |
| Pipeline failed | Daily Pipeline Failure |
| Migration missing | Production Migration |
| Customer cancellation issue | Customer Cancellation |
| Customer refund issue | Customer Refund |

## Verification after alert resolution

After resolving an alert, verify:

- The triggering condition no longer occurs.
- Production route returns expected status.
- Dashboard or API state matches expected entitlement.
- Published data freshness and lag are explicit.
- Customer-facing behavior is correct.
- Related runbook checklist is completed.
- Incident record contains no secrets.

## Completion checklist

- [ ] Minimum alert set was reviewed.
- [ ] Stripe webhook 500 alert was defined.
- [ ] API 5xx alert was defined.
- [ ] API 401/403 spike alert was defined.
- [ ] API 429 spike alert was defined.
- [ ] Daily pipeline failure alert was defined.
- [ ] Published data stale alert was defined.
- [ ] Missing published file alert was defined.
- [ ] Migration drift alert was defined.
- [ ] Alert payload safety rules exclude secrets and full API keys.
- [ ] Each alert routes to a recovery runbook.
- [ ] Manual monitoring cadence is documented until automation exists.
