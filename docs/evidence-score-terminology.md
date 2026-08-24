# Evidence score terminology

This note exists to make the public contract explicit: Urd Atlas uses **evidence score** as the canonical public name for the 0–1 support score attached to a published network-state classification.

The score combines chain-specific data quality with label-specific evidence under the current methodology and is calculated from the existing Meta confidence components. It is an **uncalibrated evidence-support measure**, so `0.80` indicates stronger support than `0.50` under the model; it does not mean that the label is correct 80% of the time.

New public surfaces use `evidence_score`, `evidence_band`, “Evidence score”, and “Strong / Moderate / Limited evidence”. Existing published artifacts and integrations retain historical fields such as `confidence.confidence_score`, `label_confidence_score`, `effective_confidence`, and the legacy `confidence_band` enum for compatibility and traceability; the numeric calculation is unchanged.

Public API responses that expose a legacy confidence-named score also expose machine-readable semantics stating that `evidence_score` is the canonical term, the range is `0..1`, calibration is `uncalibrated`, and probability interpretation is `false`.

Current evidence presentation bands are `>=0.70` Strong, `>=0.40 and <0.70` Moderate, and `<0.40` Limited. Below the existing 0.40 publish gate the normal regime label is withheld as `UNKNOWN/DEGRADED`.

If the score is later calibrated against an independently defined out-of-sample correctness target, that change must be versioned and validated before probability language is introduced.
