from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from briefs_common import (
    ALLOWED_LABELS,
    BRIEF_VERSION,
    GUARDRAIL_SENTENCE,
    LANGUAGE_POLICY,
    CHAINS,
    axis_transition,
    build_source_methodology_versions,
    chain_display_name,
    classify_chain_pattern,
    classify_persistence,
    confidence_direction,
    copy_to_latest,
    count_label_changes,
    dominant_label,
    driver_primary_axis,
    human_axis,
    human_state,
    label_counts,
    latest_run_days,
    load_latest_meta_window,
    now_utc_iso,
    previous_dominant_before_latest_run,
    resolve_published_root,
    source_files,
    stable_mean,
    unavailable_chain_brief,
    volatility_from_changes,
    write_json,
)
from validate_brief_language import validate_payload


def transition_name(previous_label: str | None, latest_label: str | None) -> str | None:
    if not previous_label or not latest_label:
        return None
    return f"{previous_label}_TO_{latest_label}"


def movement_type(pattern: str) -> str:
    return pattern


def _headline(chain_name: str, labels: list[str], pattern: str) -> str:
    latest = labels[-1]
    if pattern == "volatile_mixed":
        return f"{chain_name} showed a mixed regime path across the latest 7 published days."
    prev_dom, _ = previous_dominant_before_latest_run(labels)
    if prev_dom and prev_dom != latest and pattern in {"congestion_relief", "cheap_to_normal", "heating_to_congested"}:
        return f"{chain_name} moved from {prev_dom} into {latest} during the latest published window."
    dom, _ = dominant_label(labels)
    if dom:
        return f"{chain_name} remained {dom}-dominant across the latest 7 published days."
    return f"{chain_name} showed a mixed regime path across the latest 7 published days."


def _plain(chain_name: str, labels: list[str], pattern: str) -> str:
    latest = labels[-1]
    prev_dom, _ = previous_dominant_before_latest_run(labels)
    dom, _ = dominant_label(labels)

    if pattern == "congestion_relief" and prev_dom:
        return (
            f"{chain_name}'s latest 7 published days show a recent transition from a "
            f"{prev_dom}-dominant period into a {latest} regime."
        )
    if pattern == "volatile_mixed":
        return f"{chain_name}'s latest 7 published days show a mixed regime path rather than one dominant regime."
    if dom:
        return f"{chain_name}'s latest 7 published days were {dom}-dominant within the published window."
    return f"{chain_name}'s latest 7 published days are available for structured regime context."


def _driver_sentence(axis: str, transition: str) -> str:
    axis_label = human_axis(axis)
    parts = transition.split("_to_", 1)
    if len(parts) == 2:
        old, new = human_state(parts[0]), human_state(parts[1])
        if axis == "friction":
            return f"Friction moved from {old} to {new}."
        if axis == "capacity":
            return f"Capacity pressure moved from {old} to {new}."
        if axis == "demand":
            return f"Demand moved from {old} to {new}."
    return f"The change was primarily driven by {axis_label}."


def _persistence_sentence(latest_label: str, run_days: int) -> str:
    if run_days <= 1:
        return f"The latest {latest_label} label is a one-day observation within the 7-day window."
    return f"The latest {latest_label} label has persisted for {run_days} published days."


def _confidence_sentence(direction: str) -> str:
    if direction == "strengthening":
        return "Confidence strengthened across the latest 7 published days."
    if direction == "weakening":
        return "Confidence weakened across the latest 7 published days."
    return "Confidence remained broadly stable across the latest 7 published days."


def build_narrative(chain_name: str, labels: list[str], pattern: str, primary_axis: str, axis_transitions: dict[str, str], conf_direction: str) -> dict[str, str]:
    latest = labels[-1]
    run_days = latest_run_days(labels)
    headline = _headline(chain_name, labels, pattern)
    plain = _plain(chain_name, labels, pattern)
    driver = _driver_sentence(primary_axis, axis_transitions.get(primary_axis, "unknown"))
    persistence = _persistence_sentence(latest, run_days)
    confidence = _confidence_sentence(conf_direction)
    recent_sentence = "The latest regime is recent rather than long-established."

    advanced = " ".join(
        [
            driver,
            persistence,
            recent_sentence if run_days <= 3 else "The latest regime is supported by a multi-day run within the published window.",
            confidence,
            GUARDRAIL_SENTENCE,
        ]
    )

    return {"headline": headline, "plain": plain, "advanced": advanced}


