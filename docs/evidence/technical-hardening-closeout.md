# Technical hardening closeout

**Status:** P4 technical hardening closeout
**Date:** 2026-07-01
**Active app:** `web-v1-app`
**Repository:** `martibal/Trendanalytics`

## Decision

This closeout records the end of the current technical hardening round.

The P4 hardening scope is considered closed after the native pipeline command and audit-gate surface were added. Future work should not continue adding P4 hardening slices unless a regression or a newly discovered production-risk issue appears.

## Scope boundary

The following are explicitly outside this closeout and must be treated as separate projects or later readiness work:

1. Moving published JSON/data artifacts out of Git.
2. Full containerization or a broader runtime-platform project beyond the current native pipeline command and parity inventory.
3. Eliminating every remaining lint/audit warning to reach a literal zero-warning textbook state.
4. P5 supply-chain/security/foundation work that is not already enforced by the current gates.
5. Open-market launch sign-off, including manual operator, legal, commercial, support, accessibility, and performance checks.

## Closed P4 hardening coverage

The current repository now has gate coverage for the core P4 technical hardening themes:

| Theme | Evidence / gate surface |
| --- | --- |
| Determinism and golden fixtures | `check:pipeline-determinism`, `check:pipeline-golden-fixture`, `check:pipeline-meta-golden-fixture`, `check:methodology-version` |
| Published JSON schema contracts | `check:published-json-schemas` |
| Atomic publish and replay behavior | `check:published-atomicity` |
| Source failure handling | `check:source-failure-handling` |
| Timeout, retry, and backoff policy | `check:timeout-retry-policy` |
| Environment parity inventory | `check:pipeline-environment-parity` |
| Native pipeline command surface | `check:native-pipeline` |
| Publication integrity | `check:publication-integrity` |
| Product-boundary copy guard | `check:public-copy-guard` |

The audit runner includes the hardening gate sequence and optionally includes the production build when not run with `--skip-build`.

## Required final local gate

Before merging this closeout PR, run the following from a clean working tree:

```powershell
cd D:\css\main

git diff --check

cd D:\css\main\web-v1-app
cmd /c "npm.cmd run check:audit-gates"
cmd /c "npm.cmd run test"
cmd /c "npm.cmd run typecheck"
cmd /c "npm.cmd run lint"

cd D:\css\main
git status --short
```

Expected result:

- `git diff --check` has no real whitespace errors.
- `check:audit-gates` passes, including build.
- Jest passes.
- Typecheck passes.
- Lint has zero errors. Existing warnings are tolerated for this closeout only if unchanged from the known baseline.
- The closeout PR contains documentation only, unless a gate forces a minimal repair.

## Remaining work after closeout

The remaining work should be tracked separately from this hardening round:

### Separate data-storage project

- Move published JSON/data artifacts out of Git.
- Decide canonical artifact storage and deployment sync model.
- Update restore and publication runbooks after storage migration.

### P5 / textbook-foundation work

- Pin Node/runtime versions consistently.
- Add automated dependency/security update flow.
- Add vulnerability and secret scanning gates.
- Verify Git history for exposed secrets and rotate anything found.
- Add startup config validation.
- Finish structured logging and correlation-ID coverage.
- Exercise database rollback and backup restore, then record RTO/RPO.
- Add explicit performance and accessibility budgets.

### Open-market readiness

- Run the separate open-market readiness checklist.
- Keep legal/commercial/operator sign-off distinct from technical hardening.
- Treat support, billing, policy, analytics, and manual production verification as launch-readiness work, not P4 hardening.

## Closeout rule

After this PR merges, the current P4 hardening round is closed.

New work should be classified as one of:

1. Bug/regression fix.
2. Data-out-of-Git project.
3. P5 foundation polish.
4. Open-market readiness.
5. Product feature work.
