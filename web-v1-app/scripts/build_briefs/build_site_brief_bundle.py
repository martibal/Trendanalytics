from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from briefs_common import (
    CHAINS,
    LABEL_COLORS,
    LANGUAGE_POLICY,
    copy_to_latest,
    lag_days,
    load_latest_meta_window,
    now_utc_iso,
    read_json,
    resolve_published_root,
    write_json,
)
from validate_brief_language import validate_payload


def _chain_brief(root: Path, chain: str) -> dict[str, Any] | None:
    payload = read_json(root / "briefs" / "chains" / chain / "latest.json")
    return payload if isinstance(payload, dict) else None


def _cross_chain(root: Path) -> dict[str, Any] | None:
    payload = read_json(root / "briefs" / "cross-chain" / "latest.json")
    return payload if isinstance(payload, dict) else None


def _fallback_summary(chain_items: list[dict[str, Any]]) -> dict[str, str]:
    labels = {str(item.get("label")) for item in chain_items if item.get("label")}
    if len(labels) >= 3:
        text = "The latest published data by chain shows chain-level divergence rather than a uniform cross-chain regime."
    elif labels:
        text = "The latest published data shows mixed conditions across supported chains."
    else:
        text = "Latest 7-day regime context is not available yet."
    return {"headline": "Latest 7-day regime context", "text": text}


def _series_30d(root: Path, chain: str) -> dict[str, Any]:
    observations = load_latest_meta_window(root, chain, 30)
    return {
        "chain": chain,
        "updated_through": observations[-1].updated_through if observations else None,
        "days": [
            {
                "date": obs.date,
                "label": obs.label,
                "color": LABEL_COLORS.get(obs.label, "#6b7280"),
                "confidence_score": obs.confidence_score,
                "primary_driver": obs.primary_driver,
            }
            for obs in observations
        ],
    }


def _freshness(chains: list[dict[str, Any]]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    dates: set[str] = set()
    for item in chains:
        chain = str(item.get("chain"))
        updated = item.get("updated_through") if isinstance(item.get("updated_through"), str) else None
        if updated:
            dates.add(updated)
        out[chain] = {"updated_through": updated, "lag_days": lag_days(updated)}
    out["same_updated_through_all_chains"] = len(dates) == 1 and len(dates) > 0
    return out


def build_site_bundle(root: Path) -> dict[str, Any]:
    chain_items: list[dict[str, Any]] = []
    series: list[dict[str, Any]] = []

    for chain in CHAINS:
        brief = _chain_brief(root, chain)
        if brief is None:
            item = {
                "chain": chain,
                "label": None,
                "pattern": "unavailable",
                "headline": "The latest 7 published days are not available for this chain.",
                "updated_through": None,
                "brief_status": "unavailable",
                "confidence": {"latest": None, "average_7d": None, "direction": "unknown"},
            }
        else:
            item = {
                "chain": chain,
                "label": (brief.get("latest") or {}).get("label") if isinstance(brief.get("latest"), dict) else None,
                "pattern": (brief.get("movement") or {}).get("type") if isinstance(brief.get("movement"), dict) else "unavailable",
                "headline": (brief.get("brief") or {}).get("headline") if isinstance(brief.get("brief"), dict) else None,
                "updated_through": (brief.get("window") or {}).get("updated_through") if isinstance(brief.get("window"), dict) else None,
                "brief_status": brief.get("brief_status", "unavailable"),
                "confidence": {
                    "latest": (brief.get("confidence") or {}).get("latest") if isinstance(brief.get("confidence"), dict) else None,
                    "average_7d": (brief.get("confidence") or {}).get("average_7d") if isinstance(brief.get("confidence"), dict) else None,
                    "direction": (brief.get("confidence") or {}).get("direction") if isinstance(brief.get("confidence"), dict) else "unknown",
                },
            }
        chain_items.append(item)
        series.append(_series_30d(root, chain))

    cross = _cross_chain(root)
    if cross and isinstance(cross.get("brief"), dict):
        summary = {
            "headline": cross["brief"].get("headline") or "Latest 7-day regime context",
            "text": cross["brief"].get("plain") or _fallback_summary(chain_items)["text"],
        }
    else:
        summary = _fallback_summary(chain_items)

    payload: dict[str, Any] = {
        "schema": "urd_atlas.site_briefs_bundle.v1",
        "brief_status": "published" if any(item.get("brief_status") == "published" for item in chain_items) else "unavailable",
        "published_at": now_utc_iso(),
        "is_intraday": False,
        "summary": summary,
        "freshness": _freshness(chain_items),
        "chains": chain_items,
        "series_30d": series,
        "links": {
            "cross_chain": "data/published/v1/briefs/cross-chain/latest.json",
            "bitcoin": "data/published/v1/briefs/chains/bitcoin/latest.json",
            "ethereum": "data/published/v1/briefs/chains/ethereum/latest.json",
            "arbitrum": "data/published/v1/briefs/chains/arbitrum/latest.json",
            "base": "data/published/v1/briefs/chains/base/latest.json",
        },
        "guardrails": {
            "not_intraday": True,
            "not_prediction": True,
            "not_investment_advice": True,
            "language_policy": LANGUAGE_POLICY,
        },
        "plan_visibility": {
            "free": {
                "show_site_bundle_preview": True,
                "show_full_chain_brief_json": False,
                "show_cross_chain_json": False,
            },
            "single_chain": {
                "show_site_bundle_preview": True,
                "show_selected_chain_brief_json": True,
                "show_cross_chain_json": False,
            },
            "research": {
                "show_site_bundle_preview": True,
                "show_all_chain_briefs": True,
                "show_cross_chain_json": True,
            },
        },
        "validation": {
            "language_policy": LANGUAGE_POLICY,
            "language_validation_status": "pending",
            "banned_terms_found": [],
            "narrative_generated_from_templates": True,
        },
    }

    validation = validate_payload(payload, require_guardrail=False)
    payload["validation"] = validation
    if validation["language_validation_status"] != "passed":
        payload["brief_status"] = "degraded"
        payload["summary"] = {
            "headline": "Latest 7-day regime context",
            "text": "The latest 7 published days are available, but no narrative brief was generated.",
        }
    return payload


def write_site_bundle(root: Path) -> Path:
    payload = build_site_bundle(root)
    path = root / "briefs" / "site" / "latest.json"
    write_json(path, payload)
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Urd Atlas site brief bundle.")
    parser.add_argument("--root", default=None)
    args = parser.parse_args()
    root = resolve_published_root(args.root)
    print(write_site_bundle(root))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
