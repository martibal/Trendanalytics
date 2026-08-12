#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Export DERIVED JSON history (one file per chain/day) into data/calculated/derived.

v2 goals:
- Produce a stable derived layer immediately usable by a future web frontend.
- Compute MA7 and MA30 for all numeric GOLD fields (excluding date/chain).
- Optionally bring over a small, non-sensitive META confidence subset into derived.
- Make incremental mode revision-safe by rewriting derived day-files when their
  source GOLD/META lineage or derived producer version has changed.

Inputs:
- data/calculated/gold/<chain>/YYYY-MM-DD.json
- data/calculated/meta/<chain>/YYYY-MM-DD.json (optional)

Outputs:
- data/calculated/derived/<chain>/YYYY-MM-DD.json
- data/calculated/derived/<chain>/latest.json
- data/calculated/derived/<chain>/lastXd.json for requested windows
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd


DERIVED_PRODUCER_VERSION = "derived-json-history-v2-lineage-safe"
ROLLING_FORMULA = "pandas.Series.rolling(window=N, min_periods=1).mean() over date-sorted GOLD rows"


def _ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def _strict_json_value(obj: Any) -> Any:
    """Normalize non-finite floats to JSON null without changing finite values."""
    if isinstance(obj, float):
        return obj if math.isfinite(obj) else None
    if isinstance(obj, list):
        return [_strict_json_value(item) for item in obj]
    if isinstance(obj, tuple):
        return [_strict_json_value(item) for item in obj]
    if isinstance(obj, dict):
        return {str(key): _strict_json_value(value) for key, value in obj.items()}
    return obj


