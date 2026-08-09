#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import statistics
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.fs as pafs
import pyarrow.parquet as pq

BUCKET = "aws-public-blockchain"
ROOT = "v1.1/sonarx"

# Candidate comparison is deliberate: Base BLOB_GAS_USED may reflect a
# protocol-era block-header field rather than stable OP Stack L1 DA accounting.
# L1_GAS_USED is therefore tested alongside it before any historical backfill.
CHAIN_CANDIDATES = {
    "arbitrum": (
        ("transactions", "GAS_USED_FOR_L1"),
    ),
    "base": (
        ("transactions", "L1_GAS_USED"),
        ("blocks", "BLOB_GAS_USED"),
    ),
}


@dataclass
class DayResult:
    chain: str
    date: str
    table: str
    column: str
    object_count: int
    listed_bytes: int
    non_null_rows: int
    positive_rows: int
    zero_rows: int
    value_sum: float
    elapsed_seconds: float


def _fs() -> pafs.S3FileSystem:
    return pafs.S3FileSystem(anonymous=True, region="us-east-2")


def _candidate_day_prefixes(chain: str, table: str, day: str) -> Iterable[str]:
    base = f"{BUCKET}/{ROOT}/{chain}/{table}"
    yield f"{base}/date={day}"
    yield f"{base}/{day}"


def _files_for_day(fs: pafs.S3FileSystem, chain: str, table: str, day: str) -> list[pa.fs.FileInfo]:
    for prefix in _candidate_day_prefixes(chain, table, day):
        infos = fs.get_file_info(pafs.FileSelector(prefix, recursive=True, allow_not_found=True))
        files = [
            info
            for info in infos
            if info.type == pafs.FileType.File and info.path.lower().endswith(".parquet") and info.size > 0
        ]
        if files:
            return sorted(files, key=lambda x: x.path)
    return []


def _summarize_column_from_remote_parquet(
    fs: pafs.S3FileSystem, path: str, column: str
) -> tuple[float, int, int, int]:
    with fs.open_input_file(path) as source:
        parquet = pq.ParquetFile(source)
        names = parquet.schema_arrow.names
        lookup = {name.lower(): name for name in names}
        actual = lookup.get(column.lower())
        if actual is None:
            raise RuntimeError(f"{path}: missing required column {column}; available={names}")

        total = 0.0
        non_null = 0
        positive = 0
        zero = 0
        for rg in range(parquet.metadata.num_row_groups):
            arr = parquet.read_row_group(rg, columns=[actual])[actual]
            numeric = pc.cast(arr, pa.float64(), safe=False)
            valid = pc.drop_null(numeric)
            if len(valid) == 0:
                continue
            value = pc.sum(valid).as_py()
            if value is not None:
                total += float(value)
            non_null += len(valid)
            positive += int(pc.sum(pc.cast(pc.greater(valid, 0), pa.int64())).as_py() or 0)
            zero += int(pc.sum(pc.cast(pc.equal(valid, 0), pa.int64())).as_py() or 0)
        return total, non_null, positive, zero


