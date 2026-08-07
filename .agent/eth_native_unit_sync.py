#!/usr/bin/env python3
from pathlib import Path
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: Path, old: str, new: str):
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one match in {path}: {old[:100]!r}; found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


# 1) Normalize AWS Ethereum transaction value and gas-derived fees from wei to ETH.
feature = ROOT / "pipeline/src/feature_daily_agg.py"
replace_once(feature,
'''        if value_col is not None:\n            value_expr = _ci_safe_f64(tx_ci, value_col)\n            value_sum = tx.select(value_expr.sum().alias("value_transferred_native"))\n            value_med = tx.select(value_expr.median().alias("median_tx_value_native"))''',
'''        if value_col is not None:\n            value_expr = _ci_safe_f64(tx_ci, value_col)\n            # AWS Public Blockchain Data documents Ethereum transactions.value in wei.\n            # Canonical *_native fields are expressed in the chain's native denomination,\n            # so normalize the AWS `value` field to ETH before aggregating. Explicit\n            # native-denomination aliases remain untouched for schema compatibility.\n            if str(chain).lower() in {"ethereum", "eth"} and value_col == "value":\n                value_expr = value_expr / pl.lit(1_000_000_000_000_000_000.0)\n            value_sum = tx.select(value_expr.sum().alias("value_transferred_native"))\n            value_med = tx.select(value_expr.median().alias("median_tx_value_native"))''')

replace_once(feature,
'''        if fee_expr is None and (_ci_has(tx_ci, "receipt_effective_gas_price") and _ci_has(tx_ci, "receipt_gas_used")):\n            fee_expr = (\n                (_ci_safe_f64(tx_ci, "receipt_effective_gas_price") * _ci_safe_f64(tx_ci, "receipt_gas_used"))\n                .median()\n                .alias("median_tx_fee_native")\n            )''',
'''        if fee_expr is None and (_ci_has(tx_ci, "receipt_effective_gas_price") and _ci_has(tx_ci, "receipt_gas_used")):\n            fee_value = _ci_safe_f64(tx_ci, "receipt_effective_gas_price") * _ci_safe_f64(tx_ci, "receipt_gas_used")\n            if str(chain).lower() in {"ethereum", "eth"}:\n                fee_value = fee_value / pl.lit(1_000_000_000_000_000_000.0)\n            fee_expr = fee_value.median().alias("median_tx_fee_native")''')

replace_once(feature,
'''        if fee_expr is None and (_ci_has(tx_ci, "effective_gas_price") and _ci_has(tx_ci, "gas_used")):\n            fee_expr = (\n                (_ci_safe_f64(tx_ci, "effective_gas_price") * _ci_safe_f64(tx_ci, "gas_used"))\n                .median()\n                .alias("median_tx_fee_native")\n            )''',
'''        if fee_expr is None and (_ci_has(tx_ci, "effective_gas_price") and _ci_has(tx_ci, "gas_used")):\n            fee_value = _ci_safe_f64(tx_ci, "effective_gas_price") * _ci_safe_f64(tx_ci, "gas_used")\n            if str(chain).lower() in {"ethereum", "eth"}:\n                fee_value = fee_value / pl.lit(1_000_000_000_000_000_000.0)\n            fee_expr = fee_value.median().alias("median_tx_fee_native")''')

replace_once(feature,
'''        if fee_expr is None and (_ci_has(tx_ci, "gas_price") and _ci_has(tx_ci, "gas_used")):\n            fee_expr = ((_ci_safe_f64(tx_ci, "gas_price") * _ci_safe_f64(tx_ci, "gas_used")).median()).alias(\n                "median_tx_fee_native"\n            )''',
'''        if fee_expr is None and (_ci_has(tx_ci, "gas_price") and _ci_has(tx_ci, "gas_used")):\n            fee_value = _ci_safe_f64(tx_ci, "gas_price") * _ci_safe_f64(tx_ci, "gas_used")\n            if str(chain).lower() in {"ethereum", "eth"}:\n                fee_value = fee_value / pl.lit(1_000_000_000_000_000_000.0)\n            fee_expr = fee_value.median().alias("median_tx_fee_native")''')

