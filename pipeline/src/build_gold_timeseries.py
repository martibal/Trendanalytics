#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
build_gold_timeseries.py

Builds a per-chain GOLD timeseries Parquet from daily feature aggregates and writes a
status JSON with explicit freshness + quality metadata.

Key improvements (2026-01):
- Robust per-file read + schema normalization (prevents SchemaError on drift).
- Chain-aware guardrails for avg_block_time_sec + gas_utilization_pct.
- Explicit quality metadata: null rates, out-of-range counts, applied fixes.
- Surfaces raw-manifest freshness (latest_ok_date) into status for UI consumption.

This script is intentionally deterministic and lightweight: it does NOT recompute features,
it only assembles + validates what is already produced under features_root/<chain>/YYYY-MM-DD.parquet.
"""

import argparse
import json
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import polars as pl

LOG = logging.getLogger("GOLD_BUILDER")

# Must match feature_daily_agg.py output + stable downstream expectations
CANON_COLS = [
    "date",
    "chain",
    "tx_count_daily",
    "block_count_daily",
    "value_transferred_native",
    "median_tx_value_native",
    "median_tx_fee_native",
    "median_tx_fee_rate_sat_vbyte",
    "failed_tx_rate",
    "gas_utilization_pct",
    "median_block_base_fee_per_gas",
    "block_gas_utilization_p90",
    "block_weight_utilization_pct",
    "unique_active_addresses",
    "avg_block_time_sec",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parse_iso_date(value: str) -> datetime.date:
    try:
        return datetime.fromisoformat(value).date()
    except Exception as e:
        raise ValueError(f"Expected YYYY-MM-DD date, got {value!r}") from e


def _validate_generated_at_utc(value: str) -> str:
    try:
        parsed = value[:-1] + "+00:00" if value.endswith("Z") else value
        datetime.fromisoformat(parsed)
    except Exception as e:
        raise ValueError(f"Expected ISO timestamp for generated_at_utc, got {value!r}") from e
    return value


def _resolve_generated_at_utc(explicit_value: Optional[str], last_date: Optional[str]) -> str:
    """Resolve status timestamp without reading a runtime clock.

    Production callers may pass --generated-at-utc. When omitted, the fallback is
    derived from the data itself so this script remains reproducible in tests and
    rebuilds.
    """
    if explicit_value:
        return _validate_generated_at_utc(explicit_value)
    if last_date:
        return f"{last_date}T00:00:00Z"
    return "1970-01-01T00:00:00Z"


def _resolve_utc_today(explicit_value: Optional[str], last_date: Optional[str]) -> Optional[datetime.date]:
    """Resolve the date used for lag calculations without reading a runtime clock."""
    if explicit_value:
        return _parse_iso_date(explicit_value)
    if last_date:
        return _parse_iso_date(last_date)
    return None


def _load_json_if_exists(p: Path) -> Optional[dict]:
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        LOG.warning("Failed reading json %s: %s", p, e)
        return None


def _chain_profile(chain: str) -> str:
    c = (chain or "").strip().lower()
    if c in {"bitcoin", "btc"}:
        return "btc"
    if c in {"ethereum", "eth"}:
        return "eth"
    if c in {"arbitrum", "arb", "base"}:
        return "l2"
    return "evm"


def _extract_latest_raw_ok_date(raw_manifest_summary: dict, chain: str) -> Dict[str, Optional[str]]:
    out = {"transactions": None, "blocks": None}
    if not raw_manifest_summary:
        return out
    if chain not in raw_manifest_summary:
        return out
    for table in ["transactions", "blocks"]:
        try:
            out[table] = raw_manifest_summary[chain][table].get("latest_ok_date")
        except Exception:
            pass
    return out


def _expected_dates(first_date: str, last_date: str) -> List[str]:
    d0 = datetime.fromisoformat(first_date).date()
    d1 = datetime.fromisoformat(last_date).date()
    if d1 < d0:
        return []
    out = []
    cur = d0
    while cur <= d1:
        out.append(cur.isoformat())
        cur += timedelta(days=1)
    return out


def _missing_dates(days_present: List[str]) -> List[str]:
    if not days_present:
        return []
    expected = set(_expected_dates(days_present[0], days_present[-1]))
    present = set(days_present)
    return sorted(expected - present)


def _normalize_feature_df(df: pl.DataFrame, day_str: str, chain: str) -> pl.DataFrame:
    """
    Make schema consistent:
      - ensure all CANON_COLS exist
      - ignore any extra columns
      - enforce 'date' and 'chain' if missing or null
    """
    cols = set(df.columns)

    # Ensure date/chain present (source of truth is filename/args)
    if "date" not in cols:
        df = df.with_columns(pl.lit(day_str).alias("date"))
    else:
        df = df.with_columns(pl.when(pl.col("date").is_null()).then(pl.lit(day_str)).otherwise(pl.col("date")).alias("date"))

    if "chain" not in cols:
        df = df.with_columns(pl.lit(chain).alias("chain"))
    else:
        df = df.with_columns(pl.when(pl.col("chain").is_null()).then(pl.lit(chain)).otherwise(pl.col("chain")).alias("chain"))

    # Add missing canonical cols as null
    for c in CANON_COLS:
        if c not in df.columns:
            df = df.with_columns(pl.lit(None).alias(c))

    # Select canonical order only
    df = df.select(CANON_COLS)

    # If somehow multiple rows, keep first row and warn
    if df.height != 1:
        LOG.warning("Feature file %s %s has %s rows; expected 1. Keeping first row.", chain, day_str, df.height)
        df = df.head(1)

    return df


def _read_features_schema_robust(features_dir: Path, days: List[str], chain: str) -> Tuple[pl.DataFrame, List[dict]]:
    """
    Read each file individually, normalize to CANON_COLS, then concat relaxed.
    Returns (df, read_errors[]).
    """
    frames: List[pl.DataFrame] = []
    errors: List[dict] = []

    for d in days:
        p = features_dir / f"{d}.parquet"
        try:
            # Many daily feature parquet files can be extremely large (row-level).
            # We only need the aggregated first row. `n_rows=1` prevents loading
            # the full parquet into memory and drastically reduces runtime.
            df = pl.read_parquet(str(p), n_rows=1)
            df = _normalize_feature_df(df, day_str=d, chain=chain)
            frames.append(df)
        except Exception as e:
            errors.append({"date": d, "path": str(p), "error": str(e)})

    if not frames:
        return pl.DataFrame(schema=[(c, pl.Null) for c in CANON_COLS]), errors

    # vertical_relaxed tolerates dtype drift across files
    out = pl.concat(frames, how="vertical_relaxed")
    return out, errors


def _apply_guardrails(df: pl.DataFrame, chain: str) -> Tuple[pl.DataFrame, Dict[str, object]]:
    """
    Chain-aware guardrails for metrics that frequently suffer from unit/definition drift.
    Returns (df, fixes_meta).
    """
    fixes: Dict[str, object] = {"applied": [], "notes": []}
    prof = _chain_profile(chain)

    # avg_block_time_sec
    if "avg_block_time_sec" in df.columns:
        # First: rescale implausibly tiny positive values (observed 1e-9 scale bugs)
        # This is a safety net. Primary fix should happen upstream in feature_daily_agg.py.
        tiny_mask = (pl.col("avg_block_time_sec") > 0) & (pl.col("avg_block_time_sec") < 1e-6)
        df = df.with_columns(
            pl.when(tiny_mask)
            .then(pl.col("avg_block_time_sec") * 1_000_000_000.0)
            .otherwise(pl.col("avg_block_time_sec"))
            .alias("avg_block_time_sec")
        )
        if df.select(tiny_mask.any()).item():
            fixes["applied"].append("avg_block_time_sec_rescaled_tiny_by_1e9")
            fixes["notes"].append("Detected tiny positive avg_block_time_sec (<1e-6). Rescaled by 1e9 as safety-net.")

        # Then: plausibility window by chain profile
        if prof == "btc":
            bt_min, bt_max = 30.0, 3600.0
        elif prof == "eth":
            bt_min, bt_max = 1.0, 60.0
        elif prof == "l2":
            bt_min, bt_max = 0.001, 60.0
        else:
            bt_min, bt_max = 0.05, 600.0

        df = df.with_columns(
            pl.when(pl.col("avg_block_time_sec").is_null())
            .then(None)
            .when((pl.col("avg_block_time_sec") >= bt_min) & (pl.col("avg_block_time_sec") <= bt_max))
            .then(pl.col("avg_block_time_sec"))
            .otherwise(None)
            .alias("avg_block_time_sec")
        )

    # gas_utilization_pct
    if "gas_utilization_pct" in df.columns:
        if prof == "btc":
            # Not applicable
            df = df.with_columns(pl.lit(None).alias("gas_utilization_pct"))
            fixes["applied"].append("gas_utilization_pct_null_for_btc")
        elif prof == "l2":
            # L2 sources frequently provide non-comparable 'gas' notions; keep only if in a sane range.
            df = df.with_columns(
                pl.when(pl.col("gas_utilization_pct").is_null())
                .then(None)
                .when((pl.col("gas_utilization_pct") >= 0.0) & (pl.col("gas_utilization_pct") <= 1.2))
                .then(pl.col("gas_utilization_pct"))
                .otherwise(None)
                .alias("gas_utilization_pct")
            )
            fixes["applied"].append("gas_utilization_pct_range_checked_l2")
        else:
            # ETH/EVM: enforce tighter bounds
            df = df.with_columns(
                pl.when(pl.col("gas_utilization_pct").is_null())
                .then(None)
                .when((pl.col("gas_utilization_pct") >= 0.0) & (pl.col("gas_utilization_pct") <= 1.0))
                .then(pl.col("gas_utilization_pct"))
                .otherwise(None)
                .alias("gas_utilization_pct")
            )

    # block_weight_utilization_pct
    if "block_weight_utilization_pct" in df.columns:
        if prof == "btc":
            df = df.with_columns(
                pl.when(pl.col("block_weight_utilization_pct").is_null())
                .then(None)
                .when((pl.col("block_weight_utilization_pct") >= 0.0) & (pl.col("block_weight_utilization_pct") <= 1.0))
                .then(pl.col("block_weight_utilization_pct"))
                .otherwise(None)
                .alias("block_weight_utilization_pct")
            )
        else:
            df = df.with_columns(pl.lit(None).alias("block_weight_utilization_pct"))
            fixes["applied"].append("block_weight_utilization_pct_null_for_non_btc")

    # median_block_base_fee_per_gas: Ethereum-only, non-negative raw chain unit.
    if "median_block_base_fee_per_gas" in df.columns:
        if prof == "eth":
            df = df.with_columns(
                pl.when(pl.col("median_block_base_fee_per_gas").is_null())
                .then(None)
                .when(pl.col("median_block_base_fee_per_gas") >= 0.0)
                .then(pl.col("median_block_base_fee_per_gas"))
                .otherwise(None)
                .alias("median_block_base_fee_per_gas")
            )
        else:
            df = df.with_columns(pl.lit(None).alias("median_block_base_fee_per_gas"))
            fixes["applied"].append("median_block_base_fee_per_gas_null_for_non_eth")

    # block_gas_utilization_p90: Ethereum-only ratio in [0,1].
    if "block_gas_utilization_p90" in df.columns:
        if prof == "eth":
            df = df.with_columns(
                pl.when(pl.col("block_gas_utilization_p90").is_null())
                .then(None)
                .when((pl.col("block_gas_utilization_p90") >= 0.0) & (pl.col("block_gas_utilization_p90") <= 1.0))
                .then(pl.col("block_gas_utilization_p90"))
                .otherwise(None)
                .alias("block_gas_utilization_p90")
            )
        else:
            df = df.with_columns(pl.lit(None).alias("block_gas_utilization_p90"))
            fixes["applied"].append("block_gas_utilization_p90_null_for_non_eth")

    # median_tx_fee_rate_sat_vbyte: Bitcoin-only, non-negative sat/vB.
    if "median_tx_fee_rate_sat_vbyte" in df.columns:
        if prof == "btc":
            df = df.with_columns(
                pl.when(pl.col("median_tx_fee_rate_sat_vbyte").is_null())
                .then(None)
                .when(pl.col("median_tx_fee_rate_sat_vbyte") >= 0.0)
                .then(pl.col("median_tx_fee_rate_sat_vbyte"))
                .otherwise(None)
                .alias("median_tx_fee_rate_sat_vbyte")
            )
        else:
            df = df.with_columns(pl.lit(None).alias("median_tx_fee_rate_sat_vbyte"))
            fixes["applied"].append("median_tx_fee_rate_sat_vbyte_null_for_non_btc")

    # failed_tx_rate
    if "failed_tx_rate" in df.columns:
        df = df.with_columns(
            pl.when(pl.col("failed_tx_rate").is_null())
            .then(None)
            .when((pl.col("failed_tx_rate") >= 0.0) & (pl.col("failed_tx_rate") <= 1.0))
            .then(pl.col("failed_tx_rate"))
            .otherwise(None)
            .alias("failed_tx_rate")
        )

    return df, fixes


def _quality_summary(df: pl.DataFrame, chain: str) -> Dict[str, object]:
    """
    Create a compact quality summary for status JSON + UI consumption.
    """
    if df.is_empty():
        return {"null_rates": {}, "out_of_range_counts": {}, "row_count": 0}

    prof = _chain_profile(chain)
    row_count = int(df.height)

    null_rates: Dict[str, float] = {}
    for c in CANON_COLS:
        if c in df.columns:
            null_rates[c] = float(df.select(pl.col(c).is_null().mean()).item())
        else:
            null_rates[c] = 1.0

    out_of_range: Dict[str, int] = {}

    # median_block_base_fee_per_gas: Ethereum-only non-negative raw chain unit.
    if "median_block_base_fee_per_gas" in df.columns:
        if prof == "eth":
            out_of_range["median_block_base_fee_per_gas"] = int(
                df.select(((pl.col("median_block_base_fee_per_gas").is_not_null()) & (pl.col("median_block_base_fee_per_gas") < 0.0)).sum()).item()
            )
        else:
            out_of_range["median_block_base_fee_per_gas"] = 0

    # block_gas_utilization_p90: Ethereum-only ratio in [0,1].
    if "block_gas_utilization_p90" in df.columns:
        if prof == "eth":
            out_of_range["block_gas_utilization_p90"] = int(
                df.select(((pl.col("block_gas_utilization_p90").is_not_null()) & ((pl.col("block_gas_utilization_p90") < 0.0) | (pl.col("block_gas_utilization_p90") > 1.0))).sum()).item()
            )
        else:
            out_of_range["block_gas_utilization_p90"] = 0

    # median_tx_fee_rate_sat_vbyte: BTC-only non-negative sat/vB.
    if "median_tx_fee_rate_sat_vbyte" in df.columns:
        if prof == "btc":
            out_of_range["median_tx_fee_rate_sat_vbyte"] = int(
                df.select(((pl.col("median_tx_fee_rate_sat_vbyte").is_not_null()) & (pl.col("median_tx_fee_rate_sat_vbyte") < 0.0)).sum()).item()
            )
        else:
            out_of_range["median_tx_fee_rate_sat_vbyte"] = 0

    # block_weight_utilization_pct: BTC-only ratio in [0,1]
    if "block_weight_utilization_pct" in df.columns:
        if prof == "btc":
            out_of_range["block_weight_utilization_pct"] = int(
                df.select(((pl.col("block_weight_utilization_pct").is_not_null()) & ((pl.col("block_weight_utilization_pct") < 0.0) | (pl.col("block_weight_utilization_pct") > 1.0))).sum()).item()
            )
        else:
            out_of_range["block_weight_utilization_pct"] = 0

    # avg_block_time_sec: count non-null values that violate profile bounds
    if "avg_block_time_sec" in df.columns:
        if prof == "btc":
            bt_min, bt_max = 30.0, 3600.0
        elif prof == "eth":
            bt_min, bt_max = 1.0, 60.0
        elif prof == "l2":
            bt_min, bt_max = 0.001, 60.0
        else:
            bt_min, bt_max = 0.05, 600.0
        out_of_range["avg_block_time_sec"] = int(
            df.select(((pl.col("avg_block_time_sec").is_not_null()) & ((pl.col("avg_block_time_sec") < bt_min) | (pl.col("avg_block_time_sec") > bt_max))).sum()).item()
        )

    # gas_utilization_pct: profile bounds
    if "gas_utilization_pct" in df.columns:
        if prof == "btc":
            out_of_range["gas_utilization_pct"] = 0
        elif prof == "l2":
            out_of_range["gas_utilization_pct"] = int(
                df.select(((pl.col("gas_utilization_pct").is_not_null()) & ((pl.col("gas_utilization_pct") < 0.0) | (pl.col("gas_utilization_pct") > 1.2))).sum()).item()
            )
        else:
            out_of_range["gas_utilization_pct"] = int(
                df.select(((pl.col("gas_utilization_pct").is_not_null()) & ((pl.col("gas_utilization_pct") < 0.0) | (pl.col("gas_utilization_pct") > 1.0))).sum()).item()
            )

    # failed_tx_rate
    if "failed_tx_rate" in df.columns:
        out_of_range["failed_tx_rate"] = int(
            df.select(((pl.col("failed_tx_rate").is_not_null()) & ((pl.col("failed_tx_rate") < 0.0) | (pl.col("failed_tx_rate") > 1.0))).sum()).item()
        )

    return {"null_rates": null_rates, "out_of_range_counts": out_of_range, "row_count": row_count}


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

@dataclass
class GoldPaths:
    features_dir: Path
    gold_out: Path
    status_dir: Path
    status_out: Path


def _resolve_paths(features_root: Path, gold_root: Path, status_root: Path, chain: str) -> GoldPaths:
    features_dir = features_root / chain
    gold_out = gold_root / f"{chain}.parquet"
    status_dir = status_root
    status_out = status_dir / f"{chain}.json"
    status_dir.mkdir(parents=True, exist_ok=True)
    gold_root.mkdir(parents=True, exist_ok=True)
    return GoldPaths(features_dir, gold_out, status_dir, status_out)


# ---------------------------------------------------------------------------
# Main build
# ---------------------------------------------------------------------------

def build_gold_for_chain(
    chain: str,
    features_root: Path,
    gold_root: Path,
    status_root: Path,
    reports_dir: Path,
    generated_at_utc: Optional[str] = None,
    utc_today: Optional[str] = None,
) -> int:
    paths = _resolve_paths(features_root, gold_root, status_root, chain)

    # Pull raw manifest context (freshness, raw gaps)
    raw_manifest_summary_path = reports_dir / "raw_manifest_summary.json"
    raw_gaps_path = reports_dir / "raw_gaps.json"
    raw_manifest_summary = _load_json_if_exists(raw_manifest_summary_path) or {}
    raw_gaps = _load_json_if_exists(raw_gaps_path) or {}
    latest_raw_ok = _extract_latest_raw_ok_date(raw_manifest_summary, chain)

    # List feature days
    days_present = sorted([p.stem for p in paths.features_dir.glob("*.parquet")])

    if not days_present:
        LOG.warning("No feature files found for chain=%s under %s", chain, paths.features_dir)
        generated_at = _resolve_generated_at_utc(generated_at_utc, None)
        status = {
            "chain": chain,
            "generated_at_utc": generated_at,
            "features_first_date": None,
            "features_last_date": None,
            "missing_dates": [],
            "row_count": 0,
            "gold_path": None,
            "features_path": str(paths.features_dir),
            "read_errors": [],
            "quality": {"null_rates": {}, "out_of_range_counts": {}, "row_count": 0},
            "fixes": {"applied": [], "notes": []},
            "raw_context": {
                "latest_raw_ok_date": latest_raw_ok,
                "raw_gaps": raw_gaps,
                "raw_manifest_summary_path": str(raw_manifest_summary_path),
                "raw_gaps_path": str(raw_gaps_path),
            },
        }
        paths.status_out.write_text(json.dumps(status, indent=2), encoding="utf-8")
        LOG.info("Wrote gold status: %s", paths.status_out)
        return 1

    missing_dates = _missing_dates(days_present)
    first_date = days_present[0]
    last_date = days_present[-1]
    generated_at = _resolve_generated_at_utc(generated_at_utc, last_date)

    df, read_errors = _read_features_schema_robust(paths.features_dir, days_present, chain)

    # Sort
    if "date" in df.columns:
        df = df.sort("date")

    # Apply guardrails / safety fixes BEFORE writing gold
    df, fixes = _apply_guardrails(df, chain)

    # Write gold (even if some days had read errors; we prefer partial gold + explicit status)
    df.write_parquet(str(paths.gold_out))
    LOG.info(
        "Wrote gold: %s rows=%s cols=%s first=%s last=%s",
        paths.gold_out,
        df.height,
        df.width,
        first_date,
        last_date,
    )

    quality = _quality_summary(df, chain)

    # Also compute an explicit freshness/lag indicator for UI.
    # The reference date is injected by callers or derived from the data itself.
    try:
        last_dt = datetime.fromisoformat(last_date).date()
        today_dt = _resolve_utc_today(utc_today, last_date)
        lag_days = int((today_dt - last_dt).days) if today_dt is not None else None
    except Exception:
        lag_days = None

    status = {
        "chain": chain,
        "generated_at_utc": generated_at,
        "features_first_date": first_date,
        "features_last_date": last_date,
        "features_lag_days_vs_utc_today": lag_days,
        "missing_dates": missing_dates,
        "row_count": int(df.height),
        "gold_path": str(paths.gold_out),
        "features_path": str(paths.features_dir),
        "read_errors": read_errors,
        "quality": quality,
        "fixes": fixes,
        "raw_context": {
            "latest_raw_ok_date": latest_raw_ok,
            "raw_gaps": raw_gaps,
            "raw_manifest_summary_path": str(raw_manifest_summary_path),
            "raw_gaps_path": str(raw_gaps_path),
        },
    }

    paths.status_out.write_text(json.dumps(status, indent=2), encoding="utf-8")
    LOG.info("Wrote gold status: %s", paths.status_out)
    return 0


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")

    ap = argparse.ArgumentParser()
    ap.add_argument("--chain", required=True)
    ap.add_argument("--features_root", required=True)
    ap.add_argument("--gold_root", required=True)
    ap.add_argument("--status_root", required=True)
    ap.add_argument("--reports_dir", required=True)
    ap.add_argument(
        "--generated-at-utc",
        default=None,
        help="Optional explicit generated_at_utc timestamp for deterministic status output.",
    )
    ap.add_argument(
        "--utc-today",
        default=None,
        help="Optional YYYY-MM-DD date used for status lag calculations.",
    )
    args = ap.parse_args()

    return build_gold_for_chain(
        chain=args.chain,
        features_root=Path(args.features_root),
        gold_root=Path(args.gold_root),
        status_root=Path(args.status_root),
        reports_dir=Path(args.reports_dir),
        generated_at_utc=args.generated_at_utc,
        utc_today=args.utc_today,
    )


if __name__ == "__main__":
    raise SystemExit(main())
