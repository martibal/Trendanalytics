#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GOLD = ROOT / "data" / "calculated" / "gold_json" / "ethereum"
FIELDS = (
    "value_transferred_native",
    "median_tx_value_native",
    "median_tx_fee_native",
)
DAY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}\.json$")
SCALE = 1_000_000_000_000_000_000.0
WINDOWS = (7, 30, 90, 180, 365)


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, obj) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(
        json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True, allow_nan=False),
        encoding="utf-8",
    )
    tmp.replace(path)


def scale_row(obj: dict, path: Path) -> dict:
    if str(obj.get("chain") or "").lower() != "ethereum":
        raise RuntimeError(f"Unexpected chain in {path}: {obj.get('chain')!r}")

    for field in FIELDS:
        value = obj.get(field)
        if value is None:
            continue
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise RuntimeError(f"Non-numeric {field} in {path}: {value!r}")
        obj[field] = float(value) / SCALE
    return obj


def main() -> int:
    day_files = sorted(p for p in GOLD.glob("*.json") if DAY_RE.match(p.name))
    if not day_files:
        raise RuntimeError(f"No Ethereum GOLD day files found under {GOLD}")

    sentinel = GOLD / "2025-01-15.json"
    if not sentinel.exists():
        sentinel = day_files[0]
    before = read_json(sentinel)
    sentinel_value = before.get("value_transferred_native")
    if not isinstance(sentinel_value, (int, float)) or sentinel_value < 1e15:
        raise RuntimeError(
            "Precondition failed: Ethereum GOLD history no longer appears to be on wei scale; refusing to rescale."
        )

    rows = []
    for path in day_files:
        obj = read_json(path)
        obj = scale_row(obj, path)
        write_json(path, obj)
        rows.append(obj)

    rows.sort(key=lambda item: str(item.get("date") or ""))
    write_json(GOLD / "latest.json", rows[-1])
    for window in WINDOWS:
        write_json(GOLD / f"last{window}d.json", rows[-window:] if len(rows) >= window else rows)

    after = read_json(sentinel)
    after_value = after.get("value_transferred_native")
    expected = float(sentinel_value) / SCALE
    if not isinstance(after_value, (int, float)) or abs(float(after_value) - expected) > max(1e-12, abs(expected) * 1e-12):
        raise RuntimeError("Postcondition failed: sentinel ETH value was not scaled exactly by 1e18")

    print(f"Migrated {len(rows)} Ethereum GOLD day files from wei to ETH native units.")
    print(f"Sentinel {sentinel.name}: {sentinel_value} -> {after_value}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
