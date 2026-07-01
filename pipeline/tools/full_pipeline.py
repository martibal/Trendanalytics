#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Native pipeline entrypoint contract.
#
# This is intentionally a dry-run contract first. It mirrors the orchestration
# contract and path model of pipeline/tools/full_pipeline.ps1 without executing
# the mutating pipeline stages yet. The next parity slice can replace the
# dry-run-only guard with actual native stage execution.

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


CHAINS = ["bitcoin", "ethereum", "arbitrum", "base"]
WINDOWS = [7, 30, 90, 180, 365]


@dataclass(frozen=True)
class Stage:
    id: str
    description: str
    tool: Path | None
    mutates: bool


def utc_ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def log(message: str) -> None:
    print(f"[{utc_ts()}] {message}")


def false_like(value: str | None) -> bool:
    return bool(value and value.strip().lower() in {"0", "false", "no", "off"})


def env_or_default(name: str, default_value: str) -> str:
    raw = os.environ.get(name, "")
    return raw.strip() if raw.strip() else default_value


def default_root() -> Path:
    return Path(__file__).resolve().parents[2]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Native pipeline entrypoint contract. Use --dry-run to validate the "
            "cross-platform orchestration contract without mutating data."
        )
    )
    parser.add_argument("--root", default="", help="Repository root. Defaults to two levels above this script.")
    parser.add_argument("--mode", choices=["incremental", "rebuild"], default="incremental")
    parser.add_argument("--skip-raw-download", action="store_true")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Required for this contract slice. Non-dry-run native orchestration is intentionally not enabled yet.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit the contract payload as JSON after the human-readable summary.",
    )
    return parser.parse_args()


def require_file(path: Path, label: str) -> None:
    if not path.exists() or not path.is_file():
        raise FileNotFoundError(f"Missing required {label}: {path}")


def build_contract(root: Path, mode: str, skip_raw_download: bool) -> dict[str, object]:
    tools_root = Path(__file__).resolve().parent
    pipeline_root = tools_root.parent
    data_root = root / "data"
    raw_root = Path(env_or_default("CSS_RAW_ROOT", str(data_root / "raw"))).resolve()
    calculated_root = data_root / "calculated"
    published_root = Path(env_or_default("CSS_PUBLISHED_ROOT", str(data_root / "published" / "v1"))).resolve()

    prod_root = pipeline_root / "_work" / "prod"
    status_root = prod_root / "status"
    reports_dir = prod_root / "reports"
    features_root = prod_root / "features_agg"

    gold_parquet_root = calculated_root / "gold"
    gold_weekly_root = calculated_root / "gold_weekly"
    gold_json_root = calculated_root / "gold_json"
    meta_json_root = calculated_root / "meta"
    derived_out_root = calculated_root / "derived"

    sync_mode_gold = "full" if mode == "rebuild" else "incremental"
    mode_inc_rebuild = "rebuild" if mode == "rebuild" else "incremental"

    tools = {
        "download_raw": pipeline_root / "tools" / "download_up_to_date_minimal.py",
        "feature_daily_agg": pipeline_root / "src" / "feature_daily_agg.py",
        "build_gold_timeseries": pipeline_root / "src" / "build_gold_timeseries.py",
        "build_gold_weekly": pipeline_root / "src" / "build_gold_weekly.py",
        "sync_gold_json_history": pipeline_root / "tools" / "sync_gold_json_history.py",
        "export_derived_json_history": pipeline_root / "tools" / "export_derived_json_history.py",
        "export_meta_json_history": pipeline_root / "tools" / "export_meta_json_history.py",
        "publish_artifacts": pipeline_root / "tools" / "publish_artifacts.py",
        "validate_published_dataset": pipeline_root / "tools" / "validate_published_dataset.py",
        "sync_web_data": pipeline_root / "tools" / "sync_web_data.py",
    }

    stages = [
        Stage("download_raw", "Download/sync RAW from source", tools["download_raw"], True),
        Stage("probe_latest_raw", "Probe latest local raw and published days", None, False),
        Stage("build_daily_features", "Build missing daily feature parquet", tools["feature_daily_agg"], True),
        Stage("build_gold_timeseries", "Build GOLD timeseries parquet", tools["build_gold_timeseries"], True),
        Stage("build_gold_weekly", "Build GOLD weekly aggregates", tools["build_gold_weekly"], True),
        Stage("sync_gold_json_history", "Sync GOLD JSON history and windows", tools["sync_gold_json_history"], True),
        Stage("export_derived_json_history", "Export DERIVED JSON history and windows", tools["export_derived_json_history"], True),
        Stage("export_meta_json_history", "Export META JSON history and windows", tools["export_meta_json_history"], True),
        Stage("publish_artifacts", "Publish canonical artifacts", tools["publish_artifacts"], True),
        Stage("validate_published_dataset", "Validate published dataset contract", tools["validate_published_dataset"], False),
        Stage("sync_web_data", "Mirror published dataset into web app private data", tools["sync_web_data"], True),
    ]

    if skip_raw_download:
        stages = [stage for stage in stages if stage.id != "download_raw"]

    if false_like(os.environ.get("CSS_SYNC_WEB")):
        stages = [stage for stage in stages if stage.id != "sync_web_data"]

    return {
        "entrypoint": "pipeline/tools/full_pipeline.py",
        "status": "dry_run_contract",
        "mode": mode,
        "skip_raw_download": skip_raw_download,
        "python": env_or_default("CSS_PYTHON", sys.executable or "python"),
        "chains": CHAINS,
        "windows": WINDOWS,
        "sync_mode_gold": sync_mode_gold,
        "mode_inc_rebuild": mode_inc_rebuild,
        "paths": {
            "root": str(root),
            "pipeline_root": str(pipeline_root),
            "tools_root": str(tools_root),
            "data_root": str(data_root),
            "raw_root": str(raw_root),
            "calculated_root": str(calculated_root),
            "published_root": str(published_root),
            "prod_root": str(prod_root),
            "features_root": str(features_root),
            "status_root": str(status_root),
            "reports_dir": str(reports_dir),
            "gold_parquet_root": str(gold_parquet_root),
            "gold_weekly_root": str(gold_weekly_root),
            "gold_json_root": str(gold_json_root),
            "meta_json_root": str(meta_json_root),
            "derived_out_root": str(derived_out_root),
        },
        "tools": {name: str(path) for name, path in tools.items()},
        "stages": [
            {
                "id": stage.id,
                "description": stage.description,
                "tool": str(stage.tool) if stage.tool else None,
                "mutates": stage.mutates,
            }
            for stage in stages
        ],
    }


