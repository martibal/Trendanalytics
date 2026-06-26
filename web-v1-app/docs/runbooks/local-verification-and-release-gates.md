# Local verification and release gates runbook

Status: active
Owner: operator
Applies to: Urd Atlas local validation, pull-request verification, post-merge checks, and release-readiness gates

## Purpose

This runbook defines the standard local verification path before opening, merging, or trusting a pull request.

The goal is to make quality gates repeatable. A change is ready only when the relevant verification commands pass and the working tree is clean.

## Command roots

Run Git commands from the repository root:

```powershell
cd D:\css\main
```

Run web application commands from the web application root:

```powershell
cd D:\css\main\web-v1-app
```

Do not mix command roots. If a command fails unexpectedly, first confirm the current directory.

## Standard pull-request verification path

For normal code, test, or configuration changes, run:

```powershell
cd D:\css\main\web-v1-app

cmd /c "npm.cmd run lint"
cmd /c "npm.cmd run typecheck"
cmd /c "npm.cmd test"
cmd /c "npm.cmd run test:coverage"
cmd /c "npm.cmd run check:audit-gates:no-build"
```

Expected result:

- ESLint exits with zero errors.
- TypeScript exits with zero errors.
- Jest exits with all suites passing.
- Jest coverage passes the configured global baseline threshold.
- Audit gates pass without running the build step.

## Full release-readiness path

Before treating a branch as release-ready, run the full gate including build:

```powershell
cd D:\css\main\web-v1-app
cmd /c "npm.cmd run check:audit-gates"
```

Use this when the change affects Next.js pages, route handlers, build configuration, package versions, Prisma generation, data loading paths, public copy, API contract behavior, publication integrity, or calculation correctness.

## Targeted validation path

For a focused change, run the smallest relevant command first, then broader gates.

Examples:

```powershell
cmd /c "npm.cmd test -- src/app/api/v1/status/route.test.ts"
cmd /c "npm.cmd test -- src/lib/utils/freshness.test.ts"
cmd /c "npm.cmd test -- src/app/api-docs/samples/page.test.tsx"
cmd /c "npm.cmd run lint -- src/app/api-docs/samples/page.test.tsx"
cmd /c "npm.cmd run typecheck"
cmd /c "npm.cmd run check:audit-gates:no-build"
```

A targeted pass is not a substitute for broader validation before merge. It is a fast way to confirm that the local patch is moving in the right direction.

## Coverage gate

Coverage is enforced through:

```powershell
cmd /c "npm.cmd run test:coverage"
```

Current baseline threshold:

| Metric | Minimum |
|---|---:|
| Statements | 25 |
| Branches | 22 |
| Functions | 20 |
| Lines | 27 |

This is a conservative regression floor. It is not a claim that total test coverage is high. Raise the threshold only after adding durable tests that make the higher value stable.

If coverage drops below the threshold:

1. Check whether the change introduced untested executable code.
2. Add targeted tests for the changed behavior.
3. Avoid lowering the threshold unless the drop is intentional, reviewed, and documented.
4. Do not exclude production code from coverage only to make the gate pass.

## Audit gates

The no-build audit gate is:

```powershell
cmd /c "npm.cmd run check:audit-gates:no-build"
```

The full audit gate is:

```powershell
cmd /c "npm.cmd run check:audit-gates"
```

The audit-gate runner covers product-boundary copy, API contract inventory, calculation correctness, publication integrity, and optionally build.

All audit-gate failures are blocking until understood.

## Repository hygiene gate

Run repository hygiene checks when a change affects repo structure, generated files, data publication paths, ignored files, or cleanup scripts:

```powershell
cd D:\css\main\web-v1-app
cmd /c "npm.cmd run check:repo-hygiene"
```

Known scope note:

- Moving canonical published data out of Git is intentionally out of scope for this runbook.
- If repo hygiene reports canonical published data as tracked, treat that as a known deferred project unless the current task is explicitly about data storage hygiene.
- Do not mix that separate project into normal PR verification.

