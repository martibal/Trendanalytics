# Methodology and data-quality audit closure

This document records the engineering controls added for the seven audit findings. It distinguishes executable safeguards from external validation activities so a green CI run cannot be mistaken for evidence that a human review has taken place.

| Requirement | Engineering closure |
| --- | --- |
| REQ-01 Repository scratch-file hygiene | Temporary/scratch artifacts were removed and repository hygiene is enforced by the scratch-file and repository-hygiene checks. |
| REQ-02 Native-unit integrity | `pipeline/tools/validate_native_units.py` validates native-denomination guardrails against published data and runs in CI. |
| REQ-03 Threshold sensitivity | `pipeline/tools/audit_threshold_sensitivity.py` replays the published evidence surface under ±20% threshold perturbations and is executed in CI. |
| REQ-04 Evidence-score semantics | Public surfaces use Evidence score as the canonical term, expose explicit uncalibrated semantics, and retain `confidence_score` only as a backward-compatible API alias. |
| REQ-05 Analog-distance robustness | `pipeline/tools/audit_analog_distance.py` compares the production robust-Euclidean ranking with a regularised Mahalanobis alternative across historical observations and fails on extreme ranking instability. The audit does not silently switch the production metric. |
| REQ-06 Independent regime interpretation review | A reviewer-neutral protocol, canonical CSV schema and executable validator are included. CI validates the protocol machinery; actual independent review remains a human activity and must be recorded separately. |
| REQ-07 Raw-source column drift | `pipeline/tools/audit_feature_source_selection.py` pins the raw-column precedence used by the feature builder and fails when the selection expressions change without an explicit contract update. It can also compare a captured upstream-schema snapshot with an expected selected raw field. |

## CI contract

The main CI workflow runs all code-verifiable controls above before the production build. A change to methodology, source-field precedence or public score semantics therefore requires the corresponding contract and documentation to move in the same reviewed commit.

## Operational follow-up that CI cannot manufacture

REQ-06 includes an independent human assessment. The repository now contains everything needed to run and validate that assessment, while the existence of the tooling alone is never treated as completed expert sign-off.
