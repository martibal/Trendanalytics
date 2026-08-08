#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Iterable

import pyarrow as pa
import pyarrow.compute as pc
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

STAT_FIELDS = (
    "SIZE",
    "GAS_USED",
    "GAS_LIMIT",
    "BLOB_GAS_USED",
    "EXCESS_BLOB_GAS",
    "GAS_USED_FOR_L1",
    "L1_GAS_USED",
    "L1_FEE",
    "L2_FEE",
    "INPUT",
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


def _scalar_value(value: Any) -> Any:
    if value is None:
        return None
    if hasattr(value, "as_py"):
        return value.as_py()
    return value


def _numeric_summary(column: pa.ChunkedArray) -> dict[str, Any]:
    numeric = pc.cast(column, pa.float64(), safe=False)
    valid = pc.drop_null(numeric)
    total = len(column)
    non_null = len(valid)

    out: dict[str, Any] = {
        "rows": total,
        "non_null": non_null,
        "null_rate": (total - non_null) / total if total else None,
    }
    if non_null == 0:
        return out

    min_max = pc.min_max(valid).as_py()
    out.update(
        {
            "min": min_max.get("min"),
            "max": min_max.get("max"),
            "mean": _scalar_value(pc.mean(valid)),
            "sum": _scalar_value(pc.sum(valid)),
        }
    )

    try:
        q = pc.quantile(valid, q=[0.5, 0.9, 0.95, 0.99], interpolation="linear").as_py()
        out.update({"p50": q[0], "p90": q[1], "p95": q[2], "p99": q[3]})
    except Exception as exc:
        out["quantile_error"] = str(exc)

    return out


def _input_summary(column: pa.ChunkedArray) -> dict[str, Any]:
    text = pc.cast(column, pa.string(), safe=False)
    valid = pc.drop_null(text)
    total = len(column)
    non_null = len(valid)

    out: dict[str, Any] = {
        "rows": total,
        "non_null": non_null,
        "null_rate": (total - non_null) / total if total else None,
    }
    if non_null == 0:
        return out

    lengths = pc.utf8_length(valid)
    # EVM calldata is hex-prefixed. Convert encoded character count to payload bytes.
    byte_lengths = pc.divide(pc.max_element_wise(pc.subtract(lengths, 2), 0), 2)
    byte_lengths = pc.cast(byte_lengths, pa.float64(), safe=False)

    out.update(
        {
            "semantic_note": "Derived transaction calldata payload bytes from hex INPUT; this is application calldata, not compressed L2-to-L1 batch bytes.",
            "mean_payload_bytes": _scalar_value(pc.mean(byte_lengths)),
            "sum_payload_bytes": _scalar_value(pc.sum(byte_lengths)),
        }
    )
    try:
        q = pc.quantile(byte_lengths, q=[0.5, 0.9, 0.95, 0.99], interpolation="linear").as_py()
        out.update({"p50_payload_bytes": q[0], "p90_payload_bytes": q[1], "p95_payload_bytes": q[2], "p99_payload_bytes": q[3]})
    except Exception as exc:
        out["quantile_error"] = str(exc)

    return out


def candidate_statistics(parquet: pq.ParquetFile) -> dict[str, Any]:
    names = set(parquet.schema_arrow.names)
    selected = [name for name in STAT_FIELDS if name in names]
    if not selected:
        return {}

    table = parquet.read(columns=selected)
    out: dict[str, Any] = {}
    for name in selected:
        try:
            out[name] = _input_summary(table[name]) if name == "INPUT" else _numeric_summary(table[name])
        except Exception as exc:
            out[name] = {"error": str(exc)}
    return out


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
        "candidate_statistics": candidate_statistics(parquet),
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
