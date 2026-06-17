# Data Stale or Missing Runbook

## Purpose

This runbook describes how to diagnose and recover Urd Atlas production cases where published JSON data appears stale, missing, inconsistent, or unavailable through the website or authenticated file API.

## Use this runbook when

- A customer reports that data has not updated.
- A production page shows older-than-expected as-of dates.
- An authenticated API file request returns 404 for a file that should exist.
- A chain, genre, or window appears missing from published output.
- `dataset.json`, manifests, latest files, or window files appear inconsistent.
- The daily pipeline ran but production still serves old data.
- A production deployment appears to serve stale cached artifacts.

## Safety rules

- Do not change published data manually unless the source and expected artifact are understood.
- Do not backfill or overwrite production artifacts without preserving the reason and source run.
- Do not present stale data as fresh.
- Do not hide lag. Freshness, coverage, and lag must remain explicit.
- Do not introduce price data, price language, forecasts, or advice language while fixing data surfaces.
- If a customer is blocked by entitlement, use the API 401 and 403 Runbook before treating the issue as a data outage.

## Expected published structure

Production data should be checked through the published v1 dataset structure.

Core index:

```text
/data/published/v1/dataset.json
```

Expected genres:

```text
gold
derived
meta
briefs
```

Expected main chains:

```text
bitcoin
ethereum
arbitrum
base
```

Common expected files include:

```text
latest.json
history.json
last7d.json
last30d.json
last90d.json
last180d.json
last365d.json
30d/latest.json
90d/latest.json
180d/latest.json
365d/latest.json
manifest.json
```

Not every endpoint or plan exposes every window to every customer. Always separate missing artifact from denied entitlement.

## Step 1 — Classify the issue

Record:

- Customer report or internal observation.
- URL or API path.
- Chain.
- Genre.
- Window.
- Expected as-of date.
- Actual as-of date.
- HTTP status.
- Whether the request is public or authenticated.
- Whether the issue is seen in browser, API, or both.
- Whether other chains or genres are affected.

Classify as one of:

- Stale index.
- Stale chain artifact.
- Missing file.
- Wrong path.
- Entitlement denial.
- Cache/CDN stale response.
- Pipeline did not run.
- Pipeline ran but publish step failed.
- Deployment is serving the wrong artifact root.

## Step 2 — Check production HTTP response

From a clean shell, test the public production URL.

Example:

```powershell
$base = "https://www.urdatlas.com"
Invoke-WebRequest "$base/data/published/v1/dataset.json" -UseBasicParsing | Select-Object StatusCode
```

For a specific file, test the reported path:

```powershell
$base = "https://www.urdatlas.com"
$path = "/data/published/v1/gold/bitcoin/latest.json"
Invoke-WebRequest "$base$path" -UseBasicParsing | Select-Object StatusCode
```

If using authenticated API delivery, do not paste the API key into logs or tickets. Use the API 401 and 403 Runbook if the response is 401 or 403.

## Step 3 — Inspect `dataset.json`

Open production `dataset.json` and check:

- `computed_at_utc`.
- `methodology_version`.
- `asof_by_genre_chain`.
- Coverage metadata.
- Chain/genre entries.
- Published file references.
- Whether the affected chain and genre are present.
- Whether the index points to the expected latest files.

If `dataset.json` is stale but individual files are fresh, suspect index generation or publish ordering.

If `dataset.json` is fresh but individual files are stale, suspect per-chain or per-genre publish failure.

## Step 4 — Inspect manifests and latest files

For the affected chain and genre, inspect:

- `manifest.json`.
- `latest.json`.
- Window latest files.
- History files.
- Any generated checksum, revision, dataset ID, or as-of metadata.

Confirm:

- Manifest and latest file agree on chain.
- Manifest and latest file agree on genre.
- Manifest and latest file agree on as-of date.
- Window artifacts exist for expected plan windows.
- Derived and meta artifacts are not newer than their source gold data unless the pipeline explicitly supports that.

