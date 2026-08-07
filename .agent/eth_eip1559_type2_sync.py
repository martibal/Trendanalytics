#!/usr/bin/env python3
from pathlib import Path
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: Path, old: str, new: str):
    text = path.read_text(encoding="utf-8")
    if text.count(old) != 1:
        raise RuntimeError(f"Expected exactly one match in {path}: {old[:80]!r}; found {text.count(old)}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")

feature = ROOT / "pipeline/src/feature_daily_agg.py"
replace_once(feature,
'''    "contract_creation_tx_share",\n    "failed_tx_rate",''',
'''    "contract_creation_tx_share",\n    "eip1559_type2_tx_share",\n    "failed_tx_rate",''')
replace_once(feature,
'''    contract_creation_tx_share = pl.LazyFrame({"contract_creation_tx_share": [None]})\n    failed_tx_rate = pl.LazyFrame({"failed_tx_rate": [None]})''',
'''    contract_creation_tx_share = pl.LazyFrame({"contract_creation_tx_share": [None]})\n    eip1559_type2_tx_share = pl.LazyFrame({"eip1559_type2_tx_share": [None]})\n    failed_tx_rate = pl.LazyFrame({"failed_tx_rate": [None]})''')
replace_once(feature,
'''            contract_creation_tx_share = tx.select(created_contract.mean().alias("contract_creation_tx_share"))\n\n        # failed_tx_rate''',
'''            contract_creation_tx_share = tx.select(created_contract.mean().alias("contract_creation_tx_share"))\n\n        # Ethereum transaction-type composition: share of EIP-1559 dynamic-fee type-2 transactions.\n        # Prefer transaction_type; accept type as a compatibility fallback. Numeric 2 and hex 0x2/0x02 are equivalent.\n        if str(chain).lower() in {"ethereum", "eth"}:\n            tx_type_col = next((c for c in ["transaction_type", "type"] if _ci_has(tx_ci, c)), None)\n            if tx_type_col is not None:\n                tx_type_raw = _ci_col(tx_ci, tx_type_col)\n                tx_type_num = tx_type_raw.cast(pl.Float64, strict=False)\n                tx_type_text = tx_type_raw.cast(pl.Utf8, strict=False).str.strip_chars().str.to_lowercase()\n                is_type2 = ((tx_type_num == 2.0) | tx_type_text.is_in(["2", "2.0", "0x2", "0x02"])).fill_null(False)\n                eip1559_type2_tx_share = tx.select(is_type2.mean().alias("eip1559_type2_tx_share"))\n\n        # failed_tx_rate''')
replace_once(feature,
'''        .join(contract_creation_tx_share, how="cross")\n        .join(failed_tx_rate, how="cross")''',
'''        .join(contract_creation_tx_share, how="cross")\n        .join(eip1559_type2_tx_share, how="cross")\n        .join(failed_tx_rate, how="cross")''')

build = ROOT / "pipeline/src/build_gold_timeseries.py"
replace_once(build,
'''    "contract_creation_tx_share",\n    "failed_tx_rate",''',
'''    "contract_creation_tx_share",\n    "eip1559_type2_tx_share",\n    "failed_tx_rate",''')
replace_once(build,
'''    # median_tx_gas_used: Ethereum-only, non-negative gas units.\n''',
'''    # eip1559_type2_tx_share: Ethereum-only ratio in [0,1].\n    if "eip1559_type2_tx_share" in df.columns:\n        if prof == "eth":\n            df = df.with_columns(\n                pl.when(pl.col("eip1559_type2_tx_share").is_null())\n                .then(None)\n                .when((pl.col("eip1559_type2_tx_share") >= 0.0) & (pl.col("eip1559_type2_tx_share") <= 1.0))\n                .then(pl.col("eip1559_type2_tx_share"))\n                .otherwise(None)\n                .alias("eip1559_type2_tx_share")\n            )\n        else:\n            df = df.with_columns(pl.lit(None).alias("eip1559_type2_tx_share"))\n\n    # median_tx_gas_used: Ethereum-only, non-negative gas units.\n''')
replace_once(build,
'''    # median_tx_gas_used: Ethereum-only non-negative gas units.\n''',
'''    # eip1559_type2_tx_share: Ethereum-only ratio in [0,1].\n    if "eip1559_type2_tx_share" in df.columns:\n        if prof == "eth":\n            out_of_range["eip1559_type2_tx_share"] = int(\n                df.select(((pl.col("eip1559_type2_tx_share").is_not_null()) & ((pl.col("eip1559_type2_tx_share") < 0.0) | (pl.col("eip1559_type2_tx_share") > 1.0))).sum()).item()\n            )\n        else:\n            out_of_range["eip1559_type2_tx_share"] = 0\n\n    # median_tx_gas_used: Ethereum-only non-negative gas units.\n''')

