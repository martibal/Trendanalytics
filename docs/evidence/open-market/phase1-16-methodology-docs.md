# Phase 1 Item 16 - Methodology Documentation

Status: PASS
Checked at UTC: 2026-06-22T06:21:37Z
Git HEAD checked: a04a37fb4

## Scope

This evidence covers the open-market readiness requirement that methodology documentation is present for customers and operators before launch.

## Methodology surfaces checked

The following methodology and explanation surfaces were checked:

- docs/confidence_v2_methodology.md
- web-v1-app/src/app/methodology/ai-controls/page.tsx
- web-v1-app/src/app/methodology/boundaries/page.tsx
- web-v1-app/src/app/methodology/changelog/page.tsx
- web-v1-app/src/app/methodology/fields/page.tsx
- web-v1-app/src/app/methodology/freshness/page.tsx
- web-v1-app/src/app/wiki
- web-v1-app/src/app/api-docs/schema/page.tsx
- web-v1-app/src/app/about/page.tsx
- web-v1-app/src/app/about/about-page.tsx

## Methodology coverage observed

The documentation covers:

- Regime classification.
- Confidence scoring.
- Confidence gate behavior.
- Data-quality scoring.
- Label-confidence scoring.
- Scorecard dimensions.
- Scorecard confidence degradation.
- Regime drivers.
- Robust z-score driver interpretation.
- Percentile / threshold interpretation.
- Moving-average concepts.
- Coverage factors.
- Publication freshness.
- Chain-specific lag policy.
- Basic and Advanced explanations.
- Methodology versioning and changelog handling.
- Public methodology boundaries.
- Deterministic publication and verification controls.
- Product boundaries: no price data, no forecasts, and no advice.

## Specific evidence observed

Confidence v2 documentation states that the public composite is:

- confidence_score = sqrt(data_quality_score * label_confidence_score)

It also documents that data quality is profile-aware and includes required metric coverage, recent required metric coverage, history depth, and freshness versus chain policy.

Methodology field documentation explains:

- confidence.confidence_score
- confidence.methodology_version
- confidence.data_quality_score
- confidence.label_confidence_score
- confidence.candidate_label
- confidence.components.data_quality.required_metrics
- confidence.components.data_quality.structurally_not_applicable
- confidence.components.data_quality.optional_not_penalized
- regime.label
- regime.determinism_hash
- scorecard.dimensions.<axis>.score
- scorecard.dimensions.<axis>.score_raw
- regime.drivers[].z_robust

Freshness methodology documentation explains:

- Freshness and confidence are separate dimensions.
- Lag is interpreted against chain-specific expected cadence.
- BTC and ETH have daily-style expected cadence.
- Arbitrum and Base have slower expected cadence.
- Freshness fields include lag relative to row date and runtime UTC date.

Methodology changelog documentation explains:

- Customer-facing changes to methodology, interpretation, JSON contracts, thresholds, and historical corrections.
- Confidence v2 as an active methodology update.
- Separation between docs-only changes and output-affecting methodology changes.
- Historical republish and comparability notes.

Methodology boundary documentation explains:

- What public methodology discloses.
- What public methodology does not disclose.
- Publicly relevant thresholds and gates.
- Worked examples for deterministic and gated outputs.
- Known interpretive limits such as daily label changes and customer-side duration filtering.

## Result

PASS.

Methodology documentation is present and covers the required customer-facing and operator-facing concepts for regime classification, confidence, data quality, scorecard, drivers, freshness, coverage, versioning, and public product boundaries.

## Evidence hygiene

This evidence file contains only documentation paths, methodology topics, and readiness notes. It does not contain customer records, protected browser material, provider payloads, or private redirect URLs.
