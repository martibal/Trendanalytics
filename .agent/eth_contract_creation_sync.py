from pathlib import Path
import json, re, subprocess

ROOT = Path(__file__).resolve().parents[1]
FEATURE = ROOT / 'pipeline/src/feature_daily_agg.py'
GOLD = ROOT / 'pipeline/src/build_gold_timeseries.py'
FIXTURE = ROOT / 'web-v1-app/scripts/pipeline-golden-fixture.mjs'
FIELDS = ROOT / 'web-v1-app/src/app/methodology/fields/page.tsx'
MANIFEST = ROOT / 'pipeline/methodology-version.json'


def replace_once(path, old, new):
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, got {count}: {old[:120]!r}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')

# feature schema/init/calc/join
replace_once(FEATURE,
'    "nonempty_calldata_share",\n    "failed_tx_rate",',
'    "nonempty_calldata_share",\n    "contract_creation_tx_share",\n    "failed_tx_rate",')
replace_once(FEATURE,
'    nonempty_calldata_share = pl.LazyFrame({"nonempty_calldata_share": [None]})\n    failed_tx_rate = pl.LazyFrame({"failed_tx_rate": [None]})',
'    nonempty_calldata_share = pl.LazyFrame({"nonempty_calldata_share": [None]})\n    contract_creation_tx_share = pl.LazyFrame({"contract_creation_tx_share": [None]})\n    failed_tx_rate = pl.LazyFrame({"failed_tx_rate": [None]})')
replace_once(FEATURE,
'            nonempty_calldata_share = tx.select(has_calldata.mean().alias("nonempty_calldata_share"))\n\n        # failed_tx_rate',
'            nonempty_calldata_share = tx.select(has_calldata.mean().alias("nonempty_calldata_share"))\n\n        # Ethereum contract-creation activity: share of transactions whose receipt reports\n        # a created contract address. This is descriptive execution activity only.\n        if str(chain).lower() in {"ethereum", "eth"} and _ci_has(tx_ci, "receipt_contract_address"):\n            contract_address = _ci_col(tx_ci, "receipt_contract_address").cast(pl.Utf8, strict=False).str.strip_chars()\n            created_contract = (contract_address.is_not_null() & (contract_address != "") & (contract_address != "0x")).fill_null(False)\n            contract_creation_tx_share = tx.select(created_contract.mean().alias("contract_creation_tx_share"))\n\n        # failed_tx_rate')
replace_once(FEATURE,
'        .join(nonempty_calldata_share, how="cross")\n        .join(failed_tx_rate, how="cross")',
'        .join(nonempty_calldata_share, how="cross")\n        .join(contract_creation_tx_share, how="cross")\n        .join(failed_tx_rate, how="cross")')

# gold schema + guardrail + quality
replace_once(GOLD,
'    "nonempty_calldata_share",\n    "failed_tx_rate",',
'    "nonempty_calldata_share",\n    "contract_creation_tx_share",\n    "failed_tx_rate",')
replace_once(GOLD,
'    # median_tx_gas_used: Ethereum-only, non-negative gas units.\n',
'    # contract_creation_tx_share: Ethereum-only ratio in [0,1].\n    if "contract_creation_tx_share" in df.columns:\n        if prof == "eth":\n            df = df.with_columns(\n                pl.when(pl.col("contract_creation_tx_share").is_null())\n                .then(None)\n                .when((pl.col("contract_creation_tx_share") >= 0.0) & (pl.col("contract_creation_tx_share") <= 1.0))\n                .then(pl.col("contract_creation_tx_share"))\n                .otherwise(None)\n                .alias("contract_creation_tx_share")\n            )\n        else:\n            df = df.with_columns(pl.lit(None).alias("contract_creation_tx_share"))\n\n    # median_tx_gas_used: Ethereum-only, non-negative gas units.\n')
replace_once(GOLD,
'    # median_tx_gas_used: Ethereum-only non-negative gas units.\n',
'    # contract_creation_tx_share: Ethereum-only ratio in [0,1].\n    if "contract_creation_tx_share" in df.columns:\n        if prof == "eth":\n            out_of_range["contract_creation_tx_share"] = int(\n                df.select(((pl.col("contract_creation_tx_share").is_not_null()) & ((pl.col("contract_creation_tx_share") < 0.0) | (pl.col("contract_creation_tx_share") > 1.0))).sum()).item()\n            )\n        else:\n            out_of_range["contract_creation_tx_share"] = 0\n\n    # median_tx_gas_used: Ethereum-only non-negative gas units.\n')

