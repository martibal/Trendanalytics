#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
from datetime import date, datetime, timedelta
from pathlib import Path

import polars as pl

BASELINE_WINDOW_DAYS = 30
MIN_BASELINE_DAYS = 7
CHAINS = ("arbitrum", "base")


def _parse_day(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def _expected_days(start: date, end: date) -> list[str]:
    out = []
    current = start
    while current <= end:
        out.append(current.isoformat())
        current += timedelta(days=1)
    return out


def _longest_null_run(values: list[float | None]) -> int:
    best = current = 0
    for value in values:
        if value is None:
            current += 1
            best = max(best, current)
        else:
            current = 0
    return best


def _capacity(frame: pl.DataFrame) -> pl.DataFrame:
    raw = frame.get_column("raw_value").cast(pl.Float64, strict=False)
    baseline_input = pl.when(raw > 0).then(raw).otherwise(None)
    baseline = baseline_input.shift(1).rolling_quantile(
        quantile=0.95,
        window_size=BASELINE_WINDOW_DAYS,
        min_samples=MIN_BASELINE_DAYS,
        interpolation="nearest",
    )
    capacity = (
        pl.when((raw > 0) & baseline.is_not_null() & (baseline > 0))
        .then((raw / baseline).clip(0.0, 1.0))
        .otherwise(None)
        .alias("capacity_util_pct")
    )
    return frame.with_columns(capacity)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Combine and validate isolated L2 capacity backfill chunks.")
    parser.add_argument("--chunks-root", required=True)
    parser.add_argument("--start", required=True)
    parser.add_argument("--end", required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.chunks_root)
    start = _parse_day(args.start)
    end = _parse_day(args.end)
    expected = _expected_days(start, end)
    expected_set = set(expected)

    all_rows: dict[str, dict[str, dict]] = {chain: {} for chain in CHAINS}
    source_files = sorted(root.rglob("*.json"))
    if not source_files:
        raise SystemExit(f"No chunk JSON files under {root}")

    for path in source_files:
        obj = json.loads(path.read_text(encoding="utf-8"))
        chain = obj.get("chain")
        if chain not in all_rows:
            continue
        for row in obj.get("rows", []):
            day = str(row.get("date"))
            if day not in expected_set:
                raise SystemExit(f"{path}: date outside requested range: {day}")
            if day in all_rows[chain]:
                raise SystemExit(f"duplicate row for {chain} {day}")
            all_rows[chain][day] = row

    summary: dict[str, dict] = {}
    histories: dict[str, list[dict]] = {}

    for chain in CHAINS:
        found = set(all_rows[chain])
        missing_dates = sorted(expected_set - found)
        extra_dates = sorted(found - expected_set)
        if missing_dates or extra_dates:
            raise SystemExit(
                f"{chain}: coverage mismatch missing={missing_dates[:10]} extra={extra_dates[:10]}"
            )

        ordered = [all_rows[chain][day] for day in expected]
        raw_values = [row.get("raw_value") for row in ordered]
        frame = pl.DataFrame({"date": expected, "raw_value": raw_values})
        frame = _capacity(frame)

        capacity_values = frame.get_column("capacity_util_pct").to_list()
        for value in capacity_values:
            if value is not None and (not math.isfinite(float(value)) or not 0.0 <= float(value) <= 1.0):
                raise SystemExit(f"{chain}: invalid capacity value {value}")

        history = []
        for row, capacity_value in zip(ordered, capacity_values):
            history.append(
                {
                    "date": row["date"],
                    "raw_metric": row["raw_metric"],
                    "raw_value": row.get("raw_value"),
                    "source_status": row["source_status"],
                    "capacity_util_pct": capacity_value,
                }
            )
        histories[chain] = history

        available = sum(value is not None for value in raw_values)
        unavailable = len(raw_values) - available
        capacity_non_null = sum(value is not None for value in capacity_values)
        if available < 30:
            raise SystemExit(f"{chain}: insufficient available raw history: {available}")
        if capacity_non_null < 30:
            raise SystemExit(f"{chain}: insufficient capacity history: {capacity_non_null}")
        if capacity_values[-1] is None:
            raise SystemExit(f"{chain}: latest capacity is null after full backfill")

        summary[chain] = {
            "expected_days": len(expected),
            "rows": len(ordered),
            "available_raw_days": available,
            "unavailable_raw_days": unavailable,
            "longest_unavailable_run_days": _longest_null_run(raw_values),
            "capacity_non_null_days": capacity_non_null,
            "latest_date": expected[-1],
            "latest_raw_value": raw_values[-1],
            "latest_capacity_util_pct": capacity_values[-1],
            "min_capacity_util_pct": min(value for value in capacity_values if value is not None),
            "max_capacity_util_pct": max(value for value in capacity_values if value is not None),
        }

    payload = {
        "start": args.start,
        "end": args.end,
        "baseline": {
            "formula": "min(raw/prior_30_calendar_day_p95,1)",
            "window_days": BASELINE_WINDOW_DAYS,
            "min_positive_samples": MIN_BASELINE_DAYS,
            "all_zero_source_days": "treated_as_null",
        },
        "source_file_count": len(source_files),
        "summary": summary,
        "history": histories,
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, sort_keys=True, allow_nan=False), encoding="utf-8")
    print(json.dumps({"start": args.start, "end": args.end, "summary": summary}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
