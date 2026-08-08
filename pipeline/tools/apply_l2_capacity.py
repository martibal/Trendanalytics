#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Dict, Iterable, Optional

import polars as pl

L2_CHAINS = {"arbitrum", "base"}
RAW_VALUE_COLUMNS = {
    "arbitrum": "arbitrum_l1_gas_used_daily",
    "base": "base_blob_gas_used_daily",
}
CAPACITY_COLUMN = "capacity_util_pct"
BASELINE_WINDOW_DAYS = 30
MIN_BASELINE_DAYS = 7


def _day_dir(raw_root: Path, chain: str, table: str, day: str) -> Optional[Path]:
    for candidate in (
        raw_root / chain / table / f"date={day}",
        raw_root / chain / table / day,
    ):
        if candidate.exists() and any(candidate.rglob("*.parquet")):
            return candidate
    return None


def _parquet_files(day_dir: Path) -> list[str]:
    return [str(path) for path in sorted(day_dir.rglob("*.parquet")) if path.is_file() and path.stat().st_size > 0]


def _column_map(files: list[str]) -> Dict[str, str]:
    if not files:
        return {}
    schema = pl.read_parquet_schema(files[0])
    return {name.lower(): name for name in schema.names()}


def _sum_column(files: list[str], wanted: str) -> Optional[float]:
    if not files:
        return None

    frames: list[pl.LazyFrame] = []
    for file in files:
        try:
            frames.append(pl.scan_parquet(file))
        except Exception:
            continue
    if not frames:
        return None

    lf = pl.concat(frames, how="diagonal_relaxed")
    ci = {name.lower(): name for name in lf.collect_schema().names()}
    actual = ci.get(wanted.lower())
    if actual is None:
        return None

    value = lf.select(
        pl.col(actual).cast(pl.Float64, strict=False).sum().alias("value")
    ).collect().item()
    if value is None:
        return None
    value = float(value)
    if not math.isfinite(value) or value < 0:
        return None
    return value


def _raw_capacity_from_local_raw(raw_root: Path, chain: str, day: str) -> Optional[float]:
    if chain == "arbitrum":
        tx_dir = _day_dir(raw_root, chain, "transactions", day)
        return _sum_column(_parquet_files(tx_dir), "gas_used_for_l1") if tx_dir else None

    if chain == "base":
        block_dir = _day_dir(raw_root, chain, "blocks", day)
        return _sum_column(_parquet_files(block_dir), "blob_gas_used") if block_dir else None

    return None


def _finite_number(value) -> Optional[float]:
    if isinstance(value, bool):
        return None
    try:
        f = float(value)
    except Exception:
        return None
    return f if math.isfinite(f) and f >= 0 else None


def _published_raw_history(published_root: Path, chain: str) -> Dict[str, float]:
    raw_col = RAW_VALUE_COLUMNS[chain]
    out: Dict[str, float] = {}
    chain_dir = published_root / "gold" / chain
    if not chain_dir.exists():
        return out

    for path in sorted(chain_dir.glob("????-??-??.json")):
        try:
            obj = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(obj, dict):
            continue

        candidates: Iterable[dict] = (
            obj,
            obj.get("metrics") if isinstance(obj.get("metrics"), dict) else {},
            obj.get("gold") if isinstance(obj.get("gold"), dict) else {},
        )
        value = None
        for candidate in candidates:
            if raw_col in candidate:
                value = _finite_number(candidate.get(raw_col))
                if value is not None:
                    break
        if value is not None:
            out[path.stem] = value
    return out


def _rolling_capacity(df: pl.DataFrame, raw_col: str) -> pl.Series:
    raw = df.get_column(raw_col).cast(pl.Float64, strict=False)
    # Use only PRIOR observations for the denominator. This prevents today's
    # observation from moving its own baseline and preserves deterministic history.
    baseline = raw.shift(1).rolling_quantile(
        quantile=0.95,
        window_size=BASELINE_WINDOW_DAYS,
        min_samples=MIN_BASELINE_DAYS,
        interpolation="nearest",
    )
    ratio = (
        pl.when(raw.is_not_null() & baseline.is_not_null() & (baseline > 0))
        .then((raw / baseline).clip(0.0, 1.0))
        .otherwise(None)
        .alias(CAPACITY_COLUMN)
    )
    return df.select(ratio).to_series()


def _apply_chain(gold_root: Path, raw_root: Path, published_root: Path, chain: str) -> None:
    gold_path = gold_root / f"{chain}.parquet"
    if not gold_path.exists():
        print(f"[L2_CAPACITY] {chain}: missing gold parquet, skip: {gold_path}")
        return

    df = pl.read_parquet(gold_path)
    if df.is_empty() or "date" not in df.columns:
        print(f"[L2_CAPACITY] {chain}: empty/missing date, skip")
        return

    df = df.with_columns(pl.col("date").cast(pl.Utf8)).sort("date")
    raw_col = RAW_VALUE_COLUMNS[chain]
    published_history = _published_raw_history(published_root, chain)

    existing: Dict[str, float] = {}
    if raw_col in df.columns:
        for day, value in df.select(["date", raw_col]).iter_rows():
            numeric = _finite_number(value)
            if numeric is not None:
                existing[str(day)] = numeric

    raw_values: list[Optional[float]] = []
    local_count = 0
    persisted_count = 0
    missing_count = 0

    for day in df.get_column("date").to_list():
        day = str(day)
        value = existing.get(day)
        if value is None:
            value = published_history.get(day)
            if value is not None:
                persisted_count += 1
        if value is None:
            value = _raw_capacity_from_local_raw(raw_root, chain, day)
            if value is not None:
                local_count += 1
        if value is None:
            missing_count += 1
        raw_values.append(value)

    df = df.with_columns(pl.Series(raw_col, raw_values, dtype=pl.Float64))
    df = df.with_columns(_rolling_capacity(df, raw_col))

    if chain == "arbitrum":
        if "base_blob_gas_used_daily" not in df.columns:
            df = df.with_columns(pl.lit(None, dtype=pl.Float64).alias("base_blob_gas_used_daily"))
    elif chain == "base":
        if "arbitrum_l1_gas_used_daily" not in df.columns:
            df = df.with_columns(pl.lit(None, dtype=pl.Float64).alias("arbitrum_l1_gas_used_daily"))

    df.write_parquet(gold_path)

    non_null_capacity = df.get_column(CAPACITY_COLUMN).drop_nulls().len()
    print(
        f"[L2_CAPACITY] {chain}: rows={df.height} raw_local={local_count} "
        f"raw_persisted={persisted_count} raw_missing={missing_count} "
        f"capacity_non_null={non_null_capacity} formula=min(raw/prior_30d_p95,1) "
        f"min_baseline_days={MIN_BASELINE_DAYS}"
    )


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Add transparent chain-specific L2 capacity pressure and normalized capacity_util_pct to GOLD."
    )
    ap.add_argument("--gold-root", required=True)
    ap.add_argument("--raw-root", required=True)
    ap.add_argument("--published-root", required=True)
    ap.add_argument("--chains", default="arbitrum,base")
    args = ap.parse_args()

    gold_root = Path(args.gold_root).resolve()
    raw_root = Path(args.raw_root).resolve()
    published_root = Path(args.published_root).resolve()
    chains = [c.strip().lower() for c in args.chains.split(",") if c.strip()]

    unsupported = [c for c in chains if c not in L2_CHAINS]
    if unsupported:
        raise SystemExit(f"Unsupported L2 chain(s): {', '.join(unsupported)}")

    for chain in chains:
        _apply_chain(gold_root, raw_root, published_root, chain)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
