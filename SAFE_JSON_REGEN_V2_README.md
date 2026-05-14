# Urd Atlas safe JSON regeneration patch v2

This patch fixes the second-order issue where the first safety patch removed the false `CONGESTED` problem but flattened too many labels into `STABLE`.

## What changed

- `api/market_scorecard.py` is now profile-aware and aligned with `api/regime_engine.py`.
- L2 scorecard friction uses `median_tx_fee_native` directly instead of invalid fee-burden ratios when `median_tx_value_native = 0`.
- BTC scorecard friction uses `median_tx_fee_native` directly instead of becoming neutral when `median_tx_value_native` is missing.
- Low-variance / constant series are still neutralized and cannot drive labels.
- `reconcile_regime_with_scorecard()` no longer blindly degrades non-STABLE labels when scorecard coverage is missing.
- `validate_meta_methodology_safety.py` validates against profile-aware `scorecard.regime_support` and regime axes.
- `regenerate_json_safe.py` now detects `web-v1-app`, syncs canonical `data/published/v1` into `web-v1-app/public/data/published/v1`, and runs the Regime Brief builder if it exists there.
- `sync_web_data.ps1` now supports `web-v1-app` and mirrors the published data folder.

## Files included

```text
api/market_scorecard.py
api/regime_engine.py
pipeline/tools/validate_meta_methodology_safety.py
pipeline/tools/regenerate_json_safe.py
pipeline/tools/sync_web_data.ps1
regenerate-json-safe.ps1
SAFE_JSON_REGEN_V2_README.md
```

## How to run

From repo root:

```powershell
.\regenerate-json-safe.ps1
```

or:

```cmd
python pipeline\tools\regenerate_json_safe.py
```

For a shorter smoke test:

```powershell
.\regenerate-json-safe.ps1 -Start 2026-03-01
```

## What it does not do

It does not download raw/parquet data.
It does not rebuild Gold or Derived parquet.
It only rebuilds Meta JSON from existing local Gold artifacts, validates the labels, syncs web-public data, and rebuilds briefs when the brief builder is present.

## Expected result

The output should no longer be "almost all CONGESTED" and should no longer be "almost all STABLE". Labels should become more varied while remaining methodologically explainable.

You should see:

```text
[validate_meta_methodology_safety] OK
```

Then restart Next.js:

```cmd
cd /d D:\css\main\web-v1-app
npm run dev
```
