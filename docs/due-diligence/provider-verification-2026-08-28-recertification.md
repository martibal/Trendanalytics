# Provider verification — 2026-08-28 full recertification

Purpose: fresh provider/account evidence collected during the full 62-question recertification. This supersedes stale operational conclusions where explicitly stated.

## Supabase operational state

Connected project: `trendanalytics-prod` (`slfbmzxvrcqlhyfemxep`), region `eu-west-1`.

Fresh management checks on 2026-08-28 report `ACTIVE_HEALTHY`. A direct SQL query succeeded against Postgres 17.6 and confirmed six tables in the `public` schema. Therefore the 2026-08-27 `INACTIVE` observation is historical and closed, not the current project state.

## Supabase Data API security finding and remediation

The fresh Supabase Security Advisor identified six `rls_disabled_in_public` errors. Direct privilege inspection confirmed `anon` and `authenticated` had SELECT privileges on all six public tables while RLS was disabled, including `accounts`, `subscriptions`, and `api_keys`.

Production remediation applied on 2026-08-28:

- enabled RLS on all six public tables;
- revoked table privileges from `anon`, `authenticated`, and `public`;
- revoked public-schema sequence privileges from those roles;
- retained normal owner/server-side Postgres privileges for the Prisma path;
- recorded the change as Prisma migration `20260828202100_lock_down_supabase_data_api`.

Post-change verification confirmed all six tables have RLS enabled, `anon_select=false`, `authenticated_select=false`, and the server-side `postgres` role retains read/write privileges. A direct server-side SQL read still succeeds. The Security Advisor no longer reports any ERROR-level `rls_disabled_in_public` findings; only INFO notices remain because no client-facing RLS policies exist. That is intentional: these tables are not a public/client Data API surface.

## Stripe live product identity

Fresh live Stripe product inventory confirms the active products are named:

- `Urd Atlas Single Chain`
- `Urd Atlas Research`

Internal application/Stripe identifiers may remain `basic` and `pro`, but those identifiers are not customer-facing plan names.

## Stripe live portal

Fresh live Billing Portal verification confirms:

- cancellation enabled;
- cancellation mode `at_period_end`;
- cancellation proration behavior `none`;
- subscription update disabled;
- payment-method update and invoice history enabled.

Therefore self-service Single Chain ↔ Research plan switching is not currently available and no portal plan-change proration occurs.

## Stripe tax/current checkout

Fresh live checks confirm:

- Stripe Tax registrations list is empty;
- recent live Checkout Sessions have `automatic_tax.enabled=false`;
- recent completed $49 and $149 sessions show `amount_tax=0`.

This verifies current checkout behavior only. It is not a legal determination about future VAT/tax registration obligations.

## Recertification rule

A checklist item is PASS only when its answer matches current code/public documentation and, where applicable, fresh provider/account evidence. Historical provider observations remain in dated evidence files but must not be presented as current state after a later verification supersedes them.
