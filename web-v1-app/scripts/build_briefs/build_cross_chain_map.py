from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from briefs_common import (
    BRIEF_VERSION,
    CHAINS,
    GUARDRAIL_SENTENCE,
    LANGUAGE_POLICY,
    chain_display_name,
    copy_to_latest,
    lag_days,
    now_utc_iso,
    read_json,
    resolve_published_root,
    today_utc_iso,
    write_json,
)
from validate_brief_language import validate_payload


def _brief(root: Path, chain: str) -> dict[str, Any] | None:
    payload = read_json(root / "briefs" / "chains" / chain / "latest.json")
    return payload if isinstance(payload, dict) else None


def _chain_item(brief: dict[str, Any] | None) -> dict[str, Any]:
    if not brief:
        return {
            "latest_label": None,
            "dominant_label_7d": None,
            "weekly_pattern": "unavailable",
            "brief_status": "unavailable",
            "updated_through": None,
        }
    return {
        "latest_label": (brief.get("latest") or {}).get("label") if isinstance(brief.get("latest"), dict) else None,
        "dominant_label_7d": (brief.get("regime_path") or {}).get("dominant_label") if isinstance(brief.get("regime_path"), dict) else None,
        "weekly_pattern": (brief.get("movement") or {}).get("type") if isinstance(brief.get("movement"), dict) else "unavailable",
        "brief_status": brief.get("brief_status", "unavailable"),
        "updated_through": (brief.get("window") or {}).get("updated_through") if isinstance(brief.get("window"), dict) else None,
    }


def classify_cross_chain(chain_map: dict[str, dict[str, Any]]) -> dict[str, Any]:
    patterns = {chain: str(item.get("weekly_pattern") or "unavailable") for chain, item in chain_map.items()}
    latest_labels = {str(item.get("latest_label")) for item in chain_map.values() if item.get("latest_label")}

    if sum(1 for p in patterns.values() if p == "persistent_stable") >= 3:
        pattern = "broad_stability"
    elif patterns.get("base") == "persistent_congestion" and patterns.get("arbitrum") in {"low_friction_window", "persistent_stable"}:
        pattern = "l2_congestion_divergence"
    elif patterns.get("arbitrum") == "persistent_congestion" and patterns.get("base") in {"low_friction_window", "persistent_stable"}:
        pattern = "l2_congestion_divergence"
    elif sum(1 for p in patterns.values() if p in {"congestion_relief", "cheap_to_normal"}) >= 2:
        pattern = "cross_chain_friction_relief"
    elif sum(1 for p in patterns.values() if p in {"volatile_mixed", "degraded_or_low_confidence", "unavailable"}) >= 2:
        pattern = "mixed_unclear"
    elif len(latest_labels) >= 3:
        pattern = "chain_level_divergence"
    else:
        pattern = "mixed_unclear"

    stable_candidates = [chain for chain, p in patterns.items() if p == "persistent_stable"]
    friction_candidates = [chain for chain, p in patterns.items() if p == "persistent_congestion"]
    transition_candidates = [chain for chain, p in patterns.items() if p in {"congestion_relief", "cheap_to_normal", "heating_to_congested"}]

    return {
        "pattern": pattern,
        "uniformity": "low" if pattern in {"chain_level_divergence", "l2_congestion_divergence", "mixed_unclear"} else "moderate",
        "most_stable_chain": stable_candidates[0] if stable_candidates else None,
        "most_friction_heavy_chain": friction_candidates[0] if friction_candidates else None,
        "largest_recent_transition_chain": transition_candidates[0] if transition_candidates else None,
    }


def _freshness(chain_map: dict[str, dict[str, Any]]) -> dict[str, Any]:
    dates = {str(item.get("updated_through")) for item in chain_map.values() if item.get("updated_through")}
    freshness = {
        chain: {
            "updated_through": item.get("updated_through"),
            "lag_days": lag_days(item.get("updated_through") if isinstance(item.get("updated_through"), str) else None),
        }
        for chain, item in chain_map.items()
    }
    freshness["same_updated_through_all_chains"] = len(dates) == 1 and len(dates) > 0
    return freshness


