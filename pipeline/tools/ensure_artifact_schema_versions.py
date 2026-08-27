#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

SCHEMAS = {
    "gold": "gold.v1",
    "derived": "derived.v1",
    "meta": "meta.v1",
    "briefs": "briefs.v1",
}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True, allow_nan=False),
        encoding="utf-8",
    )
    tmp.replace(path)


def add_schema(value: Any, schema: str) -> tuple[Any, int]:
    changed = 0
    if isinstance(value, dict):
        if value.get("schema_version") != schema:
            value = dict(value)
            value["schema_version"] = schema
            changed += 1
        return value, changed
    if isinstance(value, list):
        out = []
        for item in value:
            next_item, item_changed = add_schema(item, schema)
            out.append(next_item)
            changed += item_changed
        return out, changed
    return value, changed


def process_file(path: Path, schema: str, *, check: bool) -> tuple[int, list[str]]:
    try:
        obj = read_json(path)
    except Exception as exc:
        return 0, [f"invalid_json:{path}:{exc}"]

    next_obj, changed = add_schema(obj, schema)
    if changed and not check:
        write_json(path, next_obj)
    if changed and check:
        return changed, [f"missing_or_wrong_schema:{path}:expected={schema}"]
    return changed, []


def process_genre(root: Path, genre: str, *, check: bool) -> tuple[int, list[str]]:
    genre_root = root / genre
    if not genre_root.exists():
        return 0, []
    changed = 0
    errors: list[str] = []
    for path in genre_root.rglob("*.json"):
        # dataset-specific contract files are not row artifacts.
        if path.name == "contract.json":
            continue
        n, errs = process_file(path, SCHEMAS[genre], check=check)
        changed += n
        errors.extend(errs)
    return changed, errors


def update_dataset(root: Path, *, check: bool) -> tuple[int, list[str]]:
    path = root / "dataset.json"
    if not path.exists():
        return 0, [f"missing_dataset:{path}"]
    obj = read_json(path)
    if not isinstance(obj, dict):
        return 0, [f"invalid_dataset_shape:{path}"]
    versions = obj.get("schema_versions") if isinstance(obj.get("schema_versions"), dict) else {}
    expected = {**versions, **SCHEMAS}
    changed = 0
    if versions != expected:
        changed = 1
        if not check:
            obj["schema_versions"] = expected
            write_json(path, obj)
    if changed and check:
        return changed, [f"dataset_schema_versions_out_of_sync:{path}"]
    return changed, []


def main() -> int:
    parser = argparse.ArgumentParser(description="Ensure every public Urd Atlas artifact is self-describing by schema version.")
    parser.add_argument("--root", default="data/published/v1", help="Published v1 root")
    parser.add_argument("--check", action="store_true", help="Validate only; do not write")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.exists():
        raise SystemExit(f"Published root not found: {root}")

    total_changed = 0
    errors: list[str] = []
    for genre in ("gold", "derived", "meta", "briefs"):
        changed, genre_errors = process_genre(root, genre, check=args.check)
        total_changed += changed
        errors.extend(genre_errors)

    changed, dataset_errors = update_dataset(root, check=args.check)
    total_changed += changed
    errors.extend(dataset_errors)

    if errors:
        for error in errors[:100]:
            print(f"[SCHEMA_CONTRACT] {error}")
        if len(errors) > 100:
            print(f"[SCHEMA_CONTRACT] ... {len(errors)-100} additional error(s)")
        return 1

    mode = "check" if args.check else "write"
    print(f"[SCHEMA_CONTRACT] mode={mode} changed={total_changed} root={root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
