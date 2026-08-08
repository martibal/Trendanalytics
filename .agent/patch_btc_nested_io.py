from __future__ import annotations

import json
from pathlib import Path

feature = Path('pipeline/src/feature_daily_agg.py')
text = feature.read_text(encoding='utf-8')

old_value = '''        # value (native) candidates
        value_col = None
        for cand in ["value", "value_native", "value_transferred", "amount", "native_value", "tx_value"]:
            if _ci_has(tx_ci, cand):
                value_col = cand
                break
'''
new_value = '''        # value (native) candidates. Bitcoin's AWS transaction schema exposes
        # total transaction outputs as output_value; prefer it over generic aliases
        # because UTXO transactions do not have a single top-level transfer value.
        value_col = None
        value_candidates = [
            "output_value",
            "value",
            "value_native",
            "value_transferred",
            "amount",
            "native_value",
            "tx_value",
        ] if str(chain).lower() in {"bitcoin", "btc"} else [
            "value",
            "value_native",
            "value_transferred",
            "amount",
            "native_value",
            "tx_value",
        ]
        for cand in value_candidates:
            if _ci_has(tx_ci, cand):
                value_col = cand
                break
'''
if old_value not in text:
    raise SystemExit('value candidate anchor not found')
text = text.replace(old_value, new_value, 1)

old_addr = '''        # unique_active_addresses
        from_candidates = ["from_address", "from", "sender"]
        to_candidates = ["to_address", "to", "recipient"]
        from_col = next((c for c in from_candidates if _ci_has(tx_ci, c)), None)
        to_col = next((c for c in to_candidates if _ci_has(tx_ci, c)), None)

        addr_exprs = []
        if from_col:
            addr_exprs.append(_ci_col(tx_ci, from_col))
        if to_col:
            addr_exprs.append(_ci_col(tx_ci, to_col))
        if addr_exprs:
            unique_addrs = tx.select(
                pl.concat_list(addr_exprs)
                .list.explode()
                .drop_nulls()
                .n_unique()
                .cast(pl.UInt32)
                .alias("unique_active_addresses")
            )
'''
new_addr = '''        # unique_active_addresses
        # Bitcoin is UTXO-based: AWS stores participant addresses inside
        # inputs[].address and outputs[].address rather than top-level from/to fields.
        # Count the union across both nested collections, excluding null/blank addresses.
        if str(chain).lower() in {"bitcoin", "btc"} and (
            _ci_has(tx_ci, "inputs") or _ci_has(tx_ci, "outputs")
        ):
            nested_addr_frames = []
            for io_col in ["inputs", "outputs"]:
                if _ci_has(tx_ci, io_col):
                    nested_addr_frames.append(
                        tx.select(
                            _ci_col(tx_ci, io_col)
                            .explode()
                            .struct.field("address")
                            .cast(pl.Utf8, strict=False)
                            .str.strip_chars()
                            .alias("address")
                        )
                    )
            if nested_addr_frames:
                unique_addrs = pl.concat(nested_addr_frames, how="vertical_relaxed").select(
                    pl.col("address")
                    .filter(pl.col("address").is_not_null() & (pl.col("address") != ""))
                    .n_unique()
                    .cast(pl.UInt32)
                    .alias("unique_active_addresses")
                )
        else:
            from_candidates = ["from_address", "from", "sender"]
            to_candidates = ["to_address", "to", "recipient"]
            from_col = next((c for c in from_candidates if _ci_has(tx_ci, c)), None)
            to_col = next((c for c in to_candidates if _ci_has(tx_ci, c)), None)

            addr_exprs = []
            if from_col:
                addr_exprs.append(_ci_col(tx_ci, from_col))
            if to_col:
                addr_exprs.append(_ci_col(tx_ci, to_col))
            if addr_exprs:
                unique_addrs = tx.select(
                    pl.concat_list(addr_exprs)
                    .list.explode()
                    .drop_nulls()
                    .n_unique()
                    .cast(pl.UInt32)
                    .alias("unique_active_addresses")
                )
'''
if old_addr not in text:
    raise SystemExit('address anchor not found')
