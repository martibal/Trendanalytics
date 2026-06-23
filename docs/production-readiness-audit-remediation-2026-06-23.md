# Urd Atlas Production Readiness Audit Remediation Summary

**Date:** 2026-06-23  
**Repository:** `martibal/Trendanalytics`  
**Web app:** `web-v1-app`  
**Product:** Urd Atlas  
**Purpose:** Document the audit-remediation work completed to move the Urd Atlas web application toward production readiness, with enough context for future Git reviews, audits, and ChatGPT sessions to understand what was changed and why.

---

## 1. Executive summary

This remediation phase focused on making Urd Atlas production-ready from a product-boundary, operational-health, publication-integrity, and customer-explanation perspective.

The main outcome is that the application now distinguishes between:

1. **Pipeline delay**: the upstream source has newer complete data, but the published dataset did not advance.
2. **Source-limited freshness**: the upstream AWS source itself has no newer complete data available.
3. **Unknown source freshness**: the freshness probe could not determine source availability.

This distinction is now exposed through:

- `data/published/v1/source-freshness.json`
- `/api/v1/status`
- `/status`
- the public landing page
- each chain page, for example `/chains/ethereum`

The product no longer merely shows that data is stale. It explains whether stale-looking data is caused by the source or by the publication pipeline. This is important because Bitcoin/Ethereum have near-daily freshness expectations, while Base/Arbitrum have weekly-ish source availability characteristics.

---

## 2. Production-readiness status

At the end of this work, the local checks reported:

```text
Build:                         PASS
Product boundary audit:         PASS
API contract audit:             PASS
Calculation correctness audit:   PASS with non-blocking warnings
Publication integrity audit:     PASS with non-blocking warnings
```

The audit-gate runner passed:

```text
=== Audit gate runner passed ===
Product boundary audit        PASS
API contract audit            PASS
Calculation correctness audit  PASS, warnings only
Publication integrity audit    PASS, warnings only
```

The remaining CSS optimizer warnings are non-blocking and unrelated to production correctness. They concern existing CSS ordering/selector warnings, not runtime behavior or audit failure.

---

## 3. Core production principles enforced

The remediation work preserved the core product contract:

- No price data.
- No forecasts.
- No recommendations.
- No advisory language.
- No hidden interpretation layer in the browser.
- Published JSON remains the source of truth.
- Chain-specific lag and freshness rules must be explicit.
- Customers must be told why a row is old, not merely that it is old.

The product remains descriptive, not predictive or normative.

---

## 4. Audit-remediation work completed

### 4.1 Product boundary audit

The public-copy guard passed after scanning the public UI and product-boundary rules.

Relevant outcome:

```text
Public copy guard passed.
Scanned 247 file(s) across product-boundary rules A-001 through A-010.
```

This means the visible product surface remained aligned with the non-advisory product contract.

### 4.2 API contract audit

The API endpoint inventory audit passed.

Relevant outcome:

```text
API contract audit endpoint-inventory stage passed.
```

This confirms the API surface is accounted for and did not introduce undocumented or boundary-breaking endpoint behavior.

### 4.3 Calculation correctness audit

The calculation correctness audit passed with warnings only.

Relevant outcome:

```text
Calculation correctness audit passed with 10 warning(s).
```

These warnings are non-blocking. They should remain tracked as follow-up hardening items, but they do not block production readiness under the current gate.

### 4.4 Publication integrity audit

The publication integrity audit passed with warnings only.

Relevant outcome:

```text
Publication integrity audit passed with 2 warning(s).
```

These warnings are also non-blocking. They should remain visible in audit reports, but the gate passed.

---

## 5. Source freshness remediation

### 5.1 Problem being solved

Before this remediation, `/api/v1/status` could classify Ethereum as a hard freshness failure when the observed published lag exceeded the expected policy. That was correct if the upstream source had newer complete data, but incorrect if AWS itself had not published a newer complete day.

Example issue:

```text
Ethereum published as-of: 2026-06-19
Expected Ethereum delay: ~1 day
Observed lag: 4 days
```

