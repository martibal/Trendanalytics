from pathlib import Path
import re
import subprocess


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, got {count}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


FEATURE = "pipeline/src/feature_daily_agg.py"
GOLD = "pipeline/src/build_gold_timeseries.py"
FIXTURE = "web-v1-app/scripts/pipeline-golden-fixture.mjs"
FIELDS = "web-v1-app/src/app/methodology/fields/page.tsx"
MANIFEST = "pipeline/methodology-version.json"
FIELD = "median_block_base_fee_per_gas"

# Feature schema and calculation.
replace_once(FEATURE,
    '    "gas_utilization_pct",\n    "block_gas_utilization_p90",',
    '    "gas_utilization_pct",\n    "median_block_base_fee_per_gas",\n    "block_gas_utilization_p90",')
replace_once(FEATURE,
    '    gas_util = pl.LazyFrame({"gas_utilization_pct": [None]})\n    block_gas_p90 = pl.LazyFrame({"block_gas_utilization_p90": [None]})',
    '    gas_util = pl.LazyFrame({"gas_utilization_pct": [None]})\n    median_base_fee = pl.LazyFrame({"median_block_base_fee_per_gas": [None]})\n    block_gas_p90 = pl.LazyFrame({"block_gas_utilization_p90": [None]})')
replace_once(FEATURE,
    '        if _ci_has(blk_ci, "gas_used") and _ci_has(blk_ci, "gas_limit"):',
    '''        if str(chain).lower() in {"ethereum", "eth"} and _ci_has(blk_ci, "base_fee_per_gas"):\n            base_fee = _ci_safe_f64(blk_ci, "base_fee_per_gas")\n            median_base_fee = blocks.select(\n                pl.when(base_fee >= 0.0).then(base_fee).otherwise(None).median().alias("median_block_base_fee_per_gas")\n            )\n\n        if _ci_has(blk_ci, "gas_used") and _ci_has(blk_ci, "gas_limit"):''')
replace_once(FEATURE,
    '        .join(gas_util, how="cross")\n        .join(block_gas_p90, how="cross")',
    '        .join(gas_util, how="cross")\n        .join(median_base_fee, how="cross")\n        .join(block_gas_p90, how="cross")')
replace_once(FEATURE,
    '    if "block_gas_utilization_p90" in out.columns:',
    '''    if "median_block_base_fee_per_gas" in out.columns:\n        if prof == "eth":\n            out = out.with_columns(\n                pl.when(pl.col("median_block_base_fee_per_gas").is_null())\n                .then(None)\n                .when(pl.col("median_block_base_fee_per_gas") >= 0.0)\n                .then(pl.col("median_block_base_fee_per_gas"))\n                .otherwise(None)\n                .alias("median_block_base_fee_per_gas")\n            )\n        else:\n            out = out.with_columns(pl.lit(None).alias("median_block_base_fee_per_gas"))\n\n    if "block_gas_utilization_p90" in out.columns:''')

# Gold schema, guardrail and quality accounting.
replace_once(GOLD,
    '    "gas_utilization_pct",\n    "block_gas_utilization_p90",',
    '    "gas_utilization_pct",\n    "median_block_base_fee_per_gas",\n    "block_gas_utilization_p90",')
replace_once(GOLD,
    '    # block_gas_utilization_p90: Ethereum-only ratio in [0,1].',
    '''    # median_block_base_fee_per_gas: Ethereum-only, non-negative raw chain unit.\n    if "median_block_base_fee_per_gas" in df.columns:\n        if prof == "eth":\n            df = df.with_columns(\n                pl.when(pl.col("median_block_base_fee_per_gas").is_null())\n                .then(None)\n                .when(pl.col("median_block_base_fee_per_gas") >= 0.0)\n                .then(pl.col("median_block_base_fee_per_gas"))\n                .otherwise(None)\n                .alias("median_block_base_fee_per_gas")\n            )\n        else:\n            df = df.with_columns(pl.lit(None).alias("median_block_base_fee_per_gas"))\n            fixes["applied"].append("median_block_base_fee_per_gas_null_for_non_eth")\n\n    # block_gas_utilization_p90: Ethereum-only ratio in [0,1].''')
# Insert quality block at the quality-summary occurrence (second marker).
p = Path(GOLD)
text = p.read_text(encoding="utf-8")
marker = '    # block_gas_utilization_p90: Ethereum-only ratio in [0,1].'
pos1 = text.find(marker)
pos2 = text.find(marker, pos1 + 1)
if pos2 < 0:
    raise SystemExit("Gold quality marker not found")
