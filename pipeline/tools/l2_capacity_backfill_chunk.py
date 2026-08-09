#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Iterable, Optional

import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.fs as pafs
import pyarrow.parquet as pq

BUCKET = "aws-public-blockchain"
ROOT = "v1.1/sonarx"
SOURCE = {
    "arbitrum": ("transactions", "GAS_USED_FOR_L1", "arbitrum_l1_gas_used_daily"),
    "base": ("transactions", "L1_GAS_USED", "base_l1_gas_used_daily"),
}


def _parse_day(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def _days(start: date, end: date) -> Iterable[date]:
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def _fs() -> pafs.S3FileSystem:
    return pafs.S3FileSystem(anonymous=True, region="us-east-2")


def _prefixes(chain: str, table: str, day: str) -> Iterable[str]:
    base = f"{BUCKET}/{ROOT}/{chain}/{table}"
    yield f"{base}/date={day}"
    yield f"{base}/{day}"


def _files_for_day(fs: pafs.S3FileSystem, chain: str, table: str, day: str) -> list[pa.fs.FileInfo]:
    for prefix in _prefixes(chain, table, day):
        infos = fs.get_file_info(pafs.FileSelector(prefix, recursive=True, allow_not_found=True))
        files = [
            info
            for info in infos
            if info.type == pafs.FileType.File and info.path.lower().endswith(".parquet") and info.size > 0
        ]
        if files:
            return sorted(files, key=lambda x: x.path)
    return []


def _sum_projected_column(fs: pafs.S3FileSystem, files: list[pa.fs.FileInfo], wanted: str) -> tuple[float, int, int]:
    total = 0.0
    non_null_rows = 0
    positive_rows = 0
    for info in files:
        with fs.open_input_file(info.path) as source:
            parquet = pq.ParquetFile(source)
            lookup = {name.lower(): name for name in parquet.schema_arrow.names}
            actual = lookup.get(wanted.lower())
            if actual is None:
                raise RuntimeError(f"{info.path}: missing {wanted}")
            for rg in range(parquet.metadata.num_row_groups):
                arr = parquet.read_row_group(rg, columns=[actual])[actual]
                numeric = pc.cast(arr, pa.float64(), safe=False)
                valid = pc.drop_null(numeric)
                if len(valid) == 0:
                    continue
                value = pc.sum(valid).as_py()
                if value is not None:
                    total += float(value)
                non_null_rows += len(valid)
                positive_rows += int(pc.sum(pc.cast(pc.greater(valid, 0), pa.int64())).as_py() or 0)
    return total, non_null_rows, positive_rows


def _read_day(fs: pafs.S3FileSystem, chain: str, day: str) -> dict:
    table, source_column, output_column = SOURCE[chain]
    started = time.perf_counter()
    files = _files_for_day(fs, chain, table, day)
    if not files:
        raise RuntimeError(f"{chain} {day}: no {table} parquet objects")
    total, non_null_rows, positive_rows = _sum_projected_column(fs, files, source_column)
    if not math.isfinite(total) or total < 0:
        raise RuntimeError(f"{chain} {day}: invalid aggregate {total}")
    if non_null_rows <= 0:
        raise RuntimeError(f"{chain} {day}: no non-null {source_column} rows")

    # Entire-day zero on an active chain is an unavailable source-evidence day.
    # It must never become an observed zero-capacity day.
    raw_value: Optional[float] = total if total > 0 and positive_rows > 0 else None
    status = "ok" if raw_value is not None else "all_zero_source_unavailable"
    return {
        "chain": chain,
        "date": day,
        "source_table": table,
        "source_column": source_column,
        "raw_metric": output_column,
        "raw_value": raw_value,
        "source_status": status,
        "object_count": len(files),
        "listed_bytes": sum(int(info.size) for info in files),
        "non_null_rows": non_null_rows,
        "positive_rows": positive_rows,
        "elapsed_seconds": round(time.perf_counter() - started, 3),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Read one bounded historical L2 capacity chunk from public S3.")
    parser.add_argument("--chain", choices=sorted(SOURCE), required=True)
    parser.add_argument("--start", required=True)
    parser.add_argument("--end", required=True)
    parser.add_argument("--max-days", type=int, default=31)
    parser.add_argument("--max-day-seconds", type=float, default=60.0)
    parser.add_argument("--output", required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    start = _parse_day(args.start)
    end = _parse_day(args.end)
    if end < start:
        raise SystemExit("end must be >= start")
    day_values = list(_days(start, end))
    if len(day_values) > args.max_days:
        raise SystemExit(f"chunk has {len(day_values)} days, limit is {args.max_days}")

    fs = _fs()
    rows = []
    started = time.perf_counter()
    for value in day_values:
        day = value.isoformat()
        print(f"[BACKFILL_CHUNK] chain={args.chain} date={day}", flush=True)
        row = _read_day(fs, args.chain, day)
        if row["elapsed_seconds"] > args.max_day_seconds:
            raise SystemExit(
                f"{args.chain} {day}: {row['elapsed_seconds']}s exceeded per-day limit {args.max_day_seconds}s"
            )
        print(
            f"[BACKFILL_CHUNK] OK date={day} status={row['source_status']} raw={row['raw_value']} "
            f"elapsed={row['elapsed_seconds']}s",
            flush=True,
        )
        rows.append(row)

    payload = {
        "chain": args.chain,
        "start": args.start,
        "end": args.end,
        "day_count": len(rows),
        "available_days": sum(1 for row in rows if row["raw_value"] is not None),
        "unavailable_all_zero_days": sum(1 for row in rows if row["source_status"] == "all_zero_source_unavailable"),
        "elapsed_seconds": round(time.perf_counter() - started, 3),
        "rows": rows,
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, sort_keys=True, allow_nan=False), encoding="utf-8")
    print(json.dumps({k: v for k, v in payload.items() if k != "rows"}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
