from __future__ import annotations

import argparse
from pathlib import Path


BUGGY_DRIVER_CLAUSE = b" from published regime-axis evidence"
TARGET_KEYS = (b'"one_liner"', b'"status_note"')
REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ROOTS = (
    REPO_ROOT / "data/published/v1/meta",
    REPO_ROOT / "web-v1-app/.private-data/published/v1/meta",
)


def _resolve_root(value: str) -> Path:
    path = Path(value)
    return path.resolve() if path.is_absolute() else (REPO_ROOT / path).resolve()


def _validate_roots(roots: list[Path]) -> None:
    missing = [root for root in roots if not root.exists() or not root.is_dir()]
    if missing:
        formatted = "\n".join(f"  - {root}" for root in missing)
        raise SystemExit(f"Missing required Meta root(s):\n{formatted}")


def _iter_json_files(roots: list[Path]):
    seen: set[Path] = set()

    for root in roots:
        for path in sorted(root.rglob("*.json")):
            resolved = path.resolve()

            if resolved in seen:
                continue

            seen.add(resolved)
            yield path


def _correct_file(path: Path, *, check_only: bool) -> int:
    original = path.read_bytes()
    lines = original.splitlines(keepends=True)

    output: list[bytes] = []
    changed = 0

    for line in lines:
        if BUGGY_DRIVER_CLAUSE in line and any(key in line for key in TARGET_KEYS):
            changed += line.count(BUGGY_DRIVER_CLAUSE)

            if not check_only:
                line = line.replace(BUGGY_DRIVER_CLAUSE, b"")

        output.append(line)

    if changed and not check_only:
        path.write_bytes(b"".join(output))

    return changed


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Correct the historical grammatical fallback defect in "
            "status.one_liner and status.explanation_support.status_note."
        )
    )

    parser.add_argument(
        "--root",
        action="append",
        dest="roots",
        help=(
            "Meta root to scan; repeatable. Relative paths are resolved from "
            "the repository root."
        ),
    )

    parser.add_argument(
        "--check",
        action="store_true",
        help=(
            "Fail if the buggy fallback clause remains in one_liner "
            "or status_note; do not write."
        ),
    )

    args = parser.parse_args()

    roots = (
        [_resolve_root(value) for value in args.roots]
        if args.roots
        else list(DEFAULT_ROOTS)
    )
    _validate_roots(roots)

    files_scanned = 0
    files_changed = 0
    fields_changed = 0

    for path in _iter_json_files(roots):
        files_scanned += 1
        count = _correct_file(path, check_only=args.check)

        if count:
            fields_changed += count

            if not args.check:
                files_changed += 1

    if args.check:
        if fields_changed:
            raise SystemExit(
                "Found "
                f"{fields_changed} buggy status text field(s) "
                "across scanned roots."
            )

        print(
            f"OK: scanned {files_scanned} JSON files across {len(roots)} root(s); "
            "no buggy one_liner or status_note fields remain."
        )
        return 0

    print(
        "Historical status-text correction complete: "
        f"scanned={files_scanned}, "
        f"files_changed={files_changed}, "
        f"fields_changed={fields_changed}."
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
