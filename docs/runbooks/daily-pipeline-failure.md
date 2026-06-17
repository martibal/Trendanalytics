# Daily Pipeline Failure Runbook

## Purpose

This runbook describes how to diagnose and recover a failed or incomplete Urd Atlas daily data pipeline run.

## Use this runbook when

- The daily pipeline fails before producing published artifacts.
- The pipeline appears to complete but expected JSON files are missing.
- One or more chains did not update.
- Gold, derived, meta, or briefs output is missing or inconsistent.
- The website or API serves stale data because the daily pipeline did not complete.
- A pipeline button, scheduled job, or PowerShell run exits with an error.

## Safety rules

- Do not publish partial output unless the affected chains, genres, and dates are understood.
- Do not delete historical published artifacts as a recovery shortcut.
- Do not manually edit generated JSON unless the repair is documented and later regenerated through the pipeline.
- Do not treat Base or Arbitrum upstream lag as a pipeline failure unless lag exceeds expected policy.
- Do not introduce price data, forecast language, advice language, or unsupported metrics while repairing pipeline output.
- Keep raw data, gold data, derived data, meta data, and published JSON lineage explicit.

## Expected pipeline shape

The expected production data flow is:

```text
RAW parquet
→ daily features
→ gold parquet
→ gold day-json
→ meta confidence/scorecard/regime
→ derived moving-average JSON
→ published dataset.json and manifests
→ web/API consumption
```

A failure can happen at any stage. Recovery should target the failing stage, not blindly rerun unrelated work.

## Step 1 — Capture the failure

Record:

- Date and time of run.
- How the pipeline was started.
- Command or GUI action used.
- Exit code, if shown.
- First error message.
- Last successful stage.
- Affected chain.
- Affected genre.
- Affected date range.
- Whether any files were written before failure.
- Whether production was already updated.

Do not paste secrets or production environment variable values into the incident record.

## Step 2 — Identify the failing stage

Classify the failure as one of:

- Raw data fetch failed.
- Raw data missing or stale.
- Daily feature generation failed.
- Gold parquet generation failed.
- Gold day-json generation failed.
- Meta generation failed.
- Derived generation failed.
- Window harmonization failed.
- Dataset index generation failed.
- Manifest generation failed.
- Publish/sync failed.
- Web/API consumption failed after data was generated.

If the failure is only visible on the website or API, use the Data Stale or Missing Runbook first to determine whether the pipeline actually failed.

## Step 3 — Check raw data availability

Check whether upstream data is present for the affected chain and date.

Expected freshness policy:

- Bitcoin and Ethereum should normally be near-daily.
- Base and Arbitrum may lag by about one week because upstream delivery is slower.

If raw data is not available but lag is within expected policy, document the lag and do not force synthetic output.

If raw data should be available but is missing, investigate fetch credentials, upstream availability, path changes, and fetch logs.

## Step 4 — Check generated artifacts locally

From the project root, inspect the local data output.

Common root:

```text
D:\css\main\data\published\v1
```

Check for the affected chain and genre:

```powershell
cd D:\css\main

Get-ChildItem .\data\published\v1 -Recurse |
  Where-Object { $_.FullName -match "bitcoin|ethereum|arbitrum|base" } |
  Select-Object FullName, Length, LastWriteTime |
  Select-Object -First 50
```

Confirm:

- Expected latest file exists.
- Expected window files exist.
- Manifest exists.
- `dataset.json` exists.
- Dates are plausible.
- File sizes are not zero.
- JSON parses successfully.

## Step 5 — Validate JSON shape

For any repaired or regenerated artifact, validate basic JSON parsing before publishing.

Example:

```powershell
cd D:\css\main

Get-Content .\data\published\v1\dataset.json -Raw | ConvertFrom-Json | Out-Null
```

For chain-specific files:

```powershell
Get-Content .\data\published\v1\gold\bitcoin\latest.json -Raw | ConvertFrom-Json | Out-Null
```

If JSON does not parse, stop and fix generation before publishing.

## Step 6 — Validate lineage and freshness

Before publishing, verify:

- Gold output exists for the source date.
- Meta output references the expected as-of date.
- Derived output is generated from available gold data.
- Window files are consistent with latest/history files.
- `dataset.json` points to the expected chain/genre artifacts.
- Manifests agree with artifact dates and revision IDs where applicable.
- No derived or meta file silently advances beyond its valid source input.

If lineage is unclear, do not publish until the source artifact relationship is understood.

## Step 7 — Recovery paths

Choose the smallest safe recovery path.

If raw fetch failed:

- Fix fetch cause.
- Rerun fetch for the affected chain/date range.
- Continue downstream stages only after raw data is present.

If gold generation failed:

- Regenerate gold for the affected chain/date range.
- Validate gold day-json.
- Continue meta and derived after gold is valid.

If meta generation failed:

- Regenerate meta for the affected chain/date range.
- Confirm confidence, coverage, lag, and scorecard fields are present.
- Do not fabricate confidence or regime values.

If derived generation failed:

- Regenerate derived output from valid gold data.
- Confirm moving-average windows are source-consistent.

If published windows are inconsistent:

- Regenerate the affected published windows from validated source artifacts.
- Confirm latest, history, and window files agree.

If dataset index or manifests are stale:

- Regenerate index/manifests after validating referenced artifacts.
- Confirm references resolve to existing files.

## Step 8 — Publish only after validation

Before production publish/sync:

- Confirm local artifacts parse as JSON.
- Confirm expected chains and genres are present.
- Confirm freshness and lag are explicit.
- Confirm no forbidden product language was introduced.
- Confirm contract/audit checks pass if the pipeline touches web-visible artifacts.

Do not publish if only some affected files are regenerated and the index points to missing files.

## Step 9 — Verify production after recovery

After recovery and publish, verify production from the public domain:

- `/data/published/v1/dataset.json`
- Affected chain latest file.
- Affected chain manifest.
- Affected window file.
- Website page that displays the affected data.
- Authenticated API path if customers access the file through API.

If production still serves stale files, check deployment, cache, and artifact root configuration.

## Customer communication

If customers were affected, tell them:

- Which chain or data window was affected.
- Whether the issue was upstream lag, pipeline failure, publish failure, or cache.
- Whether the issue has been fixed.
- Which as-of date they should now see.
- Whether they should retry the API request.

Do not promise exact future update timing beyond the documented pipeline and lag policy.

## Incident record

Record:

- Incident date.
- Trigger or reporter.
- Affected chain.
- Affected genre.
- Affected date range.
- Failing pipeline stage.
- Root cause.
- Recovery action.
- Files regenerated.
- Production verification result.
- Customer communication, if any.

## Completion checklist

- [ ] Failure was captured with first error and last successful stage.
- [ ] Failing stage was classified.
- [ ] Raw data availability and expected lag were checked.
- [ ] Local artifacts were inspected.
- [ ] JSON parsing was validated.
- [ ] Lineage from raw/gold/meta/derived/published was verified.
- [ ] Recovery path targeted only the affected stage.
- [ ] Dataset index and manifests were validated.
- [ ] Production public URL was verified after recovery.
- [ ] Authenticated API path was verified if relevant.
- [ ] Customer communication did not overpromise freshness.
- [ ] No price, forecast, or advice language was introduced.