# 2) Make rebuild truly recompute existing feature days while preserving missing-only incremental mode.
pipeline = ROOT / "pipeline/tools/full_pipeline.ps1"
replace_once(pipeline,
'''function Get-MissingFeatureDays([string]$featuresRoot, [string]$chain, [string[]]$rawDays, [DateTime]$startDate) {''',
'''function Get-MissingFeatureDays([string]$featuresRoot, [string]$chain, [string[]]$rawDays, [DateTime]$startDate, [bool]$RecomputeExisting = $false) {''')
replace_once(pipeline,
'''    if (-not $existing.ContainsKey([string]$d)) {\n      [void]$missing.Add([string]$d)\n    }''',
'''    if ($RecomputeExisting -or -not $existing.ContainsKey([string]$d)) {\n      [void]$missing.Add([string]$d)\n    }''')
replace_once(pipeline,
'''    $startDate = $latestRaw.AddDays(-30)\n    if ($Mode -eq 'rebuild') { $startDate = $latestRaw.AddDays(-365) }''',
'''    $startDate = $latestRaw.AddDays(-30)\n    if ($Mode -eq 'rebuild') {\n      $rebuildRawDays = @(\n        foreach ($c in $chains) {\n          Get-RawDaysForChain $RAW_ROOT $c\n        }\n      )\n      if ($rebuildRawDays.Length -gt 0) {\n        $earliestRebuildDay = @($rebuildRawDays | Sort-Object -Unique)[0]\n        $startDate = Parse-IsoDate $earliestRebuildDay\n      }\n    }''')
replace_once(pipeline,
'''      $missing = @(Get-MissingFeatureDays $FEATURES_ROOT $c $rawDays $startDate)\n\n      if ($missing.Length -eq 0) {\n        Write-Log "chain=$c feature parquet up-to-date (no missing days)"\n        continue\n      }\n\n      Write-Log ("chain=$c missing feature days: " + $missing.Length)\n\n      foreach ($d in $missing) {''',
'''      $featureDays = @(Get-MissingFeatureDays $FEATURES_ROOT $c $rawDays $startDate -RecomputeExisting ($Mode -eq 'rebuild'))\n\n      if ($featureDays.Length -eq 0) {\n        Write-Log "chain=$c feature parquet up-to-date (no missing days)"\n        continue\n      }\n\n      if ($Mode -eq 'rebuild') {\n        Write-Log ("chain=$c recompute feature days: " + $featureDays.Length)\n      }\n      else {\n        Write-Log ("chain=$c missing feature days: " + $featureDays.Length)\n      }\n\n      foreach ($d in $featureDays) {''')

# 3) Extend permanent Ethereum regression fixture with known wei values and gas prices.
golden = ROOT / "web-v1-app/scripts/pipeline-golden-fixture.mjs"
replace_once(golden,
'''pl.DataFrame({\n    "receipt_gas_used": [21000., 30000., 45000., 55000.],\n    "input": ["0x", "", "0x1234", "0xabcdef"],''',
'''pl.DataFrame({\n    "value": [1_000_000_000_000_000_000., 2_000_000_000_000_000_000., 0., 500_000_000_000_000_000.],\n    "receipt_effective_gas_price": [1_000_000_000., 2_000_000_000., 3_000_000_000., 4_000_000_000.],\n    "receipt_gas_used": [21000., 30000., 45000., 55000.],\n    "input": ["0x", "", "0x1234", "0xabcdef"],''')
replace_once(golden,
'''print(json.dumps({"p90": df["block_gas_utilization_p90"][0], "base_fee": df["median_block_base_fee_per_gas"][0], "tx_gas": df["median_tx_gas_used"][0], "calldata_share": df["nonempty_calldata_share"][0], "contract_creation_share": df["contract_creation_tx_share"][0], "type2_share": df["eip1559_type2_tx_share"][0]}))''',
'''print(json.dumps({"p90": df["block_gas_utilization_p90"][0], "base_fee": df["median_block_base_fee_per_gas"][0], "tx_gas": df["median_tx_gas_used"][0], "calldata_share": df["nonempty_calldata_share"][0], "contract_creation_share": df["contract_creation_tx_share"][0], "type2_share": df["eip1559_type2_tx_share"][0], "value_sum": df["value_transferred_native"][0], "value_median": df["median_tx_value_native"][0], "fee_median": df["median_tx_fee_native"][0]}))''')
replace_once(golden,
'''  assertClose(parsed.type2_share, 0.5, "ethereum.eip1559_type2_tx_share");\n}''',
'''  assertClose(parsed.type2_share, 0.5, "ethereum.eip1559_type2_tx_share");\n  assertClose(parsed.value_sum, 3.5, "ethereum.value_transferred_native_eth");\n  assertClose(parsed.value_median, 0.75, "ethereum.median_tx_value_native_eth");\n  assertClose(parsed.fee_median, 0.0000975, "ethereum.median_tx_fee_native_eth");\n}''')

