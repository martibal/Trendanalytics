#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regenerate Urd Atlas META/Brief JSON safely, without downloading raw/parquet data.

This script intentionally runs only JSON-generation steps:
  1. rebuild META history from existing local GOLD artifacts
  2. publish META into data/published/v1/meta
  3. validate META methodological safety
  4. optionally mirror data/published/v1 into the active Next.js app private data folder
  5. rebuild Regime Briefs if a builder exists in root/scripts or web-v1-app/scripts

It does not call download tools and does not regenerate gold/derived parquet files.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import subprocess
import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Optional, Tuple


def _repo_root_from_here() -> Path:
    return Path(__file__).resolve().parents[2]


def _run(cmd: List[str], *, cwd: Path) -> int:
    print("[regenerate_json_safe] Running:", " ".join(cmd), flush=True)
    proc = subprocess.Popen(
        cmd,
        cwd=str(cwd),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    assert proc.stdout is not None
    for line in proc.stdout:
        print(line.rstrip(), flush=True)
    return proc.wait()


def _find_web_app(root: Path) -> Optional[Path]:
    # Current repo uses web-v1-app. Older helpers used web-v1 or web.
    for name in ("web-v1-app", "web-v1", "web"):
        p = root / name
        if p.exists() and p.is_dir():
            return p
    return None


def _sync_published_to_web(root: Path) -> Optional[Path]:
    src = root / "data" / "published" / "v1"
    web = _find_web_app(root)
    if web is None:
        print("[regenerate_json_safe] No web app folder found; skipping web-private sync.")
        return None
    dst = web / ".private-data" / "published" / "v1"
    if not src.exists():
        raise SystemExit(f"Published data root not found: {src}")

    print(f"[regenerate_json_safe] Syncing published data -> web private data: {src} -> {dst}")
    if dst.exists():
        shutil.rmtree(dst)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(src, dst)
    return web


def _find_brief_builder(root: Path, web_app: Optional[Path]) -> Optional[Tuple[Path, Path, List[str]]]:
    # Return (builder_path, cwd, extra_args)
    root_builder = root / "scripts" / "build_briefs" / "build_all_briefs.py"
    if root_builder.exists():
        return root_builder, root, []

    if web_app is not None:
        web_builder = web_app / "scripts" / "build_briefs" / "build_all_briefs.py"
        if web_builder.exists():
            return web_builder, web_app, ["--root", str(root / "data" / "published" / "v1")]

    # Explicit fallback for the current known app name even if sync was skipped.
    web_v1_app_builder = root / "web-v1-app" / "scripts" / "build_briefs" / "build_all_briefs.py"
    if web_v1_app_builder.exists():
        return web_v1_app_builder, root / "web-v1-app", ["--root", str(root / "data" / "published" / "v1")]

    return None



# D-131 published derived/window harmonizer
# This runs inside regenerate_json_safe.py, which is executed even when the daily
# full pipeline exits as an incremental no-op. It repairs the final published
# contract that the audit gates read: row-count latest/lastXd windows for all
# genres, and DERIVED day files recomputed from final published GOLD with source
# lineage required by publication-integrity D-006.
BASE_DERIVED_GOLD_METRICS = [
    "tx_count_daily",
    "unique_active_addresses",
    "value_transferred_native",
    "median_tx_value_native",
    "median_tx_fee_native",
    "failed_tx_rate",
    "gas_utilization_pct",
    "avg_block_time_sec",
    "block_count_daily",
]


def _d131_parse_windows(value: str) -> List[int]:
    out: List[int] = []
    for part in (value or "").split(","):
        part = part.strip()
        if not part:
            continue
        try:
            parsed = int(part)
        except ValueError:
            continue
        if parsed > 0:
            out.append(parsed)
    return sorted(set(out))


def _d131_ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _d131_read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def _d131_sanitize_json(value):
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return value
    if isinstance(value, (int, str)):
        return value
    if isinstance(value, list):
        return [_d131_sanitize_json(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _d131_sanitize_json(child) for key, child in value.items()}
    try:
        if hasattr(value, "__float__"):
            parsed = float(value)
            if math.isnan(parsed) or math.isinf(parsed):
                return None
            return parsed
    except Exception:
        pass
    return value


def _d131_write_json(path: Path, value) -> None:
    _d131_ensure_dir(path.parent)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(
        json.dumps(_d131_sanitize_json(value), ensure_ascii=False, indent=2, sort_keys=True, allow_nan=False),
        encoding="utf-8",
    )
    tmp.replace(path)


def _d131_canonical_json_bytes(value) -> bytes:
    return json.dumps(
        _d131_sanitize_json(value),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")


def _d131_sha256_json(value) -> str:
    return hashlib.sha256(_d131_canonical_json_bytes(value)).hexdigest()


def _d131_is_iso_day(value) -> bool:
    if not isinstance(value, str):
        return False
    if len(value) != 10 or value[4] != "-" or value[7] != "-":
        return False
    try:
        datetime.strptime(value, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def _d131_normalize_day(value, fallback: str = "") -> str:
    if _d131_is_iso_day(value):
        return str(value)
    if _d131_is_iso_day(fallback):
        return fallback
    return ""


def _d131_day_files(chain_dir: Path) -> List[Path]:
    if not chain_dir.exists():
        return []
    return sorted(path for path in chain_dir.glob("????-??-??.json") if path.is_file())


def _d131_first_dict(values) -> dict:
    for value in values:
        if isinstance(value, dict):
            return value
    return {}


def _d131_gold_metrics(gold_obj) -> dict:
    if not isinstance(gold_obj, dict):
        return {}
    gold = gold_obj.get("gold")
    metrics = gold_obj.get("metrics")
    nested_metrics = gold.get("metrics") if isinstance(gold, dict) else None
    return _d131_first_dict([nested_metrics, metrics, gold, gold_obj])


def _d131_number(value):
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)) and math.isfinite(float(value)):
        return float(value)
    return None


def _d131_shift_day(day: str, delta_days: int) -> str:
    parsed = datetime.strptime(day, "%Y-%m-%d").date()
    return (parsed + timedelta(days=delta_days)).isoformat()


def _d131_rolling_mean(gold_metrics_by_day: dict, metric: str, day: str, window_days: int):
    values: List[float] = []
    for offset in range(window_days - 1, -1, -1):
        window_day = _d131_shift_day(day, -offset)
        metrics = gold_metrics_by_day.get(window_day)
        if not isinstance(metrics, dict):
            continue
        value = _d131_number(metrics.get(metric))
        if value is not None:
            values.append(value)
    if not values:
        return None
    return sum(values) / len(values)


def _d131_existing_derived_block(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        loaded = _d131_read_json(path)
    except Exception:
        return {}
    if not isinstance(loaded, dict):
        return {}
    derived = loaded.get("derived")
    return derived if isinstance(derived, dict) else {}


def _d131_rebuild_derived_from_published_gold(published_root: Path, chains: List[str]) -> dict:
    summary = {}
    for chain in chains:
        gold_dir = published_root / "gold" / chain
        derived_dir = published_root / "derived" / chain
        _d131_ensure_dir(derived_dir)

        gold_objects_by_day = {}
        gold_metrics_by_day = {}
        ordered_days: List[str] = []

        for gold_file in _d131_day_files(gold_dir):
            try:
                gold_obj = _d131_read_json(gold_file)
            except Exception:
                continue
            day = _d131_normalize_day(gold_obj.get("date") if isinstance(gold_obj, dict) else None, gold_file.stem)
            if not day:
                continue
            gold_objects_by_day[day] = gold_obj
            gold_metrics_by_day[day] = _d131_gold_metrics(gold_obj)
            ordered_days.append(day)

        ordered_days = sorted(set(ordered_days))
        if not ordered_days:
            summary[chain] = {"days": 0, "from": "", "to": ""}
            continue

        metric_cols = [
            metric
            for metric in BASE_DERIVED_GOLD_METRICS
            if any(_d131_number(gold_metrics_by_day.get(day, {}).get(metric)) is not None for day in ordered_days)
        ]

        for day in ordered_days:
            target = derived_dir / f"{day}.json"
            existing_derived = _d131_existing_derived_block(target)
            metrics = {}
            for metric in metric_cols:
                metrics[f"{metric}__ma7"] = _d131_rolling_mean(gold_metrics_by_day, metric, day, 7)
                metrics[f"{metric}__ma30"] = _d131_rolling_mean(gold_metrics_by_day, metric, day, 30)

            gold_obj = gold_objects_by_day[day]
            record = {
                "chain": chain,
                "date": day,
                "derived": {
                    "context_blocks": existing_derived.get("context_blocks", []) if isinstance(existing_derived, dict) else [],
                    "meta_confidence": existing_derived.get("meta_confidence", {}) if isinstance(existing_derived, dict) else {},
                    "metrics": metrics,
                    "source": {
                        "producer": "published-derived-from-published-gold-v2",
                        "formula": "calendar rolling mean over final data/published/v1/gold rows; min_periods=1 over available finite values",
                        "chain": chain,
                        "date": day,
                        "gold_source": f"data/published/v1/gold/{chain}",
                        "gold_sha256": _d131_sha256_json(gold_obj),
                        "metric_columns": metric_cols,
                        "rolling_windows": [7, 30],
                    },
                },
            }
            _d131_write_json(target, record)

        summary[chain] = {"days": len(ordered_days), "from": ordered_days[0], "to": ordered_days[-1]}
    return summary


def _d131_materialize_windows_from_day_files(chain_dir: Path, windows: List[int]) -> List[str]:
    records = []
    for day_file in _d131_day_files(chain_dir):
        try:
            record = _d131_read_json(day_file)
        except Exception:
            continue
        if isinstance(record, dict):
            records.append(record)

    if not records:
        return []

    records.sort(key=lambda item: _d131_normalize_day(item.get("date"), ""))
    days = [_d131_normalize_day(record.get("date"), "") for record in records]
    days = [day for day in days if day]

    _d131_write_json(chain_dir / "latest.json", records[-1])
    for window in windows:
        count = min(int(window), len(records))
        _d131_write_json(chain_dir / f"last{window}d.json", records[-count:])

    return days


def _d131_update_manifest(chain_dir: Path, genre: str, chain: str, windows: List[int], dataset_id, revision_id, computed_at_utc) -> List[str]:
    days = _d131_materialize_windows_from_day_files(chain_dir, windows)
    manifest_path = chain_dir / "manifest.json"
    existing = {}
    if manifest_path.exists():
        try:
            loaded = _d131_read_json(manifest_path)
            if isinstance(loaded, dict):
                existing = loaded
        except Exception:
            existing = {}

    manifest = {
        **existing,
        "dataset_id": dataset_id,
        "revision_id": revision_id,
        "computed_at_utc": computed_at_utc,
        "genre": genre,
        "chain": chain,
        "schema_version": f"{genre}.v1",
        "methodology_version": existing.get("methodology_version", "v1"),
        "asof": days[-1] if days else "",
        "available_days_count": len(days),
        "available_days": days,
        "windows_supported": windows,
        "files": {
            "latest": "latest.json" if (chain_dir / "latest.json").exists() else None,
            "windows": {window: f"last{window}d.json" for window in windows if (chain_dir / f"last{window}d.json").exists()},
        },
    }
    _d131_write_json(manifest_path, manifest)
    return days


def _d131_harmonize_published_derived_and_windows(root: Path, windows_csv: str) -> None:
    published_root = root / "data" / "published" / "v1"
    dataset_path = published_root / "dataset.json"
    if not dataset_path.exists():
        print(f"[D-131] published dataset not found, skipping: {dataset_path}", flush=True)
        return

    dataset = _d131_read_json(dataset_path)
    if not isinstance(dataset, dict):
        print(f"[D-131] dataset is not an object, skipping: {dataset_path}", flush=True)
        return

    chains = dataset.get("supported_chains") if isinstance(dataset.get("supported_chains"), list) else ["bitcoin", "ethereum", "arbitrum", "base"]
    genres = dataset.get("supported_genres") if isinstance(dataset.get("supported_genres"), list) else ["gold", "meta", "derived"]
    windows = _d131_parse_windows(windows_csv)
    if not windows:
        windows = [7, 30, 90, 180, 365]

    _d131_rebuild_derived_from_published_gold(published_root, [str(chain) for chain in chains])

    coverage = dataset.get("coverage") if isinstance(dataset.get("coverage"), dict) else {}
    asof_by_genre_chain = dataset.get("asof_by_genre_chain") if isinstance(dataset.get("asof_by_genre_chain"), dict) else {}
    computed_at_utc = dataset.get("computed_at_utc", "")
    dataset_id = dataset.get("dataset_id", "")
    revision_id = dataset.get("revision_id", 1)

    for chain in [str(value) for value in chains]:
        coverage.setdefault(chain, {})
        for genre in [str(value) for value in genres]:
            chain_dir = published_root / genre / chain
            if not chain_dir.exists():
                continue
            days = _d131_update_manifest(chain_dir, genre, chain, windows, dataset_id, revision_id, computed_at_utc)
            coverage[chain][genre] = {
                "days": len(days),
                "from": days[0] if days else "",
                "to": days[-1] if days else "",
                "asof": days[-1] if days else "",
            }
            asof_by_genre_chain.setdefault(genre, {})[chain] = days[-1] if days else ""

    dataset["coverage"] = coverage
    dataset["asof_by_genre_chain"] = asof_by_genre_chain
    dataset["windows_supported"] = windows
    _d131_write_json(dataset_path, dataset)
    _d131_write_json(published_root / "index.json", dataset)
    _d131_write_json(published_root / "latest.json", dataset)
    print("[D-131] Harmonized published DERIVED lineage and row-count latest/lastXd windows.", flush=True)

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=str(_repo_root_from_here()), help="Repo root. Default: inferred.")
    ap.add_argument("--start", default=None, help="Optional YYYY-MM-DD start date. Default: earliest available GOLD date.")
    ap.add_argument("--windows", default="7,30,90,180,365", help="Comma-separated meta window files to materialize.")
    ap.add_argument("--skip-briefs", action="store_true", help="Do not run Regime Brief builder even if present.")
    ap.add_argument("--skip-web-sync", action="store_true", help="Do not mirror data/published/v1 to the web private data folder.")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    py = sys.executable or "python"

    rebuild = root / "pipeline" / "tools" / "rebuild_meta_only.py"
    publish = root / "pipeline" / "tools" / "publish_meta_only.py"
    validate = root / "pipeline" / "tools" / "validate_meta_methodology_safety.py"

    if not rebuild.exists():
        raise SystemExit(f"Missing rebuild_meta_only.py: {rebuild}")
    if not publish.exists():
        raise SystemExit(f"Missing publish_meta_only.py: {publish}")

    print("[regenerate_json_safe] SAFETY: this script does not call download tools and does not build parquet.")
    print("[regenerate_json_safe] It uses existing local GOLD artifacts as input for regenerated META JSON.")
    print(f"[regenerate_json_safe] root={root}")

    cmd = [py, str(rebuild), "--root", str(root), "--mode", "rebuild", "--windows", str(args.windows)]
    if args.start:
        cmd += ["--start", str(args.start)]
    rc = _run(cmd, cwd=root)
    if rc != 0:
        return rc

    rc = _run([py, str(publish), "--root", str(root), "--windows", str(args.windows)], cwd=root)
    if rc != 0:
        return rc

    _d131_harmonize_published_derived_and_windows(root, str(args.windows))
    if validate.exists():
        rc = _run([py, str(validate), "--root", str(root)], cwd=root)
        if rc != 0:
            return rc

    web_app: Optional[Path] = None
    if not args.skip_web_sync:
        web_app = _sync_published_to_web(root)

    if not args.skip_briefs:
        found = _find_brief_builder(root, web_app)
        if found is not None:
            builder, cwd, extra = found
            rc = _run([py, str(builder), *extra], cwd=cwd)
            if rc != 0:
                return rc
        else:
            print("[regenerate_json_safe] Brief builder not found, skipping.")

    print("[regenerate_json_safe] DONE. Regenerated JSON only.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

