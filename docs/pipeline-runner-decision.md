# Data Pipeline runner and time-budget decision

**Status:** accepted  
**Scope:** `.github/workflows/pipeline.yml`

## Decision

Retain `windows-latest` for the production Data Pipeline and retain `timeout-minutes: 180` as a hard circuit breaker.

This is an explicit operational decision, not an accidental GitHub Actions default.

## Rationale

The production orchestrator is PowerShell-first (`pipeline/tools/full_pipeline.ps1`) and the existing data path has been repeatedly exercised on the Windows runner. Moving the scheduled/manual production pipeline to Linux solely to shorten the workflow definition would introduce runner-parity risk into ingestion, path handling, and publishing without changing the classification methodology.

The 180-minute value is a **maximum failure boundary**, not a target runtime or service-level objective. Normal runs should complete materially below that ceiling. A run reaching the ceiling is treated as an operational failure to investigate rather than permission to extend the timeout automatically.

## Migration rule

A future move to Linux or a different time budget must be made as one reviewed change that:

- demonstrates output parity for all four chains;
- verifies the publish path and AWS/public-source access;
- updates `.github/workflows/pipeline.yml` and this decision record together; and
- preserves deterministic published artifacts.

`pipeline/tools/audit_pipeline_runner_contract.py` enforces that the workflow and this recorded decision cannot silently diverge.
