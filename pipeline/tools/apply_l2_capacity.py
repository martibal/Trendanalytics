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
    "base": "base_l1_gas_used_daily",
}
LEGACY_RAW_VALUE_COLUMNS = {
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
    value = lf.select(pl.col(actual).cast(pl.Float64, strict=False).sum().alias("value")).collect().item()
    if value is None:
        return None
    value = float(value)
    # An active L2 day whose entire chain-specific L1 accounting field sums to
    # zero is treated as unavailable source evidence, not as zero pressure.
    return value if math.isfinite(value) and value > 0 else None


def _raw_capacity_from_local_raw(raw_root: Path, chain: str, day: str) -> Optional[float]:
    if chain == "arbitrum":
        tx_dir = _day_dir(raw_root, chain, "transactions", day)
        return _sum_column(_parquet_files(tx_dir), "gas_used_for_l1") if tx_dir else None
    if chain == "base":
        tx_dir = _day_dir(raw_root, chain, "transactions", day)
        return _sum_column(_parquet_files(tx_dir), "l1_gas_used") if tx_dir else None
    return None


def _finite_number(value) -> Optional[float]:
    if isinstance(value, bool):
        return None
    try:
        f = float(value)
    except Exception:
        return None
    return f if math.isfinite(f) and f >= 0 else None


def _positive_finite_number(value) -> Optional[float]:
    value = _finite_number(value)
    return value if value is not None and value > 0 else None


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
        for candidate in candidates:
            if raw_col in candidate:
                value = _positive_finite_number(candidate.get(raw_col))
                if value is not None:
                    out[path.stem] = value
                    break
    return out


def _rolling_capacity(df: pl.DataFrame, raw_col: str) -> pl.Series:
    raw = df.get_column(raw_col).cast(pl.Float64, strict=False)
    baseline_input = pl.when(raw > 0).then(raw).otherwise(None)
    baseline = baseline_input.shift(1).rolling_quantile(
        quantile=0.95,
        window_size=BASELINE_WINDOW_DAYS,
        min_samples=MIN_BASELINE_DAYS,
        interpolation="nearest",
    )
    ratio = (
        pl.when((raw > 0) & baseline.is_not_null() & (baseline > 0))
        .then((raw / baseline).clip(0.0, 1.0))
        .otherwise(None)
        .alias(CAPACITY_COLUMN)
    )
    return df.select(ratio).to_series()


def _write_json_atomic(path: Path, obj: dict) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True, allow_nan=False), encoding="utf-8")
    tmp.replace(path)


def _persist_published_gold(df: pl.DataFrame, published_root: Path, chain: str) -> int:
    raw_col = RAW_VALUE_COLUMNS[chain]
    legacy_raw_col = LEGACY_RAW_VALUE_COLUMNS.get(chain)
    chain_dir = published_root / "gold" / chain
    if not chain_dir.exists():
        return 0
    written = 0
    for row in df.select(["date", raw_col, CAPACITY_COLUMN]).iter_rows(named=True):
        day = str(row["date"])
        target = chain_dir / f"{day}.json"
        if not target.exists():
            continue
        try:
            obj = json.loads(target.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(obj, dict):
            continue
        raw_value = _positive_finite_number(row.get(raw_col))
        cap_value = _finite_number(row.get(CAPACITY_COLUMN))
        if legacy_raw_col:
            obj.pop(legacy_raw_col, None)
        obj[raw_col] = raw_value
        obj[CAPACITY_COLUMN] = cap_value
        _write_json_atomic(target, obj)
        written += 1
    return written


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
    legacy_raw_col = LEGACY_RAW_VALUE_COLUMNS.get(chain)
    if legacy_raw_col and legacy_raw_col in df.columns:
        df = df.drop(legacy_raw_col)
    published_history = _published_raw_history(published_root, chain)

    existing: Dict[str, float] = {}
    if raw_col in df.columns:
        for day, value in df.select(["date", raw_col]).iter_rows():
            numeric = _positive_finite_number(value)
            if numeric is not None:
                existing[str(day)] = numeric

    raw_values: list[Optional[float]] = []
    local_count = persisted_count = missing_count = 0
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
    df.write_parquet(gold_path)
    published_written = _persist_published_gold(df, published_root, chain)

    non_null_capacity = df.get_column(CAPACITY_COLUMN).drop_nulls().len()
    print(
        f"[L2_CAPACITY] {chain}: rows={df.height} raw_local={local_count} "
        f"raw_persisted={persisted_count} raw_missing={missing_count} "
        f"capacity_non_null={non_null_capacity} published_days_updated={published_written} "
        f"formula=min(raw/prior_30d_p95,1) min_baseline_days={MIN_BASELINE_DAYS}"
    )


def main() -> int:
    ap = argparse.ArgumentParser(description="Add chain-specific L2 L1-data pressure and normalized capacity_util_pct to GOLD.")
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
