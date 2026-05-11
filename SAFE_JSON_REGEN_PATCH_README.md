# Urd Atlas Safe JSON Regeneration Patch

This patch fixes the META regime-label generation path without downloading new raw/parquet data.

## What it changes

- `api/regime_engine.py`
  - Neutralizes low-variance / constant historical distributions before banding.
  - Uses mid-rank percentiles, so constant values cannot become `pct_90d = 100`.
  - Stops raw `avg_block_time_sec` from directly driving congestion.
  - Uses `blocktime_instability` instead of raw block time for capacity evidence.
  - Excludes hidden/weak L2 failure-rate semantics from L2 friction classification.
  - Adds `reconcile_regime_with_scorecard()` so final labels cannot contradict the public scorecard.

- `api/main.py`
  - Reconciles API overview labels against the scorecard before returning/persisting them.

- `pipeline/tools/export_meta_json_history.py`
  - Reconciles historical META labels against the scorecard before writing JSON.

- `pipeline/tools/regenerate_json_safe.py`
  - Rebuilds calculated META JSON, publishes META JSON, validates META safety, and optionally rebuilds Regime Briefs.
  - Does not run download tools.
  - Does not regenerate gold/derived parquet.

- `pipeline/tools/validate_meta_methodology_safety.py`
  - Fails if any published META label contradicts public scorecard dimensions.

- `regenerate-json-safe.ps1`
  - Windows-friendly wrapper for safe JSON regeneration.

## Run

From repo root:

```powershell
.\regenerate-json-safe.ps1
```

or:

```bash
python pipeline/tools/regenerate_json_safe.py
```

Optional start date for faster test runs:

```powershell
.\regenerate-json-safe.ps1 -Start 2026-04-01
```

## What this does not do

- It does not download any new raw/parquet files.
- It does not run the full pipeline.
- It does not alter Gold or Derived data.
- It does not add predictive or advisory language.

## Required post-run check

The wrapper automatically runs:

```bash
python pipeline/tools/validate_meta_methodology_safety.py
```

Expected result:

```text
[validate_meta_methodology_safety] OK
```
