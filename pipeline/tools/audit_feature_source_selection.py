#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ast
import json
import sys
from pathlib import Path

CONTRACT = {
    "value_bitcoin": ["output_value", "value", "value_native", "value_transferred", "amount", "native_value", "tx_value"],
    "value_evm": ["value", "value_native", "value_transferred", "amount", "native_value", "tx_value"],
    "fee": ["fee", "tx_fee", "transaction_fee", "gas_fee", "transaction_fee_native", "transaction_fee"],
    "ethereum_gas_used": ["receipt_gas_used", "gas_used"],
    "ethereum_tx_type": ["transaction_type", "type"],
    "from_address": ["from_address", "from", "sender"],
    "to_address": ["to_address", "to", "recipient"],
}


def _literal_string_list(node: ast.AST) -> list[str] | None:
    if not isinstance(node, (ast.List, ast.Tuple)):
        return None
    out = []
    for elt in node.elts:
        if not isinstance(elt, ast.Constant) or not isinstance(elt.value, str):
            return None
        out.append(elt.value)
    return out


def _extract_assignments(source: str) -> dict[str, list[str]]:
    tree = ast.parse(source)
    found: dict[str, list[str]] = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            value = _literal_string_list(node.value)
            if value is None:
                continue
            for target in node.targets:
                if isinstance(target, ast.Name):
                    found.setdefault(target.id, value)
    return found


def _assert_static_contract(source: str) -> list[str]:
    errors: list[str] = []
    assignments = _extract_assignments(source)
    checks = {
        "from_address": assignments.get("from_candidates"),
        "to_address": assignments.get("to_candidates"),
    }
    for key, actual in checks.items():
        if actual != CONTRACT[key]:
            errors.append(f"{key}: candidate order changed from contract: {actual!r}")

    required_fragments = [
        '"output_value",\n            "value",\n            "value_native",',
        'else [\n            "value",\n            "value_native",',
        'for cand in ["fee", "tx_fee", "transaction_fee", "gas_fee", "transaction_fee_native", "transaction_fee"]:',
        'next((c for c in ["receipt_gas_used", "gas_used"] if _ci_has(tx_ci, c)), None)',
        'next((c for c in ["transaction_type", "type"] if _ci_has(tx_ci, c)), None)',
        'from_candidates = ["from_address", "from", "sender"]',
        'to_candidates = ["to_address", "to", "recipient"]',
    ]
    for fragment in required_fragments:
        if fragment not in source:
            errors.append("source-selection expression changed or disappeared: " + fragment.splitlines()[0])
    return errors


def _select(columns: list[str], candidates: list[str]) -> str | None:
    ci = {c.lower(): c for c in columns}
    for candidate in candidates:
        if candidate.lower() in ci:
            return ci[candidate.lower()]
    return None


def _validate_schema_snapshot(path: Path) -> list[str]:
    obj = json.loads(path.read_text(encoding="utf-8"))
    errors: list[str] = []
    for row in obj.get("checks", []):
        name = row["contract"]
        candidates = CONTRACT[name]
        actual = _select(list(row.get("columns", [])), candidates)
        expected = row.get("expected_selected")
        if actual != expected:
            errors.append(f"{row.get('chain','?')} {name}: selected raw field changed from {expected!r} to {actual!r}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Fail when feature raw-column precedence changes silently; optionally validate a captured upstream schema snapshot.")
    parser.add_argument("--feature-source", default="pipeline/src/feature_daily_agg.py")
    parser.add_argument("--schema-snapshot")
    parser.add_argument("--print-contract", action="store_true")
    args = parser.parse_args()

    source = Path(args.feature_source).read_text(encoding="utf-8")
    errors = _assert_static_contract(source)
    if args.schema_snapshot:
        errors.extend(_validate_schema_snapshot(Path(args.schema_snapshot)))
    if args.print_contract:
        print(json.dumps(CONTRACT, indent=2, sort_keys=True))
    if errors:
        for error in errors:
            print("SOURCE-SELECTION DRIFT: " + error, file=sys.stderr)
        print("Update the explicit source-selection contract in the same reviewed change when a source migration is intentional.", file=sys.stderr)
        return 1
    print("FEATURE SOURCE-SELECTION CONTRACT PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