def _write_json(path: Path, obj: Any) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    strict_obj = _strict_json_value(obj)
    tmp.write_text(
        json.dumps(strict_obj, ensure_ascii=False, indent=2, sort_keys=True, allow_nan=False),
        encoding="utf-8",
    )
    tmp.replace(path)


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _canonical_json_bytes(obj: Any) -> bytes:
    return json.dumps(
        _strict_json_value(obj),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")


def _sha256_json(obj: Any) -> str:
    return hashlib.sha256(_canonical_json_bytes(obj)).hexdigest()


def _parse_windows(s: str) -> List[int]:
    out: List[int] = []
    for part in (s or "").split(","):
        part = part.strip()
        if not part:
            continue
        n = int(part)
        if n > 0:
            out.append(n)
    return sorted(set(out))


def _load_day_files(folder: Path, start: str) -> List[Dict[str, Any]]:
    if not folder.exists():
        return []

    out: List[Dict[str, Any]] = []
    for fp in sorted(folder.glob("????-??-??.json")):
        if fp.stem < start:
            continue
        obj = _read_json(fp)
        if not isinstance(obj, dict):
            raise ValueError(f"[DERIVED] Expected object in {fp}, got {type(obj).__name__}")
        out.append(obj)

    return out


def _rolling_mean(series: pd.Series, window: int) -> pd.Series:
    return series.rolling(window=window, min_periods=1).mean()


def _is_numeric_series(s: pd.Series) -> bool:
    return pd.api.types.is_numeric_dtype(s)


def _pick_meta_confidence(meta: Dict[str, Any]) -> Dict[str, Any]:
    # Keep intentionally small (safe scaffolding; can evolve later)
    c = meta.get("confidence", {}) if isinstance(meta, dict) else {}
    if not isinstance(c, dict):
        return {}

    out: Dict[str, Any] = {}
    for k in ("confidence_score", "data_freshness_days", "coverage_score", "quality_score"):
        if k in c:
            out[k] = c[k]

    return out


def _load_meta_map(meta_chain_root: Path, start: str) -> Dict[str, Dict[str, Any]]:
    meta_map: Dict[str, Dict[str, Any]] = {}

    if not meta_chain_root.exists():
        return meta_map

    for fp in sorted(meta_chain_root.glob("????-??-??.json")):
        if fp.stem < start:
            continue

        try:
            obj = _read_json(fp)
        except Exception:
            continue

        if isinstance(obj, dict):
            meta_map[fp.stem] = obj

    return meta_map


def _source_signature(
    *,
    chain: str,
    day: str,
    gold_row: Dict[str, Any],
    meta_row: Optional[Dict[str, Any]],
    metric_cols: List[str],
) -> Dict[str, Any]:
    return {
        "producer": DERIVED_PRODUCER_VERSION,
        "formula": ROLLING_FORMULA,
        "chain": chain,
        "date": day,
        "gold_sha256": _sha256_json(gold_row),
        "meta_sha256": _sha256_json(meta_row) if isinstance(meta_row, dict) else None,
        "metric_columns": metric_cols,
        "rolling_windows": [7, 30],
    }


def _existing_source_signature(existing_obj: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(existing_obj, dict):
        return None

    derived = existing_obj.get("derived")
    if not isinstance(derived, dict):
        return None

    source = derived.get("source")
    return source if isinstance(source, dict) else None


def _existing_metrics(existing_obj: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(existing_obj, dict):
        return None

    derived = existing_obj.get("derived")
    if not isinstance(derived, dict):
        return None

    metrics = derived.get("metrics")
    return metrics if isinstance(metrics, dict) else None


def _needs_write(target: Path, rec: Dict[str, Any]) -> bool:
    if not target.exists():
        return True

    try:
        existing = _read_json(target)
    except Exception:
        return True

    derived = rec.get("derived")
    if not isinstance(derived, dict):
        return True

    next_source = derived.get("source")
    next_metrics = derived.get("metrics")

    if _existing_source_signature(existing) != next_source:
        return True

    if _existing_metrics(existing) != next_metrics:
        return True

    return False


def _derive_chain(
    chain: str,
    gold_chain_root: Path,
    meta_chain_root: Path,
    out_chain_root: Path,
    start: str,
    mode: str,
    windows: List[int],
) -> int:
    gold_days = _load_day_files(gold_chain_root, start=start)
    if not gold_days:
        print(f"[DERIVED] {chain}: no gold day files found under {gold_chain_root} (skipping)")
        return 0

    df = pd.DataFrame(gold_days).sort_values("date").reset_index(drop=True)
    if "date" not in df.columns:
        raise ValueError(f"[DERIVED] {chain}: missing 'date' in gold day files")

    if "chain" not in df.columns:
        df["chain"] = chain

    metric_cols: List[str] = []
    for c in df.columns:
        if c in ("date", "chain"):
            continue
        if _is_numeric_series(df[c]):
            metric_cols.append(c)

    for c in metric_cols:
        df[f"{c}__ma7"] = _rolling_mean(df[c], 7)
        df[f"{c}__ma30"] = _rolling_mean(df[c], 30)

    meta_map = _load_meta_map(meta_chain_root, start=start)
    gold_by_date: Dict[str, Dict[str, Any]] = {str(item["date"]): item for item in gold_days if "date" in item}

    records: List[Dict[str, Any]] = []
    for _, row in df.iterrows():
        day = str(row["date"])
        gold_row = gold_by_date.get(day)
        if not isinstance(gold_row, dict):
            raise ValueError(f"[DERIVED] {chain}: could not map GOLD source row for {day}")

        meta_row = meta_map.get(day)
        derived_metrics: Dict[str, Any] = {}

        for c in metric_cols:
            v7 = row.get(f"{c}__ma7")
            v30 = row.get(f"{c}__ma30")
            derived_metrics[f"{c}__ma7"] = float(v7) if pd.notna(v7) else None
            derived_metrics[f"{c}__ma30"] = float(v30) if pd.notna(v30) else None

        rec: Dict[str, Any] = {
            "date": day,
            "chain": chain,
            "derived": {
                "metrics": derived_metrics,
                "context_blocks": [],
                "meta_confidence": _pick_meta_confidence(meta_row) if isinstance(meta_row, dict) else {},
                "source": _source_signature(
                    chain=chain,
                    day=day,
                    gold_row=gold_row,
                    meta_row=meta_row,
                    metric_cols=metric_cols,
                ),
            },
        }
        records.append(rec)

    _ensure_dir(out_chain_root)

    wrote = 0
    if mode == "incremental":
        for rec in records:
            target = out_chain_root / f"{rec['date']}.json"
            if not _needs_write(target, rec):
                continue
            _write_json(target, rec)
            wrote += 1
    else:
        for rec in records:
            _write_json(out_chain_root / f"{rec['date']}.json", rec)
            wrote += 1

    _write_json(out_chain_root / "latest.json", records[-1])
    for w in windows:
        chunk = records[-w:] if len(records) >= w else records
        _write_json(out_chain_root / f"last{w}d.json", chunk)

    print(f"[DERIVED] {chain}: wrote {wrote} changed day-file(s), latest/lastXd refreshed")
    return wrote


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, help="Project root (e.g. d:/css/main)")
    ap.add_argument("--gold-json-root", required=True, help="Calculated GOLD JSON root (data/calculated/gold)")
    ap.add_argument("--meta-json-root", required=True, help="Calculated META JSON root (data/calculated/meta)")
    ap.add_argument("--out-root", required=True, help="Output DERIVED JSON root (data/calculated/derived)")
    ap.add_argument("--start", default="2024-12-01", help="ISO start date (yyyy-mm-dd)")
    ap.add_argument("--chains", default="bitcoin,ethereum,arbitrum,base", help="Comma-separated chains")
    ap.add_argument("--mode", default="incremental", choices=["incremental", "rebuild"], help="Write mode")
    ap.add_argument("--force", action="store_true", help="Alias for rebuild behavior")
    ap.add_argument("--windows", default="7,30,90,180,365", help="Comma-separated windows")
    args = ap.parse_args()

    gold_root = Path(args.gold_json_root).resolve()
    meta_root = Path(args.meta_json_root).resolve()
    out_root = Path(args.out_root).resolve()
    _ensure_dir(out_root)

    mode = "rebuild" if args.force else args.mode
    windows = _parse_windows(args.windows)
    chains = [c.strip() for c in args.chains.split(",") if c.strip()]

    total = 0
    for chain in chains:
        total += _derive_chain(
            chain=chain,
            gold_chain_root=gold_root / chain,
            meta_chain_root=meta_root / chain,
            out_chain_root=out_root / chain,
            start=args.start,
            mode=mode,
            windows=windows,
        )

    print(f"[DERIVED] Done. Total changed day-files written: {total}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