text = text.replace(old_addr, new_addr, 1)
feature.write_text(text, encoding='utf-8')

fixture = Path('web-v1-app/scripts/pipeline-golden-fixture.mjs')
js = fixture.read_text(encoding='utf-8')
anchor = 'function validateEthereumBlockGasP90(parent) {'
if anchor not in js:
    raise SystemExit('fixture insertion anchor not found')
btc_test = r'''function validateBitcoinNestedInputsOutputs(parent) {
  const runRoot = path.join(parent, "bitcoin-nested-io");
  const rawRoot = path.join(runRoot, "raw");
  const featuresRoot = path.join(runRoot, "features_agg");
  const day = "2026-01-01";
  const txDir = path.join(rawRoot, "bitcoin", "transactions", `date=${day}`);
  const blockDir = path.join(rawRoot, "bitcoin", "blocks", `date=${day}`);
  fs.mkdirSync(txDir, { recursive: true });
  fs.mkdirSync(blockDir, { recursive: true });

  const createCode = String.raw`
import sys
from pathlib import Path
import polars as pl

tx_out = Path(sys.argv[1])
blk_out = Path(sys.argv[2])
pl.DataFrame({
    "output_value": [4.0, 6.0],
    "input_value": [4.1, 6.2],
    "fee": [0.1, 0.2],
    "virtual_size": [100.0, 200.0],
    "is_coinbase": [False, False],
    "inputs": [
        [{"address": "a"}, {"address": "b"}],
        [{"address": "a"}, {"address": "e"}],
    ],
    "outputs": [
        [{"address": "c"}, {"address": "d"}],
        [{"address": "f"}, {"address": None}],
    ],
}).write_parquet(tx_out / "part-000.parquet")
pl.DataFrame({
    "timestamp": [1704067200, 1704067800],
    "weight": [2000000.0, 2000000.0],
}).write_parquet(blk_out / "part-000.parquet")
`;
  runCommand(PYTHON, ["-c", createCode, txDir, blockDir]);

  runCommand(PYTHON, [
    path.join(REPO_ROOT, "pipeline", "src", "feature_daily_agg.py"),
    "--chain", "bitcoin",
    "--date", day,
    "--raw_root", rawRoot,
    "--out_root", featuresRoot,
  ]);

  const checkCode = String.raw`
import json
import sys
from pathlib import Path
import polars as pl
p = Path(sys.argv[1]) / "bitcoin" / "2026-01-01.parquet"
df = pl.read_parquet(p)
print(json.dumps({
    "value_sum": df["value_transferred_native"][0],
    "value_median": df["median_tx_value_native"][0],
    "unique": df["unique_active_addresses"][0],
}))
`;
  const result = runCommand(PYTHON, ["-c", checkCode, featuresRoot]);
  const parsed = JSON.parse(result.stdout.trim());
  assertClose(parsed.value_sum, 10, "bitcoin.value_transferred_native_from_output_value");
  assertClose(parsed.value_median, 5, "bitcoin.median_tx_value_native_from_output_value");
  assertClose(parsed.unique, 6, "bitcoin.unique_active_addresses_from_nested_io");
}

'''
js = js.replace(anchor, btc_test + anchor, 1)
call_anchor = '  validateEthereumBlockGasP90(tmpRoot);\n'
if call_anchor not in js:
    raise SystemExit('fixture call anchor not found')
js = js.replace(call_anchor, '  validateBitcoinNestedInputsOutputs(tmpRoot);\n' + call_anchor, 1)
fixture.write_text(js, encoding='utf-8')

methodology = Path('pipeline/methodology-version.json')
obj = json.loads(methodology.read_text(encoding='utf-8'))
if obj.get('methodology_version') != '2.0':
    raise SystemExit(f"Unexpected methodology version {obj.get('methodology_version')}")
obj['methodology_version'] = '2.1'
methodology.write_text(json.dumps(obj, indent=2) + '\n', encoding='utf-8')