def degrade_narrative(payload: dict[str, Any], validation: dict[str, Any]) -> dict[str, Any]:
    degraded = dict(payload)
    degraded["brief_status"] = "degraded"
    degraded["brief"] = {
        "headline": "The latest 7 published days are available, but no narrative brief was generated.",
        "plain": None,
        "advanced": None,
    }
    degraded["validation"] = {
        "language_policy": LANGUAGE_POLICY,
        "language_validation_status": "failed",
        "fallback_used": True,
        "banned_terms_found": validation.get("banned_terms_found", []),
        "errors": validation.get("errors", []),
        "narrative_generated_from_templates": True,
    }
    return degraded


def build_chain_brief(root: Path, chain: str) -> dict[str, Any]:
    observations = load_latest_meta_window(root, chain, 7)
    if len(observations) < 7:
        return unavailable_chain_brief(chain)

    labels = [obs.label for obs in observations]
    confidences = [obs.confidence_score for obs in observations]
    latest_obs = observations[-1]
    dom, dom_days = dominant_label(labels)
    prev_dom, prev_dom_days = previous_dominant_before_latest_run(labels)
    changes = count_label_changes(labels)
    pattern = classify_chain_pattern(observations)
    latest_run = latest_run_days(labels)
    persistence = classify_persistence(latest_run)
    conf_avg = stable_mean(confidences)
    conf_min = min([v for v in confidences if isinstance(v, (int, float))], default=None)
    conf_dir = confidence_direction(confidences)
    axis_transitions = {
        "demand": axis_transition(observations, "demand"),
        "friction": axis_transition(observations, "friction"),
        "capacity": axis_transition(observations, "capacity"),
    }
    primary_axis = driver_primary_axis(observations, pattern)
    chain_name = chain_display_name(chain)
    narrative = build_narrative(chain_name, labels, pattern, primary_axis, axis_transitions, conf_dir)

    payload: dict[str, Any] = {
        "schema": "urd_atlas.chain_7d_brief.v1",
        "brief_status": "published",
        "chain": chain,
        "window": {
            "kind": "latest_published_days",
            "days": 7,
            "start_date": observations[0].date,
            "end_date": latest_obs.date,
            "updated_through": latest_obs.updated_through,
            "is_intraday": False,
        },
        "latest": {
            "label": latest_obs.label,
            "confidence_score": latest_obs.confidence_score,
            "status": latest_obs.status,
        },
        "regime_path": {
            "labels": labels,
            "dominant_label": dom,
            "dominant_label_days": dom_days,
            "previous_dominant_label": prev_dom,
            "previous_dominant_label_days": prev_dom_days,
            "latest_label_run_days": latest_run,
            "label_changes": changes,
            "volatility": volatility_from_changes(changes),
        },
        "movement": {
            "type": movement_type(pattern),
            "transition": transition_name(prev_dom, latest_obs.label),
            "persistence": persistence,
        },
        "drivers": {
            "primary_axis": primary_axis,
            "friction": axis_transitions["friction"],
            "capacity": axis_transitions["capacity"],
            "demand": axis_transitions["demand"],
        },
        "confidence": {
            "latest": latest_obs.confidence_score,
            "average_7d": round(conf_avg, 4) if conf_avg is not None else None,
            "direction": conf_dir,
            "minimum_7d": round(conf_min, 4) if conf_min is not None else None,
        },
        "brief": narrative,
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
            "source_layers": ["meta", "derived", "gold"],
            "briefs_methodology_version": BRIEF_VERSION,
            "source_methodology_versions": build_source_methodology_versions(root, chain, observations),
            "source_files": source_files(root, chain, observations),
            "generated_at": now_utc_iso(),
        },
    }

    validation = validate_payload(payload, require_guardrail=True)
    if validation["language_validation_status"] != "passed":
        return degrade_narrative(payload, validation)
    payload["validation"] = validation
    return payload


def build_all_chain_briefs(root: Path, chains: tuple[str, ...] = CHAINS) -> list[Path]:
    written: list[Path] = []
    out_root = root / "briefs" / "chains"
    for chain in chains:
        payload = build_chain_brief(root, chain)
        end_date = payload.get("window", {}).get("end_date") if isinstance(payload.get("window"), dict) else None
        date_name = end_date if isinstance(end_date, str) and end_date else "unavailable"
        date_path = out_root / chain / f"{date_name}.json"
        latest_path = out_root / chain / "latest.json"
        write_json(date_path, payload)
        copy_to_latest(date_path, latest_path)
        written.extend([date_path, latest_path])
    return written


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Urd Atlas 7-day chain regime briefs.")
    parser.add_argument("--root", default=None, help="Published v1 root. Defaults to public/data/published/v1 or data/published/v1.")
    parser.add_argument("--chain", choices=list(CHAINS), default=None)
    args = parser.parse_args()

    root = resolve_published_root(args.root)
    chains = (args.chain,) if args.chain else CHAINS
    written = build_all_chain_briefs(root, chains=chains)
    for path in written:
        print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
