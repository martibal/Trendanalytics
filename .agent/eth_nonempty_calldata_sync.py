from pathlib import Path
import re
import subprocess

FILES = {
    'feature': Path('pipeline/src/feature_daily_agg.py'),
    'gold': Path('pipeline/src/build_gold_timeseries.py'),
    'fields': Path('web-v1-app/src/app/methodology/fields/page.tsx'),
    'fixture': Path('web-v1-app/scripts/pipeline-golden-fixture.mjs'),
    'manifest': Path('pipeline/methodology-version.json'),
}

def replace_once(path: Path, old: str, new: str):
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, got {count}: {old[:120]!r}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')

# Feature schema + computation + output join.
replace_once(FILES['feature'],
    '    "median_tx_gas_used",\n    "failed_tx_rate",',
    '    "median_tx_gas_used",\n    "nonempty_calldata_share",\n    "failed_tx_rate",')
replace_once(FILES['feature'],
    '    median_tx_gas_used = pl.LazyFrame({"median_tx_gas_used": [None]})\n    failed_tx_rate = pl.LazyFrame({"failed_tx_rate": [None]})',
    '    median_tx_gas_used = pl.LazyFrame({"median_tx_gas_used": [None]})\n    nonempty_calldata_share = pl.LazyFrame({"nonempty_calldata_share": [None]})\n    failed_tx_rate = pl.LazyFrame({"failed_tx_rate": [None]})')
replace_once(FILES['feature'],
    '        # failed_tx_rate\n        if _ci_has(tx_ci, "receipt_status"):',
    '''        # Ethereum activity composition: share of transactions carrying non-empty calldata.\n        # Null, empty string, and the canonical empty hex payload "0x" count as no calldata.\n        if str(chain).lower() in {"ethereum", "eth"} and _ci_has(tx_ci, "input"):\n            calldata = _ci_col(tx_ci, "input").cast(pl.Utf8, strict=False).str.strip_chars().str.to_lowercase()\n            has_calldata = (calldata.is_not_null() & (calldata != "") & (calldata != "0x")).fill_null(False)\n            nonempty_calldata_share = tx.select(has_calldata.mean().alias("nonempty_calldata_share"))\n\n        # failed_tx_rate\n        if _ci_has(tx_ci, "receipt_status"):''')
replace_once(FILES['feature'],
    '        .join(median_tx_gas_used, how="cross")\n        .join(failed_tx_rate, how="cross")',
    '        .join(median_tx_gas_used, how="cross")\n        .join(nonempty_calldata_share, how="cross")\n        .join(failed_tx_rate, how="cross")')

# Canonical Gold schema + guardrails + quality accounting.
replace_once(FILES['gold'],
    '    "median_tx_gas_used",\n    "failed_tx_rate",',
    '    "median_tx_gas_used",\n    "nonempty_calldata_share",\n    "failed_tx_rate",')
replace_once(FILES['gold'],
    '    # median_tx_gas_used: Ethereum-only, non-negative gas units.\n    if "median_tx_gas_used" in df.columns:',
    '''    # nonempty_calldata_share: Ethereum-only ratio in [0,1].\n    if "nonempty_calldata_share" in df.columns:\n        if prof == "eth":\n            df = df.with_columns(\n                pl.when(pl.col("nonempty_calldata_share").is_null())\n                .then(None)\n                .when((pl.col("nonempty_calldata_share") >= 0.0) & (pl.col("nonempty_calldata_share") <= 1.0))\n                .then(pl.col("nonempty_calldata_share"))\n                .otherwise(None)\n                .alias("nonempty_calldata_share")\n            )\n        else:\n            df = df.with_columns(pl.lit(None).alias("nonempty_calldata_share"))\n\n    # median_tx_gas_used: Ethereum-only, non-negative gas units.\n    if "median_tx_gas_used" in df.columns:''')
replace_once(FILES['gold'],
    '    # median_tx_gas_used: Ethereum-only non-negative gas units.\n    if "median_tx_gas_used" in df.columns:',
    '''    # nonempty_calldata_share: Ethereum-only ratio in [0,1].\n    if "nonempty_calldata_share" in df.columns:\n        if prof == "eth":\n            out_of_range["nonempty_calldata_share"] = int(\n                df.select(((pl.col("nonempty_calldata_share").is_not_null()) & ((pl.col("nonempty_calldata_share") < 0.0) | (pl.col("nonempty_calldata_share") > 1.0))).sum()).item()\n            )\n        else:\n            out_of_range["nonempty_calldata_share"] = 0\n\n    # median_tx_gas_used: Ethereum-only non-negative gas units.\n    if "median_tx_gas_used" in df.columns:''')

