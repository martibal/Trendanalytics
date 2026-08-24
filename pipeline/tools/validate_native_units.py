#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable


@dataclass(frozen=True)
class NativeBounds:
    median_tx_fee_native: float
    median_tx_value_native: float
    value_transferred_native: float


# Deliberately broad denomination guardrails, not statistical outlier limits.
# They are intended to catch scale mistakes such as wei being published as ETH
# or satoshis being published as BTC without creating a false-positive gate for
# legitimate high-activity days.
CHAIN_NATIVE_BOUNDS: Dict[str, NativeBounds] = {
    "bitcoin": NativeBounds(
        median_tx_fee_native=100.0,
        median_tx_value_native=10_000_000.0,
        value_transferred_native=1_000_000_000.0,
    ),
    "ethereum": NativeBounds(
        median_tx_fee_native=100.0,
        median_tx_value_native=1_000_000_000.0,
        value_transferred_native=1_000_000_000_000.0,
    ),
    "arbitrum": NativeBounds(
        median_tx_fee_native=100.0,
        median_tx_value_native=1_000_000_000.0,
        value_transferred_native=1_000_000_000_000.0,
    ),
    "base": NativeBounds(
        median_tx_fee_native=100.0,
        median_tx_value_native=1_000_000_000.0,
        value_transferred_native=1_000_000_000_000.0,
    ),
}

FIELD_NOTES = {
    "bitcoin": "BTC-native values; bounds are intentionally far above plausible daily medians/totals and are intended to catch BTC/satoshi-scale mistakes.",
    "ethereum": "ETH-native values; bounds preserve the existing Ethereum wei/native mismatch guard.",
    "arbitrum": "ETH-native L2 values; bounds are denomination guards for ETH/wei-scale mistakes.",
    "base": "ETH-native L2 values; bounds are denomination guards for ETH/wei-scale mistakes.",
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


def _iter_daily_json(chain_dir: Path) -> Iterable[Path]:
    return sorted(chain_dir.glob("????-??-??.json"))


def _validate_chain(root: Path, chain: str, bounds: NativeBounds) -> tuple[list[str], int]:
    errors: list[str] = []
    chain_dir = root / "gold" / chain
    if not chain_dir.exists():
        return [f"missing {chain} published Gold directory: {chain_dir}"], 0

    checked = 0
    bound_map = {
        "median_tx_fee_native": bounds.median_tx_fee_native,
        "median_tx_value_native": bounds.median_tx_value_native,
        "value_transferred_native": bounds.value_transferred_native,
    }

    for path in _iter_daily_json(chain_dir):
        try:
            obj = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"{chain}/{path.name}: invalid JSON: {exc}")
            continue

        metrics = _metrics(obj)
        checked += 1

        published_chain = str(obj.get("chain") or metrics.get("chain") or "").strip().lower()
        if published_chain and published_chain != chain:
            errors.append(
                f"{chain}/{path.name}: chain={published_chain!r} does not match directory {chain!r}"
            )

        for field, upper_bound in bound_map.items():
            raw = metrics.get(field)
            if raw is None:
                continue
            value = _finite_number(raw)
            if value is None:
                errors.append(f"{chain}/{path.name}: {field}={raw!r} is not a finite number")
                continue
            if value < 0:
                errors.append(f"{chain}/{path.name}: {field}={value} is negative")
            elif value > upper_bound:
                errors.append(
                    f"{chain}/{path.name}: {field}={value} exceeds native-unit sanity bound "
                    f"{upper_bound}; possible denomination mismatch. {FIELD_NOTES[chain]}"
                )

    if checked == 0:
        errors.append(f"no {chain} daily Gold JSON files found")
    return errors, checked


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fail closed on implausible native-denomination magnitudes for all published chains."
    )
    parser.add_argument("--published-root", default="data/published/v1")
    parser.add_argument(
        "--chain",
        action="append",
        choices=sorted(CHAIN_NATIVE_BOUNDS),
        help="Validate only the selected chain; may be repeated. Default: all chains.",
    )
    args = parser.parse_args()

    root = Path(args.published_root).resolve()
    chains = args.chain or list(CHAIN_NATIVE_BOUNDS)

    errors: list[str] = []
    checked_counts: dict[str, int] = {}
    for chain in chains:
        chain_errors, checked = _validate_chain(root, chain, CHAIN_NATIVE_BOUNDS[chain])
        errors.extend(chain_errors)
        checked_counts[chain] = checked

    if errors:
        print("[NATIVE_UNITS] FAIL")
        for error in errors:
            print(f"  - {error}")
        return 1

    detail = ", ".join(f"{chain}={count}" for chain, count in checked_counts.items())
    print(f"[NATIVE_UNITS] OK: native-denomination sanity checks passed ({detail})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
