#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import math
import re
from collections import Counter
from pathlib import Path
from typing import Any, Iterable, Optional


CHAINS = ("bitcoin", "ethereum", "arbitrum", "base")
DAILY_FILE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}\.json$")

BASE_THRESHOLDS = {
    "extreme_high_pct": 90.0,
    "high_pct": 80.0,
    "low_pct": 20.0,
    "extreme_low_pct": 10.0,
    "extreme_high_z": 2.5,
    "high_z": 1.5,
    "low_z": -1.5,
    "extreme_low_z": -2.5,
    "momentum_epsilon": 0.15,
    "confidence_gate": 0.40,
}


def _finite(value: Any) -> Optional[float]:
    try:
        number = float(value)
    except Exception:
        return None
    return number if math.isfinite(number) else None


def _scale_pct_from_midpoint(value: float, factor: float) -> float:
    return 50.0 + (value - 50.0) * factor


def _scaled_thresholds(*, band_factor: float = 1.0, momentum_factor: float = 1.0, gate_factor: float = 1.0) -> dict:
    t = dict(BASE_THRESHOLDS)
    for key in ("extreme_high_pct", "high_pct", "low_pct", "extreme_low_pct"):
        t[key] = _scale_pct_from_midpoint(t[key], band_factor)
    for key in ("extreme_high_z", "high_z", "low_z", "extreme_low_z"):
        t[key] = t[key] * band_factor
    t["momentum_epsilon"] *= momentum_factor
    t["confidence_gate"] *= gate_factor
    return t


VARIANTS = {
    "baseline": _scaled_thresholds(),
    "bands_looser_20pct": _scaled_thresholds(band_factor=0.80),
    "bands_stricter_20pct": _scaled_thresholds(band_factor=1.20),
    "momentum_looser_20pct": _scaled_thresholds(momentum_factor=0.80),
    "momentum_stricter_20pct": _scaled_thresholds(momentum_factor=1.20),
    "confidence_gate_looser_20pct": _scaled_thresholds(gate_factor=0.80),
    "confidence_gate_stricter_20pct": _scaled_thresholds(gate_factor=1.20),
}


def _band_from_pct(pct: float, t: dict) -> str:
    if pct >= t["extreme_high_pct"]:
        return "EXTREME_HIGH"
    if pct >= t["high_pct"]:
        return "HIGH"
    if pct <= t["extreme_low_pct"]:
        return "EXTREME_LOW"
    if pct <= t["low_pct"]:
        return "LOW"
    return "NORMAL"


def _band_from_z(z: float, t: dict) -> str:
    if z >= t["extreme_high_z"]:
        return "EXTREME_HIGH"
    if z >= t["high_z"]:
        return "HIGH"
    if z <= t["extreme_low_z"]:
        return "EXTREME_LOW"
    if z <= t["low_z"]:
        return "LOW"
    return "NORMAL"


def _combined_band(pct: float, z: float, t: dict, informative: bool = True) -> str:
    if not informative:
        return "NORMAL"
    pct_band = _band_from_pct(pct, t)
    z_band = _band_from_z(z, t)
    if "EXTREME_HIGH" in (pct_band, z_band):
        return "EXTREME_HIGH"
    if "HIGH" in (pct_band, z_band):
        return "HIGH"
    if "EXTREME_LOW" in (pct_band, z_band):
        return "EXTREME_LOW"
    if "LOW" in (pct_band, z_band):
        return "LOW"
    return "NORMAL"


def _trend(momentum: float, t: dict) -> str:
    eps = t["momentum_epsilon"]
    if momentum >= eps:
        return "HEATING"
    if momentum <= -eps:
        return "COOLING"
    return "FLAT"


def _signal_rows(meta: dict, chain: str, t: dict) -> list[dict]:
    regime = meta.get("regime") if isinstance(meta.get("regime"), dict) else {}
    signals = regime.get("signals") if isinstance(regime.get("signals"), dict) else {}
    rows = []
    for metric, payload in signals.items():
        if not isinstance(payload, dict):
            continue
        informative = bool(payload.get("informative", True))
        pct = _finite(payload.get("pct_90d"))
        z = _finite(payload.get("z_robust"))
        momentum = _finite(payload.get("momentum_7d_vs_30d"))
        if pct is None:
            pct = 50.0
        if z is None:
            z = 0.0
        if momentum is None:
            momentum = 0.0
        rows.append(
            {
                "metric": str(metric),
                "axis": str(payload.get("axis") or ""),
                "informative": informative,
                "pct": pct,
                "z": z,
                "momentum": momentum,
                "band": _combined_band(pct, z, t, informative),
                "trend": _trend(momentum, t) if informative else "FLAT",
                "pct_band": _band_from_pct(pct, t) if informative else "NORMAL",
                "z_band": _band_from_z(z, t) if informative else "NORMAL",
            }
        )
    return rows


