#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path
from typing import Any

DAY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}\.json$")


def is_day_file(p: Path) -> bool:
    return p.is_file() and DAY_RE.match(p.name) is not None


def read_json(path: Path) -> Any:
    # Standard json.loads will fail if the file contains NaN/Infinity.
    # Allow them, then sanitize to valid JSON values.
    txt = path.read_text(encoding="utf-8")
    return json.loads(txt, parse_constant=lambda x: float("nan"))


def _sanitize(obj: Any) -> Any:
    # Replace NaN/Infinity/-Infinity with None recursively.
    if obj is None:
        return None
    if isinstance(obj, bool):
        return obj
    if isinstance(obj, (int,)):
        return obj
    if isinstance(obj, float):
        if not math.isfinite(obj):
            return None
        return obj
    if isinstance(obj, str):
        return obj
    if isinstance(obj, list):
        return [_sanitize(x) for x in obj]
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    # fallback
    return obj


def write_json(path: Path, obj: Any) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    # allow_nan=False ensures we never emit invalid JSON
    tmp.write_text(
        json.dumps(obj, ensure_ascii=False, indent=2, allow_nan=False),
        encoding="utf-8",
    )
    tmp.replace(path)


def rebuild_one_chain_dir(chain_dir: Path, windows: list[int]) -> dict:
    day_files = sorted([p for p in chain_dir.glob("*.json") if is_day_file(p)], key=lambda p: p.stem)
    if not day_files:
        return {"chain_dir": str(chain_dir), "status": "no-day-files"}

    records: list[dict] = []
    sanitized_day_writes = 0
    bad_json_files = 0

    for p in day_files:
        try:
            obj = read_json(p)
            if not isinstance(obj, dict):
                continue
            clean = _sanitize(obj)

            # Overwrite dayfile if it contained NaN/Inf (or other non-finite)
            # We detect by attempting a strict dump; if it would fail, we rewrite.
            try:
                json.dumps(obj, allow_nan=False)
            except ValueError:
                write_json(p, clean)
                sanitized_day_writes += 1

            records.append(clean)
        except json.JSONDecodeError:
            bad_json_files += 1
            continue
        except Exception:
            bad_json_files += 1
            continue

    if not records:
        return {"chain_dir": str(chain_dir), "status": "no-valid-records", "bad_json_files": bad_json_files}

    write_json(chain_dir / "latest.json", records[-1])

    for w in windows:
        if w <= 0:
            continue
        tail = records[-w:] if len(records) >= w else records
        write_json(chain_dir / f"last{w}d.json", tail)

    return {
        "chain_dir": str(chain_dir),
        "status": "ok",
        "day_files": len(day_files),
        "records": len(records),
        "sanitized_day_writes": sanitized_day_writes,
        "bad_json_files": bad_json_files,
        "first": records[0].get("date"),
        "last": records[-1].get("date"),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, help="Path to published/v1 (or to published/v1/<genre>)")
    ap.add_argument("--genres", default="gold,meta,derived", help="Comma-separated genres to rebuild")
    ap.add_argument("--chains", default="bitcoin,ethereum,arbitrum,base", help="Comma-separated chains to rebuild")
    ap.add_argument("--windows", default="7,30,90,180,365", help="Comma-separated windows (days)")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    genres = [g.strip() for g in args.genres.split(",") if g.strip()]
    chains = [c.strip() for c in args.chains.split(",") if c.strip()]
    windows = sorted({int(x.strip()) for x in args.windows.split(",") if x.strip()})

    has_genre_dirs = any((root / g).is_dir() for g in genres)

    results = []
    for g in genres:
        genre_dir = (root / g) if has_genre_dirs else root
        if not genre_dir.is_dir():
            continue
        for c in chains:
            chain_dir = genre_dir / c
            if not chain_dir.is_dir():
                continue
            results.append(rebuild_one_chain_dir(chain_dir, windows))

    print(json.dumps(results, ensure_ascii=False, indent=2, allow_nan=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
