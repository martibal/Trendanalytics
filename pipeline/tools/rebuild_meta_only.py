#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""WebEkstra: META-only history rebuild wrapper.

Goal
----
Rebuild historical META day-files without running the full pipeline (gold/derived).

This wrapper orchestrates:
  pipeline/tools/export_meta_json_history.py

Default behavior:
- mode = rebuild (overwrite history)
- out_root = data/calculated/meta
- start date = earliest available GOLD date across supported chains (best-effort)

Notes
-----
- This script is intentionally descriptive-only; it does not interpret markets.
- Output: data/calculated/meta/<chain>/YYYY-MM-DD.json (+ lastXd.json, latest.json)
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import sys
import subprocess
from pathlib import Path
from typing import Optional

import pandas as pd


def _repo_root_from_here() -> Path:
    # .../pipeline/tools/rebuild_meta_only.py -> repo root is 3 levels up
    return Path(__file__).resolve().parents[2]


def _parse_date(s: str) -> dt.date:
    return dt.date.fromisoformat(s)


def _df_date_bounds(df: Optional[pd.DataFrame]) -> tuple[Optional[dt.date], Optional[dt.date]]:
    if df is None or getattr(df, "empty", True):
        return None, None

    col = "date" if "date" in df.columns else ("day" if "day" in df.columns else None)
    if col is None:
        return None, None

    s = df[col]
    # Normalize to datetime.date
    if pd.api.types.is_datetime64_any_dtype(s):
        d = pd.to_datetime(s, errors="coerce").dt.date
    else:
        # strings / python dates
        d = pd.to_datetime(s, errors="coerce").dt.date

    d = d.dropna()
    if d.empty:
        return None, None
    return d.min(), d.max()


def _infer_start_date(repo_root: Path) -> dt.date:
    """Infer earliest GOLD date across supported chains (best-effort)."""
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))

    # Late import after sys.path adjustment
    from api.main import SUPPORTED_CHAINS, _load_gold_df  # noqa: WPS433

    min_date: Optional[dt.date] = None

    for chain in SUPPORTED_CHAINS:
        try:
            df = _load_gold_df(chain)
        except Exception:
            df = None

        dmin, _dmax = _df_date_bounds(df)
        if dmin is None:
            continue
        if min_date is None or dmin < min_date:
            min_date = dmin

    if min_date is not None:
        return min_date

    # Fallback: 10 years back (conservative), if GOLD isn't present yet.
    return (dt.date.today() - dt.timedelta(days=3650))


def _run_export_meta_history(*, repo_root: Path, out_root: Path, start: dt.date, mode: str, windows: str) -> int:
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

    # Propagate mode also via env for downstream defaults (harmless).
    env = os.environ.copy()
    env["CSS_PIPELINE_MODE"] = mode

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
        help="Start date YYYY-MM-DD (inclusive). If omitted, inferred from earliest available GOLD date.",
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
    args = ap.parse_args()

    repo_root = Path(args.root).resolve()
    out_root = Path(args.out_root).resolve() if args.out_root else (repo_root / "data" / "calculated" / "meta")
    out_root.mkdir(parents=True, exist_ok=True)

    if args.start:
        start = _parse_date(str(args.start))
    else:
        start = _infer_start_date(repo_root)

    print(f"[rebuild_meta_only] root={repo_root}")
    print(f"[rebuild_meta_only] out_root={out_root}")
    print(f"[rebuild_meta_only] mode={args.mode}")
    print(f"[rebuild_meta_only] start={start.isoformat()}")
    print(f"[rebuild_meta_only] windows={args.windows}")

    rc = _run_export_meta_history(
        repo_root=repo_root,
        out_root=out_root,
        start=start,
        mode=str(args.mode),
        windows=str(args.windows),
    )
    if rc != 0:
        raise SystemExit(rc)


if __name__ == "__main__":
    main()