# Conservative publication bias

Urd Atlas is intentionally biased toward withholding or neutralizing weak evidence rather than manufacturing a more dramatic state.

This is a publication and interpretation policy, not a claim that the model is statistically conservative in every possible sense.

## Enforced invariants

1. **Low evidence is withheld.** When the supplied evidence score is below the configured publication threshold, the public regime becomes `UNKNOWN/DEGRADED` and the gate is exposed as `gated`.
2. **Non-informative distributions are neutralized.** Constant, near-constant, or insufficient historical series remain visible in the evidence surface but cannot create HIGH/LOW axis bands.
3. **Corroboration is required for stronger labels.** `CONGESTED`, `CHEAP`, and `HEATING` require the profile-specific axis evidence encoded in `api/regime_engine.py`; absence of that support falls back to `STABLE`.
4. **No probability interpretation is attached to the Evidence score.** It is an uncalibrated evidence-strength quantity, not a probability that the label is correct.
5. **Method changes are explicit.** A change to thresholds, baseline windows, source-selection precedence, or publication gates must be reviewed and versioned when it changes production semantics.

`pipeline/tools/audit_conservative_bias.py` executes the two failure-prone invariants that can be checked with deterministic synthetic data: low-variance neutralization and low-evidence withholding. CI runs that audit on every relevant code change.

## What this policy does not mean

`STABLE` does not mean “safe”, “good”, or “no risk”. `UNKNOWN/DEGRADED` does not mean that the network itself is degraded; it means the available evidence did not support publishing a stronger classification. These labels remain descriptive reference data, not investment recommendations.
