#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regenerate Urd Atlas META/Brief JSON safely, without downloading raw/parquet data.

This script intentionally runs only JSON-generation steps:
  1. rebuild META history from existing local GOLD artifacts
  2. publish META into data/published/v1/meta
  3. validate META methodological safety
  4. optionally sync data/published/v1 into the active Next.js app public folder
  5. rebuild Regime Briefs if a builder exists in root/scripts or web-v1-app/scripts

It does not call download tools and does not regenerate gold/derived parquet files.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path
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
        print("[regenerate_json_safe] No web app folder found; skipping web-public sync.")
        return None
    dst = web / "public" / "data" / "published" / "v1"
    if not src.exists():
        raise SystemExit(f"Published data root not found: {src}")

    print(f"[regenerate_json_safe] Syncing published data -> web public: {src} -> {dst}")
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
            return web_builder, web_app, ["--root", "public/data/published/v1"]

    # Explicit fallback for the current known app name even if sync was skipped.
    web_v1_app_builder = root / "web-v1-app" / "scripts" / "build_briefs" / "build_all_briefs.py"
    if web_v1_app_builder.exists():
        return web_v1_app_builder, root / "web-v1-app", ["--root", "public/data/published/v1"]

    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=str(_repo_root_from_here()), help="Repo root. Default: inferred.")
    ap.add_argument("--start", default=None, help="Optional YYYY-MM-DD start date. Default: earliest available GOLD date.")
    ap.add_argument("--windows", default="7,30,90,180,365", help="Comma-separated meta window files to materialize.")
    ap.add_argument("--skip-briefs", action="store_true", help="Do not run Regime Brief builder even if present.")
    ap.add_argument("--skip-web-sync", action="store_true", help="Do not copy data/published/v1 to web public data folder.")
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