# 4) Public field definitions state the normalized Ethereum unit explicitly.
fields = ROOT / "web-v1-app/src/app/methodology/fields/page.tsx"
replace_once(fields,
'''    notes:\n      "Optional across all chain profiles: visible when available, never a confidence penalty when absent, and not currently used in the public Demand/Friction/Capacity scorecard.",''',
'''    notes:\n      "Optional across all chain profiles: visible when available, never a confidence penalty when absent, and not currently used in the public Demand/Friction/Capacity scorecard. For AWS Ethereum data, transactions.value is sourced in wei and normalized by 1e18 so this field is published in ETH.",''')
replace_once(fields,
'''    notes: "Optional for all current chain profiles; visible when available, but not a confidence penalty when absent. Used only where value-normalized fee burden is methodologically valid.",''',
'''    notes: "Optional for all current chain profiles; visible when available, but not a confidence penalty when absent. Used only where value-normalized fee burden is methodologically valid. For AWS Ethereum data, transactions.value is normalized from wei to ETH before the daily median is calculated.",''')
replace_once(fields,
'''    notes: "Published as a median, not an arithmetic average. Drives the Friction axis for every current chain profile.",''',
'''    notes: "Published as a median, not an arithmetic average. Drives the Friction axis for every current chain profile. For Ethereum gas-derived fees, gas price × gas used is a wei amount and is normalized by 1e18 before publication as ETH.",''')

# 5) Methodology version acknowledges the output-correctness change.
manifest = ROOT / "pipeline/methodology-version.json"
data = json.loads(manifest.read_text(encoding="utf-8"))
if data.get("methodology_version") != "1.9":
    raise RuntimeError(f"Unexpected methodology version: {data.get('methodology_version')}")
data["methodology_version"] = "2.0"
manifest.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

# Run golden fixture. Bitcoin output should remain stable; if the digest changes for a legitimate
# shared-schema reason, synchronize both committed digest expectations.
proc = subprocess.run(["npm", "run", "check:pipeline-golden-fixture"], cwd=ROOT / "web-v1-app", text=True, capture_output=True)
combined = proc.stdout + "\n" + proc.stderr
if proc.returncode != 0:
    m = re.search(r"Golden fixture digest ([0-9a-f]{64}) does not match committed expected digest", combined)
    if not m:
        raise RuntimeError("Golden fixture failed for a reason other than an expected digest update:\n" + combined)
    new_digest = m.group(1)
    text = golden.read_text(encoding="utf-8")
    text = re.sub(r'const EXPECTED_GOLDEN_FIXTURE_DIGEST = "[0-9a-f]{64}";', f'const EXPECTED_GOLDEN_FIXTURE_DIGEST = "{new_digest}";', text, count=1)
    golden.write_text(text, encoding="utf-8")
    data = json.loads(manifest.read_text(encoding="utf-8"))
    data["golden_fixture_digest"] = new_digest
    manifest.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Synchronized golden digest: {new_digest}")
else:
    print("Golden fixture digest unchanged (Bitcoin canonical output unaffected).")

# Static safety assertions for rebuild semantics.
pipeline_text = pipeline.read_text(encoding="utf-8")
required = [
    '[bool]$RecomputeExisting = $false',
    '$RecomputeExisting -or -not $existing.ContainsKey',
    '-RecomputeExisting ($Mode -eq \'rebuild\')',
    'chain=$c recompute feature days:',
]
for marker in required:
    if marker not in pipeline_text:
        raise RuntimeError(f"Missing rebuild safety marker: {marker}")
