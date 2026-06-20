# Phase 1 / Item 10 - Production migration runbook

Status: **GREEN**
Last updated UTC: 2026-06-20T22:49:39Z

## Scope

This evidence covers the open-market readiness requirement:

- A production database migration runbook must exist.
- The runbook must document who runs production migrations.
- The runbook must document pre-migration checks.
- The runbook must document exact Prisma migration commands.
- The runbook must document post-migration verification.
- The runbook must document Vercel deployment coordination.
- The runbook must document failed migration handling.
- The runbook must document rollback decision path.

## Runbook created

The production migration runbook was created at:

- docs/runbooks/production-migrations.md

## Existing related documents reviewed

Existing Stripe/billing operational documents were reviewed before creating the general production migration runbook:

- docs/billing-launch-checklist.md
- docs/stripe-webhook-deployment-runbook.md
- docs/stripe-webhook-operational-verification.md

These existing documents cover Stripe-specific database gates and webhook deployment requirements, but the new runbook provides the general production migration process.

## Coverage

| Requirement | Result |
|---|---|
| Operator responsibility documented | PASS |
| Pre-migration status checks documented | PASS |
| Backup/checkpoint requirement documented | PASS |
| Exact Prisma commands documented | PASS |
| Post-migration verification documented | PASS |
| Vercel deployment coordination documented | PASS |
| Failed Prisma migration handling documented | PASS |
| Rollback decision path documented | PASS |
| Evidence requirements without secrets documented | PASS |

## Secret handling

- No database URL is stored in this evidence.
- No direct database URL is stored in this evidence.
- No Stripe secret, webhook secret, Clerk secret, service-role key, API key, or session material is stored in this evidence.
- The runbook instructs the operator not to paste or commit production secrets.

## Result

Phase 1 / Item 10 is **GREEN**.

The production migration process is now documented in a dedicated runbook.
