#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Publish calculated artifacts into a stable, web-ready contract:

From:
  data/calculated/{gold,meta,derived}/<chain>/*.json
To:
  data/published/v1/{gold,meta,derived}/<chain>/*.json
Plus:
  data/published/v1/dataset.json
  data/published/v1/index.json                (BACK-COMPAT ALIAS)
  data/published/v1/{genre}/{chain}/manifest.json
Plus:
  data/published/v1/landing/index.json
  data/published/v1/landing/<chain>/hero.json

Notes:
- Published dataset is the single intended input for the website.
- Landing export is intentionally "pointers + chart specs", not duplicated data.
- IMPORTANT: Published JSON must be valid JSON for browsers. That means NO NaN/Infinity.
  We sanitize all floats (NaN/Inf -> null).
"""

from __future__ import annotations

import argparse
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple


def _ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def _read_json(p: Path) -> Any:
    return json.loads(p.read_text(encoding="utf-8"))


def _sanitize_json(obj: Any) -> Any:
    """
    Recursively replace NaN / +/-Infinity with None so output is strict JSON.
    """
    if obj is None:
        return None

    # bool is subclass of int in Python -> check bool before (int,float)
    if isinstance(obj, bool):
        return obj

    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj

    if isinstance(obj, (int, str)):
        return obj

    if isinstance(obj, list):
        return [_sanitize_json(x) for x in obj]

    if isinstance(obj, dict):
        return {str(k): _sanitize_json(v) for k, v in obj.items()}

    # Fallback: try to serialize unknown numeric-like objects
    try:
        if hasattr(obj, "__float__"):
            f = float(obj)  # type: ignore[arg-type]
            if math.isnan(f) or math.isinf(f):
                return None
            return f
    except Exception:
        pass

    return obj


def _write_json(p: Path, obj: Any) -> None:
    """
    Write JSON atomically, strict for browsers:
      - NaN/Infinity are not allowed (we sanitize before writing)
      - allow_nan=False ensures we crash early if something slips through
    """
    tmp = p.with_suffix(p.suffix + ".tmp")
    safe = _sanitize_json(obj)
    tmp.write_text(
        json.dumps(safe, ensure_ascii=False, indent=2, sort_keys=True, allow_nan=False),
        encoding="utf-8",
    )
    tmp.replace(p)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _parse_list(s: str) -> List[str]:
    return [x.strip() for x in (s or "").split(",") if x.strip()]


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


def _collect_days(chain_dir: Path) -> List[str]:
    if not chain_dir.exists():
        return []
    return sorted({p.stem for p in chain_dir.glob("????-??-??.json")})


def _copy_chain_files(src_chain: Path, dst_chain: Path) -> Tuple[int, str]:
    """
    Copy (SANITIZED):
      - day files: YYYY-MM-DD.json
      - latest.json
      - lastXd.json

    Return: (copied_count, asof_date)
    """
    _ensure_dir(dst_chain)
    copied = 0

    day_files = sorted(src_chain.glob("????-??-??.json"))
    asof = day_files[-1].stem if day_files else ""

    # Day files
    for fp in day_files:
        obj = _read_json(fp)
        _write_json(dst_chain / fp.name, obj)
        copied += 1

    # latest.json
    for fp in src_chain.glob("latest.json"):
        obj = _read_json(fp)
        _write_json(dst_chain / fp.name, obj)
        copied += 1

    # lastXd.json files
    for fp in src_chain.glob("last*d.json"):
        obj = _read_json(fp)
        _write_json(dst_chain / fp.name, obj)
        copied += 1

    return copied, asof


def _compute_dataset_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d.%H%M%S")


def _read_or_bump_revision(published_root: Path, dataset_id: str) -> int:
    ds = published_root / "dataset.json"
    if not ds.exists():
        return 1
    try:
        prev = _read_json(ds)
        prev_id = prev.get("dataset_id")
        prev_rev = int(prev.get("revision_id", 1))
        if prev_id == dataset_id:
            return prev_rev
        return prev_rev + 1
    except Exception:
        return 1


def _schema_version(genre: str) -> str:
    return f"{genre}.v1"


def _rel_from_published(published_root: Path, target: Path) -> str:
    rel = target.relative_to(published_root)
    return rel.as_posix()


def _landing_chart_specs(chain: str) -> List[Dict[str, Any]]:
    """
    Hero charts: "slående" men 100% deskriptivt.
    Referer til published window-filer (lastXd) så web kan tegne store interaktive charts.
    """
    evm = chain in ("ethereum", "arbitrum", "base")
    charts: List[Dict[str, Any]] = []

    charts.append(
        {
            "id": "tx_count_daily",
            "title": "Daily transactions",
            "genre": "gold",
            "window_days": 90,
            "x": "date",
            "y": "tx_count_daily",
            "format": "int",
            "hint_basic": "How many transactions were included per day (last 90 days).",
            "hint_advanced": "Directly from the published gold window file; no smoothing.",
        }
    )

    charts.append(
        {
            "id": "median_tx_fee_native",
            "title": "Median transaction fee (native)",
            "genre": "gold",
            "window_days": 90,
            "x": "date",
            "y": "median_tx_fee_native",
            "format": "float",
            "hint_basic": "Median fee paid per transaction (native units).",
            "hint_advanced": "Median of per-transaction fee distribution; null where unavailable.",
        }
    )

    charts.append(
        {
            "id": "avg_block_time_sec",
            "title": "Average block time (seconds)",
            "genre": "gold",
            "window_days": 90,
            "x": "date",
            "y": "avg_block_time_sec",
            "format": "float",
            "hint_basic": "Average seconds between blocks (last 90 days).",
            "hint_advanced": "Computed from daily aggregation; descriptive only.",
        }
    )

    if evm:
        charts.append(
            {
                "id": "gas_utilization_pct",
                "title": "Gas utilization (%)",
                "genre": "gold",
                "window_days": 90,
                "x": "date",
                "y": "gas_utilization_pct",
                "format": "pct",
                "hint_basic": "How full blocks are on average (last 90 days).",
                "hint_advanced": "Null where unavailable.",
            }
        )
        charts.append(
            {
                "id": "failed_tx_rate",
                "title": "Failed transaction rate",
                "genre": "gold",
                "window_days": 90,
                "x": "date",
                "y": "failed_tx_rate",
                "format": "pct",
                "hint_basic": "Share of transactions that failed (last 90 days).",
                "hint_advanced": "Null where unavailable.",
            }
        )
    else:
        charts.append(
            {
                "id": "block_count_daily",
                "title": "Blocks per day",
                "genre": "gold",
                "window_days": 90,
                "x": "date",
                "y": "block_count_daily",
                "format": "int",
                "hint_basic": "How many blocks were produced per day (last 90 days).",
                "hint_advanced": "Descriptive count; useful to spot anomalies in cadence.",
            }
        )

    return charts


def _export_landing(
    published_root: Path,
    dataset_id: str,
    revision_id: int,
    computed_at_utc: str,
    chains: List[str],
    genres: List[str],
    windows: List[int],
) -> None:
    landing_root = published_root / "landing"
    _ensure_dir(landing_root)

    cards: List[Dict[str, Any]] = []

    for chain in chains:
        chain_dir = landing_root / chain
        _ensure_dir(chain_dir)

        files: Dict[str, Any] = {}
        asof: Dict[str, str] = {}

        for genre in genres:
            gdir = published_root / genre / chain
            if not gdir.exists():
                files[genre] = {"latest": None, "windows": {}, "manifest": None}
                asof[genre] = ""
                continue

            manifest_path = gdir / "manifest.json"
            manifest = _read_json(manifest_path) if manifest_path.exists() else {}
            asof[genre] = str(manifest.get("asof", "")) if isinstance(manifest, dict) else ""

            latest_path = gdir / "latest.json"
            win_paths: Dict[int, str] = {}
            for w in windows:
                fp = gdir / f"last{w}d.json"
                if fp.exists():
                    win_paths[w] = _rel_from_published(published_root, fp)

            files[genre] = {
                "manifest": _rel_from_published(published_root, manifest_path) if manifest_path.exists() else None,
                "latest": _rel_from_published(published_root, latest_path) if latest_path.exists() else None,
                "windows": {str(k): v for k, v in win_paths.items()},
            }

        hero_charts = []
        for spec in _landing_chart_specs(chain):
            genre = spec["genre"]
            window_days = int(spec["window_days"])
            window_file = None
            if genre in files:
                window_file = files[genre]["windows"].get(str(window_days))
            hero_charts.append({**spec, "source_file": window_file})

        hero = {
            "dataset_id": dataset_id,
            "revision_id": revision_id,
            "computed_at_utc": computed_at_utc,
            "chain": chain,
            "windows_supported": windows,
            "asof": asof,
            "files": files,
            "hero": {
                "headline": "Network activity & execution conditions",
                "charts": hero_charts,
                "notes": [
                    "Landing hero is descriptive only (no prices, no forecasts).",
                    "Charts reference published window files; web renders interactive tooltips on hover.",
                ],
            },
        }
        _write_json(chain_dir / "hero.json", hero)

        cards.append(
            {
                "chain": chain,
                "hero_file": _rel_from_published(published_root, chain_dir / "hero.json"),
                "asof": asof,
            }
        )

    landing_index = {
        "dataset_id": dataset_id,
        "revision_id": revision_id,
        "computed_at_utc": computed_at_utc,
        "chains": chains,
        "genres": genres,
        "windows_supported": windows,
        "cards": cards,
        "schema_version": "landing.v1",
    }
    _write_json(landing_root / "index.json", landing_index)

    print(f"[PUBLISH] landing export OK: {landing_root}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, help="Project root (e.g. d:/css/main)")
    ap.add_argument("--calculated-root", required=True, help="data/calculated root")
    ap.add_argument("--published-root", required=True, help="data/published/v1 root")
    ap.add_argument("--chains", default="bitcoin,ethereum,arbitrum,base", help="Comma-separated chains")
    ap.add_argument("--genres", default="gold,meta,derived", help="Comma-separated genres")
    ap.add_argument("--windows", default="7,30,90,180,365", help="Comma-separated windows")
    args = ap.parse_args()

    calculated = Path(args.calculated_root).resolve()
    published = Path(args.published_root).resolve()
    _ensure_dir(published)

    chains = _parse_list(args.chains)
    genres = _parse_list(args.genres)
    windows = _parse_windows(args.windows)

    dataset_id = _compute_dataset_id()
    revision_id = _read_or_bump_revision(published, dataset_id)
    computed_at_utc = _utc_now_iso()

    asof_by_genre_chain: Dict[str, Dict[str, str]] = {g: {} for g in genres}
    copied_counts: Dict[str, Dict[str, int]] = {g: {} for g in genres}

    for genre in genres:
        src_genre = calculated / genre
        dst_genre = published / genre
        _ensure_dir(dst_genre)

        for chain in chains:
            src_chain = src_genre / chain
            dst_chain = dst_genre / chain
            _ensure_dir(dst_chain)

            if not src_chain.exists():
                asof_by_genre_chain[genre][chain] = ""
                copied_counts[genre][chain] = 0
            else:
                copied, asof = _copy_chain_files(src_chain, dst_chain)
                asof_by_genre_chain[genre][chain] = asof
                copied_counts[genre][chain] = copied

            available_days = _collect_days(dst_chain)
            manifest = {
                "dataset_id": dataset_id,
                "revision_id": revision_id,
                "computed_at_utc": computed_at_utc,
                "genre": genre,
                "chain": chain,
                "schema_version": _schema_version(genre),
                "methodology_version": "v1",
                "asof": available_days[-1] if available_days else "",
                "available_days_count": len(available_days),
                "available_days": available_days,
                "windows_supported": windows,
                "files": {
                    "latest": "latest.json" if (dst_chain / "latest.json").exists() else None,
                    "windows": {w: f"last{w}d.json" for w in windows if (dst_chain / f"last{w}d.json").exists()},
                },
            }
            _write_json(dst_chain / "manifest.json", manifest)

    dataset = {
        "dataset_id": dataset_id,
        "revision_id": revision_id,
        "computed_at_utc": computed_at_utc,
        "supported_chains": chains,
        "supported_genres": genres,
        "windows_supported": windows,
        "schema_versions": {g: _schema_version(g) for g in genres},
        "methodology_version": "v1",
        "asof_by_genre_chain": asof_by_genre_chain,
        "copied_file_counts": copied_counts,
        "notes": [
            "Published dataset is the only intended input for the website.",
            "Published JSON is sanitized for strict browser JSON (NaN/Inf -> null).",
        ],
    }

    # Primary dataset contract
    _write_json(published / "dataset.json", dataset)

    # Back-compat aliases (some web code fetches these)
    _write_json(published / "index.json", dataset)
    _write_json(published / "latest.json", dataset)

    # Landing export (website depends on it)
    _export_landing(
        published_root=published,
        dataset_id=dataset_id,
        revision_id=revision_id,
        computed_at_utc=computed_at_utc,
        chains=chains,
        genres=genres,
        windows=windows,
    )

    print(f"[PUBLISH] OK dataset_id={dataset_id} revision_id={revision_id} published_root={published}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())