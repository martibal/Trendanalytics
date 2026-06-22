# Backup and Restore Runbook

This runbook describes how to restore Urd Atlas production service after data loss, broken deployment, corrupted published artifacts, billing-state mismatch, or provider configuration loss.

## Scope

This runbook covers:

- Production database recovery.
- Stripe billing and subscription-state reconciliation.
- Published JSON artifact recovery.
- Deployment/provider configuration recovery.
- Git rollback and redeployment.
- Post-restore verification.

This runbook does not replace provider-specific backup features. Use managed backup and restore controls from the production database provider, Stripe, Vercel, GitHub, and storage providers where applicable.

## Safety rules

- Do not perform destructive production changes without a written forward-fix or rollback plan.
- Do not paste runtime values, database URLs, provider values, customer access values, webhook signing values, or private request headers into chat, tickets, commits, screenshots, or logs.
- Prefer forward recovery over manual database editing when customer billing state or entitlement state may be affected.
- Preserve the reason, timestamp, operator, affected customer or artifact scope, and verification result for every restore action.
- If there is any sign of exposed runtime values, rotate or revoke those values before declaring the restore complete.

## Recovery inventory

The restore surface is split into five independent layers.

| Layer | Source of truth | Primary recovery path | Verification |
| --- | --- | --- | --- |
| Git/source | GitHub main branch and deploy history | Revert or redeploy known-good commit | Build, audit gates, production healthcheck |
| Published JSON | `data/published/v1` and pipeline source artifacts | Rebuild or restore from Git-tracked published artifacts | Dataset contract, manifests, production file URLs |
| Database | Production database provider backup plus Prisma migrations | Provider restore or forward migration/reconciliation | Prisma status, dashboard account checks, API entitlement checks |
| Billing | Stripe dashboard and event history | Replay events or reconcile from Stripe state | Stripe state matches Urd Atlas subscription state |
| Provider config | Vercel/Stripe/Clerk/Supabase/provider dashboards | Reapply known configuration and rotate affected values | App boots, checkout works, webhook delivery works |

## Scenario 1 - Broken deployment or bad code release

Use this when production fails immediately after a code or configuration deployment.

1. Identify the last known-good commit.
2. Check whether the incident is code, environment configuration, database migration, or published data.
3. If code is the likely cause, revert the bad commit or redeploy the last known-good commit.
4. Run local verification before pushing any fix:
   - `npm run check:audit-gates:no-build`
   - targeted tests for affected routes/components
5. After deployment, verify:
   - public landing page loads
   - dashboard loads for an authenticated account
   - checkout starts
   - authenticated file delivery works for a known active entitlement
   - production healthcheck passes or only reports accepted freshness warnings

## Scenario 2 - Published JSON artifact corruption or missing data

Use this when website/API data is missing, stale, malformed, or inconsistent.

1. Follow `docs/runbooks/data-stale-or-missing.md` for diagnosis.
2. Follow `docs/runbooks/daily-pipeline-failure.md` if the daily pipeline failed.
3. Check the local published root:
   - `D:\css\main\data\published\v1`
4. Verify core files parse:
   - `data/published/v1/dataset.json`
   - `data/published/v1/contract.json`
   - affected chain/genre/window files
5. Choose the smallest safe recovery path:
   - restore known-good published artifacts from Git history
   - regenerate affected chain/genre/window files from validated source artifacts
   - rerun the full pipeline if lineage is unclear
6. Validate before publish:
   - dataset contract
   - manifests
   - latest files
   - relevant windows
7. Verify production URLs after deployment:
   - `/data/published/v1/dataset.json`
   - affected `/data/published/v1/{genre}/{chain}/latest.json`
   - affected windows

Do not manually edit published JSON as the normal restore path. If manual repair is unavoidable, document every changed file and why regeneration was not used.

## Scenario 3 - Production database restore

Use this when production database data is missing, corrupted, or inconsistent.

1. Stop and classify the incident:
   - schema issue
   - missing subscription/account rows
   - failed migration
   - unintended manual change
   - broader database loss
2. Check Prisma migration state using the production migration runbook.
3. If provider-level restore is needed:
   - identify the restore point
   - confirm expected data-loss window
   - record affected customer and entitlement scope
   - restore through the database provider controls
4. After restore, run migration status verification.
5. Reconcile billing state against Stripe:
   - active Stripe subscriptions must map to active Urd Atlas subscription state
   - canceled Stripe subscriptions must not retain active entitlement
   - refund cases must not create or extend entitlement
6. Verify at least one active and one inactive customer path if available.

Do not assume a database restore alone is enough. Stripe remains the billing source of truth and must be checked after database recovery.

## Scenario 4 - Stripe billing-state or webhook replay recovery

Use this when Stripe shows successful payment or subscription activity, but Urd Atlas state is wrong.

1. Follow `docs/runbooks/paid-but-no-access.md`.
2. Follow `docs/runbooks/stripe-webhook-500.md` if Stripe delivery failed.
3. Confirm the active webhook destination is:
   - `/api/v1/stripe/webhook`
4. Replay or resend the relevant Stripe event only after confirming the route and database schema are healthy.
5. If replay cannot repair state, perform a documented manual reconciliation from Stripe as source of truth.
6. Verify:
   - dashboard entitlement
   - API allowed request
   - API denied request for non-entitled chain/window
   - subscription state matches Stripe

## Scenario 5 - Provider configuration restore

Use this when production environment/provider configuration is missing or suspected to be wrong.

1. Identify affected provider:
   - Vercel
   - Stripe
   - Clerk
   - database provider
   - storage provider
   - rate-limit provider
2. Reapply configuration through provider dashboards or approved CLI flow.
3. Never commit real runtime values to the repository.
4. If any value may have been exposed, rotate or revoke it.
5. Verify:
   - production app boots
   - login works
   - checkout works
   - webhook delivery works
   - authenticated file delivery works
   - production healthcheck works

## Scenario 6 - Customer access-value recovery

Customer access values are not restored as plaintext.

If a customer loses or exposes an access value:

1. Revoke the affected value.
2. Create a new value through the supported dashboard/admin process.
3. Verify old value no longer works.
4. Verify new value works only for the customer entitlement.
5. Do not send full values through support channels unless the product flow is explicitly designed for one-time display.

## Minimum post-restore checklist

After any restore or rollback:

- [ ] Git status is clean.
- [ ] Relevant tests passed.
- [ ] Audit gates passed.
- [ ] Production deployment completed.
- [ ] Public page loads.
- [ ] Dashboard loads.
- [ ] Checkout starts if billing was affected.
- [ ] Stripe webhook delivery is healthy if billing was affected.
- [ ] Published dataset parses if data was affected.
- [ ] Authenticated file delivery works for an allowed request.
- [ ] Authenticated file delivery denies a non-entitled request.
- [ ] Customer-facing support reply avoids internal IDs and sensitive runtime details.
- [ ] Incident notes include cause, action, operator, timestamp, affected scope, and verification result.

## Escalation

Escalate before restore if:

- billing state and database state disagree and the correct source of truth is unclear
- restore may remove customer entitlement records
- provider-level backup restore would lose recent production writes
- published data lineage is unclear
- runtime values may have been exposed
- destructive SQL is being considered

## Related runbooks

- `docs/runbooks/production-migrations.md`
- `docs/runbooks/daily-pipeline-failure.md`
- `docs/runbooks/data-stale-or-missing.md`
- `docs/runbooks/paid-but-no-access.md`
- `docs/runbooks/stripe-webhook-500.md`
- `docs/runbooks/api-key-rotation.md`
- `docs/runbooks/production-alerts-and-observability.md`