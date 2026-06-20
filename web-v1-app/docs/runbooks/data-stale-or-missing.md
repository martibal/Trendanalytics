# Data stale or missing runbook

Status: active
Owner: operator
Applies to: Urd Atlas production data freshness, missing published artifacts, and stale API/dashboard data

## Purpose

This runbook defines how to detect, classify, and respond when published production data is stale, missing, incomplete, or inconsistent.

Urd Atlas is a descriptive data product. Freshness, coverage, and publication integrity are part of the product contract.

## Failure classes

| Failure class | Meaning | Launch impact |
|---|---|---|
| Stale data | Published as-of date is older than expected for the chain or genre. | High if sold chain/window is affected. |
| Missing artifact | A required JSON file, manifest, dataset index, or chain/window file is absent. | High if API/dashboard depends on it. |
| Mixed revision | Published artifacts come from inconsistent dataset or revision identities. | High. |
| Low coverage | Expected days are missing or non-null ratio is below the documented threshold. | Medium to high depending on chain/window. |
| Pipeline failure | Scheduled data pipeline or publish workflow did not complete. | High if production remains stale. |
| API delivery mismatch | Published file exists but API route returns 404/500 or wrong entitlement response. | High for paying customers. |

## Detection sources

| Detection source | What to check |
|---|---|
| Production healthcheck | Overall public/API/data health after deploy or scheduled check. |
| Dataset index | as-of dates, chain/genre availability, methodology version, and contract fields. |
| Published manifests | Required files, revision identity, and chain/window coverage. |
| Dashboard freshness UI | Whether customer-visible freshness and lag indicators match published data. |
| API smoke test | Whether sold chains/windows return expected status and payload shape. |
| GitHub Actions | Whether daily pipeline/publish workflow succeeded. |
| Vercel logs | Whether API routes are failing during file delivery. |

## Immediate triage

1. Identify affected chain, genre, and window.
2. Identify whether the issue is public preview, paid API delivery, dashboard rendering, or all surfaces.
3. Check whether the affected chain has a known lag policy.
4. Check dataset index and latest manifests.
5. Check the last successful pipeline/publish workflow.
6. Check whether the issue is stale data, missing file, mixed revision, or API delivery failure.
7. Record only sanitized evidence. Do not paste secrets, full API keys, browser auth material, or customer identifiers.

## Chain lag policy

BTC and ETH are expected to be near daily.

Base and Arbitrum may lag because their source data delivery is slower. A stale-data incident should account for documented chain-specific lag policy before being classified as a production failure.

## Recovery path

Use the least destructive recovery that restores a consistent published state:

1. If the pipeline did not run, rerun the pipeline or scheduled workflow.
2. If publish failed after data generation, rerun the publish/sync step.
3. If a single artifact is missing, prefer regenerating the full affected chain/genre/window bundle rather than hand-editing one file.
4. If revisions are mixed, restore or republish a complete consistent dataset revision.
5. If API delivery fails while files exist, inspect the API route, entitlement path, and storage path resolution.
6. If paid customer access is affected, create support evidence and preserve customer/account traceability without exposing secrets.

## Escalation

Escalate to incident handling when:

- a sold chain/window is unavailable,
- API delivery returns 500 for a paying customer,
- published data is stale beyond documented lag policy,
- manifest and latest files disagree,
- dataset revision identity is mixed,
- pipeline failure repeats,
- manual repair would be required.

## Verification after recovery

After recovery:

1. Run production healthcheck.
2. Verify dataset index as-of values.
3. Verify published manifests.
4. Verify API delivery for affected chain/window.
5. Verify dashboard freshness indicators.
6. Verify no unexpected 500s in Vercel logs for the affected route.
7. Record evidence in docs/evidence/open-market/.

## Customer-facing response

If customer-visible access or freshness was affected:

1. Avoid speculative language.
2. State the affected chain/window/surface.
3. State whether access, freshness, or both were affected.
4. State that the product is descriptive and does not provide advice.
5. State when the issue was resolved or when the next update will be checked.

## Evidence requirements

Record:

- date/time UTC,
- affected chain,
- affected genre,
- affected window,
- detection source,
- expected as-of,
- observed as-of,
- lag policy considered,
- action taken,
- verification result,
- secrets included in evidence: no.

## Related runbooks

- docs/runbooks/production-alerts-and-observability.md
- docs/runbooks/production-migrations.md

## Completion criteria

This runbook is complete when stale data, missing artifacts, mixed revisions, pipeline failures, and API delivery mismatches have defined detection, triage, recovery, escalation, and verification steps.
