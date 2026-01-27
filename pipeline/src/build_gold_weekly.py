#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
build_gold_weekly.py

Derives a per-chain WEEKLY gold dataset from daily gold (<gold_root>/<chain>.parquet).

Weekly outputs are designed for investor-oriented "what changed this week" views:
- 7d aggregates (sum/mean/median)
- week-over-week deltas
- seasonality baselines: median of last 8 and 26 weeks (excluding current week)

This script is deterministic and does NOT read raw AWS data. It only uses existing
daily gold parquet files already present on disk.

Output:
  <gold_weekly_root>/<chain>.parquet

Schema (stable, minimal):
  date (week_start ISO, Monday)
  week_start, week_end (ISO)
  chain
  activity_7d_sum
  fees_7d_sum_proxy
  capacity_7d_mean
  wow_activity_pct
  wow_fees_pct
  wow_capacity_pct
  baseline_activity_8w_med
  baseline_activity_26w_med
  baseline_fees_8w_med
  baseline_fees_26w_med
  baseline_capacity_8w_med
  baseline_capacity_26w_med
"""

import argparse
from datetime import datetime, timedelta
from pathlib import Path
import logging
import polars as pl

LOG = logging.getLogger("GOLD_WEEKLY")

def _normalize_date_column(df: pl.DataFrame, col: str = "date") -> pl.DataFrame:
    """Normalize an in-memory DataFrame date column to Polars Date.

    Note: Polars expressions do not expose dtype introspection (Expr has no .dtype).
    We therefore inspect the DataFrame schema and apply the appropriate cast.
    """
    if col not in df.columns:
        return df

    dt = df.schema.get(col)
    if dt == pl.Date:
        return df.with_columns(pl.col(col).alias("_d"))
    if dt == pl.Datetime:
        return df.with_columns(pl.col(col).dt.date().alias("_d"))

    # Default: treat as string-like and parse.
    return df.with_columns(pl.col(col).cast(pl.Utf8).str.strptime(pl.Date, strict=False).alias("_d"))

def _safe_pct_change(cur: pl.Expr, prev: pl.Expr) -> pl.Expr:
    return pl.when(prev.is_null() | (prev == 0)).then(None).otherwise((cur - prev) / prev)

def build_weekly_for_chain(chain: str, gold_root: Path, gold_weekly_root: Path) -> int:
    gold_weekly_root.mkdir(parents=True, exist_ok=True)
    inp = gold_root / f"{chain}.parquet"
    outp = gold_weekly_root / f"{chain}.parquet"

    if not inp.exists():
        LOG.warning("Missing daily gold for %s at %s", chain, inp)
        # Write empty placeholder to keep downstream from crashing
        empty = pl.DataFrame({"date": [], "week_start": [], "week_end": [], "chain": []})
        empty.write_parquet(str(outp))
        return 1

    df = pl.read_parquet(str(inp))
    if df.is_empty():
        df = pl.DataFrame({"date": [], "week_start": [], "week_end": [], "chain": []})
        df.write_parquet(str(outp))
        return 0

    # normalize date column name
    if "date" not in df.columns and "day" in df.columns:
        df = df.rename({"day": "date"})

    if "date" not in df.columns:
        LOG.error("Daily gold missing 'date' column: %s", inp)
        return 2

    df = _normalize_date_column(df, "date")
    df = df.with_columns(pl.lit(chain).alias("chain")).drop_nulls(subset=["_d"]).sort("_d")

    # Build proxies:
    # activity = tx_count_daily
    # fees proxy = median_tx_fee_native * tx_count_daily  (robust to missing total fees)
    # capacity proxy: for BTC use block_time + blocks; for others use gas utilization when present, else block time.
    tx = pl.col("tx_count_daily").cast(pl.Float64)
    med_fee = pl.col("median_tx_fee_native").cast(pl.Float64)
    gas_util = pl.col("gas_utilization_pct").cast(pl.Float64)
    blk_time = pl.col("avg_block_time_sec").cast(pl.Float64)

    fees_proxy_daily = (med_fee * tx).alias("_fee_proxy")
    df = df.with_columns(fees_proxy_daily)

    # week_start (Monday): weekday() is Monday=1..Sunday=7. Compute Monday by subtracting weekday-1 days.
    df = df.with_columns(
        (
            pl.col("_d")
            - pl.duration(days=(pl.col("_d").dt.weekday() - 1).cast(pl.Int64))
        ).alias("_week_start")
    )

    grp = df.group_by("_week_start").agg(
        pl.col("_d").min().alias("_min_d"),
        pl.col("_d").max().alias("_max_d"),
        tx.sum().alias("activity_7d_sum"),
        pl.col("_fee_proxy").sum().alias("fees_7d_sum_proxy"),
        gas_util.mean().alias("_gas_mean"),
        blk_time.mean().alias("_blk_mean"),
    ).sort("_week_start")

    # capacity: prefer gas utilization if it has data, else block time stability proxy (inverse)
    # Represent as a "higher is tighter" proxy in [0,1] when gas exists, else -block_time (lower block time => higher capacity, so negate)
    grp = grp.with_columns(
        pl.when(pl.col("_gas_mean").is_not_null())
          .then(pl.col("_gas_mean"))
          .otherwise(pl.col("_blk_mean") * -1.0)
          .alias("capacity_7d_mean")
    )

    # week_end
    grp = grp.with_columns(
        pl.col("_week_start").alias("week_start"),
        (pl.col("_week_start") + timedelta(days=6)).alias("week_end"),
        pl.lit(chain).alias("chain")
    )

    # wow deltas (pct)
    grp = grp.with_columns(
        pl.col("activity_7d_sum").shift(1).alias("_prev_act"),
        pl.col("fees_7d_sum_proxy").shift(1).alias("_prev_fee"),
        pl.col("capacity_7d_mean").shift(1).alias("_prev_cap"),
    ).with_columns(
        _safe_pct_change(pl.col("activity_7d_sum"), pl.col("_prev_act")).alias("wow_activity_pct"),
        _safe_pct_change(pl.col("fees_7d_sum_proxy"), pl.col("_prev_fee")).alias("wow_fees_pct"),
        _safe_pct_change(pl.col("capacity_7d_mean"), pl.col("_prev_cap")).alias("wow_capacity_pct"),
    )

    # baselines: median of prior weeks (exclude current) over 8 and 26
    grp = grp.with_columns(
        pl.col("activity_7d_sum").shift(1).rolling_median(window_size=8, min_samples=4).alias("baseline_activity_8w_med"),
        pl.col("activity_7d_sum").shift(1).rolling_median(window_size=26, min_samples=10).alias("baseline_activity_26w_med"),
        pl.col("fees_7d_sum_proxy").shift(1).rolling_median(window_size=8, min_samples=4).alias("baseline_fees_8w_med"),
        pl.col("fees_7d_sum_proxy").shift(1).rolling_median(window_size=26, min_samples=10).alias("baseline_fees_26w_med"),
        pl.col("capacity_7d_mean").shift(1).rolling_median(window_size=8, min_samples=4).alias("baseline_capacity_8w_med"),
        pl.col("capacity_7d_mean").shift(1).rolling_median(window_size=26, min_samples=10).alias("baseline_capacity_26w_med"),
    )

    # Final shape; keep a 'date' column for API slicing compatibility
    out = grp.select([
        pl.col("week_start").cast(pl.Date).dt.strftime("%Y-%m-%d").alias("date"),
        pl.col("week_start").cast(pl.Date).dt.strftime("%Y-%m-%d").alias("week_start"),
        pl.col("week_end").cast(pl.Date).dt.strftime("%Y-%m-%d").alias("week_end"),
        pl.col("chain"),
        pl.col("activity_7d_sum"),
        pl.col("fees_7d_sum_proxy"),
        pl.col("capacity_7d_mean"),
        pl.col("wow_activity_pct"),
        pl.col("wow_fees_pct"),
        pl.col("wow_capacity_pct"),
        pl.col("baseline_activity_8w_med"),
        pl.col("baseline_activity_26w_med"),
        pl.col("baseline_fees_8w_med"),
        pl.col("baseline_fees_26w_med"),
        pl.col("baseline_capacity_8w_med"),
        pl.col("baseline_capacity_26w_med"),
    ])

    out.write_parquet(str(outp))
    LOG.info("Wrote weekly gold: %s rows=%s first=%s last=%s", outp, out.height,
             out["date"][0] if out.height else None,
             out["date"][-1] if out.height else None)
    return 0


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
    ap = argparse.ArgumentParser()
    ap.add_argument("--chain", required=True)
    ap.add_argument("--gold_root", required=True)
    ap.add_argument("--gold_weekly_root", required=True)
    args = ap.parse_args()
    return build_weekly_for_chain(args.chain, Path(args.gold_root), Path(args.gold_weekly_root))

if __name__ == "__main__":
    raise SystemExit(main())