# Public field documentation.
replace_once(FILES['fields'],
    '  {\n    field: "failed_tx_rate",',
    '''  {\n    field: "nonempty_calldata_share",\n    meaning: "Share of Ethereum transactions carrying non-empty calldata that day.",\n    notes: (\n      <>\n        Ethereum-only observational activity-composition field. A transaction counts as carrying\n        calldata when its <FieldCode>input</FieldCode> value is non-null and, after trimming, is\n        neither an empty string nor <FieldCode>0x</FieldCode>. The metric is published on a 0–1\n        scale, is null for non-Ethereum chains, and does not identify protocols, tokens, or user\n        intent. It does not yet drive the public regime label, scorecard, or confidence calculation\n        while historical behaviour is being validated.\n      </>\n    ),\n  },\n  {\n    field: "failed_tx_rate",''')

# Permanent Ethereum regression fixture: four transactions, two with calldata => 0.5.
replace_once(FILES['fixture'],
    '    "receipt_gas_used": [21000., 30000., 45000., 55000.],\n}).write_parquet(tx_out / "part-000.parquet")',
    '    "receipt_gas_used": [21000., 30000., 45000., 55000.],\n    "input": ["0x", "", "0x1234", "0xabcdef"],\n}).write_parquet(tx_out / "part-000.parquet")')
replace_once(FILES['fixture'],
    'print(json.dumps({"p90": df["block_gas_utilization_p90"][0], "base_fee": df["median_block_base_fee_per_gas"][0], "tx_gas": df["median_tx_gas_used"][0]}))',
    'print(json.dumps({"p90": df["block_gas_utilization_p90"][0], "base_fee": df["median_block_base_fee_per_gas"][0], "tx_gas": df["median_tx_gas_used"][0], "calldata_share": df["nonempty_calldata_share"][0]}))')
replace_once(FILES['fixture'],
    '  assertClose(parsed.tx_gas, 37500, "ethereum.median_tx_gas_used");',
    '  assertClose(parsed.tx_gas, 37500, "ethereum.median_tx_gas_used");\n  assertClose(parsed.calldata_share, 0.5, "ethereum.nonempty_calldata_share");')

# Bump methodology and let the golden fixture calculate the new deterministic digest.
manifest = FILES['manifest']
m = manifest.read_text(encoding='utf-8').replace('"methodology_version": "1.6"', '"methodology_version": "1.7"', 1)
m = re.sub(r'"golden_fixture_digest": "[0-9a-f]{64}"', '"golden_fixture_digest": "' + '0' * 64 + '"', m, count=1)
manifest.write_text(m, encoding='utf-8')

fixture = FILES['fixture']
f = fixture.read_text(encoding='utf-8')
f = re.sub(r'const EXPECTED_GOLDEN_FIXTURE_DIGEST = "[0-9a-f]{64}";', 'const EXPECTED_GOLDEN_FIXTURE_DIGEST = "' + '0' * 64 + '";', f, count=1)
fixture.write_text(f, encoding='utf-8')

proc = subprocess.run(['npm', 'run', 'check:pipeline-golden-fixture'], cwd='web-v1-app', text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
print(proc.stdout)
match = re.search(r'Golden fixture digest ([0-9a-f]{64}) does not match', proc.stdout)
if not match:
    raise SystemExit('Could not resolve new golden fixture digest from expected mismatch')
digest = match.group(1)

m = manifest.read_text(encoding='utf-8').replace('"' + '0' * 64 + '"', f'"{digest}"', 1)
manifest.write_text(m, encoding='utf-8')
f = fixture.read_text(encoding='utf-8').replace('"' + '0' * 64 + '"', f'"{digest}"', 1)
fixture.write_text(f, encoding='utf-8')

# Final validation must be green before workflow commits anything.
subprocess.run(['python', '-m', 'py_compile', str(FILES['feature']), str(FILES['gold'])], check=True)
subprocess.run(['npm', 'run', 'check:pipeline-golden-fixture'], cwd='web-v1-app', check=True)
subprocess.run(['npm', 'run', 'check:field-dictionary-sync'], cwd='web-v1-app', check=True)
print('Resolved digest:', digest)
