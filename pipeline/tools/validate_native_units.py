#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path


ETH_LIMITS = {
    "median_tx_fee_native": 100.0,
    "median_tx_value_native": 1_000_000_000.0,
    "value_transferred_native": 1_000_000_000_000.0,
}


def _finite_number(value):
    if isinstance(value, bool):
        return None
    try:
        number = float(value)
    except Exception:
        return None
    return number if math.isfinite(number) else None


def _metrics(obj: dict) -> dict:
    if not isinstance(obj, dict):
        return {}
    gold = obj.get("gold")
    metrics = obj.get("metrics")
    nested = gold.get("metrics") if isinstance(gold, dict) else None
    for candidate in (nested, metrics, gold, obj):
        if isinstance(candidate, dict):
            return candidate
    return {}


def validate_ethereum(root: Path) -> list[str]:
    errors: list[str] = []
    chain_dir = root / "gold" / "ethereum"
    if not chain_dir.exists():
        return [f"missing Ethereum published Gold directory: {chain_dir}"]

    checked = 0
    for path in sorted(chain_dir.glob("????-??-??.json")):
        try:
            obj = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"{path}: invalid JSON: {exc}")
            continue
        metrics = _metrics(obj)
        checked += 1
        for field, upper_bound in ETH_LIMITS.items():
            value = _finite_number(metrics.get(field))
            if value is None:
                continue
            if value < 0:
                errors.append(f"{path.name}: {field}={value} is negative")
            elif value > upper_bound:
                errors.append(
                    f"{path.name}: {field}={value} exceeds native-unit sanity bound {upper_bound}; "
                    "possible wei/native denomination mismatch"
                )

    if checked == 0:
        errors.append("no Ethereum daily Gold JSON files found")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Fail closed on implausible published native-unit magnitudes.")
    parser.add_argument("--published-root", default="data/published/v1")
    args = parser.parse_args()

    root = Path(args.published_root).resolve()
    errors = validate_ethereum(root)
    if errors:
        print("[NATIVE_UNITS] FAIL")
        for error in errors:
            print(f"  - {error}")
        return 1

    print("[NATIVE_UNITS] OK: Ethereum native-denomination publication sanity checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