def validate_contract(contract: dict[str, object]) -> None:
    paths = contract["paths"]
    if not isinstance(paths, dict):
        raise TypeError("contract paths must be a dictionary")

    root = Path(str(paths["root"]))
    require_file(root / "pipeline" / "tools" / "full_pipeline.ps1", "PowerShell reference entrypoint")
    require_file(root / "pipeline" / "tools" / "sync_web_data.py", "cross-platform web sync entrypoint")

    stages = contract["stages"]
    if not isinstance(stages, list) or len(stages) < 9:
        raise ValueError("native pipeline contract must include the expected stage inventory")

    for stage in stages:
        if not isinstance(stage, dict):
            raise TypeError("stage entries must be dictionaries")
        tool = stage.get("tool")
        if tool:
            require_file(Path(str(tool)), f"stage tool for {stage.get('id')}")

    stage_ids = [str(stage["id"]) for stage in stages]
    required_stage_ids = [
        "probe_latest_raw",
        "build_daily_features",
        "build_gold_timeseries",
        "build_gold_weekly",
        "sync_gold_json_history",
        "export_derived_json_history",
        "export_meta_json_history",
        "publish_artifacts",
        "validate_published_dataset",
    ]

    for stage_id in required_stage_ids:
        if stage_id not in stage_ids:
            raise ValueError(f"missing required native pipeline stage contract: {stage_id}")


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve() if args.root else default_root()

    if not args.dry_run:
        log("Native pipeline execution is not enabled in this slice.")
        log("Run with --dry-run to validate the orchestration contract.")
        return 2

    contract = build_contract(root=root, mode=args.mode, skip_raw_download=bool(args.skip_raw_download))
    validate_contract(contract)

    log("=== PIPELINE NATIVE ENTRYPOINT CONTRACT OK ===")
    log(f"mode={contract['mode']} skip_raw_download={contract['skip_raw_download']}")
    log(f"chains={','.join(CHAINS)} windows={','.join(str(window) for window in WINDOWS)}")
    log(f"stages={len(contract['stages'])}")
    for stage in contract["stages"]:
        log(f"stage={stage['id']} mutates={stage['mutates']}")

    if args.json:
        print(json.dumps(contract, indent=2, sort_keys=True))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