# field dictionary
replace_once(FIELDS,
'  {\n    field: "failed_tx_rate",',
'  {\n    field: "contract_creation_tx_share",\n    meaning: "Share of Ethereum transactions that create a contract that day.",\n    notes: (\n      <>\n        Ethereum-only observational activity-composition field calculated as the share of transactions\n        with a non-empty <FieldCode>receipt_contract_address</FieldCode>. It describes contract-deployment\n        activity without identifying protocols, tokens, financial intent, or trading behaviour. Values are\n        published on a 0–1 scale, are null for non-Ethereum chains, and do not yet drive the public regime\n        label, scorecard, or confidence calculation while historical behaviour is being validated.\n      </>\n    ),\n  },\n  {\n    field: "failed_tx_rate",')

# ethereum regression fixture: one created contract out of four => 0.25
replace_once(FIXTURE,
'    "receipt_gas_used": [21000., 30000., 45000., 55000.],\n    "input": ["0x", "", "0x1234", "0xabcdef"],',
'    "receipt_gas_used": [21000., 30000., 45000., 55000.],\n    "input": ["0x", "", "0x1234", "0xabcdef"],\n    "receipt_contract_address": [None, "", "0xabc123", None],')
replace_once(FIXTURE,
'print(json.dumps({"p90": df["block_gas_utilization_p90"][0], "base_fee": df["median_block_base_fee_per_gas"][0], "tx_gas": df["median_tx_gas_used"][0], "calldata_share": df["nonempty_calldata_share"][0]}))',
'print(json.dumps({"p90": df["block_gas_utilization_p90"][0], "base_fee": df["median_block_base_fee_per_gas"][0], "tx_gas": df["median_tx_gas_used"][0], "calldata_share": df["nonempty_calldata_share"][0], "contract_creation_share": df["contract_creation_tx_share"][0]}))')
replace_once(FIXTURE,
'  assertClose(parsed.calldata_share, 0.5, "ethereum.nonempty_calldata_share");',
'  assertClose(parsed.calldata_share, 0.5, "ethereum.nonempty_calldata_share");\n  assertClose(parsed.contract_creation_share, 0.25, "ethereum.contract_creation_tx_share");')

# bump methodology; digest gets replaced after first fixture run
m = json.loads(MANIFEST.read_text(encoding='utf-8'))
m['methodology_version'] = '1.8'
MANIFEST.write_text(json.dumps(m, indent=2) + '\n', encoding='utf-8')

# Run fixture once to get new deterministic digest, then synchronize both expected values.
proc = subprocess.run(['node', 'scripts/pipeline-golden-fixture.mjs'], cwd=ROOT/'web-v1-app', text=True, capture_output=True)
combined = (proc.stdout or '') + '\n' + (proc.stderr or '')
if proc.returncode == 0:
    digest = re.search(r'EXPECTED_GOLDEN_FIXTURE_DIGEST = "([0-9a-f]{64})"', FIXTURE.read_text(encoding='utf-8')).group(1)
else:
    mm = re.search(r'Golden fixture digest ([0-9a-f]{64}) does not match committed expected digest', combined)
    if not mm:
        print(combined)
        raise SystemExit('Could not extract new golden fixture digest')
    digest = mm.group(1)

ft = FIXTURE.read_text(encoding='utf-8')
ft = re.sub(r'(const EXPECTED_GOLDEN_FIXTURE_DIGEST = ")[0-9a-f]{64}(";)', rf'\g<1>{digest}\g<2>', ft, count=1)
FIXTURE.write_text(ft, encoding='utf-8')
m = json.loads(MANIFEST.read_text(encoding='utf-8'))
m['golden_fixture_digest'] = digest
MANIFEST.write_text(json.dumps(m, indent=2) + '\n', encoding='utf-8')
print('new_digest=' + digest)
