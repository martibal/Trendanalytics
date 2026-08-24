#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

VALUE_FIELDS = ("value", "value_native", "value_transferred", "amount", "native_value", "tx_value")
FROM_FIELDS = ("from_address", "from", "sender")
TO_FIELDS = ("to_address", "to", "recipient")
DIRECT_FEE_FIELDS = ("fee", "tx_fee", "transaction_fee", "gas_fee", "transaction_fee_native")
FEE_PAIRS = (
    ("receipt_effective_gas_price", "receipt_gas_used"),
    ("effective_gas_price", "gas_used"),
    ("gas_price", "gas_used"),
)
TIMESTAMP_FIELDS = ("timestamp", "block_timestamp")


def _top_level_columns(row: dict[str, Any]) -> set[str]:
    columns: set[str] = set()
    for field in row.get("schema", []):
        raw = str(field.get("path") or "")
        if raw:
            columns.add(raw.split(".", 1)[0].replace("[]", "").lower())
    return columns


def _has_any(columns: set[str], candidates: tuple[str, ...]) -> bool:
    return any(candidate.lower() in columns for candidate in candidates)


def _validate_transaction(columns: set[str]) -> list[str]:
    errors: list[str] = []
    if not _has_any(columns, VALUE_FIELDS):
        errors.append("no value field compatible with feature_daily_agg")
    if not _has_any(columns, FROM_FIELDS):
        errors.append("no sender/from field compatible with unique_active_addresses")
    if not _has_any(columns, TO_FIELDS):
        errors.append("no recipient/to field compatible with unique_active_addresses")
    fee_ok = _has_any(columns, DIRECT_FEE_FIELDS) or any(
        left in columns and right in columns for left, right in FEE_PAIRS
    )
    if not fee_ok:
        errors.append("no supported direct or gas-derived fee path")
    return errors


def _validate_block(columns: set[str]) -> list[str]:
    errors: list[str] = []
    if not _has_any(columns, TIMESTAMP_FIELDS):
        errors.append("no timestamp field compatible with avg_block_time_sec")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fail when the live Arbitrum/Base source schema no longer supports core feature extraction."
    )
    parser.add_argument("report", help="JSON report emitted by l2_source_schema_probe.py")
    args = parser.parse_args()

    payload = json.loads(Path(args.report).read_text(encoding="utf-8"))
    results: list[dict[str, Any]] = []
    failures: list[str] = []

    for row in payload.get("files", []):
        name = str(row.get("file") or "")
        lowered = name.lower()
        columns = _top_level_columns(row)
        if "transaction" in lowered:
            errors = _validate_transaction(columns)
            table = "transactions"
        elif "block" in lowered:
            errors = _validate_block(columns)
            table = "blocks"
        else:
            errors = ["cannot infer source table from probe filename"]
            table = "unknown"

        result = {
            "file": name,
            "table": table,
            "status": "ok" if not errors else "drift",
            "errors": errors,
        }
        results.append(result)
        for error in errors:
            failures.append(f"{name}: {error}")

    if not results:
        failures.append("probe report contained no sampled files")

    summary = {
        "purpose": "Live upstream-schema compatibility gate for L2 feature extraction.",
        "status": "ok" if not failures else "drift",
        "files": results,
    }
    print(json.dumps(summary, indent=2, sort_keys=True))

    if failures:
        for failure in failures:
            print("LIVE L2 SCHEMA DRIFT: " + failure, file=sys.stderr)
        return 1

    print("LIVE L2 SCHEMA CONTRACT PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