def _aggregate_axis(rows: Iterable[dict], t: dict) -> dict:
    signals = [row for row in rows if row.get("informative")]
    if not signals:
        return {"band_high": "NORMAL", "band_low": "NORMAL", "trend": "FLAT", "informative_count": 0}

    bands = [row["band"] for row in signals]
    band_high = "EXTREME_HIGH" if "EXTREME_HIGH" in bands else ("HIGH" if "HIGH" in bands else "NORMAL")
    band_low = "EXTREME_LOW" if "EXTREME_LOW" in bands else ("LOW" if "LOW" in bands else "NORMAL")
    top = sorted(
        signals,
        key=lambda row: (abs(row["z"]), abs(row["momentum"]), row["metric"]),
        reverse=True,
    )[:2]
    avg_momentum = sum(row["momentum"] for row in top) / len(top) if top else 0.0
    return {
        "band_high": band_high,
        "band_low": band_low,
        "trend": _trend(avg_momentum, t),
        "informative_count": len(signals),
    }


def _is_high(band: str) -> bool:
    return band in {"HIGH", "EXTREME_HIGH"}


def _is_low(band: str) -> bool:
    return band in {"LOW", "EXTREME_LOW"}


def _candidate_label(meta: dict, chain: str, t: dict) -> tuple[str, dict]:
    rows = _signal_rows(meta, chain, t)

    demand_rows = [row for row in rows if row["axis"] == "demand"]
    friction_rows = [row for row in rows if row["axis"] == "friction"]
    capacity_rows = [row for row in rows if row["axis"] == "capacity"]

    calldata = None
    if chain == "ethereum":
        for row in demand_rows:
            if row["metric"] == "nonempty_calldata_share":
                calldata = row
                break
        demand_rows = [row for row in demand_rows if row["metric"] != "nonempty_calldata_share"]

    demand = _aggregate_axis(demand_rows, t)
    friction = _aggregate_axis(friction_rows, t)
    capacity = _aggregate_axis(capacity_rows, t)

    demand_high = _is_high(demand["band_high"]) and demand["informative_count"] > 0
    friction_high = _is_high(friction["band_high"]) and friction["informative_count"] > 0
    friction_low = _is_low(friction["band_low"]) and friction["informative_count"] > 0
    capacity_high = _is_high(capacity["band_high"]) and capacity["informative_count"] > 0
    capacity_low = _is_low(capacity["band_low"]) and capacity["informative_count"] > 0
    capacity_extreme = capacity["band_high"] == "EXTREME_HIGH" and capacity["informative_count"] > 0

    label = "STABLE"
    if chain == "bitcoin":
        if friction_high and capacity_high:
            label = "CONGESTED"
        elif friction_low and not capacity_high:
            label = "CHEAP"
        elif demand_high and demand["trend"] == "HEATING":
            label = "HEATING"
    elif chain == "ethereum":
        calldata_heating = bool(calldata and calldata["informative"] and calldata["trend"] == "HEATING")
        if (friction_high and capacity_high) or (capacity_extreme and capacity["trend"] == "HEATING"):
            label = "CONGESTED"
        elif friction_low and (capacity_low or not capacity_high):
            label = "CHEAP"
        elif demand_high and demand["trend"] == "HEATING":
            label = "HEATING"
        elif demand_high and calldata_heating:
            label = "HEATING"
    else:
        if (friction_high and capacity_high) or (capacity_extreme and capacity["trend"] == "HEATING"):
            label = "CONGESTED"
        elif friction_low and (capacity_low or not capacity_high):
            label = "CHEAP"
        elif demand_high and demand["trend"] == "HEATING":
            label = "HEATING"

    confidence = None
    conf = meta.get("confidence")
    if isinstance(conf, dict):
        confidence = _finite(conf.get("confidence_score"))
    if confidence is None:
        pub = meta.get("publish_confidence")
        if isinstance(pub, dict):
            confidence = _finite(pub.get("confidence_score"))

    if confidence is not None and confidence < t["confidence_gate"]:
        label = "UNKNOWN/DEGRADED"

    axes = {"demand": demand, "friction": friction, "capacity": capacity}
    return label, axes


def _daily_meta_paths(root: Path, chain: str) -> list[Path]:
    chain_dir = root / "meta" / chain
    if not chain_dir.exists():
        raise FileNotFoundError(f"missing meta directory: {chain_dir}")
    return sorted(path for path in chain_dir.iterdir() if path.is_file() and DAILY_FILE_RE.match(path.name))