Without source awareness, this looked like a pipeline failure. After source probing, it can be classified correctly as source-limited if AWS also only has complete Ethereum data through 2026-06-19.

### 5.2 New source freshness file

A new generated artifact was introduced:

```text
data/published/v1/source-freshness.json
```

Its schema is identified as:

```json
{
  "schema": "urd_atlas.source_freshness.v1"
}
```

It includes chain-level fields such as:

```text
last_run_date
last_data_load_date
latest_available_source_date
latest_seen_source_partition_date
source_cutoff_date
reason_code
reason
source_is_newer_than_published
source_is_not_newer_than_published
tables
```

### 5.3 Meaning of the three customer-facing dates

The production UI now explains the three key dates:

```text
Last run
When the source freshness probe last checked the upstream source.

Last data load
The latest complete date currently published for the chain.

Latest source
The latest complete date available from the upstream AWS source after source-lag policy is applied.
```

These dates are deliberately separated so users can understand whether the product is stale because the pipeline is behind, or because the source itself has not published newer complete data.

### 5.4 Source freshness classifications

The source freshness logic supports these important cases:

```text
source_newer_than_published
The upstream AWS source has newer complete data than the published dataset.
This indicates the pipeline/publication process is behind source.

source_not_newer_than_published
The upstream AWS source does not have a newer complete day than the published dataset.
This means the chain is source-limited, not necessarily pipeline-broken.

source_check_unavailable / source_no_dates_detected
The source check could not determine a reliable source date.
This should be surfaced as unknown/warn rather than silently treated as healthy.
```

---

## 6. Example: Ethereum source-limited freshness

The generated freshness file showed Ethereum as:

```json
{
  "chain": "ethereum",
  "last_run_date": "2026-06-23",
  "last_data_load_date": "2026-06-19",
  "latest_available_source_date": "2026-06-19",
  "observed_lag_days": 4,
  "reason_code": "source_not_newer_than_published",
  "reason": "No newer complete data is currently available from the upstream AWS source.",
  "source_is_newer_than_published": false,
  "source_is_not_newer_than_published": true
}
```

The correct customer-facing interpretation is:

> Ethereum data is older than the normal daily expectation, but AWS does not currently expose a newer complete Ethereum source day. This is source-limited freshness, not necessarily a failed publication pipeline.

The UI should therefore show this as explained staleness or warning, not as a silent failure and not as an unexplained stale date.

---

## 7. Files and areas changed

### 7.1 Source freshness probe

A source freshness probe was added under the pipeline tooling:

```text
pipeline/tools/probe_source_freshness.py
```

Purpose:

- Inspect AWS public blockchain S3 prefixes.
- Determine the latest visible and latest effective complete source dates.
- Compare source availability against the published dataset.
- Write `data/published/v1/source-freshness.json`.

### 7.2 Daily pipeline integration

The daily pipeline script was updated:

```text
run-daily-pipeline.ps1
```

Purpose:

- Run the source freshness probe after published metadata harmonization.
- Ensure the generated freshness report is included in the published dataset before web publication/commit.

### 7.3 Status API integration

The public status endpoint was updated:

```text
web-v1-app/src/app/api/v1/status/route.ts
```

Purpose:

- Read `data/published/v1/source-freshness.json`.
- Attach `source_freshness` to each chain row.
- Include `freshness_explanation`.
- Downgrade source-limited lag from hard fail to warn.
- Preserve hard fail if source has newer complete data than the published dataset.

### 7.4 Status page integration

The status page was updated:

```text
web-v1-app/src/app/status/page.tsx
```

Purpose:

- Display `Last run`, `Last data load`, and `Latest source`.
- Explain source-limited staleness.
- Show whether lag is due to source availability or pipeline delay.

### 7.5 Customer-facing UI integration

A reusable component was added:

```text
web-v1-app/src/components/SourceFreshnessExplainer.tsx
```

Purpose:

