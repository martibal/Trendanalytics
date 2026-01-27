#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Export "overview JSON" as historical, file-backed meta JSON.

Purpose
- Calls the backend's compute_overview() for each chain/day and writes the returned object to:
    <repo_root>/data/calculated/meta/<chain>/<YYYY-MM-DD>.json
  plus:
    <repo_root>/data/calculated/meta/<chain>/latest.json

Notes
- This script is designed to be runnable from ANY working directory.
- It adds the repo root to sys.path so `import api.main` works even when launched from `pipeline/tools`.
- Start date should typically be: 2024-12-01
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import datetime as dt
from pathlib import Path
from typing import Any, Dict, Optional


def _repo_root_from_here() -> Path:
    # .../main/pipeline/tools/export_meta_json.py -> parents[2] == .../main
    return Path(__file__).resolve().parents[2]


REPO_ROOT = _repo_root_from_here()
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


def _iso_date(s: str) -> dt.date:
    try:
        return dt.date.fromisoformat(s)
    except Exception:
        raise SystemExit(f"--start must be YYYY-MM-DD, got: {s}")


def _json_dump(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False), encoding="utf-8")


def _iter_days(start: dt.date, end: dt.date) -> list[dt.date]:
    days: list[dt.date] = []
    cur = start
    while cur <= end:
        days.append(cur)
        cur = cur + dt.timedelta(days=1)
    return days


def _compute_overview_compat(*, chain: str, day: str) -> Dict[str, Any]:
    """
    Call api.main.compute_overview with best-effort compatibility across versions.
    Supported signatures seen:
      - compute_overview(chain: str, *, asof: Optional[str] = None)
      - (legacy) compute_overview(chain: str, *, asof_date: Optional[str] = None)
      - (legacy) compute_overview(chain: str, *, date: Optional[str] = None)
    """
    from api import main as api_main  # imported after sys.path injection

    fn = getattr(api_main, "compute_overview", None)
    if fn is None:
        raise SystemExit("api.main.compute_overview was not found. Check api/main.py in this repo.")

    # Try preferred kwarg names first.
    for kw in ("asof", "asof_date", "date"):
        try:
            return fn(chain=chain, **{kw: day})
        except TypeError:
            continue

    # Last resort: positional (chain, day)
    try:
        return fn(chain, day)  # type: ignore[misc]
    except TypeError as e:
        raise SystemExit(f"compute_overview() signature mismatch. Cannot call it with day={day}. Error: {e}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, help="Repo root, e.g. D:\\css\\main")
    ap.add_argument("--start", required=True, help="ISO date YYYY-MM-DD (inclusive), e.g. 2024-12-01")
    ap.add_argument(
        "--end",
        default=None,
        help="ISO date YYYY-MM-DD (inclusive). Default: today-<publish_lag_days_policy> (min 1 day).",
    )
    ap.add_argument(
        "--publish-lag-days-policy",
        type=int,
        default=1,
        help="Conservative lag policy for 'end' when --end is omitted. Default 1.",
    )
    ap.add_argument(
        "--chains",
        default=None,
        help='Comma-separated chains. Default: api.main.SUPPORTED_CHAINS if present else "bitcoin,ethereum,arbitrum,base".',
    )
    args = ap.parse_args()

    rr = Path(args.root).resolve()
    if not rr.exists():
        raise SystemExit(f"--root does not exist: {rr}")

    # Determine chains
    chains: list[str]
    if args.chains:
        chains = [c.strip() for c in args.chains.split(",") if c.strip()]
    else:
        try:
            from api.main import SUPPORTED_CHAINS  # type: ignore
            chains = list(SUPPORTED_CHAINS)
        except Exception:
            chains = ["bitcoin", "ethereum", "arbitrum", "base"]

    start = _iso_date(args.start)

    if args.end:
        end = _iso_date(args.end)
    else:
        # Conservative end: UTC today - lag_days (min 1)
        lag = max(1, int(args.publish_lag_days_policy or 1))
        end = (dt.datetime.utcnow().date() - dt.timedelta(days=lag))

    if end < start:
        raise SystemExit(f"end < start ({end} < {start})")

    meta_root = rr / "data" / "calculated" / "meta"

    days = _iter_days(start, end)
    print(f"[META] repo_root={rr}")
    print(f"[META] meta_root={meta_root}")
    print(f"[META] chains={', '.join(chains)}")
    print(f"[META] range={start} .. {end} (N={len(days)})")

    wrote = 0
    for chain in chains:
        chain_dir = meta_root / chain
        chain_dir.mkdir(parents=True, exist_ok=True)

        last_obj: Optional[Dict[str, Any]] = None

        for d in days:
            day = d.isoformat()
            out = chain_dir / f"{day}.json"

            obj: Dict[str, Any] = _compute_overview_compat(chain=chain, day=day)
            _json_dump(out, obj)
            wrote += 1
            last_obj = obj

            if wrote % 50 == 0:
                print(f"[META] wrote {wrote} files...", flush=True)

        if last_obj is not None:
            _json_dump(chain_dir / "latest.json", last_obj)

    print(f"[META] done. wrote={wrote} day files (+latest.json per chain).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