def _load_meta(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _published_label(meta: dict) -> str:
    regime = meta.get("regime")
    if isinstance(regime, dict) and regime.get("label"):
        return str(regime["label"])
    return "MISSING"


def _summarize_chain(root: Path, chain: str, max_days: int) -> dict:
    paths = _daily_meta_paths(root, chain)
    if max_days > 0:
        paths = paths[-max_days:]

    rows: list[dict] = []
    disagreement_signals = 0
    informative_signals = 0

    for path in paths:
        meta = _load_meta(path)
        date = str(meta.get("date") or path.stem)
        published = _published_label(meta)
        variant_labels = {}
        for name, thresholds in VARIANTS.items():
            variant_labels[name], _ = _candidate_label(meta, chain, thresholds)

        base_signals = _signal_rows(meta, chain, VARIANTS["baseline"])
        for signal in base_signals:
            if not signal["informative"]:
                continue
            informative_signals += 1
            if signal["pct_band"] != signal["z_band"]:
                disagreement_signals += 1

        rows.append({"date": date, "published": published, **variant_labels})

    base_counts = Counter(row["baseline"] for row in rows)
    published_counts = Counter(row["published"] for row in rows)
    variants = {}

    for name in VARIANTS:
        counts = Counter(row[name] for row in rows)
        changed = [row for row in rows if row[name] != row["baseline"]]
        transitions = Counter(f'{row["baseline"]}->{row[name]}' for row in changed)
        variants[name] = {
            "thresholds": VARIANTS[name],
            "label_counts": dict(sorted(counts.items())),
            "changed_days_vs_baseline": len(changed),
            "change_rate_vs_baseline": (len(changed) / len(rows)) if rows else 0.0,
            "transitions_vs_baseline": dict(sorted(transitions.items())),
        }

    baseline_vs_published = [row for row in rows if row["baseline"] != row["published"]]

    return {
        "chain": chain,
        "days_evaluated": len(rows),
        "published_label_counts": dict(sorted(published_counts.items())),
        "baseline_reclassification_counts": dict(sorted(base_counts.items())),
        "baseline_vs_published_mismatch_days": len(baseline_vs_published),
        "baseline_vs_published_mismatch_rate": (len(baseline_vs_published) / len(rows)) if rows else 0.0,
        "percentile_vs_robust_z": {
            "informative_signals": informative_signals,
            "different_band_assessment": disagreement_signals,
            "disagreement_rate": (disagreement_signals / informative_signals) if informative_signals else 0.0,
        },
        "variants": variants,
    }


def _write_csv(path: Path, report: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["chain", "variant", "days_evaluated", "changed_days", "change_rate"])
        for chain, block in report["chains"].items():
            for variant, data in block["variants"].items():
                writer.writerow(
                    [
                        chain,
                        variant,
                        block["days_evaluated"],
                        data["changed_days_vs_baseline"],
                        f'{data["change_rate_vs_baseline"]:.8f}',
                    ]
                )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Audit regime-label sensitivity to ±20% threshold perturbations using published Meta evidence."
    )
    parser.add_argument("--published-root", default="data/published/v1")
    parser.add_argument("--output-json", default="reports/threshold-sensitivity.json")
    parser.add_argument("--output-csv", default="reports/threshold-sensitivity.csv")
    parser.add_argument("--max-days", type=int, default=365, help="Per-chain daily files to evaluate; 0 means all.")
    parser.add_argument("--chain", action="append", choices=CHAINS)
    args = parser.parse_args()

    root = Path(args.published_root).resolve()
    chains = args.chain or list(CHAINS)

    report = {
        "method": {
            "description": "Reclassify the published regime evidence surface while perturbing one threshold family at a time.",
            "variation": "±20%",
            "baseline_thresholds": BASE_THRESHOLDS,
            "note": (
                "This is a stability/sensitivity audit. It does not establish predictive validity or calibrate "
                "the labels against external outcomes."
            ),
        },
        "chains": {},
    }

    for chain in chains:
        report["chains"][chain] = _summarize_chain(root, chain, max(0, args.max_days))

    output_json = Path(args.output_json)
    output_json.parent.mkdir(parents=True, exist_ok=True)
    output_json.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    _write_csv(Path(args.output_csv), report)

    print("[THRESHOLD_SENSITIVITY] OK")
    for chain, block in report["chains"].items():
        print(
            f"  {chain}: days={block['days_evaluated']} "
            f"band_loose={block['variants']['bands_looser_20pct']['change_rate_vs_baseline']:.2%} "
            f"band_strict={block['variants']['bands_stricter_20pct']['change_rate_vs_baseline']:.2%} "
            f"momentum_loose={block['variants']['momentum_looser_20pct']['change_rate_vs_baseline']:.2%} "
            f"momentum_strict={block['variants']['momentum_stricter_20pct']['change_rate_vs_baseline']:.2%} "
            f"gate_loose={block['variants']['confidence_gate_looser_20pct']['change_rate_vs_baseline']:.2%} "
            f"gate_strict={block['variants']['confidence_gate_stricter_20pct']['change_rate_vs_baseline']:.2%}"
        )
    print(f"  JSON: {output_json}")
    print(f"  CSV: {args.output_csv}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
