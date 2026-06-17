# Production Migration Runbook

## Purpose

This runbook documents how production database migrations are checked, applied, verified, and recovered for Urd Atlas.

## Current verified state

The production migration flow has been verified using Vercel production environment variables.

The migration `20260608120000_add_stripe_webhook_events` was initially applied manually in Supabase SQL Editor during live Stripe webhook recovery.

Afterward, Prisma migration history was reconciled from the web app root using production environment variables, and `npx prisma migrate status` reported that the production database schema was up to date.

## Safety rules

Do not rely on stale local `.env` values for production migration checks.

Do not paste database URLs, passwords, Stripe secrets, Clerk secrets, Supabase service role keys, or API keys into chat, tickets, commits, screenshots, or logs.

Do not print production environment variable values to the terminal.

Do not run destructive SQL manually in production unless there is a written rollback or forward-fix plan.

Prefer forward migrations over rollback-by-editing-production when production data may already exist.

## Required local context

Run all commands from the web app root:

```powershell
cd D:\css\main\web-v1-app
```

Required access:

```text
Vercel project access
Production environment variable access in Vercel
Production database access through Vercel environment variables
Prisma CLI through the project dependencies
```

Before doing migration work, confirm git status:

```powershell
git status --short
git log --oneline -5
```

Untracked audit files, local smoke-test output folders, or local `.gitignore` edits must not be committed unless explicitly intended.

## Step 1 — Pull production environment variables to a temporary file

Use a temporary file outside the repository.

```powershell
$envFile = Join-Path $env:TEMP "urd-atlas-vercel-production.env"

if (Test-Path $envFile) {
  Remove-Item $envFile -Force
}

npx vercel env pull $envFile --environment=production
```

Do not print the contents of this file.

## Step 2 — Load production database variables into the current shell

This loads values from the temporary Vercel env file into the current PowerShell process without printing secret values.

```powershell
$envFile = Join-Path $env:TEMP "urd-atlas-vercel-production.env"

if (!(Test-Path $envFile)) {
  throw "Missing production env file. Run Step 1 first."
}

Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()

  if ($line -eq "" -or $line.StartsWith("#")) {
    return
  }

  if ($line -match "^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$") {
    $name = $matches[1]
    $value = $matches[2].Trim()
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

if (-not $env:DATABASE_URL) { throw "DATABASE_URL was not loaded." }
if (-not $env:DIRECT_URL) { throw "DIRECT_URL was not loaded." }

"Production database environment loaded for this PowerShell process."
```

## Step 3 — Check migration status

Run this before applying any production migration:

```powershell
npx prisma migrate status
```

Expected healthy result:

```text
Database schema is up to date!
```

If Prisma reports pending migrations, review the migration names before applying anything.

## Step 4 — Apply pending migrations

Only run this after confirming that the pending migration is expected for production:

```powershell
npx prisma migrate deploy
```

This command applies committed Prisma migrations that have not yet been applied to the production database.

Do not run this command just because a migration exists locally. First confirm that the app code being deployed expects the schema change.

## Step 5 — Verify after migration deploy

Always run migration status again after deploy:

```powershell
npx prisma migrate status
```

Expected result:

```text
Database schema is up to date!
```

Then verify the production route that depended on the migration, such as the Stripe webhook route, dashboard entitlement route, API key route, or authenticated file delivery route.

## Step 6 — Clean up the temporary environment file

Remove the temporary Vercel production env file after migration work is finished:

```powershell
$envFile = Join-Path $env:TEMP "urd-atlas-vercel-production.env"

if (Test-Path $envFile) {
  Remove-Item $envFile -Force
}
```

This removes the temporary file. Close the PowerShell window when finished if production variables were loaded into the current process.

## Incident procedure — missing database object

Use this when a production route fails because a table, column, or index is missing.

1. Do not repeatedly resend Stripe events before understanding the error.
2. Check whether the missing object is part of an existing Prisma migration.
3. Pull and load Vercel production env using Step 1 and Step 2.
4. Run Step 3: migration status.
5. If the migration is pending and expected, run Step 4: migrate deploy.
6. Run Step 5: migration status again.
7. Retry the failed production route or resend the failed Stripe event.
8. Confirm the route returns the expected status.
9. Confirm dashboard, entitlement, or API behavior matches the expected state.

## Manual Supabase SQL rule

Manual SQL in Supabase SQL Editor should be treated as an emergency or controlled operational action, not the normal migration path.

If manual SQL is used:

- Document exactly what was run.
- Confirm whether it corresponds to a Prisma migration file.
- Reconcile Prisma migration history afterward.
- Run migration status after reconciliation.
- Ensure future deploys do not attempt to reapply or conflict with the manual change.

## Do not commit

Do not commit:

```text
.env
.env.local
Temporary Vercel env files
Database URLs
Supabase credentials
Stripe secrets
Clerk secrets
API keys
Local smoke-test output
Local audit or handoff files unless deliberately intended
```

## Completion checklist

- [ ] Production env was pulled from Vercel, not guessed from local `.env`.
- [ ] `DATABASE_URL` and `DIRECT_URL` loaded without printing secret values.
- [ ] `npx prisma migrate status` was run before deploy.
- [ ] Pending migrations were reviewed before deploy.
- [ ] `npx prisma migrate deploy` was run only when expected.
- [ ] `npx prisma migrate status` was run after deploy.
- [ ] A production route depending on the migration was verified.
- [ ] Temporary env file was deleted.
- [ ] No secrets were committed or pasted.
