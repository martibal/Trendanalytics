# Release checklist

Status: active
Owner: operator
Applies to: production releases, release-candidate merges, manual production verification, and version tagging

## Purpose

This runbook defines the release discipline for Urd Atlas / Trendanalytics. It links the required local checks, CI status, audit outputs, build verification, Vercel deployment verification, pipeline verification, and source-freshness review before a release is considered complete.

Use this checklist for production releases and meaningful release-candidate merges. Small documentation-only PRs may use a reduced validation path, but the final release readiness decision must use this full checklist.

## Release inputs

Record these before starting a release:

| Field | Value |
|---|---|
| Release date | |
| Release owner | |
| Base branch | `main` |
| Release branch or PR | |
| Commit SHA | |
| Intended version or tag | |
| Vercel deployment URL | |
| Latest pipeline run | |
| Latest source-freshness artifact | |

## 1. Pre-release repository state

From the repository root:

```powershell
cd D:\css\main

git checkout main
git pull origin main
git status --short
```

Required result:

- `main` is up to date with `origin/main`.
- Working tree is clean.
- No release is started from a dirty local state.

## 2. Local verification gate

From the active web app root:

```powershell
cd D:\css\main\web-v1-app

cmd /c "npm.cmd run lint"
cmd /c "npm.cmd run typecheck"
cmd /c "npm.cmd run test"
cmd /c "npm.cmd run test:coverage"
cmd /c "npm.cmd run check:audit-gates"
```

Required result:

- Lint passes.
- TypeScript typecheck passes.
- Unit and regression tests pass.
- Coverage gate passes.
- Full audit-gate runner passes, including build.

For documentation-only PRs, `check:audit-gates:no-build` may be used before PR creation, but the release decision must include a full `check:audit-gates` run or a CI run that includes the same build path.

## 3. Audit report links

After the audit gate runner completes, record the generated report paths:

| Audit | Report path | Result |
|---|---|---|
| Product boundary audit | `web-v1-app/.audit/public-copy/public-copy-guard.md` | |
| API contract audit | `web-v1-app/.audit/api-contract/endpoint-inventory.md` | |
| Calculation correctness audit | `web-v1-app/.audit/calculation-correctness/calculation-inventory.md` | |
| Publication integrity audit | `web-v1-app/.audit/publication-integrity/publication-integrity.md` | |

Required result:

- All audit reports are generated.
- No blocking audit fails.
- Any non-blocking warning is explicitly reviewed and either accepted for the release or converted into a follow-up issue.

## 4. Build verification

Confirm the build command has passed:

```powershell
cd D:\css\main\web-v1-app
cmd /c "npm.cmd run build"
```

This is redundant when `npm run check:audit-gates` already ran without `--skip-build`, but it may be run separately when isolating a build failure.

Required result:

- Prisma generation completes.
- Next.js build completes.
- No production-blocking TypeScript, route, static generation, or runtime-boundary issue remains.

## 5. Pull request discipline

Each release-candidate PR must include:

- concise summary of what changed,
- exact local validation commands and results,
- changed-file scope,
- whether data artifacts, pipeline behavior, billing, auth, or public copy changed,
- any known warnings or deferred work.

Required GitHub state before merge:

- CI is green.
- PR diff is narrow enough to review.
- Branch is up to date or mergeable.
- No unrelated cleanup is mixed into the release PR.

## 6. Vercel deploy verification

After merge to `main`, verify the production deployment.

Minimum checks:

- Vercel deployment completed successfully.
- Production domain responds.
- `/status` loads.
- `/methodology/freshness` loads.
- `/api/v1/status` returns a valid response.
- Dashboard and billing-critical flows are not spot-checked unless the release changed auth, billing, subscription, API-key, or entitlement behavior.

When available, run:

```powershell
cd D:\css\main\web-v1-app
cmd /c "npm.cmd run check:production-health"
```

Required result:

- Production healthcheck passes, or manual verification is recorded with exact URLs and timestamps.

## 7. Pipeline and source-freshness verification

A production release that can affect published data, data display, status, methodology, API delivery, or freshness interpretation must link the latest pipeline and freshness evidence.

Record:

| Item | Evidence |
|---|---|
| Latest pipeline run | |
| Latest published dataset/index | |
| Latest `source-freshness.json` or equivalent artifact | |
| Latest `/status` verification | |
| BTC/ETH freshness within expected policy | |
| Arbitrum/Base freshness within expected policy | |

Required result:

- Latest published data is present.
- Source freshness is inside the documented chain-specific policy or explicitly marked as an accepted release caveat.
- Any stale or missing data condition links to `docs/runbooks/data-stale-or-missing.md` or the app-level equivalent.

## 8. Post-release smoke checks

After production deployment and pipeline/freshness review:

- open the production homepage,
- open `/status`,
- open one chain page,
- open `/methodology`,
- open `/methodology/freshness`,
- open `/api-docs`,
- call `/api/v1/status`,
- confirm no advisory, predictive, or trading-action copy was introduced.

Record failures immediately and decide between:

- monitor,
- hotfix,
- rollback,
- soft pause,
- hard rollback.

Use `docs/runbooks/public-launch-rollback.md` for rollback decisions.

## 9. Versioning and tags

Use conventional commit style for normal commits where practical:

- `docs:` documentation-only changes,
- `test:` tests and regression coverage,
- `ci:` CI and workflow changes,
- `fix:` production bug fixes,
- `feat:` product or API capability additions,
- `chore:` maintenance with no product behavior change.

Tag only meaningful releases, not every documentation merge.

Suggested tag policy:

- Patch tag for production bug fix or operational hardening release.
- Minor tag for customer-visible feature/API capability.
- No tag for internal-only documentation unless it is part of a release-candidate bundle.

Before tagging:

```powershell
cd D:\css\main

git checkout main
git pull origin main
git status --short
git tag --list
```

Create a tag only after release verification is complete:

```powershell
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

## 10. Release completion record

A release is complete only when this table can be filled:

| Gate | Result | Evidence |
|---|---|---|
| Clean main | | |
| Local verification | | |
| CI | | |
| Audit reports | | |
| Build | | |
| PR merged | | |
| Vercel deploy | | |
| Production healthcheck | | |
| Pipeline/freshness checked | | |
| Post-release smoke check | | |
| Tag decision made | | |

## Failure handling

If any required gate fails:

1. Stop the release.
2. Record the failing command, URL, or artifact.
3. Decide whether to fix forward, revert, or rollback.
4. Do not tag the release.
5. Do not mark the release complete.

## Related runbooks

- `web-v1-app/docs/runbooks/local-verification-and-release-gates.md`
- `docs/runbooks/production-alerts-and-observability.md`
- `docs/runbooks/data-stale-or-missing.md`
- `docs/runbooks/public-launch-rollback.md`
- `docs/runbooks/production-migrations.md`
- `docs/code-owner-map.md`