- Explain the three freshness dates pedagogically.
- Render chain-level freshness cards.
- Reuse the same explanation on the landing page and chain pages.
- Pull live freshness diagnostics from `/api/v1/status`.

The landing page integration was added in:

```text
web-v1-app/src/components/landing/LandingHero.tsx
```

The chain-page integration was added in:

```text
web-v1-app/src/app/chains/[chain]/page.tsx
```

Purpose:

- Make freshness explanations visible to customers outside `/status`.
- Ensure a user on `/chains/ethereum` sees why Ethereum data is older.
- Ensure a user on the landing page understands the meaning of the three dates before reading chain data.

---

## 8. Production validation checklist

After deployment, verify the following manually.

### 8.1 API status check

Run:

```powershell
Invoke-RestMethod "https://www.urdatlas.com/api/v1/status" |
  Select-Object -ExpandProperty chains |
  Where-Object { $_.chain -eq "ethereum" } |
  ConvertTo-Json -Depth 10
```

Expected Ethereum behavior:

```text
status: warn
source_freshness.reason_code: source_not_newer_than_published
source_freshness.last_run_date: current probe run date
source_freshness.last_data_load_date: latest published Ethereum date
source_freshness.latest_available_source_date: latest complete AWS Ethereum source date
freshness_explanation: explains source-limited freshness
```

### 8.2 Landing page check

Open:

```text
https://www.urdatlas.com/
```

Confirm that the customer sees a freshness explanation section that explains:

- Last run
- Last data load
- Latest source
- why these dates can differ

### 8.3 Ethereum chain page check

Open:

```text
https://www.urdatlas.com/chains/ethereum
```

Confirm that the page explains why Ethereum is old when source-limited:

```text
Last run:        2026-06-23
Last data load:  2026-06-19
Latest source:   2026-06-19
Reason:          No newer complete data is currently available from the upstream AWS source.
```

### 8.4 Status page check

Open:

```text
https://www.urdatlas.com/status
```

Confirm that Ethereum is not presented as an unexplained hard failure when AWS itself has no newer complete source date.

---

## 9. Commands used for validation

The following local commands were used during remediation:

```powershell
cd D:\css\main\web-v1-app
npm run build
npm run check:audit-gates:no-build
```

The audit-gate runner executes:

```text
Product boundary audit
API contract audit
Calculation correctness audit
Publication integrity audit
```

Successful result:

```text
=== Audit gate runner passed ===
```

---

## 10. Remaining non-blocking warnings

The following warnings were observed and are not currently production-blocking:

```text
Calculation correctness audit: 10 warning(s)
Publication integrity audit: 2 warning(s)
CSS optimizer: 4 warning(s)
```

CSS optimizer warnings include an existing `@import` ordering warning and selector warnings involving Tailwind-style arbitrary color selectors. These do not currently fail the build.

These should be treated as future cleanup/hardening work, not as blockers for production readiness.

---

## 11. Future hardening candidates

Recommended follow-up work:

1. Align naming between source lag policy and expected publication delay.
   - Example: L2 source lag may be 7 days while expected publication delay may be represented as 8 days depending on inclusive date arithmetic.
2. Add a small methodology/wiki entry for the three freshness dates.
3. Add a regression test for `/api/v1/status` classification:
   - source newer than published => fail
   - source not newer than published => warn
   - source unavailable => warn/unknown
4. Add a UI snapshot or integration test for Ethereum source-limited freshness.
5. Clean up existing CSS optimizer warnings.

---

## 12. Final conclusion

The remediation phase successfully moved Urd Atlas toward production readiness by making freshness transparent, auditable, and customer-explainable.

The key production-readiness improvement is that the product no longer treats stale-looking chain data as a single undifferentiated failure mode. It now distinguishes:

```text
Pipeline behind source
Source has no newer complete day
Source check unavailable
```

and exposes this distinction through the API, status page, landing page, and chain pages.

Assuming the latest commit is pushed, Vercel deploy is green, and the daily pipeline has generated `source-freshness.json`, the application is production-ready according to the audit and product-boundary criteria completed in this phase.
