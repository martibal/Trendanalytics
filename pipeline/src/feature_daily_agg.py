#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import logging
from pathlib import Path
from typing import Dict, Optional, Tuple

import polars as pl

LOG = logging.getLogger("FEATURE_AGG")

CANON_COLS = [
    "date",
    "chain",
    "tx_count_daily",
    "block_count_daily",
    "value_transferred_native",
    "median_tx_value_native",
    "median_tx_fee_native",
    "median_tx_fee_rate_sat_vbyte",
    "median_tx_gas_used",
    "failed_tx_rate",
    "gas_utilization_pct",
    "median_block_base_fee_per_gas",
    "block_gas_utilization_p90",
    "block_weight_utilization_pct",
    "unique_active_addresses",
    "avg_block_time_sec",
]


def _raw_day_paths(raw_root: Path, chain: str, day_str: str) -> Tuple[Path, Path]:
    """
    Raw layout compatibility.

    Historically, different ingest tools have produced one of these layouts:

      A) raw_root/<chain>/<table>/date=<YYYY-MM-DD>/*.parquet
      B) raw_root/<chain>/<table>/<YYYY-MM-DD>/*.parquet

    We support both. Preference order:
      1) date=<YYYY-MM-DD> (Hive-style partition)
      2) <YYYY-MM-DD>      (plain folder)

    Returns (tx_dir, blk_dir) for the chosen layout; the directories may not exist.
    """
    chain_dir = raw_root / chain

    # Preferred (Hive-style) layout
    tx_dir_hive = chain_dir / "transactions" / f"date={day_str}"
    blk_dir_hive = chain_dir / "blocks" / f"date={day_str}"

    # Plain layout
    tx_dir_plain = chain_dir / "transactions" / day_str
    blk_dir_plain = chain_dir / "blocks" / day_str

    tx_dir = tx_dir_hive if tx_dir_hive.exists() else tx_dir_plain
    blk_dir = blk_dir_hive if blk_dir_hive.exists() else blk_dir_plain
    return tx_dir, blk_dir


def _scan_dir(dir_path: Path) -> Optional[pl.LazyFrame]:
    """
    Robust parquet scanning:
      - Some days/tables have parquet files with slightly different schemas.
      - Using scan_parquet(list_of_files) can raise SchemaError.
      - We instead scan per-file and concat using diagonal_relaxed (union schema).
    """
    if not dir_path.exists():
        return None

    files = sorted(str(p) for p in dir_path.rglob("*.parquet"))
    if not files:
        return None

    lfs = []
    for f in files:
        try:
            lfs.append(pl.scan_parquet(f))
        except Exception as e:
            LOG.warning("Failed to scan parquet %s: %s", f, e)

    if not lfs:
        return None

    return pl.concat(lfs, how="diagonal_relaxed")


def _load_daily_inputs(raw_root: Path, chain: str, day_str: str) -> Tuple[Optional[pl.LazyFrame], Optional[pl.LazyFrame]]:
    tx_dir, blk_dir = _raw_day_paths(raw_root, chain, day_str)
    tx = _scan_dir(tx_dir)
    blocks = _scan_dir(blk_dir)
    return tx, blocks


def _has_non_empty_parquet(day_dir: Path) -> Tuple[bool, str]:
    if not day_dir.exists():
        return False, "MISSING"
    files = list(day_dir.rglob("*.parquet"))
    if not files:
        return False, "NO_PARQUET"
    for f in files:
        try:
            if f.stat().st_size > 0:
                return True, "OK"
        except Exception:
            continue
    return False, "EMPTY"


def _ci_map_columns(lf: pl.LazyFrame) -> Dict[str, str]:
    return {c.lower(): c for c in lf.columns}


def _ci_has(ci: Dict[str, str], name: str) -> bool:
    return name.lower() in ci


def _ci_col(ci: Dict[str, str], name: str) -> pl.Expr:
    return pl.col(ci[name.lower()])


def _ci_safe_f64(ci: Dict[str, str], name: str) -> pl.Expr:
    return _ci_col(ci, name).cast(pl.Float64, strict=False)


