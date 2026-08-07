from pathlib import Path
import re
import subprocess


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, got {count}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


FEATURE = "pipeline/src/feature_daily_agg.py"
GOLD = "pipeline/src/build_gold_timeseries.py"
FIXTURE = "web-v1-app/scripts/pipeline-golden-fixture.mjs"
FIELDS = "web-v1-app/src/app/methodology/fields/page.tsx"
MANIFEST = "pipeline/methodology-version.json"

# Feature schema + calculation.
replace_once(FEATURE,
    '    "median_tx_fee_rate_sat_vbyte",\n    "failed_tx_rate",',
    '    "median_tx_fee_rate_sat_vbyte",\n    "median_tx_gas_used",\n    "failed_tx_rate",')
replace_once(FEATURE,
    '    median_fee_rate = pl.LazyFrame({"median_tx_fee_rate_sat_vbyte": [None]})\n    failed_tx_rate = pl.LazyFrame({"failed_tx_rate": [None]})',
    '    median_fee_rate = pl.LazyFrame({"median_tx_fee_rate_sat_vbyte": [None]})\n    median_tx_gas_used = pl.LazyFrame({"median_tx_gas_used": [None]})\n    failed_tx_rate = pl.LazyFrame({"failed_tx_rate": [None]})')
replace_once(FEATURE,
    '        # failed_tx_rate\n        if _ci_has(tx_ci, "receipt_status"):',
    '''        # Ethereum execution intensity: median gas actually consumed by transactions.\n        # Prefer receipt_gas_used; fall back to transaction gas_used only when needed.\n        if str(chain).lower() in {"ethereum", "eth"}:\n            tx_gas_col = next((c for c in ["receipt_gas_used", "gas_used"] if _ci_has(tx_ci, c)), None)\n            if tx_gas_col is not None:\n                tx_gas = _ci_safe_f64(tx_ci, tx_gas_col)\n                median_tx_gas_used = tx.select(\n                    pl.when(tx_gas >= 0.0).then(tx_gas).otherwise(None).median().alias("median_tx_gas_used")\n                )\n\n        # failed_tx_rate\n        if _ci_has(tx_ci, "receipt_status"):''')
replace_once(FEATURE,
    '        .join(median_fee_rate, how="cross")\n        .join(failed_tx_rate, how="cross")',
    '        .join(median_fee_rate, how="cross")\n        .join(median_tx_gas_used, how="cross")\n        .join(failed_tx_rate, how="cross")')
replace_once(FEATURE,
    '    if "median_block_base_fee_per_gas" in out.columns:',
    '''    if "median_tx_gas_used" in out.columns:\n        if prof == "eth":\n            out = out.with_columns(\n                pl.when(pl.col("median_tx_gas_used").is_null())\n                .then(None)\n                .when(pl.col("median_tx_gas_used") >= 0.0)\n                .then(pl.col("median_tx_gas_used"))\n                .otherwise(None)\n                .alias("median_tx_gas_used")\n            )\n        else:\n            out = out.with_columns(pl.lit(None).alias("median_tx_gas_used"))\n\n    if "median_block_base_fee_per_gas" in out.columns:''')

# Gold schema + guardrails + quality accounting.
replace_once(GOLD,
    '    "median_tx_fee_rate_sat_vbyte",\n    "failed_tx_rate",',
    '    "median_tx_fee_rate_sat_vbyte",\n    "median_tx_gas_used",\n    "failed_tx_rate",')
replace_once(GOLD,
    '    # median_block_base_fee_per_gas: Ethereum-only, non-negative raw chain unit.',
    '''    # median_tx_gas_used: Ethereum-only, non-negative gas units.\n    if "median_tx_gas_used" in df.columns:\n        if prof == "eth":\n            df = df.with_columns(\n                pl.when(pl.col("median_tx_gas_used").is_null())\n                .then(None)\n                .when(pl.col("median_tx_gas_used") >= 0.0)\n                .then(pl.col("median_tx_gas_used"))\n                .otherwise(None)\n                .alias("median_tx_gas_used")\n            )\n        else:\n            df = df.with_columns(pl.lit(None).alias("median_tx_gas_used"))\n            fixes["applied"].append("median_tx_gas_used_null_for_non_eth")\n\n    # median_block_base_fee_per_gas: Ethereum-only, non-negative raw chain unit.''')

p = Path(GOLD)
text = p.read_text(encoding="utf-8")
marker = '    # median_block_base_fee_per_gas: Ethereum-only non-negative raw chain unit.'
pos = text.find(marker)
if pos < 0:
    raise SystemExit("Gold quality marker not found")
quality = '''    # median_tx_gas_used: Ethereum-only non-negative gas units.\n    if "median_tx_gas_used" in df.columns:\n        if prof == "eth":\n            out_of_range["median_tx_gas_used"] = int(\n                df.select(((pl.col("median_tx_gas_used").is_not_null()) & (pl.col("median_tx_gas_used") < 0.0)).sum()).item()\n            )\n        else:\n            out_of_range["median_tx_gas_used"] = 0\n\n'''
text = text[:pos] + quality + text[pos:]
p.write_text(text, encoding="utf-8")

