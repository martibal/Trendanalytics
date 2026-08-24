# Independent regime interpretation review protocol

## Purpose

This protocol adds a human interpretability check to the deterministic regime engine without turning reviewer opinion into a hidden model input. The published classifier remains deterministic; the review tests whether an experienced analyst can read the underlying chain conditions and regard the published state as a defensible descriptive summary.

## Sampling

Use a stratified historical sample across Bitcoin, Ethereum, Arbitrum and Base. Include every published state that exists for the chain, dates close to regime transitions, high- and moderate-evidence observations, and a smaller random sample of ordinary dates. Reviewers must see the date, chain, relevant Gold/Derived measurements, scorecard axes and drivers. They should not see the published regime until their own assessment has been recorded when a blind review is practical.

## Review fields

The canonical CSV schema is `docs/regime-expert-review-template.csv`.

- `reviewer_assessment`: `agree`, `disagree`, `uncertain`, or `pending`.
- `reviewer_confidence`: `high`, `medium`, `low`, or `pending`.
- `reason`: short domain explanation grounded in the chain conditions for that date.

A disagreement is an audit result, not an instruction to overwrite a published historical row. Repeated disagreements concentrated in one state, chain or transition type should trigger a methodology review and, if the classifier changes materially, the normal methodology-version process.

## Validation

Run:

```bash
python pipeline/tools/validate_regime_expert_review.py path/to/completed-review.csv
```

The validator rejects incomplete rows unless `--allow-pending` is supplied and reports the agreement rate over completed reviews. CI validates the checked-in template and protocol machinery only; it does not represent that an external review has occurred.

## Completion criterion

A human-validation round is complete when the planned stratified sample has no pending rows, the validator passes, disagreements have been reviewed by category, and any resulting methodology decision is recorded. This operational review is deliberately separate from the code-quality gates so the repository never claims external expert sign-off that has not actually happened.