def _brief_text(cross: dict[str, Any], freshness: dict[str, Any]) -> dict[str, str]:
    same = bool(freshness.get("same_updated_through_all_chains"))
    prefix = "The latest published data shows" if same else "The latest published data by chain shows"
    pattern = cross.get("pattern")

    if pattern == "broad_stability":
        headline = f"{prefix} broad stability across supported chains."
        plain = f"{prefix} a broadly stable regime profile across supported chains."
    elif pattern == "l2_congestion_divergence":
        headline = f"{prefix} L2 regime divergence."
        plain = f"{prefix} different regime profiles across Base and Arbitrum."
    elif pattern == "cross_chain_friction_relief":
        headline = f"{prefix} cross-chain friction relief."
        plain = f"{prefix} multiple chains moving away from congestion-heavy profiles."
    elif pattern == "chain_level_divergence":
        headline = f"{prefix} chain-level divergence."
        plain = f"{prefix} chain-level divergence rather than a uniform cross-chain regime."
    else:
        headline = f"{prefix} mixed conditions across supported chains."
        plain = f"{prefix} mixed conditions across supported chains."

    advanced = " ".join(
        [
            plain,
            "Across each chain's latest published 7-day window, the cross-chain map compares regime pattern, latest label, and confidence support.",
            GUARDRAIL_SENTENCE,
        ]
    )
    return {"headline": headline, "plain": plain, "advanced": advanced}


def build_cross_chain_map(root: Path) -> dict[str, Any]:
    chain_map = {chain: _chain_item(_brief(root, chain)) for chain in CHAINS}
    freshness = _freshness(chain_map)
    cross = classify_cross_chain(chain_map)
    brief = _brief_text(cross, freshness)
    payload: dict[str, Any] = {
        "schema": "urd_atlas.cross_chain_regime_map.v1",
        "brief_status": "published",
        "window": {
            "kind": "latest_published_days_by_chain",
            "days": 7,
            "is_intraday": False,
        },
        "freshness": freshness,
        "chains": chain_map,
        "cross_chain": cross,
        "brief": brief,
        "guardrails": {
            "not_intraday": True,
            "not_prediction": True,
            "not_investment_advice": True,
            "language_policy": LANGUAGE_POLICY,
        },
        "validation": {
            "language_policy": LANGUAGE_POLICY,
            "language_validation_status": "pending",
            "banned_terms_found": [],
            "narrative_generated_from_templates": True,
        },
        "provenance": {
            "briefs_methodology_version": BRIEF_VERSION,
            "source_layers": ["briefs/chains"],
            "generated_at": now_utc_iso(),
        },
    }

    validation = validate_payload(payload, require_guardrail=True)
    payload["validation"] = validation
    if validation["language_validation_status"] != "passed":
        payload["brief_status"] = "degraded"
        payload["brief"] = {
            "headline": "The latest chain briefs are available, but no cross-chain narrative brief was generated.",
            "plain": None,
            "advanced": None,
        }
        payload["validation"]["fallback_used"] = True
    return payload


def write_cross_chain_map(root: Path) -> list[Path]:
    payload = build_cross_chain_map(root)
    date_name = today_utc_iso()
    # Prefer latest common end-date when available.
    dates = [item.get("updated_through") for item in payload.get("chains", {}).values() if isinstance(item, dict) and item.get("updated_through")]
    if dates:
        date_name = max(str(d) for d in dates)
    date_path = root / "briefs" / "cross-chain" / f"{date_name}.json"
    latest_path = root / "briefs" / "cross-chain" / "latest.json"
    write_json(date_path, payload)
    copy_to_latest(date_path, latest_path)
    return [date_path, latest_path]


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Urd Atlas cross-chain regime map.")
    parser.add_argument("--root", default=None)
    args = parser.parse_args()
    root = resolve_published_root(args.root)
    for path in write_cross_chain_map(root):
        print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
