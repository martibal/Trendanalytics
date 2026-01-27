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
  data/published/v1/{genre}/{chain}/manifest.json

Notes:
- This is the single source of truth for the website later.
- Today it is a "copy/publish" step. Later we can add filtering/sanitization here to enforce
  non-invertibility and any legal constraints, without changing calculated outputs.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple


def _ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def _read_json(p: Path) -> Any:
    return json.loads(p.read_text(encoding="utf-8"))


def _write_json(p: Path, obj: Any) -> None:
    tmp = p.with_suffix(p.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")
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
    _ensure_dir(dst_chain)
    copied = 0

    day_files = sorted(src_chain.glob("????-??-??.json"))
    asof = day_files[-1].stem if day_files else ""

    for fp in day_files:
        (dst_chain / fp.name).write_bytes(fp.read_bytes())
        copied += 1

    for fp in src_chain.glob("latest.json"):
        (dst_chain / fp.name).write_bytes(fp.read_bytes())
        copied += 1

    for fp in src_chain.glob("last*d.json"):
        (dst_chain / fp.name).write_bytes(fp.read_bytes())
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
            "Published dataset is the only intended input for the future website.",
            "Calculated outputs remain internal; publish step can later enforce sanitization/legal constraints.",
        ],
    }
    _write_json(published / "dataset.json", dataset)

    print(f"[PUBLISH] OK dataset_id={dataset_id} revision_id={revision_id} published_root={published}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