quality = '''    # median_block_base_fee_per_gas: Ethereum-only non-negative raw chain unit.\n    if "median_block_base_fee_per_gas" in df.columns:\n        if prof == "eth":\n            out_of_range["median_block_base_fee_per_gas"] = int(\n                df.select(((pl.col("median_block_base_fee_per_gas").is_not_null()) & (pl.col("median_block_base_fee_per_gas") < 0.0)).sum()).item()\n            )\n        else:\n            out_of_range["median_block_base_fee_per_gas"] = 0\n\n'''
text = text[:pos2] + quality + text[pos2:]
p.write_text(text, encoding="utf-8")

# Public field dictionary.
replace_once(FIELDS,
    '  {\n    field: "block_gas_utilization_p90",',
    '''  {\n    field: "median_block_base_fee_per_gas",\n    meaning: "Typical Ethereum protocol base fee per unit of gas across blocks produced that day.",\n    notes: (\n      <>\n        Ethereum-only observational transaction-cost field calculated as the daily median of block\n        <FieldCode>base_fee_per_gas</FieldCode>. It describes the protocol-set base price for gas\n        before transaction-specific priority fees. Values are published in the raw chain unit from\n        the source schema, are null for non-Ethereum chains, and do not yet drive the public regime\n        label, scorecard, or confidence calculation while historical behaviour is being validated.\n      </>\n    ),\n  },\n  {\n    field: "block_gas_utilization_p90",''')

# Extend the permanent Ethereum regression fixture to cover base fee median = 55.
replace_once(FIXTURE,
    '    "gas_limit": [100.] * 10,\n}).write_parquet(out / "part-000.parquet")',
    '    "gas_limit": [100.] * 10,\n    "base_fee_per_gas": [10., 20., 30., 40., 50., 60., 70., 80., 90., 100.],\n}).write_parquet(out / "part-000.parquet")')
replace_once(FIXTURE,
    'print(json.dumps({"value": df["block_gas_utilization_p90"][0]}))',
    'print(json.dumps({"p90": df["block_gas_utilization_p90"][0], "base_fee": df["median_block_base_fee_per_gas"][0]}))')
replace_once(FIXTURE,
    '  assertClose(parsed.value, 0.9, "ethereum.block_gas_utilization_p90");',
    '  assertClose(parsed.p90, 0.9, "ethereum.block_gas_utilization_p90");\n  assertClose(parsed.base_fee, 55, "ethereum.median_block_base_fee_per_gas");')

# Bitcoin golden fixture now also carries the new canonical null field and fix marker.
replace_once(FIXTURE,
    '      block_gas_utilization_p90: 0,\n      median_tx_fee_rate_sat_vbyte: 0,',
    '      block_gas_utilization_p90: 0,\n      median_block_base_fee_per_gas: 0,\n      median_tx_fee_rate_sat_vbyte: 0,')
replace_once(FIXTURE,
    '        "block_gas_utilization_p90_null_for_non_eth",\n        "median_tx_fee_rate_sat_vbyte_null_for_non_btc",',
    '        "block_gas_utilization_p90_null_for_non_eth",\n        "median_block_base_fee_per_gas_null_for_non_eth",\n        "median_tx_fee_rate_sat_vbyte_null_for_non_btc",')

# Bump methodology and resolve the new deterministic digest from the fixture itself.
manifest = Path(MANIFEST)
m = manifest.read_text(encoding="utf-8").replace('"methodology_version": "1.4"', '"methodology_version": "1.5"', 1)
m = re.sub(r'"golden_fixture_digest": "[0-9a-f]{64}"', '"golden_fixture_digest": "' + '0' * 64 + '"', m, count=1)
manifest.write_text(m, encoding="utf-8")

fixture = Path(FIXTURE)
f = fixture.read_text(encoding="utf-8")nf = re.sub(r'const EXPECTED_GOLDEN_FIXTURE_DIGEST = "[0-9a-f]{64}";', 'const EXPECTED_GOLDEN_FIXTURE_DIGEST = "' + '0' * 64 + '";', f, count=1)
fixture.write_text(f, encoding="utf-8")

proc = subprocess.run(["npm", "run", "check:pipeline-golden-fixture"], cwd="web-v1-app", text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
print(proc.stdout)
match = re.search(r"Golden fixture digest ([0-9a-f]{64}) does not match", proc.stdout)
if not match:
    raise SystemExit("Could not resolve new golden digest; a regression assertion may have failed")
digest = match.group(1)
fixture.write_text(fixture.read_text(encoding="utf-8").replace('0' * 64, digest, 1), encoding="utf-8")
manifest.write_text(manifest.read_text(encoding="utf-8").replace('0' * 64, digest, 1), encoding="utf-8")
print(f"Resolved digest: {digest}")