fields = ROOT / "web-v1-app/src/app/methodology/fields/page.tsx"
replace_once(fields,
'''  {\n    field: "failed_tx_rate",''',
'''  {\n    field: "eip1559_type2_tx_share",\n    meaning: "Share of Ethereum transactions using EIP-1559 dynamic-fee transaction type 2 that day.",\n    notes: (\n      <>\n        Ethereum-only observational transaction-composition field derived from <FieldCode>transaction_type</FieldCode>,\n        with <FieldCode>type</FieldCode> as a schema-compatibility fallback. Numeric <FieldCode>2</FieldCode> and\n        equivalent hex encodings such as <FieldCode>0x2</FieldCode> count as type 2. Values are published on a\n        0–1 scale, are null for non-Ethereum chains, and describe transaction-envelope adoption only; they do not\n        identify protocols, tokens, financial intent, or trading behaviour. The field does not yet drive the public\n        regime label, scorecard, or confidence calculation while historical behaviour is being validated.\n      </>\n    ),\n  },\n  {\n    field: "failed_tx_rate",''')

golden = ROOT / "web-v1-app/scripts/pipeline-golden-fixture.mjs"
replace_once(golden,
'''    "receipt_contract_address": [None, "", "0xabc123", None],\n''',
'''    "receipt_contract_address": [None, "", "0xabc123", None],\n    "transaction_type": [0, 2, 2, 1],\n''')
replace_once(golden,
'''print(json.dumps({"p90": df["block_gas_utilization_p90"][0], "base_fee": df["median_block_base_fee_per_gas"][0], "tx_gas": df["median_tx_gas_used"][0], "calldata_share": df["nonempty_calldata_share"][0], "contract_creation_share": df["contract_creation_tx_share"][0]}))''',
'''print(json.dumps({"p90": df["block_gas_utilization_p90"][0], "base_fee": df["median_block_base_fee_per_gas"][0], "tx_gas": df["median_tx_gas_used"][0], "calldata_share": df["nonempty_calldata_share"][0], "contract_creation_share": df["contract_creation_tx_share"][0], "type2_share": df["eip1559_type2_tx_share"][0]}))''')
replace_once(golden,
'''  assertClose(parsed.contract_creation_share, 0.25, "ethereum.contract_creation_tx_share");\n''',
'''  assertClose(parsed.contract_creation_share, 0.25, "ethereum.contract_creation_tx_share");\n  assertClose(parsed.type2_share, 0.5, "ethereum.eip1559_type2_tx_share");\n''')

manifest = ROOT / "pipeline/methodology-version.json"
data = json.loads(manifest.read_text(encoding="utf-8"))
if data.get("methodology_version") != "1.8":
    raise RuntimeError(f"Unexpected methodology version: {data.get('methodology_version')}")
data["methodology_version"] = "1.9"
manifest.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

proc = subprocess.run(["npm", "run", "check:pipeline-golden-fixture"], cwd=ROOT / "web-v1-app", text=True, capture_output=True)
combined = proc.stdout + "\n" + proc.stderr
m = re.search(r"Golden fixture digest ([0-9a-f]{64}) does not match committed expected digest", combined)
if not m:
    if proc.returncode == 0:
        raise RuntimeError("Golden fixture unexpectedly retained old digest after canonical schema change")
    raise RuntimeError("Could not extract new golden digest:\n" + combined)
new_digest = m.group(1)

text = golden.read_text(encoding="utf-8")
text = re.sub(r'const EXPECTED_GOLDEN_FIXTURE_DIGEST = "[0-9a-f]{64}";', f'const EXPECTED_GOLDEN_FIXTURE_DIGEST = "{new_digest}";', text, count=1)
golden.write_text(text, encoding="utf-8")

data = json.loads(manifest.read_text(encoding="utf-8"))
data["golden_fixture_digest"] = new_digest
manifest.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
print(f"Synchronized golden digest: {new_digest}")
