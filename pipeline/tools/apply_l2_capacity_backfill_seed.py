#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

RAW_COLUMNS = {
    "arbitrum": "arbitrum_l1_gas_used_daily",
    "base": "base_l1_gas_used_daily",
}
LEGACY_BASE = "base_blob_gas_used_daily"
CAPACITY = "capacity_util_pct"


def _finite_or_none(value):
    if value is None or isinstance(value, bool):
        return None
    value = float(value)
    return value if math.isfinite(value) else None


def _write(path: Path, obj: dict) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True, allow_nan=False), encoding="utf-8")
    tmp.replace(path)


def _set_metric(obj: dict, key: str, value) -> None:
    obj[key] = value
    metrics = obj.get("metrics")
    if isinstance(metrics, dict):
        metrics[key] = value
    gold = obj.get("gold")
    if isinstance(gold, dict):
        nested_metrics = gold.get("metrics")
        if isinstance(nested_metrics, dict):
            nested_metrics[key] = value
        elif key in gold:
            gold[key] = value


def _remove_metric(obj: dict, key: str) -> None:
    obj.pop(key, None)
    metrics = obj.get("metrics")
    if isinstance(metrics, dict):
        metrics.pop(key, None)
    gold = obj.get("gold")
    if isinstance(gold, dict):
        gold.pop(key, None)
        nested_metrics = gold.get("metrics")
        if isinstance(nested_metrics, dict):
            nested_metrics.pop(key, None)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", required=True)
    ap.add_argument("--published-root", required=True)
    args = ap.parse_args()

    seed = json.loads(Path(args.seed).read_text(encoding="utf-8"))
    root = Path(args.published_root)
    history = seed.get("history") or {}
    expected_start = str(seed.get("start"))
    expected_end = str(seed.get("end"))

    summary = {}
    for chain in ("arbitrum", "base"):
        rows = history.get(chain)
        if not isinstance(rows, list) or not rows:
            raise SystemExit(f"seed missing history for {chain}")
        if rows[0].get("date") != expected_start or rows[-1].get("date") != expected_end:
            raise SystemExit(f"seed boundary mismatch for {chain}")

        raw_col = RAW_COLUMNS[chain]
        written = 0
        raw_non_null = 0
        cap_non_null = 0
        for row in rows:
            day = str(row.get("date"))
            path = root / "gold" / chain / f"{day}.json"
            if not path.exists():
                raise SystemExit(f"published Gold day missing: {path}")
            obj = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(obj, dict):
                raise SystemExit(f"published Gold day is not object: {path}")

            raw = _finite_or_none(row.get("raw_value"))
            cap = _finite_or_none(row.get(CAPACITY))
            if raw is not None and raw <= 0:
                raise SystemExit(f"non-positive raw value in seed: {chain} {day}")
            if cap is not None and not (0.0 <= cap <= 1.0):
                raise SystemExit(f"capacity out of range: {chain} {day} {cap}")

            if chain == "base":
                _remove_metric(obj, LEGACY_BASE)
            _set_metric(obj, raw_col, raw)
            _set_metric(obj, CAPACITY, cap)
            _write(path, obj)
            written += 1
            raw_non_null += raw is not None
            cap_non_null += cap is not None

        latest = rows[-1]
        summary[chain] = {
            "rows": written,
            "raw_non_null": raw_non_null,
            "capacity_non_null": cap_non_null,
            "latest_raw": latest.get("raw_value"),
            "latest_capacity_util_pct": latest.get(CAPACITY),
        }

    print(json.dumps(summary, indent=2, sort_keys=True))
    if summary["arbitrum"]["rows"] != 610 or summary["base"]["rows"] != 610:
        raise SystemExit("unexpected backfill row count")
    if summary["arbitrum"]["raw_non_null"] != 562:
        raise SystemExit("unexpected Arbitrum source coverage")
    if summary["base"]["raw_non_null"] != 610:
        raise SystemExit("unexpected Base source coverage")
    if summary["arbitrum"]["capacity_non_null"] != 548:
        raise SystemExit("unexpected Arbitrum capacity coverage")
    if summary["base"]["capacity_non_null"] != 603:
        raise SystemExit("unexpected Base capacity coverage")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
