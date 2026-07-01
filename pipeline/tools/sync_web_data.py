#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Cross-platform mirror sync for published dataset files.
#
# Mirrors:
#   <repo-root>/data/published/v1
# to:
#   <repo-root>/web-v1-app/.private-data/published/v1
#
# This replaces the previous robocopy-based implementation so the same sync
# contract can run on Windows and Linux CI runners.

from __future__ import annotations

import argparse
import filecmp
import shutil
from datetime import datetime, timezone
from pathlib import Path


def utc_ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def log(message: str) -> None:
    print(f"[{utc_ts()}] {message}")


def default_root() -> Path:
    return Path(__file__).resolve().parents[2]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Mirror published dataset into the web app private data folder.")
    parser.add_argument(
        "--root",
        default="",
        help="Repository root. Defaults to two levels above this script.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned mirror operations without writing files.",
    )
    return parser.parse_args()


def should_copy_file(src: Path, dst: Path) -> bool:
    if not dst.exists() or not dst.is_file():
        return True

    try:
        return not filecmp.cmp(src, dst, shallow=False)
    except OSError:
        return True


def remove_path(path: Path, dry_run: bool) -> None:
    if path.is_dir() and not path.is_symlink():
        if dry_run:
            return
        shutil.rmtree(path)
        return

    if dry_run:
        return
    path.unlink()


def mirror_tree(src: Path, dst: Path, dry_run: bool) -> dict[str, int]:
    if not src.exists() or not src.is_dir():
        raise FileNotFoundError(f"Missing published dataset folder: {src}")

    stats = {
        "dirs_created": 0,
        "files_copied": 0,
        "extra_paths_removed": 0,
        "files_unchanged": 0,
    }

    if not dry_run:
        dst.mkdir(parents=True, exist_ok=True)

    if dst.exists():
        for dst_path in sorted(dst.rglob("*"), key=lambda item: len(item.parts), reverse=True):
            rel = dst_path.relative_to(dst)
            src_peer = src / rel
            if src_peer.exists():
                continue

            log(f"remove extra: {dst_path}")
            stats["extra_paths_removed"] += 1
            remove_path(dst_path, dry_run)

    for src_path in sorted(src.rglob("*")):
        rel = src_path.relative_to(src)
        dst_path = dst / rel

        if src_path.is_symlink():
            raise RuntimeError(f"Refusing to mirror symlink from published dataset: {src_path}")

        if src_path.is_dir():
            if not dst_path.exists():
                log(f"create dir: {dst_path}")
                stats["dirs_created"] += 1
                if not dry_run:
                    dst_path.mkdir(parents=True, exist_ok=True)
            continue

        if not src_path.is_file():
            continue

        if should_copy_file(src_path, dst_path):
            log(f"copy file: {src_path} -> {dst_path}")
            stats["files_copied"] += 1
            if not dry_run:
                dst_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src_path, dst_path)
        else:
            stats["files_unchanged"] += 1

    return stats


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve() if args.root else default_root()

    published = root / "data" / "published" / "v1"
    web_v1_app = root / "web-v1-app"
    dst = web_v1_app / ".private-data" / "published" / "v1"

    log("=== SYNC WEB DATA START ===")
    log(f"root      = {root}")
    log(f"published = {published}")
    log(f"targetWeb = {web_v1_app}")
    log(f"dst       = {dst}")
    log(f"dryRun    = {bool(args.dry_run)}")

    if not web_v1_app.exists() or not web_v1_app.is_dir():
        raise FileNotFoundError(f"No web app folder found under root. Expected: {web_v1_app}")

    stats = mirror_tree(published, dst, bool(args.dry_run))

    log(
        "summary: "
        f"dirs_created={stats['dirs_created']} "
        f"files_copied={stats['files_copied']} "
        f"extra_paths_removed={stats['extra_paths_removed']} "
        f"files_unchanged={stats['files_unchanged']}"
    )
    log("=== SYNC WEB DATA OK ===")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # CLI boundary should report any fatal error.
        log(f"=== SYNC WEB DATA FAILED === {exc}")
        raise SystemExit(1)
