from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path
from typing import Any

BUGGY_DRIVER_CLAUSE = " from published regime-axis evidence"
DEFAULT_ROOTS = (
    Path("data/published/v1/meta"),
    Path("web-v1-app/.private-data/published/v1/meta"),
    Path("web-v1-app/public/data/published/v1/meta"),
)


def _masked(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: ("<ONE_LINER>" if key == "one_liner" else _masked(item)) for key, item in value.items()}
    if isinstance(value, list):
        return [_masked(item) for item in value]
    return value


def _correct_one_liners(value: Any) -> int:
    changed = 0
    if isinstance(value, dict):
        for key, item in value.items():
            if key == "one_liner" and isinstance(item, str) and BUGGY_DRIVER_CLAUSE in item:
                value[key] = item.replace(BUGGY_DRIVER_CLAUSE, "")
                changed += 1
            else:
                changed += _correct_one_liners(item)
    elif isinstance(value, list):
        for item in value:
            changed += _correct_one_liners(item)
    return changed


def _iter_json_files(roots: list[Path]):
    seen: set[Path] = set()
    for root in roots:
        if not root.exists():
            continue
        for path in sorted(root.rglob("*.json")):
            resolved = path.resolve()
            if resolved in seen:
                continue
            seen.add(resolved)
            yield path


def main() -> int:
    parser = argparse.ArgumentParser(description="Correct the historical grammatical fallback defect in status.one_liner only.")
    parser.add_argument("--root", action="append", dest="roots", help="Meta root to scan; repeatable.")
    parser.add_argument("--check", action="store_true", help="Fail if a buggy one_liner remains; do not write.")
    args = parser.parse_args()

    roots = [Path(p) for p in args.roots] if args.roots else list(DEFAULT_ROOTS)
    files_scanned = files_changed = fields_changed = remaining = 0

    for path in _iter_json_files(roots):
        files_scanned += 1
        obj = json.loads(path.read_text(encoding="utf-8"))
        before_masked = _masked(copy.deepcopy(obj))
        count = _correct_one_liners(obj)
        if count:
            remaining += count
            if not args.check:
                after_masked = _masked(copy.deepcopy(obj))
                if before_masked != after_masked:
                    raise RuntimeError(f"Invariant violation: non-one_liner content changed in {path}")
                path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                files_changed += 1
                fields_changed += count

    if args.check:
        if remaining:
            raise SystemExit(f"Found {remaining} buggy one_liner field(s) across scanned roots.")
        print(f"OK: scanned {files_scanned} JSON files; no buggy one_liner fields remain.")
        return 0

    print(f"Historical one_liner correction complete: scanned={files_scanned}, files_changed={files_changed}, one_liner_fields_changed={fields_changed}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
