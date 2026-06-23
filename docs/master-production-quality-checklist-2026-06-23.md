# Urd Atlas Master Production Quality Checklist

**Date:** 2026-06-23  
**Repository:** `martibal/Trendanalytics`  
**Application:** `web-v1-app`  
**Product:** Urd Atlas  
**Document purpose:** One consolidated checklist describing the quality, audit, billing, entitlement, publication, source-freshness, and production-readiness work completed across the project.

---

## 1. Executive summary

This document consolidates the broader production-readiness work done before and during the final source-freshness remediation phase.

The project has gone through a large quality-hardening process across the following areas:

1. Product-boundary safety and public-copy controls.
2. API contract and endpoint boundary auditing.
3. Calculation correctness auditing.
4. Publication integrity auditing.
5. Billing launch readiness and Stripe integration hardening.
6. API key lifecycle, usage, and entitlement controls.
7. Authenticated file delivery and subscription-gated access.
8. Account dashboard and customer billing visibility.
9. Source freshness diagnostics and customer-facing stale-data explanation.
10. Production build and deployment validation.

At the end of the latest phase, the application had:

```text
Build:                         PASS
Product boundary audit:         PASS
API contract audit:             PASS
Calculation correctness audit:   PASS with non-blocking warnings
Publication integrity audit:     PASS with non-blocking warnings
```

The remaining warnings are non-blocking and are tracked as future hardening work rather than production blockers.

---

## 2. Current production readiness conclusion

Urd Atlas is production-ready under the quality criteria used in this remediation work, assuming the latest deployed build is green and the daily data pipeline continues to generate the expected published artifacts.

The strongest production-readiness improvement is that the product no longer treats stale-looking data as one undifferentiated failure mode. It now distinguishes:

```text
Pipeline behind source
Source has no newer complete day
Source check unavailable
```

This is now exposed through the generated data artifact, API, status page, landing page, and chain pages.

---

## 3. Master checklist

### 3.1 Product-boundary and public-copy quality

| Item | Status | Evidence / outcome |
|---|---:|---|
| No price data | Done | Product copy and audit rules preserve the no-price-data boundary. |
| No forecasts | Done | Public-copy guard passed. |
| No recommendations or advisory language | Done | Public-copy guard passed across product-boundary rules. |
| Descriptive language only | Done | Product copy remains observational and non-normative. |
| Customer-facing explanations separated from advice | Done | Freshness, confidence, and regime explanations are framed as data quality and state context, not advice. |
| Public copy guard | Passed | `npm run check:public-copy-guard` passed in the audit-gate runner. |

### 3.2 API contract and endpoint boundary quality

| Item | Status | Evidence / outcome |
|---|---:|---|
| Endpoint inventory audit | Passed | `npm run check:api-contract` passed. |
| Dashboard endpoint boundary | Done | Dedicated dashboard endpoint boundary audit work was committed. |
| `/api/v1/status` includes source freshness | Done | Endpoint returns `source_freshness` and `freshness_explanation` per chain. |
| Source-limited lag classification | Done | Source-limited stale data is warn/explained, not hard fail. |
| Pipeline-behind-source classification | Done | If AWS source is newer than published data, status can fail as a publication delay. |
| API response remains non-advisory | Done | Endpoint returns operational data-quality context, not market guidance. |

### 3.3 Calculation correctness quality

| Item | Status | Evidence / outcome |
|---|---:|---|
| Calculation correctness audit runner | Passed | `npm run check:calculation-correctness` passed. |
| Warning tracking | Done | Audit passed with 10 warnings, treated as non-blocking follow-up items. |
| Published calculations remain source-of-truth | Done | UI reads published JSON rather than inventing browser-side classification. |
| Deterministic regime/status outputs | Done | UI presents published meta/status artifacts and documented diagnostics. |
| Confidence separated from freshness | Done | UI distinguishes evidence quality from publication freshness. |

### 3.4 Publication integrity quality

| Item | Status | Evidence / outcome |
|---|---:|---|
| Publication integrity audit runner | Passed | `npm run check:publication-integrity` passed. |
| Warning tracking | Done | Audit passed with 2 warnings, treated as non-blocking. |
| Published dataset manifest | Done | Dataset manifest remains the published reference surface. |
| Chain-level published artifacts | Done | Gold, Derived, Meta, Briefs and status-related artifacts are part of the publication model. |
| Source freshness artifact | Done | `data/published/v1/source-freshness.json` added to publication flow. |
| Pipeline integration | Done | `run-daily-pipeline.ps1` invokes source freshness probing after metadata harmonization. |

### 3.5 Billing launch readiness

