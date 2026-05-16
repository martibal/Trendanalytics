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


# ── Headline ──────────────────────────────────────────────────────────────────

def _headline(chain_name: str, labels: list[str], pattern: str) -> str:
    latest = labels[-1]
    dom, _ = dominant_label(labels)
    prev_dom, _ = previous_dominant_before_latest_run(labels)
    changes = count_label_changes(labels)
    run = latest_run_days(labels)

    if pattern == "volatile_mixed":
        return (
            f"{chain_name} showed a mixed regime path across the latest 7 published days."
        )

    if prev_dom and prev_dom != latest and pattern in {
        "congestion_relief", "cheap_to_normal", "heating_to_congested"
    }:
        return (
            f"{chain_name} moved from {prev_dom} into {latest} "
            f"during the latest published window."
        )

    if pattern == "degraded_or_low_confidence":
        if latest == "UNKNOWN/DEGRADED":
            return (
                f"{chain_name} closed the latest 7 published days with an "
                f"UNKNOWN/DEGRADED label due to reduced confidence support."
            )
        if dom and dom != latest:
            return (
                f"{chain_name} was {dom}-dominant in the 7-day window but "
                f"confidence weakened in recent published days."
            )

    if dom:
        if run >= 5:
            return (
                f"{chain_name} remained {dom}-dominant across the latest 7 published days, "
                f"with {dom} persisting for {run} consecutive days."
            )
        if changes == 0:
            return (
                f"{chain_name} remained {dom} without regime transitions "
                f"across the latest 7 published days."
            )
        return (
        f"{chain_name} remained {dom}-dominant across the latest 7 published days, "
        f"with {changes} regime transition(s) in the window."
    )

    return f"{chain_name} showed a mixed regime path across the latest 7 published days."


# ── Plain ─────────────────────────────────────────────────────────────────────

def _plain(
    chain_name: str,
    labels: list[str],
    pattern: str,
    observations: list[Any],
    conf_dir: str,
    conf_avg: float | None,
    conf_latest: float | None,
    run_days: int,
    changes: int,
    primary_axis: str,
    axis_transitions: dict[str, str],
) -> str:
    latest = labels[-1]
    dom, _ = dominant_label(labels)
    prev_dom, _ = previous_dominant_before_latest_run(labels)

    parts: list[str] = []

    # Opening: what dominated
    if pattern == "congestion_relief" and prev_dom:
        parts.append(
            f"{chain_name}'s latest 7 published days show a transition from "
            f"{prev_dom}-dominant conditions into {latest}."
        )
    elif pattern == "volatile_mixed":
        parts.append(
            f"{chain_name}'s latest 7 published days show a mixed regime path "
            f"with {changes} transition(s) — no single label dominated."
        )
    elif dom:
        parts.append(
            f"{chain_name}'s latest 7 published days were {dom}-dominant."
        )
    else:
        parts.append(
            f"{chain_name}'s latest 7 published days are available for structured regime context."
        )

    # Confidence: use actual numbers if available
    if conf_latest is not None and conf_avg is not None:
        conf_latest_str = f"{conf_latest:.3f}"
        conf_avg_str = f"{conf_avg:.3f}"
        if conf_dir == "weakening":
            parts.append(
                f"Confidence weakened across the window, averaging {conf_avg_str} "
                f"and closing at {conf_latest_str}."
            )
        elif conf_dir == "strengthening":
            parts.append(
                f"Confidence strengthened across the window, averaging {conf_avg_str} "
                f"and closing at {conf_latest_str}."
            )
        else:
            parts.append(
                f"Confidence was broadly stable across the window "
                f"(average {conf_avg_str}, latest {conf_latest_str})."
            )
    elif conf_dir == "weakening":
        parts.append("Confidence weakened across the 7-day window.")
    elif conf_dir == "strengthening":
        parts.append("Confidence strengthened across the 7-day window.")

    # Persistence of latest label
    if run_days <= 1:
        parts.append(
            f"The latest {latest} label is a one-day observation within the 7-day window."
        )
    elif run_days <= 3:
        parts.append(
            f"The latest {latest} label has been in place for {run_days} published days."
        )
    else:
        parts.append(
            f"The latest {latest} label has persisted for {run_days} consecutive published days."
        )

    # Primary driver with actual axis state if informative
    axis_t = axis_transitions.get(primary_axis, "unknown")
    axis_label = human_axis(primary_axis)
    if "_to_" in axis_t:
        parts_axis = axis_t.split("_to_", 1)
        old_state = human_state(parts_axis[0])
        new_state = human_state(parts_axis[1])
        parts.append(
            f"{axis_label.capitalize()} moved from {old_state} to {new_state} "
            f"during the window."
        )
    elif axis_t.endswith("_stable") and "normal" not in axis_t and "unknown" not in axis_t:
        state = human_state(axis_t.replace("_stable", ""))
        parts.append(
            f"{axis_label.capitalize()} remained {state} across the window."
        )
    else:
        # At minimum name the primary axis
        parts.append(
            f"The primary contributing axis was {axis_label}."
        )

    return " ".join(parts)


# ── Advanced ──────────────────────────────────────────────────────────────────

