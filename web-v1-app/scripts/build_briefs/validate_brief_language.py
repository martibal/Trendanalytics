from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

from briefs_common import GUARDRAIL_SENTENCE, LANGUAGE_POLICY, read_json

POLICY_PATH = Path(__file__).with_name("brief_language_policy_v1.json")


def load_policy() -> dict[str, Any]:
    payload = read_json(POLICY_PATH)
    if not isinstance(payload, dict):
        raise RuntimeError(f"Could not read language policy: {POLICY_PATH}")
    return payload


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def get_nested(payload: Any, path: str) -> list[str]:
    """Collect narrative values from a small dot-path syntax.

    Supported syntax: a.b.c and arrays with [] such as chains[].headline.
    """
    parts = path.split(".")
    current: list[Any] = [payload]
    for part in parts:
        next_values: list[Any] = []
        if part.endswith("[]"):
            key = part[:-2]
            for item in current:
                if isinstance(item, dict):
                    next_values.extend(_as_list(item.get(key)))
        else:
            for item in current:
                if isinstance(item, dict) and part in item:
                    next_values.append(item.get(part))
        current = next_values
    return [str(item) for item in current if isinstance(item, str) and item.strip()]


def narrative_texts(payload: dict[str, Any]) -> dict[str, list[str]]:
    fields = {
        "brief.headline": get_nested(payload, "brief.headline"),
        "brief.plain": get_nested(payload, "brief.plain"),
        "brief.advanced": get_nested(payload, "brief.advanced"),
        "cross_chain.brief.headline": get_nested(payload, "cross_chain.brief.headline"),
        "cross_chain.brief.plain": get_nested(payload, "cross_chain.brief.plain"),
        "cross_chain.brief.advanced": get_nested(payload, "cross_chain.brief.advanced"),
        "summary.headline": get_nested(payload, "summary.headline"),
        "summary.text": get_nested(payload, "summary.text"),
        "chains[].headline": get_nested(payload, "chains[].headline"),
    }
    return {k: v for k, v in fields.items() if v}


def _phrase_pattern(phrase: str) -> re.Pattern[str]:
    escaped = re.escape(phrase.lower())
    if re.fullmatch(r"[a-z0-9_-]+", phrase.lower()):
        return re.compile(rf"(?<![a-z0-9_-]){escaped}(?![a-z0-9_-])", re.IGNORECASE)
    return re.compile(escaped, re.IGNORECASE)


def find_banned_terms(text: str, policy: dict[str, Any]) -> list[str]:
    blocked = policy.get("hard_blocked_phrases", {})
    found: list[str] = []
    if isinstance(blocked, dict):
        for phrases in blocked.values():
            if not isinstance(phrases, list):
                continue
            for phrase in phrases:
                if not isinstance(phrase, str) or not phrase.strip():
                    continue
                if _phrase_pattern(phrase.strip()).search(text):
                    found.append(phrase.strip())
    return sorted(set(found))


def _source_window_dates(payload: dict[str, Any]) -> set[str]:
    dates: set[str] = set()
    window = payload.get("window")
    if isinstance(window, dict):
        for key in ("start_date", "end_date", "updated_through"):
            value = window.get(key)
            if isinstance(value, str):
                dates.add(value)
    provenance = payload.get("provenance")
    if isinstance(provenance, dict):
        for item in _as_list(provenance.get("source_files")):
            if isinstance(item, dict) and isinstance(item.get("date"), str):
                dates.add(item["date"])
    return dates


def _text_dates(text: str) -> set[str]:
    return set(re.findall(r"\b\d{4}-\d{2}-\d{2}\b", text))


def validate_payload(payload: dict[str, Any], require_guardrail: bool = True) -> dict[str, Any]:
    policy = load_policy()
    fields = narrative_texts(payload)
    all_text = "\n".join(text for values in fields.values() for text in values)
    banned = find_banned_terms(all_text, policy)

    errors: list[str] = []
    if banned:
        errors.append("banned_terms_found")

    if require_guardrail and all_text and GUARDRAIL_SENTENCE not in all_text:
        schema = str(payload.get("schema") or "")
        # The site bundle can carry guardrails structurally; full chain/cross-chain briefs need the sentence in narrative text.
        if not schema.endswith("site_briefs_bundle.v1"):
            errors.append("missing_guardrail_sentence")

    source_dates = _source_window_dates(payload)
    referenced_dates = _text_dates(all_text)
    if source_dates and referenced_dates and not referenced_dates.issubset(source_dates):
        errors.append("narrative_references_dates_outside_source_window")

    return {
        "language_policy": LANGUAGE_POLICY,
        "language_validation_status": "passed" if not errors else "failed",
        "banned_terms_found": banned,
        "errors": errors,
        "validated_fields": sorted(fields.keys()),
        "narrative_generated_from_templates": True,
    }


def validate_file(path: Path, require_guardrail: bool = True) -> dict[str, Any]:
    payload = read_json(path)
    if not isinstance(payload, dict):
        raise ValueError(f"Expected JSON object: {path}")
    return validate_payload(payload, require_guardrail=require_guardrail)


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Urd Atlas Regime Brief narrative language.")
    parser.add_argument("files", nargs="+", help="JSON files to validate")
    parser.add_argument("--no-require-guardrail", action="store_true")
    args = parser.parse_args()

    failed = False
    for item in args.files:
        path = Path(item)
        result = validate_file(path, require_guardrail=not args.no_require_guardrail)
        print(json.dumps({"file": str(path), **result}, ensure_ascii=False, indent=2))
        if result["language_validation_status"] != "passed":
            failed = True
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
