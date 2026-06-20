# Production database migration runbook

Status: active
Owner: operator
Applies to: Urd Atlas production database migrations

## Purpose

This runbook defines the production-safe process for applying Prisma database migrations.

The application build may run Prisma Client generation, but Prisma Client generation does not change the production database schema. Database migrations must be applied explicitly and verified.

## When to use this runbook

Use this runbook before any production deployment or launch step that depends on a new or changed database schema, including new tables, columns, indexes, enums, constraints, Stripe webhook event storage, account state, subscription state, entitlement state, API-key state, usage state, or audit state.

## Roles

| Role | Responsibility |
|---|---|
| Operator | Runs the migration commands and records evidence. |
| Reviewer | Confirms the migration plan, backup/checkpoint, and post-migration verification. |
| Support owner | Confirms whether customer-visible support messaging is needed. |

One person may hold multiple roles for a solo operation, but the checklist must still be followed.

## Pre-migration checklist

Before running a production migration:

1. Confirm the current Git commit is the intended production commit.
2. Confirm the migration files are committed under prisma/migrations/.
3. Confirm the Prisma schema and migration SQL represent the same intended schema.
4. Confirm no production secret values are copied into chat, issue comments, screenshots, or evidence files.
5. Confirm the production database provider dashboard is reachable.
6. Confirm the database has a recent provider-managed backup, restore point, or equivalent checkpoint.
7. Confirm the Vercel production deployment status is known.
8. Confirm Stripe live traffic impact if the migration affects billing or entitlement tables.
9. Confirm the operator knows how to stop or pause new live checkout traffic if billing sync is affected.
10. Confirm the rollback decision path below has been read.

## Required commands

Run commands from the web application root:

- cd D:\css\main\web-v1-app

Check migration status before deployment:

- npx prisma migrate status

Apply committed migrations to the configured production database:

- npx prisma migrate deploy

Check migration status again:

- npx prisma migrate status

Run launch or billing gates when applicable:

- npm run check:billing-launch
- npm run check:production-health

## Production environment handling

- Use environment variables from the deployment or secure secret manager.
- Do not paste database URLs, direct database URLs, Stripe secrets, Clerk secrets, webhook secrets, or service-role keys into evidence.
- Do not commit local environment files.
- Do not run production migrations against a local or preview database by mistake.
- Verify the target database before applying migrations.

## Verification after migration

After npx prisma migrate deploy succeeds:

1. Run npx prisma migrate status and confirm there are no pending migrations.
2. Confirm the expected table, enum, column, or index exists in the database provider dashboard or SQL console.
3. Run npm run check:billing-launch when the migration affects billing, Stripe, subscriptions, entitlements, or API keys.
4. Run npm run check:production-health after the production deployment is live.
5. For Stripe webhook migrations, verify Stripe Workbench has no current unresolved 500-class webhook failures.
6. Record evidence in docs/evidence/open-market/ without secrets.

## Deployment coordination

Preferred order for additive, backward-compatible migrations:

1. Commit migration files and app code.
2. Deploy application code if it is backward-compatible with the old schema.
3. Apply migration with npx prisma migrate deploy.
4. Verify migration status.
5. Run production health and billing gates.
6. Enable or continue live traffic.

For non-additive or potentially breaking migrations:

1. Create a two-step compatibility plan.
2. Deploy code that supports both old and new schema.
3. Apply migration.
4. Verify production behavior.
5. Deploy cleanup code only after the new schema is confirmed stable.

Do not combine a destructive schema change and irreversible application assumption in a single unverified step.

## Rollback decision path

Database rollback is not the same as application rollback.

If a migration fails before completion:

1. Do not retry blindly.
2. Capture the error category without secrets.
3. Run npx prisma migrate status.
4. Inspect the database provider state.
5. Decide whether to fix-forward, mark resolved, or restore from provider backup.
6. If billing is affected, pause new live checkout traffic until the database state is understood.

If the migration succeeds but the application fails:

1. Prefer application rollback or hotfix when the new schema is backward-compatible.
2. Keep Stripe events available for replay.
3. Do not delete subscription, API-key, entitlement, or webhook-event records as a shortcut.
4. If the schema itself must be reverted, use a reviewed migration or provider restore path.

If customer access is affected:

1. Stop or avoid new live checkout traffic if entitlement sync is unsafe.
2. Preserve audit rows and Stripe event history.
3. Use support runbooks to trace account, Stripe, subscription, entitlement, and API-key state.
4. Document the incident and recovery action.

## Failed Prisma migration handling

When npx prisma migrate deploy fails:

1. Save the command name, timestamp, migration name, and sanitized error summary.
2. Do not paste database URLs or raw secrets into evidence.
3. Run npx prisma migrate status.
4. Check whether the failed migration partially applied.
5. If no production data is at risk and the failure is SQL or compatibility related, prepare a fix-forward migration.
6. If Prisma marks a migration failed but the database was manually corrected, use the documented migration resolve flow only after review.
7. If data integrity is uncertain, stop the launch and use the database provider restore or checkpoint process.

## Evidence template

Record each production migration with:

- Date/time UTC
- Operator
- Git commit
- Migration name or names
- Pre-migration status
- Backup or checkpoint confirmed
- Command run
- Post-migration status
- Production health result
- Billing or Stripe result if applicable
- Rollback decision if failure occurred
- Secrets included in evidence: no

## Related documents

- docs/billing-launch-checklist.md
- docs/stripe-webhook-deployment-runbook.md
- docs/stripe-webhook-operational-verification.md
- docs/evidence/open-market/readiness-checklist-2026-06-19.md

## Completion criteria

This runbook is complete when it defines who runs production migrations, pre-migration checks, backup/checkpoint requirement, exact Prisma commands, post-migration verification, Vercel deployment coordination, failed migration handling, rollback decision path, and evidence requirements without secrets.