def inspect_day_candidate(
    fs: pafs.S3FileSystem, chain: str, day: str, table: str, column: str
) -> DayResult:
    started = time.perf_counter()
    files = _files_for_day(fs, chain, table, day)
    if not files:
        raise RuntimeError(f"{chain} {day}: no parquet files found for {table}")

    total = 0.0
    rows = 0
    positive_rows = 0
    zero_rows = 0
    for info in files:
        value, count, positive, zero = _summarize_column_from_remote_parquet(fs, info.path, column)
        total += value
        rows += count
        positive_rows += positive
        zero_rows += zero

    elapsed = time.perf_counter() - started
    if not math.isfinite(total) or total < 0:
        raise RuntimeError(f"{chain} {day}: invalid aggregate {total}")
    if rows <= 0:
        raise RuntimeError(f"{chain} {day}: no non-null rows for {column}")

    return DayResult(
        chain=chain,
        date=day,
        table=table,
        column=column,
        object_count=len(files),
        listed_bytes=sum(int(info.size) for info in files),
        non_null_rows=rows,
        positive_rows=positive_rows,
        zero_rows=zero_rows,
        value_sum=total,
        elapsed_seconds=round(elapsed, 3),
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fast read-only historical candidate comparison for L2 capacity using Parquet column projection over anonymous S3."
    )
    parser.add_argument("--dates", required=True, help="Comma-separated representative YYYY-MM-DD dates")
    parser.add_argument("--chains", default="arbitrum,base")
    parser.add_argument("--history-days", type=int, default=615, help="Approximate days used only for runtime projection")
    parser.add_argument("--max-sample-seconds", type=float, default=180.0)
    parser.add_argument("--max-projected-serial-minutes", type=float, default=120.0)
    parser.add_argument("--output", default="reports/l2-capacity-s3-preflight.json")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    dates = [x.strip() for x in args.dates.split(",") if x.strip()]
    chains = [x.strip().lower() for x in args.chains.split(",") if x.strip()]
    unsupported = [c for c in chains if c not in CHAIN_CANDIDATES]
    if unsupported:
        raise SystemExit(f"Unsupported chain(s): {', '.join(unsupported)}")
    if len(dates) < 2:
        raise SystemExit("Preflight requires at least two representative dates")

    fs = _fs()
    results: list[DayResult] = []
    failures: list[str] = []

    for chain in chains:
        for table, column in CHAIN_CANDIDATES[chain]:
            for day in dates:
                print(f"[PREFLIGHT] reading chain={chain} table={table} column={column} date={day}", flush=True)
                try:
                    result = inspect_day_candidate(fs, chain, day, table, column)
                    results.append(result)
                    print(
                        f"[PREFLIGHT] OK chain={chain} table={table} column={column} date={day} "
                        f"objects={result.object_count} rows={result.non_null_rows} positive={result.positive_rows} "
                        f"zero={result.zero_rows} sum={result.value_sum:.6f} elapsed={result.elapsed_seconds:.3f}s",
                        flush=True,
                    )
                except Exception as exc:
                    failures.append(f"{chain} {table}.{column} {day}: {exc}")
                    print(
                        f"[PREFLIGHT] FAIL chain={chain} table={table} column={column} date={day}: {exc}",
                        flush=True,
                    )

    elapsed_values = [r.elapsed_seconds for r in results]
    median_seconds = statistics.median(elapsed_values) if elapsed_values else None
    worst_seconds = max(elapsed_values) if elapsed_values else None

    # Projection uses one selected candidate per chain after comparison, not all
    # diagnostic candidates. This remains a conservative scheduling estimate.
    projected_serial_minutes = (
        median_seconds * args.history_days * len(chains) / 60.0 if median_seconds is not None else None
    )

    accepted = (
        not failures
        and bool(results)
        and worst_seconds is not None
        and worst_seconds <= args.max_sample_seconds
    )

    candidate_summary: dict[str, dict[str, dict]] = {}
    for result in results:
        key = f"{result.table}.{result.column}"
        entry = candidate_summary.setdefault(result.chain, {}).setdefault(
            key,
            {"sample_days": 0, "zero_sum_days": 0, "positive_sum_days": 0, "total_positive_rows": 0},
        )
        entry["sample_days"] += 1
        if result.value_sum == 0:
            entry["zero_sum_days"] += 1
        else:
            entry["positive_sum_days"] += 1
        entry["total_positive_rows"] += result.positive_rows

    strategy = {
        "accepted_for_chunked_backfill": accepted,
        "reason": (
            "all representative candidate reads succeeded within per-day limit"
            if accepted
            else "one or more representative reads failed or exceeded the per-day runtime limit"
        ),
        "median_candidate_day_seconds": median_seconds,
        "worst_candidate_day_seconds": worst_seconds,
        "projected_serial_minutes_after_candidate_selection": projected_serial_minutes,
        "serial_projection_exceeds_limit": (
            projected_serial_minutes is not None
            and projected_serial_minutes > args.max_projected_serial_minutes
        ),
        "recommended_chunk_days": 30 if accepted else None,
        "recommended_max_parallel": 8 if accepted else None,
        "note": "Candidate continuity must be reviewed before selecting the production metric. Full backfill must use bounded parallel chunks, never one monolithic rebuild job.",
    }

    payload = {
        "purpose": "Compare real-source L2 capacity candidates and estimate cost before historical backfill.",
        "read_mode": "anonymous S3 + Parquet column projection only",
        "dates": dates,
        "chains": chains,
        "results": [asdict(r) for r in results],
        "candidate_summary": candidate_summary,
        "failures": failures,
        "strategy": strategy,
    }

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    print(json.dumps(payload, indent=2, sort_keys=True))

    if not accepted:
        raise SystemExit("L2 capacity candidate preflight failed; historical backfill is blocked")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
