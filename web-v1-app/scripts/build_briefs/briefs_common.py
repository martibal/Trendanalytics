from __future__ import annotations

import json
import math
import os
import re
import shutil
from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Iterable

CHAINS: tuple[str, ...] = ("bitcoin", "ethereum", "arbitrum", "base")
CHAIN_LABELS: dict[str, str] = {
    "bitcoin": "Bitcoin",
    "ethereum": "Ethereum",
    "arbitrum": "Arbitrum",
    "base": "Base",
}
ALLOWED_LABELS: tuple[str, ...] = (
    "STABLE",
    "HEATING",
    "CONGESTED",
    "CHEAP",
    "UNKNOWN/DEGRADED",
)
LABEL_COLORS: dict[str, str] = {
    "STABLE": "#00c97a",
    "HEATING": "#f5a623",
    "CONGESTED": "#ff4d4d",
    "CHEAP": "#3b82f6",
    "UNKNOWN/DEGRADED": "#6b7280",
}
BRIEF_VERSION = "briefs_v1.0"
LANGUAGE_POLICY = "urd_atlas_brief_language_v1"
GUARDRAIL_SENTENCE = (
    "Data cadence: daily, not intraday. This is descriptive regime context, "
    "not a prediction or recommendation."
)
ISO_DAY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
DATE_FILE_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})\.json$")


@dataclass(frozen=True)
class AxisSnapshot:
    raw_level: str | None
    normalized_state: str
    score: float | None


@dataclass(frozen=True)
class MetaObservation:
    chain: str
    date: str
    updated_through: str
    label: str
    confidence_score: float | None
    status: str | None
    axes: dict[str, AxisSnapshot]
    primary_driver: str | None
    methodology_version: str | None
    determinism_hash: str | None
    meta_path: str


def resolve_published_root(explicit_root: str | None = None) -> Path:
    """Resolve the published v1 root used by the local pipeline.

    Priority:
    1. explicit --root argument
    2. URD_PUBLISHED_ROOT env var
    3. public/data/published/v1 if present
    4. data/published/v1 if present
    5. public/data/published/v1 as the default write target
    """
    if explicit_root:
        return Path(explicit_root).expanduser().resolve()

    env_root = os.environ.get("URD_PUBLISHED_ROOT", "").strip()
    if env_root:
        return Path(env_root).expanduser().resolve()

    public_root = Path("public/data/published/v1")
    data_root = Path("data/published/v1")
    if public_root.exists():
        return public_root.resolve()
    if data_root.exists():
        return data_root.resolve()
    return public_root.resolve()


def read_json(path: Path) -> Any | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON at {path}: {exc}") from exc


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=False) + "\n",
        encoding="utf-8",
    )


def copy_to_latest(date_path: Path, latest_path: Path) -> None:
    latest_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(date_path, latest_path)


def today_utc_iso() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_iso_day(value: str | None) -> date | None:
    if not value or not ISO_DAY_RE.match(value):
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def lag_days(updated_through: str | None) -> int | None:
    parsed = parse_iso_day(updated_through)
    if parsed is None:
        return None
    return max(0, (datetime.now(timezone.utc).date() - parsed).days)


def normalize_label(value: Any) -> str:
    raw = str(value or "").strip().upper().replace(" ", "_")
    if raw in ALLOWED_LABELS:
        return raw
    if raw in {"UNKNOWN", "DEGRADED", "UNKNOWN_DEGRADED", "UNKNOWN/DEGRADED"}:
        return "UNKNOWN/DEGRADED"
    return "UNKNOWN/DEGRADED"


def safe_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(f):
        return None
    return f


def stable_mean(values: Iterable[float | None]) -> float | None:
    cleaned = [float(v) for v in values if isinstance(v, (int, float)) and math.isfinite(float(v))]
    if not cleaned:
        return None
    return sum(cleaned) / len(cleaned)


def axis_state(axis: str, level: Any, score: Any = None) -> str:
    """Normalize Meta scorecard levels into brief-friendly states.

    This mirrors the public scorecard semantics documented by the site:
    - High / >= 67 means elevated pressure or elevated activity.
    - Low / <= 33 means low activity or low friction/capacity pressure.
    - Normal / neutral / medium means normal.

    Capacity is *not* inverted here. In Urd Atlas, a high capacity score means
    the network is closer to operational limits / capacity pressure is elevated.
    """
    text = str(level or "").strip().lower().replace("_", " ")
    numeric = safe_float(score)

    high_words = ("high", "elevated", "above", "hot", "strong", "stretched")
    low_words = ("low", "below", "depressed", "cheap", "soft")

    has_high = any(word in text for word in high_words)
    has_low = any(word in text for word in low_words)

    if has_high:
        return "elevated"
    if has_low:
        return "low"
    if numeric is not None:
        if numeric >= 67:
            return "elevated"
        if numeric <= 33:
            return "low"
        return "normal"
    if text in {"normal", "neutral", "baseline", "moderate", "medium", "balanced"}:
        return "normal"
    return "unknown"


