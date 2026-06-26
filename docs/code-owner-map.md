# Code owner map

Status: active
Owner: operator
Applies to: repository ownership, production-critical paths, generated artifacts, legacy areas, archive material, and cleanup candidates

## Purpose

This document maps major repository areas to operational ownership and cleanup status.

It is not a GitHub CODEOWNERS file. It is a human-readable repository map used for review, launch readiness, and maintenance planning.

## Status taxonomy

| Status | Meaning |
|---|---|
| production-critical | Required for the active product, CI, production pipeline, deployment, billing, security, or customer-facing behavior. |
| generated | Produced by build, test, pipeline, cache, coverage, or local tooling. Should normally be ignored or regenerated rather than hand-edited. |
| legacy | Historical implementation or migration material. Keep only when it still explains current behavior or supports rollback. |
| archive | Preserved documentation, evidence, or historical context. Not part of the runtime path. |
| cleanup-candidate | Not required for active product operation. Safe only after explicit review and a separate cleanup PR. |

## Root-level map

| Path or pattern | Primary owner | Status | Notes |
|---|---|---|---|
| `.github/workflows/` | operator | production-critical | CI, daily pipeline publish, production healthcheck, and manual probes. |
| `web-v1-app/` | web app owner | production-critical | Active Next.js application, API routes, tests, docs, Prisma schema, public assets, and operational scripts. |
| `pipeline/` | data pipeline owner | production-critical | Data ingestion, transformation, validation, and publication tooling. |
| `data/published/v1/` | data pipeline owner | generated | Canonical published data currently remains in Git. Moving data out of Git is a separate deferred project. |
| `data/raw/` and other raw data paths | data pipeline owner | generated | Pipeline input/cache material. Do not edit manually. |
| `docs/` | operator | production-critical | Root-level product, audit, evidence, archive, and runbook documentation. |
| `docs/archive/` | operator | archive | Historical docs retained for context. Not runtime-critical. |
| `docs/evidence/` | operator | archive | Evidence for audits, launch decisions, and historical validation. |
| `docs/product/` | product owner | production-critical | Product positioning and planning documentation where current. |
| `docs/runbooks/` | operator | production-critical | Root-level operational runbooks where current. |
| `api/` | operator | legacy | Legacy or non-primary API surface. Review before changing or deleting. |
| `css_gui_pipeline.py` | data pipeline owner | production-critical | Local GUI pipeline entrypoint. |
| `run-daily-pipeline.ps1` | data pipeline owner | production-critical | Daily pipeline workflow entrypoint used by automation. |
| `publish-web-data.ps1`, `sync-published-data.ps1`, `refresh-published-window-files.ps1` | data pipeline owner | production-critical | Publication and data synchronization helpers. |
| `SAFE_JSON_REGEN_V2_README.md`, `METHOD_SAFETY_V3_README.md`, `docs/confidence_v2_methodology.md` | data methodology owner | legacy | Methodology and regeneration context. Keep while still useful for audit trail. |
| `logs/`, `reports/`, `__pycache__/` | operator | generated | Local or pipeline output. Should not be treated as source of truth unless explicitly archived as evidence. |
| `.vercel/` | deployment owner | generated | Local Vercel state. Not source-controlled release material. |
| `web-v1/`, `web-v1 - Kopi/`, `web patch zip/`, `zippet/` | operator | legacy | Historical app copies or patch workspaces. Do not use for active development. |
| `*.zip` | operator | cleanup-candidate | Patch/package artifacts. Review separately before deletion. |
| `patch*.ps1`, `repair*.ps1`, `force-rebuild*.ps1`, `line-rebuild*.ps1` | operator | cleanup-candidate | Historical one-off patch scripts. Review separately before deletion. |
| `main.zip` and other root package snapshots | operator | cleanup-candidate | Historical package snapshots. Review separately before deletion. |

## Active web app map

| Path or pattern | Primary owner | Status | Notes |
|---|---|---|---|
| `web-v1-app/src/` | web app owner | production-critical | Active application code, pages, components, API routes, auth, storage, and utilities. |
| `web-v1-app/public/` | web app owner | production-critical | Public runtime assets and sample/static files. |
| `web-v1-app/prisma/` | billing and data owner | production-critical | Database schema and Prisma-generated client contract. |
| `web-v1-app/scripts/` | operator | production-critical | Audit gates, launch checks, repo hygiene checks, and operational scripts. |
| `web-v1-app/tests/` | test owner | production-critical | Test support and regression coverage. |
| `web-v1-app/docs/` | operator | production-critical | Active app-level launch docs, runbooks, and operational verification docs. |
| `web-v1-app/docs/runbooks/` | operator | production-critical | Active app runbooks. |
| `web-v1-app/docs/evidence/` | operator | archive | App-level evidence and historical launch validation. |
| `web-v1-app/package.json` and `web-v1-app/package-lock.json` | web app owner | production-critical | Runtime, build, test, and CI command contract. |
| `web-v1-app/jest.config.ts` and `web-v1-app/jest.setup.ts` | test owner | production-critical | Jest and coverage-gate configuration. |
| `web-v1-app/eslint.config.mjs`, `web-v1-app/tsconfig.json`, `web-v1-app/next.config.js` | web app owner | production-critical | Static analysis, TypeScript, and Next.js build configuration. |
| `web-v1-app/.env.example` and `web-v1-app/.env.production.template` | operator | production-critical | Environment contract templates. Must not contain secrets. |
| `web-v1-app/.env` and `web-v1-app/.env.local` | operator | generated | Local secret-bearing files. Must not be committed. |
| `web-v1-app/.next/`, `web-v1-app/node_modules/`, `web-v1-app/coverage/`, `web-v1-app/.swc/` | operator | generated | Build, dependency, and coverage outputs. |
| `web-v1-app/.private-data/` | data pipeline owner | generated | Local private data mirror. Do not commit unless explicitly required. |
| `web-v1-app/backup/`, `web-v1-app/test-filer/`, `web-v1-app/web-bilder/` | operator | legacy | Local or historical work areas. Review before deletion. |
| `web-v1-app/*.zip` | operator | cleanup-candidate | Historical patch bundles. Review separately before deletion. |
| `web-v1-app/stray shell/test paste files` | operator | cleanup-candidate | Files with names such as braces, partial expressions, or test fragments are cleanup candidates after explicit review. |
| `web-v1-app/TrendAnalytics_Master styringsdokument.docx` | product owner | legacy | Historical product/master document. Keep only if still referenced. |

## Ownership rules

1. Treat production-critical paths as blocking for CI, release readiness, and launch decisions.
2. Treat generated paths as reproducible output, not source-of-truth code.
3. Treat legacy paths as read-only unless the current task explicitly targets migration or cleanup.
4. Treat archive paths as evidence or historical context, not runtime input.
5. Treat cleanup-candidate paths as candidates only. Delete them in separate cleanup PRs with narrow diffs and clear validation.

## Cleanup rules

- Do not delete production-critical, generated, legacy, archive, and cleanup-candidate material in the same PR.
- Do not mix data-out-of-Git work with general repo cleanup.
- Before deleting any candidate path, confirm whether it is tracked by Git and whether any script, workflow, documentation, or runbook references it.
- Prefer one cleanup PR per artifact family.

## Completion criteria

This map is complete when major root-level and active app-level areas are classified by operational owner and status, and cleanup candidates are identified without being deleted.