def compute_daily_features(chain: str, day_str: str, raw_root: Path) -> Optional[pl.DataFrame]:
    tx_dir, blk_dir = _raw_day_paths(raw_root, chain, day_str)
    tx_ok, tx_reason = _has_non_empty_parquet(tx_dir)
    blk_ok, blk_reason = _has_non_empty_parquet(blk_dir)

    if not tx_ok and not blk_ok:
        LOG.warning("[FEATURE] %s %s: no inputs (%s/%s)", chain, day_str, tx_reason, blk_reason)
        return None

    tx, blocks = _load_daily_inputs(raw_root, chain, day_str)
    if tx is None and blocks is None:
        LOG.warning("[FEATURE] %s %s: failed to scan inputs", chain, day_str)
        return None

    base = pl.LazyFrame({"date": [day_str], "chain": [chain]})

    # Transactions-derived features
    tx_ci = _ci_map_columns(tx) if tx is not None else {}

    tx_count = pl.LazyFrame({"tx_count_daily": [None]})
    value_sum = pl.LazyFrame({"value_transferred_native": [None]})
    value_med = pl.LazyFrame({"median_tx_value_native": [None]})
    median_fee = pl.LazyFrame({"median_tx_fee_native": [None]})
    median_fee_rate = pl.LazyFrame({"median_tx_fee_rate_sat_vbyte": [None]})
    median_tx_gas_used = pl.LazyFrame({"median_tx_gas_used": [None]})
    failed_tx_rate = pl.LazyFrame({"failed_tx_rate": [None]})
    unique_addrs = pl.LazyFrame({"unique_active_addresses": [None]})

    if tx is not None:
        tx_count = tx.select(pl.len().cast(pl.UInt32).alias("tx_count_daily"))

        # value (native) candidates
        value_col = None
        for cand in ["value", "value_native", "value_transferred", "amount", "native_value", "tx_value"]:
            if _ci_has(tx_ci, cand):
                value_col = cand
                break

        if value_col is not None:
            value_expr = _ci_safe_f64(tx_ci, value_col)
            value_sum = tx.select(value_expr.sum().alias("value_transferred_native"))
            value_med = tx.select(value_expr.median().alias("median_tx_value_native"))

        # fee candidates
        fee_expr: Optional[pl.Expr] = None

        for cand in ["fee", "tx_fee", "transaction_fee", "gas_fee", "transaction_fee_native", "transaction_fee"]:
            if _ci_has(tx_ci, cand):
                fee_expr = _ci_safe_f64(tx_ci, cand).median().alias("median_tx_fee_native")
                break

        if fee_expr is None and (_ci_has(tx_ci, "receipt_effective_gas_price") and _ci_has(tx_ci, "receipt_gas_used")):
            fee_expr = (
                (_ci_safe_f64(tx_ci, "receipt_effective_gas_price") * _ci_safe_f64(tx_ci, "receipt_gas_used"))
                .median()
                .alias("median_tx_fee_native")
            )

        if fee_expr is None and (_ci_has(tx_ci, "effective_gas_price") and _ci_has(tx_ci, "gas_used")):
            fee_expr = (
                (_ci_safe_f64(tx_ci, "effective_gas_price") * _ci_safe_f64(tx_ci, "gas_used"))
                .median()
                .alias("median_tx_fee_native")
            )

        if fee_expr is None and (_ci_has(tx_ci, "gas_price") and _ci_has(tx_ci, "gas_used")):
            fee_expr = ((_ci_safe_f64(tx_ci, "gas_price") * _ci_safe_f64(tx_ci, "gas_used")).median()).alias(
                "median_tx_fee_native"
            )

        if fee_expr is not None:
            median_fee = tx.select(fee_expr)

        # Bitcoin fee rate: fee is expressed in BTC in the AWS/bitcoin-etl
        # transaction schema, while virtual_size is measured in virtual bytes.
        # Convert BTC -> satoshis before dividing, and publish the daily median.
        if str(chain).lower() in {"bitcoin", "btc"} and _ci_has(tx_ci, "fee") and _ci_has(tx_ci, "virtual_size"):
            fee_btc = _ci_safe_f64(tx_ci, "fee")
            virtual_size = _ci_safe_f64(tx_ci, "virtual_size")
            fee_rate = pl.when(
                fee_btc.is_not_null() & virtual_size.is_not_null() & (virtual_size > 0)
            ).then((fee_btc * pl.lit(100_000_000.0)) / virtual_size).otherwise(None)
            if _ci_has(tx_ci, "is_coinbase"):
                fee_rate = pl.when(_ci_col(tx_ci, "is_coinbase") == False).then(fee_rate).otherwise(None)  # noqa: E712
            median_fee_rate = tx.select(fee_rate.median().alias("median_tx_fee_rate_sat_vbyte"))

        # Ethereum execution intensity: median gas actually consumed by transactions.
        # Prefer receipt_gas_used; fall back to transaction gas_used only when needed.
        if str(chain).lower() in {"ethereum", "eth"}:
            tx_gas_col = next((c for c in ["receipt_gas_used", "gas_used"] if _ci_has(tx_ci, c)), None)
            if tx_gas_col is not None:
                tx_gas = _ci_safe_f64(tx_ci, tx_gas_col)
                median_tx_gas_used = tx.select(
                    pl.when(tx_gas >= 0.0).then(tx_gas).otherwise(None).median().alias("median_tx_gas_used")
                )

        # failed_tx_rate
        if _ci_has(tx_ci, "receipt_status"):
            failed_tx_rate = tx.select((_ci_safe_f64(tx_ci, "receipt_status") != 1.0).mean().alias("failed_tx_rate"))
        elif _ci_has(tx_ci, "status"):
            failed_tx_rate = tx.select((_ci_safe_f64(tx_ci, "status") != 1.0).mean().alias("failed_tx_rate"))

        # unique_active_addresses
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

    # Blocks-derived features
    blk_ci = _ci_map_columns(blocks) if blocks is not None else {}

    block_count = pl.LazyFrame({"block_count_daily": [None]})
    gas_util = pl.LazyFrame({"gas_utilization_pct": [None]})
    median_base_fee = pl.LazyFrame({"median_block_base_fee_per_gas": [None]})
    block_gas_p90 = pl.LazyFrame({"block_gas_utilization_p90": [None]})
    block_weight_util = pl.LazyFrame({"block_weight_utilization_pct": [None]})
    avg_block_time = pl.LazyFrame({"avg_block_time_sec": [None]})

    if blocks is not None:
        block_count = blocks.select(pl.len().cast(pl.UInt32).alias("block_count_daily"))

        if str(chain).lower() in {"ethereum", "eth"} and _ci_has(blk_ci, "base_fee_per_gas"):
            base_fee = _ci_safe_f64(blk_ci, "base_fee_per_gas")
            median_base_fee = blocks.select(
                pl.when(base_fee >= 0.0).then(base_fee).otherwise(None).median().alias("median_block_base_fee_per_gas")
            )

        if _ci_has(blk_ci, "gas_used") and _ci_has(blk_ci, "gas_limit"):
            gas_used_sum = _ci_safe_f64(blk_ci, "gas_used").sum()
            gas_limit_sum = _ci_safe_f64(blk_ci, "gas_limit").sum()
            gas_util = blocks.select(
                pl.when(gas_limit_sum > 0).then(gas_used_sum / gas_limit_sum).otherwise(None).alias("gas_utilization_pct")
            )

            # Ethereum-only blockspace stress observation. Unlike the daily aggregate
            # above, this retains information about the upper tail of per-block load.
            if str(chain).lower() in {"ethereum", "eth"}:
                per_block_util = pl.when(
                    _ci_safe_f64(blk_ci, "gas_limit") > 0
                ).then(
                    _ci_safe_f64(blk_ci, "gas_used") / _ci_safe_f64(blk_ci, "gas_limit")
                ).otherwise(None)
                block_gas_p90 = blocks.select(
                    per_block_util.drop_nulls().quantile(0.90, interpolation="nearest").alias("block_gas_utilization_p90")
                )

        # Bitcoin blockspace utilization: average block weight divided by the
        # consensus maximum of 4,000,000 weight units. This is intentionally
        # computed only for the BTC profile; non-BTC chains remain null.
        if str(chain).lower() in {"bitcoin", "btc"}:
            weight_col = next((c for c in ["weight", "block_weight"] if _ci_has(blk_ci, c)), None)
            if weight_col is not None:
                weight = _ci_safe_f64(blk_ci, weight_col)
                block_weight_util = blocks.select(
                    pl.when(weight.is_not_null().sum() > 0)
                    .then(weight.mean() / pl.lit(4_000_000.0))
                    .otherwise(None)
                    .alias("block_weight_utilization_pct")
                )

        def _ts_divisor_from_max(max_ts_expr: pl.Expr) -> pl.Expr:
            return (
                pl.when(max_ts_expr >= 1_000_000_000_000_000_000)
                .then(pl.lit(1_000_000_000))
                .when(max_ts_expr >= 1_000_000_000_000_000)
                .then(pl.lit(1_000_000))
                .when(max_ts_expr >= 1_000_000_000_000)
                .then(pl.lit(1_000))
                .otherwise(pl.lit(1))
            )

        ts_col = None
        if _ci_has(blk_ci, "timestamp"):
            ts_col = "timestamp"
        elif _ci_has(blk_ci, "block_timestamp"):
            ts_col = "block_timestamp"

        if ts_col is not None:
            ts = (
                blocks.select(_ci_col(blk_ci, ts_col).cast(pl.Int64, strict=False).alias("ts"))
                .drop_nulls()
                .unique()
                .sort("ts")
            )

            max_ts = pl.col("ts").max()
            divisor = _ts_divisor_from_max(max_ts)

            avg_block_time = ts.select((pl.col("ts").diff().median() / divisor).alias("avg_block_time_sec"))

    out = (
        base.join(tx_count, how="cross")
        .join(block_count, how="cross")
        .join(value_sum, how="cross")
        .join(value_med, how="cross")
        .join(median_fee, how="cross")
        .join(median_fee_rate, how="cross")
        .join(median_tx_gas_used, how="cross")
        .join(failed_tx_rate, how="cross")
        .join(gas_util, how="cross")
        .join(median_base_fee, how="cross")
        .join(block_gas_p90, how="cross")
        .join(block_weight_util, how="cross")
        .join(unique_addrs, how="cross")
        .join(avg_block_time, how="cross")
        .collect()
    )

    for c in CANON_COLS:
        if c not in out.columns:
            out = out.with_columns(pl.lit(None).alias(c))
    out = out.select(CANON_COLS)

    def _chain_profile(ch: str) -> str:
        c = (ch or "").lower()
        if c in {"bitcoin", "btc"}:
            return "btc"
        if c in {"ethereum", "eth"}:
            return "eth"
        if c in {"arbitrum", "arb", "base"}:
            return "l2"
        return "evm"

    prof = _chain_profile(chain)

    if "avg_block_time_sec" in out.columns:
        if prof == "btc":
            bt_min, bt_max = 30.0, 7200.0
        elif prof == "eth":
            bt_min, bt_max = 0.5, 120.0
        elif prof == "l2":
            bt_min, bt_max = 0.02, 30.0
        else:
            bt_min, bt_max = 0.05, 600.0

        out = out.with_columns(
            pl.when(pl.col("avg_block_time_sec").is_null())
            .then(None)
            .when((pl.col("avg_block_time_sec") >= bt_min) & (pl.col("avg_block_time_sec") <= bt_max))
            .then(pl.col("avg_block_time_sec"))
            .otherwise(None)
            .alias("avg_block_time_sec")
        )

    if "gas_utilization_pct" in out.columns:
        if prof == "btc":
            out = out.with_columns(pl.lit(None).alias("gas_utilization_pct"))
        else:
            out = out.with_columns(
                pl.when(pl.col("gas_utilization_pct").is_null())
                .then(None)
                .when((pl.col("gas_utilization_pct") >= 0) & (pl.col("gas_utilization_pct") <= 1.2))
                .then(pl.col("gas_utilization_pct"))
                .otherwise(None)
                .alias("gas_utilization_pct")
            )

    if "median_tx_gas_used" in out.columns:
        if prof == "eth":
            out = out.with_columns(
                pl.when(pl.col("median_tx_gas_used").is_null())
                .then(None)
                .when(pl.col("median_tx_gas_used") >= 0.0)
                .then(pl.col("median_tx_gas_used"))
                .otherwise(None)
                .alias("median_tx_gas_used")
            )
        else:
            out = out.with_columns(pl.lit(None).alias("median_tx_gas_used"))

    if "median_block_base_fee_per_gas" in out.columns:
        if prof == "eth":
            out = out.with_columns(
                pl.when(pl.col("median_block_base_fee_per_gas").is_null())
                .then(None)
                .when(pl.col("median_block_base_fee_per_gas") >= 0.0)
                .then(pl.col("median_block_base_fee_per_gas"))
                .otherwise(None)
                .alias("median_block_base_fee_per_gas")
            )
        else:
            out = out.with_columns(pl.lit(None).alias("median_block_base_fee_per_gas"))

    if "block_gas_utilization_p90" in out.columns:
        if prof == "eth":
            out = out.with_columns(
                pl.when(pl.col("block_gas_utilization_p90").is_null())
                .then(None)
                .when((pl.col("block_gas_utilization_p90") >= 0) & (pl.col("block_gas_utilization_p90") <= 1.0))
                .then(pl.col("block_gas_utilization_p90"))
                .otherwise(None)
                .alias("block_gas_utilization_p90")
            )
        else:
            out = out.with_columns(pl.lit(None).alias("block_gas_utilization_p90"))

    if "median_tx_fee_rate_sat_vbyte" in out.columns:
        if prof == "btc":
            out = out.with_columns(
                pl.when(pl.col("median_tx_fee_rate_sat_vbyte").is_null())
                .then(None)
                .when(pl.col("median_tx_fee_rate_sat_vbyte") >= 0)
                .then(pl.col("median_tx_fee_rate_sat_vbyte"))
                .otherwise(None)
                .alias("median_tx_fee_rate_sat_vbyte")
            )
        else:
            out = out.with_columns(pl.lit(None).alias("median_tx_fee_rate_sat_vbyte"))

    if "block_weight_utilization_pct" in out.columns:
        if prof == "btc":
            out = out.with_columns(
                pl.when(pl.col("block_weight_utilization_pct").is_null())
                .then(None)
                .when((pl.col("block_weight_utilization_pct") >= 0) & (pl.col("block_weight_utilization_pct") <= 1.0))
                .then(pl.col("block_weight_utilization_pct"))
                .otherwise(None)
                .alias("block_weight_utilization_pct")
            )
        else:
            out = out.with_columns(pl.lit(None).alias("block_weight_utilization_pct"))

    if "failed_tx_rate" in out.columns:
        out = out.with_columns(
            pl.when(pl.col("failed_tx_rate").is_null())
            .then(None)
            .when((pl.col("failed_tx_rate") >= 0) & (pl.col("failed_tx_rate") <= 1))
            .then(pl.col("failed_tx_rate"))
            .otherwise(None)
            .alias("failed_tx_rate")
        )

    if out.height != 1:
        LOG.warning("[FEATURE] %s %s produced %s rows; expected 1. Keeping first row.", chain, day_str, out.height)
        out = out.head(1)

    return out


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")

    ap = argparse.ArgumentParser()
    ap.add_argument("--chain", required=True)
    ap.add_argument("--date", required=True)  # YYYY-MM-DD
    ap.add_argument("--raw_root", required=True)
    ap.add_argument("--out_root", required=True)
    args = ap.parse_args()

    raw_root = Path(args.raw_root)
    out_dir = Path(args.out_root) / args.chain

    if out_dir.parent.name.lower() == "features":
        raise SystemExit(f"Refusing to write to legacy features root: {out_dir.parent}. Use features_agg.")

    out_dir.mkdir(parents=True, exist_ok=True)

    df = compute_daily_features(args.chain, args.date, raw_root)
    if df is None:
        LOG.warning("[FEATURE] %s %s: no output", args.chain, args.date)
        return 2

    out_path = out_dir / f"{args.date}.parquet"
    df.write_parquet(out_path)
    LOG.info("[FEATURE] wrote %s", out_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
