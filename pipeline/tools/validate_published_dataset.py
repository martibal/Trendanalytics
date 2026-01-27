#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Validate the published dataset contract under data/published/v1.

Checks:
- dataset.json exists and parses
- per genre/chain: manifest.json exists and parses
- day files are ISO ordered, no duplicates
- if any day files exist: latest.json and lastXd.json exist for requested windows
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, List


def _read_json(p: Path) -> Any:
    return json.loads(p.read_text(encoding="utf-8"))


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


def _fail(msg: str) -> None:
    raise SystemExit(f"[VALIDATE] FAIL: {msg}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--published-root", required=True, help="data/published/v1")
    ap.add_argument("--chains", default="bitcoin,ethereum,arbitrum,base")
    ap.add_argument("--genres", default="gold,meta,derived")
    ap.add_argument("--windows", default="7,30,90,180,365")
    args = ap.parse_args()

    published = Path(args.published_root).resolve()
    chains = _parse_list(args.chains)
    genres = _parse_list(args.genres)
    windows = _parse_windows(args.windows)

    ds_path = published / "dataset.json"
    if not ds_path.exists():
        _fail(f"Missing dataset.json: {ds_path}")

    try:
        ds = _read_json(ds_path)
    except Exception as e:
        _fail(f"dataset.json parse error: {e}")

    for k in ("dataset_id", "revision_id", "computed_at_utc", "supported_chains", "supported_genres"):
        if k not in ds:
            _fail(f"dataset.json missing key: {k}")

    for genre in genres:
        for chain in chains:
            chain_dir = published / genre / chain
            if not chain_dir.exists():
                _fail(f"Missing directory: {chain_dir}")

            mf = chain_dir / "manifest.json"
            if not mf.exists():
                _fail(f"Missing manifest.json: {mf}")

            try:
                manifest = _read_json(mf)
            except Exception as e:
                _fail(f"manifest parse error ({genre}/{chain}): {e}")

            day_files = sorted(chain_dir.glob("????-??-??.json"))
            days = [p.stem for p in day_files]

            if len(days) != len(set(days)):
                _fail(f"Duplicate day files in {chain_dir}")
            if days != sorted(days):
                _fail(f"Day files not ISO-ordered in {chain_dir}")

            if len(days) > 0:
                if not (chain_dir / "latest.json").exists():
                    _fail(f"Missing latest.json for {genre}/{chain}")

                for w in windows:
                    wf = chain_dir / f"last{w}d.json"
                    if not wf.exists():
                        _fail(f"Missing last{w}d.json for {genre}/{chain}")

                asof = manifest.get("asof", "")
                if asof and asof != days[-1]:
                    _fail(f"Manifest asof mismatch for {genre}/{chain}: manifest={asof} actual={days[-1]}")

    print("[VALIDATE] OK. Published dataset contract looks consistent.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