| Item | Status | Evidence / outcome |
|---|---:|---|
| Billing launch checklist contract | Done | Billing launch checklist contract work committed earlier. |
| Billing launch gate | Done | Billing launch gate and documentation work committed earlier. |
| Billing launch gate coverage | Done | Coverage audit work committed earlier. |
| Billing launch gate read-only boundary | Done | Read-only boundary audit work committed earlier. |
| Final billing launch readiness audit | Done | Final billing launch readiness and consolidation work committed earlier. |
| Billing runtime environment documentation | Done | Runtime environment documentation/evidence committed. |
| Stripe billing mode guard | Done | Stripe billing mode guard added earlier. |
| Self-service billing management evidence | Done | Self-service billing management evidence committed earlier. |

### 3.6 Stripe checkout and webhook quality

| Item | Status | Evidence / outcome |
|---|---:|---|
| Checkout billing route audit | Done | Publication audit extended for checkout billing routes. |
| Checkout session output/cache predicates | Done | Checkout session output and cache audit predicates fixed earlier. |
| Checkout entitlement contract | Done | Checkout webhook entitlement contract audit committed. |
| Stripe webhook response status audit | Done | Stripe webhook response status audit committed. |
| Stripe webhook stale processing recovery | Done | Stale processing recovery audit committed. |
| Webhook import compatibility | Done | Stripe webhook audit import compatibility preserved. |
| Public billing portal error details minimized | Done | Public error surface reduced in earlier billing hardening. |
| Billing portal pre-auth rate limit | Done | Pre-auth rate limit added to billing portal route. |

### 3.7 API key lifecycle, usage, and entitlement quality

| Item | Status | Evidence / outcome |
|---|---:|---|
| API key lifecycle boundary | Done | API key lifecycle boundary audit committed. |
| API key usage rate limit | Done | API key usage rate-limit audit committed. |
| Authenticated file delivery entitlement | Done | Authenticated file delivery entitlement audit committed. |
| Subscription-gated API/file access | Done | Entitlement and billing contract checks have been audited. |

### 3.8 Account dashboard and customer visibility

| Item | Status | Evidence / outcome |
|---|---:|---|
| Account dashboard subscription display | Done | Subscription display boundary audit committed. |
| Dashboard endpoint boundary | Done | Dashboard endpoint boundary audit alignment committed. |
| Self-service billing management | Done | Customer billing-management evidence committed. |
| Freshness explanation in customer UI | Done | Source freshness explainer added to landing and chain pages. |

### 3.9 Source freshness and data staleness explanation

| Item | Status | Evidence / outcome |
|---|---:|---|
| Source freshness probe | Done | `pipeline/tools/probe_source_freshness.py` added. |
| Source freshness artifact | Done | `data/published/v1/source-freshness.json` generated. |
| Three-date model | Done | `Last run`, `Last data load`, and `Latest source` exposed and explained. |
| Ethereum source-limited lag | Done | Ethereum can show old data with reason: AWS has no newer complete source day. |
| Status API source logic | Done | `/api/v1/status` includes source freshness and explanation. |
| Status page explanation | Done | `/status` shows dates and freshness note. |
| Landing page explanation | Done | `SourceFreshnessExplainer` added to public landing UI. |
| Chain page explanation | Done | `SourceFreshnessExplainer` added to each chain page, e.g. `/chains/ethereum`. |

---

## 4. Earlier audit work identified in Git history

The following earlier quality-remediation work was identified from commit history and is incorporated into this consolidated checklist.

### 4.1 Billing and commercial launch hardening

Earlier commits show a dedicated billing launch checklist and launch-gate track:

```text
90dec1550 Add billing launch checklist contract
4a251472 Add billing launch gate and documentation
c6edaa13 Audit billing launch gate coverage
e40ecb0c Audit billing launch gate read-only boundary
91c1cc89 Add final billing launch readiness audit
a3b566a4 Add final billing launch checklist consolidation audit
```

Additional billing hardening identified in history:

```text
69fb5753 Add Stripe billing mode guard
680f64a3 Extend publication audit for checkout billing routes
022d4abd Extend publication audit for Prisma billing data model
c283ff49 Extend publication audit for Stripe billing environment
544a5d4a Document billing runtime environment variables
99ed406a Record verified billing launch evidence
4b4eaaf4 docs: add self-service billing management evidence
```

### 4.2 Stripe checkout and webhook hardening

Earlier commits show a dedicated Stripe checkout/webhook audit track:

