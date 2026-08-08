#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Iterable

import pyarrow.parquet as pq

CANDIDATE_TOKENS = (
    "data",
    "byte",
    "size",
    "batch",
    "calldata",
    "input",
    "blob",
    "gas",
    "l1",
    "sequencer",
    "compressed",
)


def flatten_schema_fields(schema) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []

    def walk(field, prefix: str = "") -> None:
        name = f"{prefix}.{field.name}" if prefix else field.name
        out.append({"path": name, "type": str(field.type)})
        dtype = field.type
        if hasattr(dtype, "num_fields"):
            for i in range(dtype.num_fields):
                walk(dtype.field(i), name)
        elif hasattr(dtype, "value_field"):
            walk(dtype.value_field, f"{name}[]")

    for field in schema:
        walk(field)
    return out


def candidate_fields(fields: Iterable[dict[str, str]]) -> list[dict[str, str]]:
    matches = []
    for field in fields:
        path = field["path"].lower()
        if any(token in path for token in CANDIDATE_TOKENS):
            matches.append(field)
    return matches


def json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, bytes):
        return f"<bytes:{len(value)}>"
    if isinstance(value, dict):
        return {str(k): json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_safe(v) for v in value[:10]]
    return str(value)


def inspect_file(path: Path) -> dict[str, Any]:
    parquet = pq.ParquetFile(path)
    arrow_schema = parquet.schema_arrow
    fields = flatten_schema_fields(arrow_schema)

    rows: list[dict[str, Any]] = []
    if parquet.metadata and parquet.metadata.num_rows > 0:
        table = parquet.read_row_group(0).slice(0, 3)
        rows = [json_safe(row) for row in table.to_pylist()]

    return {
        "file": str(path),
        "file_size_bytes": path.stat().st_size,
        "num_rows": parquet.metadata.num_rows if parquet.metadata else None,
        "num_row_groups": parquet.metadata.num_row_groups if parquet.metadata else None,
        "schema": fields,
        "candidate_capacity_fields": candidate_fields(fields),
        "sample_rows": rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Inspect sampled Arbitrum/Base parquet schemas without mutating pipeline data."
    )
    parser.add_argument("files", nargs="+", help="Local parquet files to inspect")
    parser.add_argument("--output", default="reports/l2-source-schema-probe.json")
    args = parser.parse_args()

    results = []
    for raw in args.files:
        path = Path(raw)
        if not path.exists():
            raise FileNotFoundError(path)
        results.append(inspect_file(path))

    payload = {
        "purpose": "Identify source fields suitable for an L2 capacity metric, especially l2_data_bytes.",
        "candidate_tokens": list(CANDIDATE_TOKENS),
        "files": results,
    }

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")

    print(json.dumps(payload, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