def axis_from_scorecard(meta: dict[str, Any]) -> dict[str, AxisSnapshot]:
    out: dict[str, AxisSnapshot] = {}
    scorecard = meta.get("scorecard") if isinstance(meta, dict) else None
    dimensions: Any = None

    if isinstance(scorecard, dict):
        raw_dimensions = scorecard.get("dimensions")

        # Current Urd Atlas Meta shape:
        # scorecard.dimensions.demand/friction/capacity = { score, level, ... }
        if isinstance(raw_dimensions, dict):
            dimensions = []
            for key in ("demand", "friction", "capacity"):
                raw = raw_dimensions.get(key)
                if isinstance(raw, dict):
                    dimensions.append({"key": key, **raw})

        # Older/alternate shape:
        # scorecard.dimensions = [{ key/axis/label, score, level }, ...]
        elif isinstance(raw_dimensions, list):
            dimensions = raw_dimensions

        # Flat fallback:
        # scorecard.demand/friction/capacity = { score, level, ... }
        elif any(k in scorecard for k in ("demand", "friction", "capacity")):
            dimensions = []
            for key in ("demand", "friction", "capacity"):
                raw = scorecard.get(key)
                if isinstance(raw, dict):
                    dimensions.append({"key": key, **raw})

    if isinstance(dimensions, list):
        for item in dimensions:
            if not isinstance(item, dict):
                continue
            key = str(item.get("key") or item.get("axis") or item.get("label") or "").strip().lower()
            if key not in {"demand", "friction", "capacity"}:
                continue
            raw_level = item.get("level")
            score = safe_float(item.get("score"))
            out[key] = AxisSnapshot(
                raw_level=str(raw_level) if raw_level is not None else None,
                normalized_state=axis_state(key, raw_level, score),
                score=score,
            )

    for key in ("demand", "friction", "capacity"):
        out.setdefault(key, AxisSnapshot(raw_level=None, normalized_state="unknown", score=None))
    return out


def primary_driver_axis(meta: dict[str, Any], axes: dict[str, AxisSnapshot]) -> str | None:
    drivers = meta.get("drivers") if isinstance(meta, dict) else None
    if isinstance(drivers, list):
        for item in drivers:
            if isinstance(item, dict):
                axis = str(item.get("axis") or "").strip().lower()
                if axis in {"demand", "friction", "capacity"}:
                    return axis

    # fallback: choose the strongest non-normal axis by distance from neutral
    ranked: list[tuple[float, str]] = []
    for axis, snap in axes.items():
        if snap.score is None:
            continue
        ranked.append((abs(float(snap.score) - 50.0), axis))
    if ranked:
        return sorted(ranked, reverse=True)[0][1]
    return None


def extract_methodology_version(payload: dict[str, Any], layer_name: str) -> str | None:
    candidates = (
        payload.get("methodology_version"),
        payload.get(f"{layer_name}_methodology_version"),
        payload.get("version"),
    )
    for candidate in candidates:
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()
    methodology = payload.get("methodology")
    if isinstance(methodology, dict):
        version = methodology.get("version") or methodology.get("methodology_version")
        if isinstance(version, str) and version.strip():
            return version.strip()
    return None


def source_relative_path(root: Path, path: Path) -> str:
    try:
        return str(path.relative_to(root).as_posix())
    except ValueError:
        return str(path.as_posix())


def list_date_json_files(directory: Path) -> list[Path]:
    if not directory.exists() or not directory.is_dir():
        return []
    files = [p for p in directory.iterdir() if p.is_file() and DATE_FILE_RE.match(p.name)]
    return sorted(files, key=lambda p: p.name)


