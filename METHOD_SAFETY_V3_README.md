# Urd Atlas JSON Method Safety v3

This patch is the final public-explainability hardening layer after v2.

It does **not** download raw/parquet data and does **not** rebuild Gold/Derived.
It keeps the v2 profile-aware regime/scorecard logic, then fixes the remaining
problem: public `status.one_liner` could say `Demand: Normal; Friction: Normal;
Capacity: Balanced` while the label was `CHEAP`, `HEATING`, or `CONGESTED`.

## What this patch changes

- `api/main.py`
  - Replaces `_status_from_regime_and_scorecard`.
  - `status.one_liner` now explains the actual label.
  - If `regime.sanity.support_basis = regime_axes`, the one-liner uses regime-axis evidence instead of neutral scorecard text.
  - Adds `status.explanation_support` with basis, scorecard summary and regime-axis summary.

- `pipeline/tools/validate_meta_methodology_safety.py`
  - Still validates label support against profile-aware scorecard or regime axes.
  - Also validates public one-liners.
  - Fails if a non-STABLE label has a neutral-only one-liner.

- Includes the v2 files for scorecard/regime alignment and web-v1-app sync support.

## Run after installing

From repo root:

```cmd
cd /d D:\css\main
python pipeline\tools\regenerate_json_safe.py
```

Expected ending:

```text
[validate_meta_methodology_safety] OK
[regenerate_json_safe] DONE. Regenerated JSON only.
```

Then restart web:

```cmd
cd /d D:\css\main\web-v1-app
npm run dev
```

## Critical invariant

A non-STABLE label must never be published with a neutral-only public explanation.

Examples that should now fail validation:

```text
CHEAP + Demand: Normal; Friction: Normal; Capacity: Balanced
HEATING + Demand: Normal; Friction: Normal; Capacity: Balanced
CONGESTED + Demand: Normal; Friction: Normal; Capacity: Balanced
```

Examples that should pass:

```text
Lower-friction regime: regime-axis evidence shows low friction from median transaction fee, with no high capacity pressure.
Demand-led heating: regime-axis evidence shows elevated demand with a heating trend from transaction count.
Congested regime: regime-axis evidence shows elevated friction and capacity pressure.
```