## Step 5 — Compare expected lag policy

Before treating data as stale, compare the observed as-of date with expected data availability.

Known operating expectation:

- Bitcoin and Ethereum are expected to be near-daily.
- Base and Arbitrum may lag by about one week because upstream delivery is slower.

If the observed lag is within the expected policy, communicate it as freshness/lag, not as an outage.

If the observed lag exceeds the expected policy, continue investigation.

## Step 6 — Check the latest pipeline run

Check the most recent daily pipeline or publication run.

Record:

- Run timestamp.
- Commit or data revision, if available.
- Chains processed.
- Genres processed.
- Last successful stage.
- Any failed stage.
- Whether publish completed.
- Whether artifacts were written to the expected published root.
- Whether website deployment or sync consumed the new published root.

If the pipeline failed before publish, rerun only after the cause is understood.

If the pipeline succeeded but production is stale, check artifact sync, deployment, and cache.

## Step 7 — Check local published artifacts

From the project root, inspect the local published root expected by the current production workflow.

Common project path:

```text
D:\css\main\data\published\v1
```

Check the affected file locally before republishing:

```powershell
cd D:\css\main

Get-Item .\data\published\v1\dataset.json
Get-ChildItem .\data\published\v1 -Recurse | Select-Object -First 20
```

Do not overwrite production until you know whether local data is fresher and valid.

## Step 8 — Recover

Choose the smallest safe recovery path:

- If the request path is wrong, correct documentation or customer instructions.
- If entitlement is wrong, use the API 401 and 403 Runbook.
- If pipeline failed, fix the failing stage and rerun the pipeline.
- If publish failed, rerun or repair the publish step after verifying source artifacts.
- If only the index is stale, regenerate and republish the index after validating referenced files.
- If chain artifacts are stale, regenerate affected chain/genre artifacts from source data.
- If CDN or deployment cache is stale, redeploy or purge through the supported production mechanism.
- If production artifact root is wrong, fix deployment configuration before republishing.

Do not use manual file edits as the normal recovery mechanism. If manual repair is unavoidable, document every file changed.

## Step 9 — Verify after recovery

Verify production from the public domain, not only local files.

Check:

- `dataset.json` is fresh.
- Affected `manifest.json` is fresh.
- Affected `latest.json` is fresh.
- Expected window file is present.
- Website UI displays expected as-of and lag.
- Authenticated API returns 200 for allowed customer files.
- Authenticated API still returns 403 for out-of-plan files.
- No price, forecast, or advice language was introduced.

## Customer communication

If a customer reported the issue, tell them:

- Whether the issue was stale data, missing file, entitlement, or expected lag.
- Which chain and data window were affected.
- Whether the issue has been fixed.
- What as-of date they should now see.
- Whether they should retry the same API request.
- Whether the chain has expected upstream lag.

Do not promise future update timing beyond the documented pipeline and lag policy.

## Incident record

For every confirmed data stale or missing-file incident, record:

- Date and time discovered.
- Reporter.
- Affected chain.
- Affected genre.
- Affected window.
- Public/API path.
- Expected as-of.
- Actual as-of.
- Root cause.
- Recovery action.
- Files regenerated or republished.
- Verification result.
- Customer communication, if any.

## Completion checklist

- [ ] Issue was classified as stale, missing, entitlement, cache, pipeline, publish, or path error.
- [ ] Public production URL was checked.
- [ ] Authenticated API behavior was checked if relevant.
- [ ] `dataset.json` was inspected.
- [ ] Manifest/latest/window files were inspected.
- [ ] Expected lag policy was considered.
- [ ] Latest pipeline or publish run was checked.
- [ ] Recovery action was documented.
- [ ] Production was verified after recovery.
- [ ] Customer communication did not overpromise freshness.
- [ ] No price, forecast, or advice language was introduced.
