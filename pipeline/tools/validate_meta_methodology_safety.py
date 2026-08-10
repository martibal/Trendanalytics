#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Validate published/calculated META JSON methodological safety.

Fails if a public regime label contradicts both:
  1) public scorecard.regime_support, and
  2) regime axis support.

Also fails if the public status.one_liner does not explain the published
non-STABLE label. This is a product-integrity check: public labels may be
supported by scorecard or by regime_axes, but the public one_liner must state
that basis instead of saying only Normal/Balanced for a non-STABLE label.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


LABELS = {"STABLE", "HEATING", "CONGESTED", "CHEAP", "UNKNOWN/DEGRADED"}
REQUIRED_RULESET_BY_CHAIN = {
    "ethereum": "eth_l1_v2",
}


def _repo_root_from_here() -> Path:
    return Path(__file__).resolve().parents[2]


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _label(obj: Dict[str, Any]) -> str:
    return str(((obj.get("status") or {}).get("label")) or ((obj.get("regime") or {}).get("label")) or "UNKNOWN/DEGRADED")


def _date(obj: Dict[str, Any], fallback: str) -> str:
    return str(obj.get("date") or obj.get("updated_through") or fallback)


def _score(obj: Dict[str, Any], axis: str) -> Optional[float]:
    try:
        v = (((obj.get("scorecard") or {}).get("dimensions") or {}).get(axis) or {}).get("score")
        if v is None:
            return None
        f = float(v)
        return f
    except Exception:
        return None


def _level(obj: Dict[str, Any], axis: str) -> Optional[str]:
    try:
        v = (((obj.get("scorecard") or {}).get("dimensions") or {}).get(axis) or {}).get("level")
        return str(v) if v is not None else None
    except Exception:
        return None


def _scorecard_support(obj: Dict[str, Any], label: str) -> bool:
    sc = obj.get("scorecard") or {}
    support = sc.get("regime_support") or {}
    if label == "CONGESTED" and support.get("congested_supported") is True:
        return True
    if label == "CHEAP" and support.get("cheap_supported") is True:
        return True
    if label == "HEATING" and support.get("heating_supported") is True:
        return True

    demand_score = _score(obj, "demand")
    friction_score = _score(obj, "friction")
    capacity_score = _score(obj, "capacity")
    demand_level = _level(obj, "demand")
    friction_level = _level(obj, "friction")
    capacity_level = _level(obj, "capacity")

    if label == "CONGESTED":
        return bool(
            (friction_score is not None and friction_score >= 67.0 and capacity_score is not None and capacity_score >= 67.0)
            or (friction_level == "High" and capacity_level == "Tight")
        )
    if label == "CHEAP":
        friction_low = (friction_score is not None and friction_score <= 33.0) or friction_level == "Low"
        capacity_tight = (capacity_score is not None and capacity_score >= 67.0) or capacity_level == "Tight"
        return bool(friction_low and not capacity_tight)
    if label == "HEATING":
        return bool((demand_score is not None and demand_score >= 67.0) or demand_level == "High")
    return True


def _axis_support(obj: Dict[str, Any], label: str) -> bool:
    axes = ((obj.get("regime") or {}).get("axes") or {})
    d = axes.get("demand") or {}
    f = axes.get("friction") or {}
    c = axes.get("capacity") or {}

    def high(axis: Dict[str, Any]) -> bool:
        return str(axis.get("band_high")) in {"HIGH", "EXTREME_HIGH"} and int(axis.get("informative_count") or 0) > 0

    def extreme_high(axis: Dict[str, Any]) -> bool:
        return str(axis.get("band_high")) == "EXTREME_HIGH" and int(axis.get("informative_count") or 0) > 0

    def low(axis: Dict[str, Any]) -> bool:
        return str(axis.get("band_low")) in {"LOW", "EXTREME_LOW"} and int(axis.get("informative_count") or 0) > 0

    def heating(axis: Dict[str, Any]) -> bool:
        return str(axis.get("trend")) == "HEATING"

    if label == "CONGESTED":
        return bool((high(f) and high(c)) or (extreme_high(c) and heating(c)))
    if label == "CHEAP":
        return bool(low(f) and not high(c))
    if label == "HEATING":
        return bool(high(d) and heating(d))
    return True


def _safe_label_supported(obj: Dict[str, Any]) -> Tuple[bool, str]:
    label = _label(obj)
    if label not in LABELS:
        return False, f"unknown label {label!r}"
    if label in {"STABLE", "UNKNOWN/DEGRADED"}:
        return True, "ok"

    if _scorecard_support(obj, label):
        return True, "ok_scorecard_support"
    if _axis_support(obj, label):
        return True, "ok_axis_support"

    return False, f"{label} without scorecard or regime-axis support"


def _one_liner(obj: Dict[str, Any]) -> str:
    try:
        return str(((obj.get("status") or {}).get("one_liner")) or "")
    except Exception:
        return ""