# Public field dictionary.
replace_once(FIELDS,
    '  {\n    field: "failed_tx_rate",',
    '''  {\n    field: "median_tx_gas_used",\n    meaning: "Typical execution gas consumed by an Ethereum transaction that day.",\n    notes: (\n      <>\n        Ethereum-only observational execution-intensity field calculated as the daily median of\n        <FieldCode>receipt_gas_used</FieldCode>, with transaction-level <FieldCode>gas_used</FieldCode>\n        used only as a fallback when receipt gas is unavailable. Values are raw gas units, are null\n        for non-Ethereum chains, and do not yet drive the public regime label, scorecard, or confidence\n        calculation while historical behaviour is being validated.\n      </>\n    ),\n  },\n  {\n    field: "failed_tx_rate",''')

# Extend permanent Ethereum regression fixture: 4 txs => median gas used 37,500.
replace_once(FIXTURE,
    '  const blockDir = path.join(rawRoot, "ethereum", "blocks", `date=${day}`);\n  fs.mkdirSync(blockDir, { recursive: true });',
    '  const blockDir = path.join(rawRoot, "ethereum", "blocks", `date=${day}`);\n  const txDir = path.join(rawRoot, "ethereum", "transactions", `date=${day}`);\n  fs.mkdirSync(blockDir, { recursive: true });\n  fs.mkdirSync(txDir, { recursive: true });')
replace_once(FIXTURE,
    'out = Path(sys.argv[1])\npl.DataFrame({\n    "timestamp": [1704067200 + 12 * i for i in range(10)],',
    'out = Path(sys.argv[1])\ntx_out = Path(sys.argv[2])\npl.DataFrame({\n    "timestamp": [1704067200 + 12 * i for i in range(10)],')
replace_once(FIXTURE,
    '}).write_parquet(out / "part-000.parquet")\n`;\n  runCommand(PYTHON, ["-c", createCode, blockDir]);',
    '}).write_parquet(out / "part-000.parquet")\npl.DataFrame({\n    "receipt_gas_used": [21000., 30000., 45000., 55000.],\n}).write_parquet(tx_out / "part-000.parquet")\n`;\n  runCommand(PYTHON, ["-c", createCode, blockDir, txDir]);')
replace_once(FIXTURE,
    'print(json.dumps({"p90": df["block_gas_utilization_p90"][0], "base_fee": df["median_block_base_fee_per_gas"][0]}))',
    'print(json.dumps({"p90": df["block_gas_utilization_p90"][0], "base_fee": df["median_block_base_fee_per_gas"][0], "tx_gas": df["median_tx_gas_used"][0]}))')
replace_once(FIXTURE,
    '  assertClose(parsed.base_fee, 55, "ethereum.median_block_base_fee_per_gas");',
    '  assertClose(parsed.base_fee, 55, "ethereum.median_block_base_fee_per_gas");\n  assertClose(parsed.tx_gas, 37500, "ethereum.median_tx_gas_used");')

# Bitcoin fixture: new canonical field is null and chain guardrail is recorded.
replace_once(FIXTURE,
    '      median_tx_fee_rate_sat_vbyte: 0,\n      median_tx_value_native: 0,',
    '      median_tx_fee_rate_sat_vbyte: 0,\n      median_tx_gas_used: 1,\n      median_tx_value_native: 0,')
replace_once(FIXTURE,
    '      median_tx_fee_rate_sat_vbyte: 0,\n    },',
    '      median_tx_fee_rate_sat_vbyte: 0,\n      median_tx_gas_used: 0,\n    },')
replace_once(FIXTURE,
    '    applied: ["gas_utilization_pct_null_for_btc", "median_block_base_fee_per_gas_null_for_non_eth", "block_gas_utilization_p90_null_for_non_eth"],',
    '    applied: ["gas_utilization_pct_null_for_btc", "median_tx_gas_used_null_for_non_eth", "median_block_base_fee_per_gas_null_for_non_eth", "block_gas_utilization_p90_null_for_non_eth"],')

# Methodology version + deterministic digest.
manifest = Path(MANIFEST)
m = manifest.read_text(encoding="utf-8").replace('"methodology_version": "1.5"', '"methodology_version": "1.6"', 1)
m = re.sub(r'"golden_fixture_digest": "[0-9a-f]{64}"', '"golden_fixture_digest": "' + '0' * 64 + '"', m, count=1)
manifest.write_text(m, encoding="utf-8")

fixture = Path(FIXTURE)
f = fixture.read_text(encoding="utf-8")
f = re.sub(r'const EXPECTED_GOLDEN_FIXTURE_DIGEST = "[0-9a-f]{64}";', 'const EXPECTED_GOLDEN_FIXTURE_DIGEST = "' + '0' * 64 + '";', f, count=1)
fixture.write_text(f, encoding="utf-8")

proc = subprocess.run(["npm", "run", "check:pipeline-golden-fixture"], cwd="web-v1-app", text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
print(proc.stdout)
match = re.search(r"Golden fixture digest ([0-9a-f]{64}) does not match", proc.stdout)
if not match:
    raise SystemExit("Could not resolve new golden digest; an explicit regression assertion or fixture expectation failed")
digest = match.group(1)
fixture.write_text(fixture.read_text(encoding="utf-8").replace('0' * 64, digest, 1), encoding="utf-8")
manifest.write_text(manifest.read_text(encoding="utf-8").replace('0' * 64, digest, 1), encoding="utf-8")
print(f"Resolved digest: {digest}")