def load_meta_observation(root: Path, chain: str, path: Path) -> MetaObservation:
    payload = read_json(path)
    if not isinstance(payload, dict):
        raise ValueError(f"Meta file is not an object: {path}")

    match = DATE_FILE_RE.match(path.name)
    file_day = match.group(1) if match else None

    status_obj = payload.get("status") if isinstance(payload.get("status"), dict) else None
    regime_obj = payload.get("regime") if isinstance(payload.get("regime"), dict) else None

    # Match the existing website parser in src/lib/mobile/data.ts:
    # public final label prefers status.label, then regime.label, then top-level label.
    label = normalize_label(
        (status_obj or {}).get("label")
        or (regime_obj or {}).get("label")
        or payload.get("label")
    )

    # Historical observations are keyed by their dated JSON filename. Do not let
    # a repeated updated_through field collapse all rows onto the latest date.
    observation_date = (
        payload.get("date")
        or ((regime_obj or {}).get("asof_date") if regime_obj else None)
        or file_day
    )
    if not isinstance(observation_date, str) or not ISO_DAY_RE.match(observation_date):
        observation_date = file_day or today_utc_iso()

    updated = payload.get("updated_through") or observation_date
    if not isinstance(updated, str) or not ISO_DAY_RE.match(updated):
        updated = observation_date

    confidence = None
    if isinstance(payload.get("confidence"), dict):
        confidence = safe_float(payload["confidence"].get("confidence_score"))
    if confidence is None:
        confidence = safe_float(payload.get("confidence_score"))

    axes = axis_from_scorecard(payload)
    status = None
    if isinstance(payload.get("status"), dict):
        status_raw = payload["status"].get("label")
        status = str(status_raw) if status_raw is not None else None

    determinism_hash = None
    if isinstance(payload.get("regime"), dict):
        dh = payload["regime"].get("determinism_hash")
        determinism_hash = str(dh) if dh is not None else None

    return MetaObservation(
        chain=chain,
        date=observation_date,
        updated_through=updated,
        label=label,
        confidence_score=confidence,
        status=status,
        axes=axes,
        primary_driver=primary_driver_axis(payload, axes),
        methodology_version=extract_methodology_version(payload, "meta"),
        determinism_hash=determinism_hash,
        meta_path=source_relative_path(root, path),
    )


def load_latest_meta_window(root: Path, chain: str, days: int) -> list[MetaObservation]:
    meta_dir = root / "meta" / chain
    files = list_date_json_files(meta_dir)
    if not files:
        return []
    selected = files[-days:]
    return [load_meta_observation(root, chain, path) for path in selected]


def label_counts(labels: list[str]) -> Counter[str]:
    return Counter(labels)


def dominant_label(labels: list[str]) -> tuple[str | None, int]:
    if not labels:
        return None, 0
    counts = label_counts(labels)
    order = {label: i for i, label in enumerate(ALLOWED_LABELS)}
    label, count = sorted(counts.items(), key=lambda kv: (-kv[1], order.get(kv[0], 999)))[0]
    return label, int(count)


def latest_run_days(labels: list[str]) -> int:
    if not labels:
        return 0
    latest = labels[-1]
    total = 0
    for label in reversed(labels):
        if label != latest:
            break
        total += 1
    return total


def previous_dominant_before_latest_run(labels: list[str]) -> tuple[str | None, int]:
    run = latest_run_days(labels)
    remaining = labels[: max(0, len(labels) - run)]
    return dominant_label(remaining)


def count_label_changes(labels: list[str]) -> int:
    return sum(1 for a, b in zip(labels, labels[1:]) if a != b)


def volatility_from_changes(label_changes: int) -> str:
    if label_changes <= 1:
        return "low"
    if label_changes == 2:
        return "moderate"
    return "high"


def confidence_direction(values: list[float | None]) -> str:
    cleaned = [v for v in values if isinstance(v, (int, float)) and math.isfinite(float(v))]
    if len(cleaned) < 2:
        return "unknown"
    delta = float(cleaned[-1]) - float(cleaned[0])
    if delta >= 0.05:
        return "strengthening"
    if delta <= -0.05:
        return "weakening"
    return "stable"


def axis_transition(observations: list[MetaObservation], axis: str) -> str:
    states = [obs.axes.get(axis, AxisSnapshot(None, "unknown", None)).normalized_state for obs in observations]
    states = [s for s in states if s != "unknown"]
    if not states:
        return "unknown"
    start, end = states[0], states[-1]
    if start == end:
        return f"{end}_stable"
    return f"{start}_to_{end}"


def axis_state_counts(observations: list[MetaObservation], axis: str) -> Counter[str]:
    return Counter(
        obs.axes.get(axis, AxisSnapshot(None, "unknown", None)).normalized_state for obs in observations
    )


