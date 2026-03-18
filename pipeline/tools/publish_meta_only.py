#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WebEkstra: META-only publish

Purpose
-------
Publish only META artifacts (day-files + windows + latest) into:
  data/published/v1/meta/<chain>/

WITHOUT republishing gold/derived or touching dataset.json/contract/landing.

Why
---
After running meta-only history rebuild (data/calculated/meta),
we want the website (which reads published data) to see the new meta.regime.signals
without a full pipeline rebuild.

Behavior
--------
- Reads:  data/calculated/meta/<chain>/*.json
- Writes: data/published/v1/meta/<chain>/*.json  (sanitized strict JSON)
- Writes: data/published/v1/meta/<chain>/manifest.json (schema_version=meta.v1)
- Does NOT modify: data/published/v1/dataset.json, contract.json, landing/*
"""

from __future__ import annotations

import argparse
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def _read_json(p: Path) -> Any:
    return json.loads(p.read_text(encoding="utf-8"))


def _sanitize_json(obj: Any) -> Any:
    """Recursively replace NaN / +/-Infinity with None so output is strict JSON."""
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
    """Write JSON atomically, strict for browsers (no NaN/Infinity)."""
    tmp = p.with_suffix(p.suffix + ".tmp")
    safe = _sanitize_json(obj)
    tmp.write_text(
        json.dumps(safe, ensure_ascii=False, indent=2, sort_keys=True, allow_nan=False),
        encoding="utf-8",
    )
    tmp.replace(p)


def _collect_days(chain_dir: Path) -> List[str]:
    if not chain_dir.exists():
        return []
    return sorted({p.stem for p in chain_dir.glob("????-??-??.json")})


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


def _infer_repo_root_from_here() -> Path:
    # .../pipeline/tools/publish_meta_only.py -> repo root is 3 levels up
    return Path(__file__).resolve().parents[2]


def _try_read_dataset_ids(published_root: Path) -> Tuple[Optional[str], Optional[int]]:
    """
    Best-effort: read existing dataset_id/revision_id from data/published/v1/dataset.json.
    We intentionally do NOT modify dataset.json in meta-only publish.
    """
    ds = published_root / "dataset.json"
    if not ds.exists():
        return None, None
    try:
        obj = _read_json(ds)
        dataset_id = obj.get("dataset_id")
        revision_id = obj.get("revision_id")
        if isinstance(dataset_id, str) and dataset_id.strip():
            pass
        else:
            dataset_id = None
        try:
            revision_id_int = int(revision_id)
        except Exception:
            revision_id_int = None
        return dataset_id, revision_id_int
    except Exception:
        return None, None


def _copy_meta_chain_files(src_chain: Path, dst_chain: Path) -> Tuple[int, str]:
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

    for fp in day_files:
        obj = _read_json(fp)
        _write_json(dst_chain / fp.name, obj)
        copied += 1

    for fp in src_chain.glob("latest.json"):
        obj = _read_json(fp)
        _write_json(dst_chain / fp.name, obj)
        copied += 1

    for fp in src_chain.glob("last*d.json"):
        obj = _read_json(fp)
        _write_json(dst_chain / fp.name, obj)
        copied += 1

    return copied, asof


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--root",
        default=str(_infer_repo_root_from_here()),
        help="Repo root (default: inferred from this script location)",
    )
    ap.add_argument(
        "--calculated",
        default=None,
        help="Calculated root (default: <root>/data/calculated)",
    )
    ap.add_argument(
        "--published",
        default=None,
        help="Published root (default: <root>/data/published/v1)",
    )
    ap.add_argument(
        "--chains",
        default=None,
        help="Comma-separated chains. Default: uses api.main.SUPPORTED_CHAINS if available, else autodetect from calculated/meta/",
    )
    ap.add_argument(
        "--windows",
        default="7,30,90,180,365",
        help="Comma-separated window sizes to record in manifest (files must exist to be listed)",
    )
    args = ap.parse_args()

    repo_root = Path(args.root).resolve()
    calculated_root = Path(args.calculated).resolve() if args.calculated else (repo_root / "data" / "calculated")
    published_root = Path(args.published).resolve() if args.published else (repo_root / "data" / "published" / "v1")

    src_meta = calculated_root / "meta"
    dst_meta = published_root / "meta"

    if not src_meta.exists():
        raise SystemExit(f"[publish_meta_only] calculated META folder not found: {src_meta}")

    _ensure_dir(dst_meta)

    # Determine chains
    chains: List[str] = []
    if args.chains:
        chains = _parse_list(str(args.chains))
    else:
        # Prefer canonical supported chains list if repo has api.main
        try:
            if str(repo_root) not in __import__("sys").path:
                __import__("sys").path.insert(0, str(repo_root))
            from api.main import SUPPORTED_CHAINS  # type: ignore

            chains = list(SUPPORTED_CHAINS)
        except Exception:
            # Fallback: autodetect from folders in calculated/meta
            chains = sorted([p.name for p in src_meta.iterdir() if p.is_dir()])

    if not chains:
        raise SystemExit("[publish_meta_only] No chains resolved (empty list).")

    windows = _parse_windows(str(args.windows))
    computed_at_utc = _utc_now_iso()

    # Reuse existing dataset_id/revision_id if present, without modifying dataset.json
    dataset_id, revision_id = _try_read_dataset_ids(published_root)
    if dataset_id is None:
        dataset_id = datetime.now(timezone.utc).strftime("%Y-%m-%d.%H%M%S")
    if revision_id is None:
        revision_id = 1

    print(f"[publish_meta_only] root={repo_root}")
    print(f"[publish_meta_only] calculated_meta={src_meta}")
    print(f"[publish_meta_only] published_meta={dst_meta}")
    print(f"[publish_meta_only] chains={chains}")
    print(f"[publish_meta_only] windows={windows}")
    print(f"[publish_meta_only] dataset_id(reused if present)={dataset_id}")
    print(f"[publish_meta_only] revision_id(reused if present)={revision_id}")
    print(f"[publish_meta_only] computed_at_utc(this run)={computed_at_utc}")

    total_copied = 0

    for chain in chains:
        src_chain = src_meta / chain
        dst_chain = dst_meta / chain
        _ensure_dir(dst_chain)

        if not src_chain.exists():
            print(f"[publish_meta_only] chain={chain}: source missing, skipping (no calculated/meta/{chain})")
            continue

        copied, asof = _copy_meta_chain_files(src_chain, dst_chain)
        total_copied += copied

        available_days = _collect_days(dst_chain)
        asof_manifest = available_days[-1] if available_days else ""

        files_windows: Dict[int, str] = {}
        for w in windows:
            fn = f"last{w}d.json"
            if (dst_chain / fn).exists():
                files_windows[w] = fn

        manifest = {
            "dataset_id": dataset_id,
            "revision_id": revision_id,
            "computed_at_utc": computed_at_utc,
            "genre": "meta",
            "chain": chain,
            "schema_version": "meta.v1",
            "methodology_version": "v1",
            "asof": asof_manifest,
            "available_days_count": len(available_days),
            "available_days": available_days,
            "windows_supported": windows,
            "files": {
                "latest": "latest.json" if (dst_chain / "latest.json").exists() else None,
                "windows": {str(k): v for k, v in files_windows.items()},
            },
            "notes": [
                "This manifest is produced by publish_meta_only.py (meta-only publish).",
                "It does not imply dataset.json/contract.json were regenerated in the same run.",
                "Published META files are sanitized for strict JSON (NaN/Infinity -> null).",
            ],
        }

        _write_json(dst_chain / "manifest.json", manifest)

        day_span = ""
        if available_days:
            day_span = f"{available_days[0]}..{available_days[-1]} ({len(available_days)} days)"
        print(f"[publish_meta_only] chain={chain}: copied={copied} asof_src={asof} available={day_span}")

    print(f"[publish_meta_only] DONE: total_copied={total_copied}")


if __name__ == "__main__":
    main()