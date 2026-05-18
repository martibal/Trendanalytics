# Confidence v2 methodology

Confidence v2 keeps the public composite formula:

```text
confidence_score = sqrt(data_quality_score * label_confidence_score)
```

The change is in the two inputs.

## Data quality

Data quality is now profile-aware. Each chain is scored against the evidence surface that is actually used for that chain's regime classification.

- Structurally non-applicable fields are excluded from the denominator.
- Optional fields remain visible in Gold/Meta but do not reduce confidence when they are not part of the current regime evidence surface.
- BTC is scored on BTC-relevant evidence: transactions, blocks, fee pressure, and block timing.
- ETH is scored on ETH L1 evidence: demand, fee/friction, execution failures, gas utilization, active addresses, and block timing.
- Base and Arbitrum are scored on the L2 evidence surface and are not penalized for hidden L1-only gas-utilization / failed-transaction semantics.

Weights:

```text
data_quality_score =
  0.35 * current_required_metric_coverage
+ 0.25 * recent_required_metric_coverage_30d
+ 0.15 * recent_density_30d
+ 0.15 * history_depth_180d
+ 0.10 * freshness_vs_chain_policy
```

## Label confidence

Label confidence is now label-specific and uses raw evidence rather than confidence-degraded display scores.

- HEATING: demand rule margin, demand driver strength, trend strength, axis coherence, and available persistence.
- CONGESTED: friction/capacity pressure, congestion driver strength, axis coherence, severity margin, and available persistence.
- CHEAP: low-friction rule margin, low-friction driver strength, absence of tight capacity, axis coherence, and available persistence.
- STABLE: neutrality, lack of strong drivers, axis coherence, and available persistence.

Persistence is included only when the build context exposes prior-label run length. If unavailable, it is reported as not available and excluded from the weighted denominator rather than being invented.

## Candidate label

When the confidence gate withholds a label, Meta now exposes:

```json
"confidence": {
  "candidate_label": {
    "label": "HEATING",
    "label_confidence_score": 0.34,
    "withheld_by_confidence_gate": true
  }
}
```

This preserves the descriptive gate while making the evidence surface more transparent.

## Audit

Run:

```powershell
python pipeline/tools/audit_confidence_v2.py --root . --max-days 365
```

Outputs:

```text
reports/confidence_v2_audit.json
reports/confidence_v2_audit.csv
```

Any confidence increase should be explainable by one or more explicit reasons:

- profile-aware data quality increase
- label-specific evidence increase
- structurally non-applicable fields excluded
- optional fields not penalized
- raw evidence used instead of confidence-degraded display score