def classify_chain_pattern(observations: list[MetaObservation]) -> str:
    labels = [obs.label for obs in observations]
    if len(labels) < 7:
        return "unavailable"

    counts = label_counts(labels)
    changes = count_label_changes(labels)
    avg_conf = stable_mean([obs.confidence_score for obs in observations])
    latest_label = labels[-1]
    dom, _ = dominant_label(labels)
    prev_dom, _ = previous_dominant_before_latest_run(labels)
    friction_counts = axis_state_counts(observations, "friction")
    capacity_counts = axis_state_counts(observations, "capacity")
    demand_counts = axis_state_counts(observations, "demand")
    friction_transition = axis_transition(observations, "friction")

    if counts["UNKNOWN/DEGRADED"] >= 2 or (avg_conf is not None and avg_conf < 0.50):
        return "degraded_or_low_confidence"

    if (
        prev_dom == "CONGESTED"
        and latest_label in {"CHEAP", "STABLE"}
        and friction_transition in {"elevated_to_low", "elevated_to_normal"}
    ):
        return "congestion_relief"

    if counts["CONGESTED"] >= 4 and latest_label in {"CONGESTED", "STABLE"} and (
        friction_counts["elevated"] >= 4 or capacity_counts["elevated"] >= 4
    ):
        return "persistent_congestion"

    if counts["STABLE"] >= 5 and changes <= 2:
        return "persistent_stable"

    if counts["HEATING"] >= 3 and demand_counts["elevated"] >= 3 and friction_counts["elevated"] < 4:
        return "demand_led_heating"

    if counts["CHEAP"] >= 4 and friction_counts["low"] >= 4:
        return "low_friction_window"

    if dom == "CHEAP" and latest_label == "STABLE" and changes <= 2:
        return "cheap_to_normal"

    early = labels[:4]
    late = labels[3:]
    if early.count("HEATING") >= 2 and late.count("CONGESTED") >= 2 and changes >= 2:
        return "heating_to_congested"

    if changes >= 3 and all(v < 4 for v in counts.values()):
        return "volatile_mixed"

    return "volatile_mixed" if changes >= 3 else f"{str(dom or 'mixed').lower()}_dominant"


def classify_persistence(latest_run: int) -> str:
    if latest_run <= 1:
        return "one_day_observation"
    if latest_run <= 3:
        return "recent_but_not_long_established"
    return "multi_day_regime_within_window"


def driver_primary_axis(observations: list[MetaObservation], pattern: str) -> str:
    if pattern in {"congestion_relief", "low_friction_window", "persistent_congestion"}:
        return "friction"
    if pattern == "demand_led_heating":
        return "demand"
    if pattern == "heating_to_congested":
        return "capacity"
    drivers = [obs.primary_driver for obs in observations if obs.primary_driver]
    if drivers:
        return Counter(drivers).most_common(1)[0][0]
    return "friction"


def human_axis(axis: str) -> str:
    return {
        "demand": "demand",
        "friction": "friction",
        "capacity": "capacity pressure",
    }.get(axis, axis)


def human_state(state: str) -> str:
    return state.replace("_", " ")


def chain_display_name(chain: str) -> str:
    return CHAIN_LABELS.get(chain, chain.capitalize())


def build_source_methodology_versions(root: Path, chain: str, observations: list[MetaObservation]) -> dict[str, list[str]]:
    meta_versions = sorted({obs.methodology_version for obs in observations if obs.methodology_version})
    versions: dict[str, list[str]] = {"meta": meta_versions or ["unknown"]}

    for layer in ("derived", "gold"):
        layer_versions: set[str] = set()
        for obs in observations:
            candidate = root / layer / chain / f"{obs.date}.json"
            payload = read_json(candidate)
            if isinstance(payload, dict):
                version = extract_methodology_version(payload, layer)
                if version:
                    layer_versions.add(version)
        versions[layer] = sorted(layer_versions) or ["unknown"]

    return versions


def source_files(root: Path, chain: str, observations: list[MetaObservation]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for obs in observations:
        item: dict[str, Any] = {
            "date": obs.date,
            "meta_path": f"data/published/v1/meta/{chain}/{obs.date}.json",
            "derived_path": f"data/published/v1/derived/{chain}/{obs.date}.json",
            "gold_path": f"data/published/v1/gold/{chain}/{obs.date}.json",
        }
        if obs.methodology_version:
            item["meta_methodology_version"] = obs.methodology_version
        if obs.determinism_hash:
            item["determinism_hash"] = obs.determinism_hash
        out.append(item)
    return out


def unavailable_chain_brief(chain: str, reason: str = "not_enough_published_meta_observations") -> dict[str, Any]:
    return {
        "schema": "urd_atlas.chain_7d_brief.v1",
        "brief_status": "unavailable",
        "chain": chain,
        "window": {
            "kind": "latest_published_days",
            "days": 7,
            "start_date": None,
            "end_date": None,
            "updated_through": None,
            "is_intraday": False,
        },
        "latest": {"label": None, "confidence_score": None, "status": None},
        "brief": {
            "headline": "The latest 7 published days are not available for this chain.",
            "plain": None,
            "advanced": None,
        },
        "unavailable_reason": reason,
        "guardrails": {
            "not_intraday": True,
            "not_prediction": True,
            "not_investment_advice": True,
            "language_policy": LANGUAGE_POLICY,
        },
        "validation": {
            "language_policy": LANGUAGE_POLICY,
            "language_validation_status": "not_applicable",
            "banned_terms_found": [],
            "narrative_generated_from_templates": True,
        },
        "provenance": {
            "source_layers": ["meta", "derived", "gold"],
            "briefs_methodology_version": BRIEF_VERSION,
            "source_methodology_versions": {"meta": ["unknown"], "derived": ["unknown"], "gold": ["unknown"]},
            "source_files": [],
        },
    }