def _weak_neutral_only(text: str) -> bool:
    t = (text or "").strip().lower()
    if not t:
        return True
    neutral_tokens = ["demand: normal", "friction: normal", "capacity: balanced"]
    return all(tok in t for tok in neutral_tokens) and not any(
        x in t for x in (
            "lower-friction",
            "low friction",
            "demand-led",
            "heating",
            "congested",
            "capacity pressure",
            "elevated friction",
            "regime-axis",
            "scorecard shows",
        )
    )


def _one_liner_explains_label(obj: Dict[str, Any]) -> Tuple[bool, str]:
    label = _label(obj)
    if label in {"STABLE", "UNKNOWN/DEGRADED"}:
        return True, "ok"

    text = _one_liner(obj)
    t = text.lower()
    if _weak_neutral_only(text):
        return False, f"{label} one_liner is neutral-only: {text!r}"

    support = (((obj.get("status") or {}).get("explanation_support") or {}))
    if not isinstance(support, dict):
        support = {}
    basis = str(support.get("basis") or (((obj.get("regime") or {}).get("sanity") or {}).get("support_basis") or ""))

    if label == "CHEAP":
        ok = ("low friction" in t) or ("lower-friction" in t) or ("friction low" in t)
        if not ok:
            return False, f"CHEAP one_liner must explain low/lower friction: {text!r}"
    elif label == "HEATING":
        ok = ("demand" in t) and (("heating" in t) or ("elevated" in t) or ("high" in t))
        if not ok:
            return False, f"HEATING one_liner must explain demand-led heating: {text!r}"
    elif label == "CONGESTED":
        ok = ("congest" in t) or ("capacity pressure" in t) or ("elevated friction" in t) or ("friction high" in t) or ("capacity tight" in t)
        if not ok:
            return False, f"CONGESTED one_liner must explain friction/capacity pressure: {text!r}"

    # If the regime was supported only by regime axes, expose that fact in status.
    if basis == "regime_axes" and not support:
        return False, f"{label} supported by regime_axes but status.explanation_support missing"

    return True, "ok"


def _iter_meta_files(meta_root: Path) -> Iterable[Path]:
    for chain_dir in sorted([p for p in meta_root.iterdir() if p.is_dir()]):
        for path in sorted(chain_dir.glob("????-??-??.json")):
            yield path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=str(_repo_root_from_here()), help="Repo root. Default: inferred.")
    ap.add_argument("--meta-root", default=None, help="META root. Default: <root>/data/published/v1/meta")
    ap.add_argument("--max-errors", type=int, default=50)
    args = ap.parse_args()

    root = Path(args.root).resolve()
    meta_root = Path(args.meta_root).resolve() if args.meta_root else root / "data" / "published" / "v1" / "meta"
    if not meta_root.exists():
        raise SystemExit(f"META root not found: {meta_root}")

    counts: Counter[str] = Counter()
    ruleset_counts: Counter[str] = Counter()
    errors: List[str] = []
    total = 0
    adjusted = 0
    basis_counts: Counter[str] = Counter()

    for path in _iter_meta_files(meta_root):
        total += 1
        obj = _read_json(path)
        if not isinstance(obj, dict):
            errors.append(f"{path}: not an object")
            continue
        label = _label(obj)
        counts[label] += 1
        regime = obj.get("regime") or {}
        ruleset_id = str(regime.get("ruleset_id") or "")
        ruleset_counts[f"{path.parent.name}:{ruleset_id or 'missing'}"] += 1

        expected_ruleset = REQUIRED_RULESET_BY_CHAIN.get(path.parent.name)
        if expected_ruleset and ruleset_id != expected_ruleset:
            errors.append(
                f"{path.parent.name}/{path.name}: {_date(obj, path.stem)} "
                f"ruleset_id={ruleset_id!r}, expected {expected_ruleset!r}"
            )
            if len(errors) >= int(args.max_errors):
                break

        sanity = (regime.get("sanity") or {})
        if sanity.get("adjusted") is True:
            adjusted += 1
        basis_counts[str(sanity.get("support_basis") or "n/a")] += 1

        ok, reason = _safe_label_supported(obj)
        if not ok:
            errors.append(f"{path.parent.name}/{path.name}: {_date(obj, path.stem)} {reason}")
            if len(errors) >= int(args.max_errors):
                break

        ok_line, reason_line = _one_liner_explains_label(obj)
        if not ok_line:
            errors.append(f"{path.parent.name}/{path.name}: {_date(obj, path.stem)} {reason_line}")
            if len(errors) >= int(args.max_errors):
                break

    print(f"[validate_meta_methodology_safety] meta_root={meta_root}")
    print(f"[validate_meta_methodology_safety] checked={total}")
    print(f"[validate_meta_methodology_safety] label_counts={dict(counts)}")
    print(f"[validate_meta_methodology_safety] ruleset_counts={dict(ruleset_counts)}")
    print(f"[validate_meta_methodology_safety] sanity_adjusted={adjusted}")
    print(f"[validate_meta_methodology_safety] support_basis_counts={dict(basis_counts)}")

    if errors:
        print("[validate_meta_methodology_safety] FAILED")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("[validate_meta_methodology_safety] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
