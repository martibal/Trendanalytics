# Phase 1 Item 15 - Data Quality and Caveat Documentation

Status: PASS
Checked at UTC: 2026-06-22T06:19:02Z
Git HEAD checked: f43196df2

## Scope

This evidence covers the open-market readiness requirement that data-quality, freshness, lag, missing-data, confidence, and caveat documentation is visible before launch.

## Public-facing surfaces checked

The following public/customer-facing surfaces were checked:

- web-v1-app/src/app/status/page.tsx
- web-v1-app/src/app/status/status-page.tsx
- web-v1-app/src/app/about/page.tsx
- web-v1-app/src/app/about/about-page.tsx
- web-v1-app/src/app/api-docs/page.tsx
- web-v1-app/src/app/api-docs/getting-started/page.tsx
- web-v1-app/src/app/api-docs/getting-started/getting-started-page.tsx
- web-v1-app/src/app/api-docs/schema/page.tsx
- web-v1-app/src/app/api-docs/samples/page.tsx
- web-v1-app/src/app/api-docs/workflows/page.tsx
- web-v1-app/src/app/methodology/changelog/page.tsx
- web-v1-app/src/app/methodology/boundaries/page.tsx

## Operator/runbook surfaces checked

The following operator/support surfaces were checked:

- docs/runbooks/data-stale-or-missing.md
- docs/runbooks/daily-pipeline-failure.md
- docs/runbooks/production-alerts-and-observability.md
- docs/runbooks/README.md
- docs/confidence_v2_methodology.md

## Coverage observed

The documentation covers:

- Publication freshness.
- Chain-relative lag.
- Chain-specific expected delay policy.
- The distinction between health/freshness and evidence confidence.
- Confidence score interpretation.
- Data-quality score interpretation.
- Coverage factor interpretation.
- Missing-data handling.
- Stale or missing published data handling.
- Expected upstream lag for slower chains.
- As-of dates as the temporal anchor.
- Public product boundaries: no price data, no forecasts, and no advice.
- Operator caveats: do not present stale data as fresh, do not hide lag, do not fabricate confidence/regime values, and do not overpromise future freshness.

## Public-facing examples observed

The status page explains that:

- Health is freshness relative to expected cadence.
- Confidence is evidence quality for the published label.
- Freshness and confidence are separate dimensions.
- BTC and ETH are expected to publish roughly daily.
- Arbitrum and Base are intentionally published with an expected delay.
- Lag must be interpreted relative to chain-specific policy.

The API schema documentation explains that:

- confidence.confidence_score is an evidence-quality measure.
- confidence.data_quality_score reflects completeness, recent data, history depth, and freshness versus chain policy.
- confidence.lag_days_vs_utc_today is a freshness diagnostic and should not be confused with confidence.
- confidence.missing indicates that the confidence layer could not be computed.
- scorecard coverage_factor fields explain how much input coverage exists for each axis.

The About and API docs state the product boundary:

- No price data.
- No forecasts.
- No recommendations or advice.
- Outputs are descriptive on-chain reference data.

## Result

PASS.

Data-quality and caveat documentation is present across public status, API schema, API getting-started, samples/workflows, about/methodology pages, and support runbooks. The documentation explicitly separates freshness from confidence, explains chain-specific lag policy, exposes coverage/missing/confidence concepts, and preserves the no-price/no-forecast/no-advice boundary.

## Evidence hygiene

This evidence file contains only documentation paths and readiness notes. It does not contain customer records, protected browser material, provider payloads, or private redirect URLs.
