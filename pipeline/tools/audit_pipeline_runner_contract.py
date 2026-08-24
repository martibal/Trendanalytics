#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

EXPECTED_RUNNER = "runs-on: windows-latest"
EXPECTED_TIMEOUT = "timeout-minutes: 180"
DECISION_DOC = Path("docs/pipeline-runner-decision.md")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Guard the explicit Data Pipeline runner/time-budget decision."
    )
    parser.add_argument("--workflow", default=".github/workflows/pipeline.yml")
    args = parser.parse_args()

    workflow = Path(args.workflow)
    text = workflow.read_text(encoding="utf-8")
    errors: list[str] = []
    if EXPECTED_RUNNER not in text:
        errors.append(f"expected explicit runner contract {EXPECTED_RUNNER!r}")
    if EXPECTED_TIMEOUT not in text:
        errors.append(f"expected explicit timeout contract {EXPECTED_TIMEOUT!r}")
    if not DECISION_DOC.exists():
        errors.append(f"missing runner decision record: {DECISION_DOC}")

    if errors:
        for error in errors:
            print("PIPELINE RUNNER CONTRACT: " + error, file=sys.stderr)
        print(
            "Change the workflow and decision record together when intentionally migrating the runner or time budget.",
            file=sys.stderr,
        )
        return 1
    print("PIPELINE RUNNER CONTRACT PASSED (windows-latest, 180-minute circuit breaker)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
