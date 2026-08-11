#!/usr/bin/env python3
from __future__ import annotations

import datetime as dt
import tempfile
from pathlib import Path

from pipeline.tools.rebuild_meta_only import _resolve_mode


def _touch_day(root: Path, chain: str, day: str) -> None:
    path = root / "data" / "published" / "v1" / "meta" / chain / f"{day}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("{}\n", encoding="utf-8")


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        _touch_day(root, "ethereum", "2024-12-01")
        _touch_day(root, "arbitrum", "2024-12-03")

        bounded = _resolve_mode(
            repo_root=root,
            requested_mode="rebuild",
            explicit_start=True,
            start=dt.date(2026, 5, 13),
        )
        assert bounded == "incremental", bounded

        full_history = _resolve_mode(
            repo_root=root,
            requested_mode="rebuild",
            explicit_start=True,
            start=dt.date(2024, 12, 1),
        )
        assert full_history == "rebuild", full_history

        inferred_start = _resolve_mode(
            repo_root=root,
            requested_mode="rebuild",
            explicit_start=False,
            start=dt.date(2026, 5, 13),
        )
        assert inferred_start == "rebuild", inferred_start

        explicitly_incremental = _resolve_mode(
            repo_root=root,
            requested_mode="incremental",
            explicit_start=True,
            start=dt.date(2026, 5, 13),
        )
        assert explicitly_incremental == "incremental", explicitly_incremental

    print("bounded META rebuild mode regression OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