```text
720fd095 Fix checkout plan validation audit predicate
0d0555dc Fix checkout cache audit template literals
b5b3aac2 Fix checkout session output audit predicate
f9df5b04 Rebuild Stripe webhook response cache audit
1778cc16 Add Stripe webhook response status audit
689508e5 Add Stripe webhook stale processing recovery audit
172a34c5 Add checkout webhook entitlement contract audit
fccb4e1a Keep Stripe webhook audit import compatibility
```

### 4.3 API key, entitlement, and file delivery hardening

Earlier commits show a dedicated key/entitlement track:

```text
a963c1df Add API key lifecycle boundary audit
9296fd74 Add API key usage rate limit audit
51f38164 Add authenticated file delivery entitlement audit
```

### 4.4 Account dashboard and endpoint-boundary hardening

Earlier commits show account/dashboard and endpoint-boundary work:

```text
a588903b Add account dashboard subscription display boundary audit
1848dacc fix: align dashboard endpoint boundary audit
```

### 4.5 Production readiness source freshness work

The latest production-readiness work added source-freshness diagnostics and customer-facing explanations:

```text
ee38963f feat: explain source freshness dates in customer UI
c818273c docs: document production readiness audit remediation
```

---

## 5. Current validation commands

The following commands are the current local validation set:

```powershell
cd D:\css\main\web-v1-app

npm run build
npm run check:audit-gates:no-build
```

The audit-gate runner executes:

```text
1. Product boundary audit
2. API contract audit
3. Calculation correctness audit
4. Publication integrity audit
```

Successful expected result:

```text
=== Audit gate runner passed ===
```

---

## 6. Production validation checklist

After deploy, verify:

### 6.1 Landing page

Open:

```text
https://www.urdatlas.com/
```

Confirm:

- Freshness explanation appears.
- The UI explains `Last run`, `Last data load`, and `Latest source`.
- The language remains descriptive, not advisory.

### 6.2 Ethereum chain page

Open:

```text
https://www.urdatlas.com/chains/ethereum
```

Confirm:

- Ethereum shows freshness dates.
- If source-limited, the page explains that AWS has no newer complete source day.
- It does not imply a market signal or recommendation.

### 6.3 Status page

Open:

```text
https://www.urdatlas.com/status
```

Confirm:

- Per-chain freshness is visible.
- Ethereum source-limited lag is warning/explained, not unexplained failure.
- Hard failure is reserved for actual publication lag behind available source data.

### 6.4 Status API

Run:

```powershell
Invoke-RestMethod "https://www.urdatlas.com/api/v1/status" |
  Select-Object -ExpandProperty chains |
  Where-Object { $_.chain -eq "ethereum" } |
  ConvertTo-Json -Depth 10
```

Expected source-limited Ethereum shape:

```json
{
  "chain": "ethereum",
  "status": "warn",
  "source_freshness": {
    "reason_code": "source_not_newer_than_published",
    "source_is_newer_than_published": false,
    "source_is_not_newer_than_published": true
  }
}
```

---

## 7. Non-blocking warnings still tracked

The latest quality run reported non-blocking warnings:

```text
Calculation correctness audit: 10 warnings
Publication integrity audit: 2 warnings
CSS optimizer: 4 warnings
```

These are not production blockers under the current audit-gate policy, but they should remain visible as follow-up hardening items.

---

## 8. Recommended future checklist hardening

Future work should include:

1. Add regression tests for `/api/v1/status`:
   - source newer than published => fail
   - source not newer than published => warn
   - source check unavailable => warn/unknown
2. Add a methodology/wiki page section for the three freshness dates.
3. Add a UI snapshot/integration test for Ethereum source-limited freshness.
4. Clean up CSS optimizer warnings.
5. Align naming between source lag policy and expected publication delay.
6. Keep billing/entitlement audit documentation updated as Stripe/product plans evolve.
7. Add a release checklist that links:
   - audit-gate output
   - build output
   - latest source-freshness artifact
   - Vercel deployment
   - GitHub Actions daily pipeline run

---

## 9. Final consolidated status

The full quality-hardening work can be summarized as:

```text
Product boundary:       Hardened and passing
API contract:           Hardened and passing
Calculations:           Audited and passing with tracked warnings
Publication integrity:  Audited and passing with tracked warnings
Billing launch:         Checklist, gate, docs, and evidence added
Stripe checkout:        Audited and hardened
Stripe webhooks:        Audited and hardened
API keys:               Lifecycle and usage audited
Entitlements:           File delivery and subscription access audited
Customer dashboard:     Subscription and billing visibility audited
Source freshness:       Probe, API, status, landing, and chain UI implemented
Production build:       Passing
Deployment readiness:   Ready after green Vercel deploy and pipeline publish
```

This document should be treated as the master checklist for the work completed to ensure Urd Atlas quality and production readiness through the current remediation phase.
