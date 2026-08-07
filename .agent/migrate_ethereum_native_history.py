#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
GOLD = ROOT / "data" / "calculated" / "gold_json" / "ethereum"
META = ROOT / "data" / "calculated" / "meta" / "ethereum"
FIELDS = (
    "value_transferred_native",
    "median_tx_value_native",
    "median_tx_fee_native",
)
DAY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}\.json$")
SCALE = 1_000_000_000_000_000_000.0
WINDOWS = (7, 30, 90, 180, 365)


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, obj: Any) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(
        json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True, allow_nan=False),
        encoding="utf-8",
    )
    tmp.replace(path)


def scale_num(value: Any, *, field: str, path: Path) -> Any:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise RuntimeError(f"Non-numeric {field} in {path}: {value!r}")
    return float(value) / SCALE


def scale_gold_row(obj: dict[str, Any], path: Path) -> dict[str, Any]:
    if str(obj.get("chain") or "").lower() != "ethereum":
        raise RuntimeError(f"Unexpected chain in {path}: {obj.get('chain')!r}")
    for field in FIELDS:
        if field in obj:
            obj[field] = scale_num(obj.get(field), field=field, path=path)
    return obj


def canonical_hash12(payload: dict[str, Any]) -> str:
    canon = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(canon.encode("utf-8")).hexdigest()[:12]


def scale_meta_row(obj: dict[str, Any], path: Path) -> dict[str, Any]:
    if str(obj.get("chain") or "").lower() != "ethereum":
        raise RuntimeError(f"Unexpected META chain in {path}: {obj.get('chain')!r}")

    scorecard = obj.get("scorecard")
    if isinstance(scorecard, dict):
        dims = scorecard.get("dimensions")
        if isinstance(dims, dict):
            for dim in dims.values():
                if not isinstance(dim, dict):
                    continue
                components = dim.get("components")
                if not isinstance(components, dict):
                    continue
                for field in FIELDS:
                    comp = components.get(field)
                    if isinstance(comp, dict) and "current" in comp:
                        comp["current"] = scale_num(comp.get("current"), field=field, path=path)

    regime = obj.get("regime")
    if isinstance(regime, dict):
        drivers = regime.get("drivers")
        if isinstance(drivers, list):
            for driver in drivers:
                if not isinstance(driver, dict):
                    continue
                metric = str(driver.get("metric") or "")
                if metric in FIELDS and "current" in driver:
                    driver["current"] = scale_num(driver.get("current"), field=metric, path=path)

        signals = regime.get("signals")
        if isinstance(signals, dict):
            for field in FIELDS:
                sig = signals.get(field)
                if isinstance(sig, dict) and "current" in sig:
                    sig["current"] = scale_num(sig.get("current"), field=field, path=path)

        if regime.get("determinism_hash"):
            sanity = regime.get("sanity")
            adjusted = isinstance(sanity, dict) and sanity.get("adjusted") is True
            if not adjusted:
                regime["determinism_hash"] = canonical_hash12(
                    {
                        "chain": regime.get("chain"),
                        "ruleset_id": regime.get("ruleset_id"),
                        "label": regime.get("label"),
                        "asof_date": regime.get("asof_date"),
                        "drivers": regime.get("drivers"),
                    }
                )

    return obj


def migrate_days(folder: Path, transform) -> list[dict[str, Any]]:
    day_files = sorted(p for p in folder.glob("*.json") if DAY_RE.match(p.name))
    rows: list[dict[str, Any]] = []
    for path in day_files:
        obj = read_json(path)
        if not isinstance(obj, dict):
            raise RuntimeError(f"Expected object in {path}")
        obj = transform(obj, path)
        write_json(path, obj)
        rows.append(obj)
    return rows


def refresh_windows(folder: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    rows.sort(key=lambda item: str(item.get("date") or ""))
    write_json(folder / "latest.json", rows[-1])
    for window in WINDOWS:
        write_json(folder / f"last{window}d.json", rows[-window:] if len(rows) >= window else rows)


def main() -> int:
    gold_day_files = sorted(p for p in GOLD.glob("*.json") if DAY_RE.match(p.name))
    if not gold_day_files:
        raise RuntimeError(f"No Ethereum GOLD day files found under {GOLD}")

    sentinel = GOLD / "2025-01-15.json"
    if not sentinel.exists():
        sentinel = gold_day_files[0]
    before = read_json(sentinel)
    sentinel_value = before.get("value_transferred_native")
    if not isinstance(sentinel_value, (int, float)) or sentinel_value < 1e15:
        raise RuntimeError(
            "Precondition failed: Ethereum GOLD history no longer appears to be on wei scale; refusing to rescale."
        )

    gold_rows = migrate_days(GOLD, scale_gold_row)
    refresh_windows(GOLD, gold_rows)

    meta_rows = migrate_days(META, scale_meta_row) if META.exists() else []
    refresh_windows(META, meta_rows)

    after = read_json(sentinel)
    after_value = after.get("value_transferred_native")
    expected = float(sentinel_value) / SCALE
    if not isinstance(after_value, (int, float)) or abs(float(after_value) - expected) > max(1e-12, abs(expected) * 1e-12):
        raise RuntimeError("Postcondition failed: sentinel ETH value was not scaled exactly by 1e18")

    print(f"Migrated {len(gold_rows)} Ethereum GOLD day files from wei to ETH native units.")
    print(f"Migrated {len(meta_rows)} Ethereum META day files while preserving dimensionless evidence.")
    print(f"Sentinel {sentinel.name}: {sentinel_value} -> {after_value}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
