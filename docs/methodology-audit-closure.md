# Methodology and data-quality audit closure

This document records the engineering controls added for the methodology/data-quality audit. It distinguishes executable safeguards, scheduled operational checks and human review so a green CI run cannot be mistaken for evidence that an external service or reviewer has already run.

## Core engineering controls

| Requirement | Engineering closure |
| --- | --- |
| Repository scratch-file hygiene | Temporary/scratch artifacts were removed and repository hygiene is enforced by the scratch-file and repository-hygiene checks. |
| Native-unit integrity | `pipeline/tools/validate_native_units.py` validates native-denomination guardrails against published data and runs in CI. |
| Threshold sensitivity | `pipeline/tools/audit_threshold_sensitivity.py` replays the published evidence surface under ±20% threshold perturbations and is executed in CI. |
| Evidence-score semantics | Public surfaces use Evidence score as the canonical term, expose explicit uncalibrated semantics, and retain `confidence_score` only as a backward-compatible API alias. |
| Analog-distance robustness | `pipeline/tools/audit_analog_distance.py` compares the production robust-Euclidean ranking with a regularised Mahalanobis alternative across historical observations and fails on extreme ranking instability. The audit does not silently switch the production metric. |
| Independent regime interpretation review | A reviewer-neutral protocol, canonical CSV schema and executable validator are included. CI validates the protocol machinery; actual independent review remains a human activity and must be recorded separately. |
| Raw-source column selection | `pipeline/tools/audit_feature_source_selection.py` pins feature-builder raw-column precedence so a code-side source migration cannot happen silently. |

## Residual audit list closed in the consolidated 2026-08-24 pass

The residual list used the original audit IDs below. Those IDs are preserved here to avoid confusing them with the shorter engineering-control table above.

| Original ID | Residual finding | Closure |
| --- | --- | --- |
| REQ-04 | Confidence/evidence terminology | Closed by the Evidence-score terminology contract and CI gate. |
| REQ-06 | External data cross-check | `pipeline/tools/audit_external_crosscheck.py` compares the newest overlapping BTC/ETH `tx_count_daily` observations with Coin Metrics Community `TxCnt`. `.github/workflows/external-data-crosscheck.yml` runs it daily and fails on >10% material divergence. The external series is validation-only and never feeds classification. |
| REQ-07 | Schema-drift alerting | `.github/workflows/l2-source-schema-probe.yml` now runs daily against live public Arbitrum/Base parquet shards. `pipeline/tools/audit_live_l2_schema_report.py` converts the probe into a failing compatibility gate when core transaction/value/address/fee or block-time source paths disappear. |
| REQ-08 | Mahalanobis assessment | Closed by `pipeline/tools/audit_analog_distance.py`; production remains robust Euclidean unless a separately reviewed methodology change is made. |
| REQ-09 | Longer baseline context | `pipeline/tools/audit_baseline_context.py` compares the 45-day production analog baseline with 90/180-day robust-z context across published history. CI requires at least 50% directional agreement. Production stays at 45 days; any baseline change must be explicit and versioned. |
| REQ-10 | Conservative-bias documentation | `docs/conservative-bias.md` defines the publication bias precisely and `pipeline/tools/audit_conservative_bias.py` enforces low-variance neutralization and low-evidence withholding in CI. |
| REQ-12 | Windows/180-minute pipeline decision | `docs/pipeline-runner-decision.md` explicitly retains `windows-latest` and the 180-minute hard circuit breaker, with migration criteria. `pipeline/tools/audit_pipeline_runner_contract.py` prevents the workflow and decision record from silently diverging. |

## CI contract

The main CI workflow runs all deterministic code-verifiable controls before the production build. A change to methodology, source-field precedence, public score semantics, baseline context or production runner contract therefore requires the corresponding control/documentation to move in the same reviewed commit.

The two checks that require live upstream data are intentionally scheduled outside ordinary deploy CI:

- the independent BTC/ETH data cross-check; and
- the live Arbitrum/Base source-schema probe.

This keeps a temporary third-party/public-source outage from making an otherwise valid web deployment fail while still producing a visible GitHub Actions failure when an operational validation detects drift.

## Human follow-up

Independent regime interpretation remains a genuinely human assessment. The repository contains the protocol and validator, but tooling alone is not recorded as expert sign-off.