def _advanced(
    chain_name: str,
    labels: list[str],
    pattern: str,
    primary_axis: str,
    axis_transitions: dict[str, str],
    conf_dir: str,
    conf_avg: float | None,
    conf_latest: float | None,
    conf_min: float | None,
    run_days: int,
    changes: int,
    volatility: str,
    observations: list[Any],
) -> str:
    latest = labels[-1]
    parts: list[str] = []

    # Driver sentence
    axis_t = axis_transitions.get(primary_axis, "unknown")
    axis_label = human_axis(primary_axis)
    if "_to_" in axis_t:
        p = axis_t.split("_to_", 1)
        old_s, new_s = human_state(p[0]), human_state(p[1])
        if primary_axis == "friction":
            parts.append(f"Friction moved from {old_s} to {new_s}.")
        elif primary_axis == "capacity":
            parts.append(f"Capacity pressure moved from {old_s} to {new_s}.")
        else:
            parts.append(f"Demand moved from {old_s} to {new_s}.")
    else:
        parts.append(f"The change was primarily driven by {axis_label}.")

    # All three axes
    axis_summary: list[str] = []
    for ax in ("demand", "friction", "capacity"):
        t = axis_transitions.get(ax, "unknown")
        ax_label = human_axis(ax)
        if "_to_" in t:
            p = t.split("_to_", 1)
            axis_summary.append(f"{ax_label}: {human_state(p[0])} → {human_state(p[1])}")
        elif t.endswith("_stable"):
            state = human_state(t.replace("_stable", ""))
            axis_summary.append(f"{ax_label}: {state}")
    if axis_summary:
        parts.append(f"Scorecard axes — {'; '.join(axis_summary)}.")

    # Persistence
    if run_days <= 1:
        parts.append(f"The latest {latest} label is a single-day observation.")
    elif run_days <= 3:
        parts.append(
            f"The latest {latest} label has persisted for {run_days} published days "
            f"— recent rather than long-established."
        )
    else:
        parts.append(
            f"The latest {latest} label is supported by a {run_days}-day run "
            f"within the published window."
        )

    # Label changes and volatility
    if changes == 0:
        parts.append("No regime transitions were recorded in the 7-day window.")
    elif changes == 1:
        parts.append(f"One regime transition was recorded in the 7-day window ({volatility} volatility).")
    else:
        parts.append(f"{changes} regime transitions were recorded in the 7-day window ({volatility} volatility).")

    # Confidence with numbers
    if conf_latest is not None:
        conf_str = f"{conf_latest:.3f}"
        avg_str = f"{conf_avg:.3f}" if conf_avg is not None else "—"
        min_str = f"{conf_min:.3f}" if conf_min is not None else "—"
        if conf_dir == "strengthening":
            parts.append(
                f"Confidence strengthened across the latest 7 published days "
                f"(avg {avg_str}, min {min_str}, latest {conf_str})."
            )
        elif conf_dir == "weakening":
            parts.append(
                f"Confidence weakened across the latest 7 published days "
                f"(avg {avg_str}, min {min_str}, latest {conf_str})."
            )
        else:
            parts.append(
                f"Confidence remained broadly stable "
                f"(avg {avg_str}, min {min_str}, latest {conf_str})."
            )

    # Guardrail
    parts.append(GUARDRAIL_SENTENCE)

    return " ".join(parts)


# ── Narrative builder ─────────────────────────────────────────────────────────

def build_narrative(
    chain_name: str,
    labels: list[str],
    pattern: str,
    primary_axis: str,
    axis_transitions: dict[str, str],
    conf_dir: str,
    conf_avg: float | None,
    conf_latest: float | None,
    conf_min: float | None,
    run_days: int,
    changes: int,
    volatility: str,
    observations: list[Any],
) -> dict[str, str]:
    headline = _headline(chain_name, labels, pattern)
    plain = _plain(
        chain_name, labels, pattern, observations,
        conf_dir, conf_avg, conf_latest, run_days, changes, primary_axis, axis_transitions,
    )
    advanced = _advanced(
        chain_name, labels, pattern, primary_axis, axis_transitions,
        conf_dir, conf_avg, conf_latest, conf_min, run_days, changes, volatility, observations,
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


# ── Main builder ──────────────────────────────────────────────────────────────

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
    run = latest_run_days(labels)
    persistence = classify_persistence(run)
    volatility = volatility_from_changes(changes)
    conf_avg = stable_mean(confidences)
    conf_min_raw = [v for v in confidences if isinstance(v, (int, float))]
    conf_min = min(conf_min_raw) if conf_min_raw else None
    conf_dir = confidence_direction(confidences)
    conf_latest = latest_obs.confidence_score

    axis_transitions = {
        "demand":   axis_transition(observations, "demand"),
        "friction": axis_transition(observations, "friction"),
        "capacity": axis_transition(observations, "capacity"),
    }
    primary_axis = driver_primary_axis(observations, pattern)
    chain_name = chain_display_name(chain)

    narrative = build_narrative(
        chain_name, labels, pattern, primary_axis, axis_transitions,
        conf_dir,
        round(conf_avg, 4) if conf_avg is not None else None,
        round(conf_latest, 4) if conf_latest is not None else None,
        round(conf_min, 4) if conf_min is not None else None,
        run, changes, volatility, observations,
    )

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
            "latest_label_run_days": run,
            "label_changes": changes,
            "volatility": volatility,
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
    parser.add_argument("--root", default=None)
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