## Build gate

Run the build gate when changing app code, routing, public pages, Next.js configuration, package versions, Prisma generation, or server/runtime behavior:

```powershell
cd D:\css\main\web-v1-app
cmd /c "npm.cmd run build"
```

A passing test suite does not prove that the Next.js production build works.

## Post-merge verification

After a PR is merged:

```powershell
cd D:\css\main

git checkout main
git pull origin main
git branch --delete <branch-name>

cd .\web-v1-app
cmd /c "npm.cmd test -- <target-test-file>"
cmd /c "npm.cmd run check:audit-gates:no-build"

cd D:\css\main
git status --short
```

Expected result:

- local main fast-forwards,
- local feature branch is deleted,
- targeted merged test passes,
- audit gates pass,
- git status is empty.

For a broader merge or release candidate, replace the targeted test with:

```powershell
cmd /c "npm.cmd test"
cmd /c "npm.cmd run test:coverage"
cmd /c "npm.cmd run check:audit-gates"
```

## Working tree cleanup rules

Before committing:

```powershell
cd D:\css\main
git status --short
```

Expected result should include only intentional files.

If build, test, or pipeline commands create local coverage artifacts, they should remain ignored and should not appear in git status.

If generated data changes under data/ appear unexpectedly, do not commit them unless the current task is explicitly a data publication update. Restore accidental local data changes with:

```powershell
cd D:\css\main
git restore -- data
```

If private local published data changes appear under web-v1-app/.private-data/, do not commit them unless the current task explicitly requires it. Restore accidental local private-data changes with:

```powershell
cd D:\css\main
git restore -- web-v1-app/.private-data
```

## Branch and commit rules

Use one branch per logical change.

Recommended branch prefixes:

| Change type | Prefix example |
|---|---|
| Tests | test/... |
| Fixes | fix/... |
| Docs | docs/... |
| Chores | chore/... |
| Security | security/... |

Before pushing:

```powershell
cd D:\css\main
git status --short
git diff --stat
```

Commit only intentional files:

```powershell
git add <files>
git commit -m "<concise imperative summary>"
git push -u origin <branch-name>
```

## Pull request evidence

Each pull request should include:

- what changed,
- why the change exists,
- which files were changed,
- which local commands passed,
- whether any warnings are known existing noise,
- whether any scope exclusions apply.

Do not include secrets, customer identifiers, API keys, Stripe payloads, database URLs, browser session material, or private provider tokens in PR descriptions or comments.

## Known existing test output noise

Some tests intentionally exercise error paths and may emit console output while still passing.

Current known examples:

- audit log output during API-key tests,
- account and terms error-path logs during account tests.

Treat these as non-blocking only when the Jest suite exits successfully. A new console error in a new test path should still be investigated.

## Failure handling

When a gate fails:

1. Stop and identify the first failing command.
2. Preserve the relevant error output.
3. Determine whether the failure is caused by the current change, branch drift, environment state, or known existing noise.
4. Fix the smallest responsible surface.
5. Re-run the failing command.
6. Re-run the broader verification path before commit or merge.

Do not stack unrelated fixes in the same branch unless the failure blocks validation and the fix is directly necessary.

## Evidence requirements

When recording verification evidence, include:

- date/time UTC if relevant,
- branch name,
- commit SHA if available,
- command run,
- pass/fail result,
- short failure summary if failed,
- follow-up action,
- secrets included in evidence: no.

## Related runbooks

- docs/runbooks/data-stale-or-missing.md
- docs/runbooks/production-alerts-and-observability.md
- docs/runbooks/production-migrations.md
- docs/billing-launch-checklist.md
- docs/stripe-webhook-deployment-runbook.md
- docs/stripe-webhook-operational-verification.md

## Completion criteria

This runbook is complete when local validation, coverage, audit gates, build verification, post-merge checks, working-tree cleanup, branch hygiene, PR evidence, and known scope exclusions are documented with exact commands.
