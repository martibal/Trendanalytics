#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WebEkstra (5.2): reexport_meta_only.py

Purpose
-------
Auto-wrapper for exporting META JSON history WITHOUT running full pipeline.

It:
- Discovers supported chains via api.main.SUPPORTED_CHAINS
- Loads GOLD daily frames via api.main._load_gold_df
- Finds earliest available GOLD date across chains (min(date))
- Calls pipeline/tools/export_meta_json_history.py with:
    --mode rebuild
    --start <earliest gold date>
    --out-root <root>/data/calculated/meta
    --windows 7,30,90,180,365 (default)

Why
---
To allow regenerating meta history when regime-engine/meta schema changes (e.g. meta.regime.signals),
without recomputing gold/derived.

Output
------
data/calculated/meta/<chain>/YYYY-MM-DD.json
+ latest.json
+ lastXd.json windows
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional, Tuple

import pandas as pd


def _repo_root_from_here() -> Path:
    # .../pipeline/tools/reexport_meta_only.py -> repo root is 3 levels up
    return Path(__file__).resolve().parents[2]


def _parse_date_iso(s: str) -> dt.date:
    return dt.date.fromisoformat(s)


def _extract_date_bounds(df: Optional[pd.DataFrame]) -> Tuple[Optional[dt.date], Optional[dt.date]]:
    """Return (min_date, max_date) from a GOLD dataframe, best-effort."""
    if df is None or getattr(df, "empty", True):
        return None, None

    d = df

    # Standardize column name
    if "date" not in d.columns and "day" in d.columns:
        d = d.rename(columns={"day": "date"})

    if "date" not in d.columns:
        return None, None

    s = pd.to_datetime(d["date"], errors="coerce")
    s = s.dropna()
    if s.empty:
        return None, None

    dates = s.dt.date
    return dates.min(), dates.max()


def _infer_earliest_gold_date(repo_root: Path) -> dt.date:
    """Infer earliest GOLD date across supported chains, using api.main."""
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))

    # Late imports after sys.path adjustment
    from api.main import SUPPORTED_CHAINS, _load_gold_df  # noqa: WPS433

    earliest: Optional[dt.date] = None

    for chain in SUPPORTED_CHAINS:
        try:
            df = _load_gold_df(chain, "daily")
        except Exception:
            df = None

        dmin, _dmax = _extract_date_bounds(df)
        if dmin is None:
            continue
        if earliest is None or dmin < earliest:
            earliest = dmin

    if earliest is None:
        # Conservative fallback: one year back (still deterministic); caller can override --start.
        return dt.date.today() - dt.timedelta(days=365)

    return earliest


def _run_export_meta_history(
    *,
    repo_root: Path,
    out_root: Path,
    start: dt.date,
    mode: str,
    windows: str,
    force: bool,
) -> int:
    tool = (repo_root / "pipeline" / "tools" / "export_meta_json_history.py").resolve()
    if not tool.exists():
        raise FileNotFoundError(f"export_meta_json_history.py not found: {tool}")

    cmd = [
        sys.executable or "python",
        str(tool),
        "--root",
        str(repo_root),
        "--out-root",
        str(out_root),
        "--start",
        start.isoformat(),
        "--mode",
        mode,
        "--windows",
        windows,
    ]
    if force:
        cmd.append("--force")

    env = os.environ.copy()
    env["CSS_PIPELINE_MODE"] = mode

    print(f"[reexport_meta_only] Running: {' '.join(cmd)}")
    proc = subprocess.Popen(
        cmd,
        cwd=str(repo_root),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
    )
    assert proc.stdout is not None
    for line in proc.stdout:
        print(line.rstrip())
    return proc.wait()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--root",
        default=str(_repo_root_from_here()),
        help="Repo root (default: inferred from this script location)",
    )
    ap.add_argument(
        "--out-root",
        default=None,
        help="Output root (default: <root>/data/calculated/meta)",
    )
    ap.add_argument(
        "--start",
        default=None,
        help="Start date YYYY-MM-DD (inclusive). If omitted, inferred from earliest GOLD date across chains.",
    )
    ap.add_argument(
        "--mode",
        default="rebuild",
        choices=["incremental", "rebuild"],
        help="incremental=preserve existing day files; rebuild=overwrite history (default)",
    )
    ap.add_argument(
        "--windows",
        default="7,30,90,180,365",
        help="Comma-separated window sizes to materialize as lastXd.json",
    )
    ap.add_argument(
        "--force",
        action="store_true",
        help="Force overwrite existing day files (same effect as --mode rebuild, but explicit)",
    )
    args = ap.parse_args()

    repo_root = Path(args.root).resolve()
    out_root = Path(args.out_root).resolve() if args.out_root else (repo_root / "data" / "calculated" / "meta")
    out_root.mkdir(parents=True, exist_ok=True)

    if args.start:
        start = _parse_date_iso(str(args.start))
        inferred = False
    else:
        start = _infer_earliest_gold_date(repo_root)
        inferred = True

    print(f"[reexport_meta_only] root={repo_root}")
    print(f"[reexport_meta_only] out_root={out_root}")
    print(f"[reexport_meta_only] mode={args.mode}")
    print(f"[reexport_meta_only] start={start.isoformat()} (inferred={inferred})")
    print(f"[reexport_meta_only] windows={args.windows}")
    print(f"[reexport_meta_only] force={bool(args.force)}")

    rc = _run_export_meta_history(
        repo_root=repo_root,
        out_root=out_root,
        start=start,
        mode=str(args.mode),
        windows=str(args.windows),
        force=bool(args.force),
    )
    if rc != 0:
        raise SystemExit(rc)

    print("[reexport_meta_only] DONE")


if __name__ == "__main__":
    main()