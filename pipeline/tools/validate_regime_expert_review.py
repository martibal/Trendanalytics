#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter
from pathlib import Path

REQUIRED = ["chain", "date", "published_regime", "reviewer_assessment", "reviewer_confidence", "reason"]
ASSESSMENTS = {"agree", "disagree", "uncertain", "pending"}
CONFIDENCE = {"high", "medium", "low", "pending"}


def validate(path: Path, allow_pending: bool) -> tuple[list[str], dict]:
    errors: list[str] = []
    rows = list(csv.DictReader(path.open(encoding="utf-8", newline="")))
    if not rows:
        return ["review file contains no rows"], {}
    missing = [c for c in REQUIRED if c not in (rows[0].keys() if rows else [])]
    if missing:
        return ["missing columns: " + ", ".join(missing)], {}

    counts = Counter()
    for i, row in enumerate(rows, start=2):
        assessment = (row.get("reviewer_assessment") or "").strip().lower()
        confidence = (row.get("reviewer_confidence") or "").strip().lower()
        if assessment not in ASSESSMENTS:
            errors.append(f"line {i}: invalid reviewer_assessment={assessment!r}")
        if confidence not in CONFIDENCE:
            errors.append(f"line {i}: invalid reviewer_confidence={confidence!r}")
        if not allow_pending and (assessment == "pending" or confidence == "pending"):
            errors.append(f"line {i}: pending review remains")
        if assessment:
            counts[assessment] += 1
    completed = counts["agree"] + counts["disagree"] + counts["uncertain"]
    agreement = (counts["agree"] / completed) if completed else None
    summary = {"rows": len(rows), "completed": completed, "pending": counts["pending"], "agreement_rate_excluding_pending": agreement}
    return errors, summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate the independent regime-review rubric and compute agreement once human reviews have been entered.")
    parser.add_argument("review_file")
    parser.add_argument("--allow-pending", action="store_true")
    args = parser.parse_args()
    errors, summary = validate(Path(args.review_file), args.allow_pending)
    print(json.dumps(summary, indent=2, sort_keys=True))
    if errors:
        for error in errors:
            print("REGIME REVIEW VALIDATION: " + error, file=sys.stderr)
        return 1
    print("REGIME REVIEW PROTOCOL PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
