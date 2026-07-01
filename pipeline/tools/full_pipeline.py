#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Native pipeline entrypoint scaffold.
#
# This entrypoint now supports two things:
#   1. dry-run contract validation for the full orchestration plan
#   2. allowlisted native execution of non-mutating smoke stages
#
# Full mutating native orchestration is intentionally still disabled until the
# remaining execution-parity slices are covered by CI and fixtures.

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


CHAINS = ["bitcoin", "ethereum", "arbitrum", "base"]
WINDOWS = [7, 30, 90, 180, 365]
GENRES = ["gold", "meta", "derived"]
SAFE_EXECUTION_STAGES = {"validate_published_dataset"}


@dataclass(frozen=True)
class Stage:
    id: str
    description: str
    tool: Path | None
    mutates: bool
    executable: bool = False


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


def csv(values: list[str] | list[int]) -> str:
    return ",".join(str(value) for value in values)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Native pipeline entrypoint scaffold. Use --dry-run to validate the "
            "cross-platform orchestration contract, or --execute-stage for an "
            "allowlisted non-mutating smoke stage."
        )
    )
    parser.add_argument("--root", default="", help="Repository root. Defaults to two levels above this script.")
    parser.add_argument("--mode", choices=["incremental", "rebuild"], default="incremental")
    parser.add_argument("--skip-raw-download", action="store_true")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate the orchestration contract without mutating data.",
    )
    parser.add_argument(
        "--execute-stage",
        action="append",
        default=[],
        choices=["validate_published_dataset"],
        help="Execute an allowlisted native smoke stage. May be provided more than once.",
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
        Stage("download_raw", "Download/sync RAW from source", tools["download_raw"], True, False),
        Stage("probe_latest_raw", "Probe latest local raw and published days", None, False, False),
        Stage("build_daily_features", "Build missing daily feature parquet", tools["feature_daily_agg"], True, False),
        Stage("build_gold_timeseries", "Build GOLD timeseries parquet", tools["build_gold_timeseries"], True, False),
        Stage("build_gold_weekly", "Build GOLD weekly aggregates", tools["build_gold_weekly"], True, False),
        Stage("sync_gold_json_history", "Sync GOLD JSON history and windows", tools["sync_gold_json_history"], True, False),
        Stage("export_derived_json_history", "Export DERIVED JSON history and windows", tools["export_derived_json_history"], True, False),
        Stage("export_meta_json_history", "Export META JSON history and windows", tools["export_meta_json_history"], True, False),
        Stage("publish_artifacts", "Publish canonical artifacts", tools["publish_artifacts"], True, False),
        Stage(
            "validate_published_dataset",
            "Validate published dataset contract",
            tools["validate_published_dataset"],
            False,
            True,
        ),
        Stage("sync_web_data", "Mirror published dataset into web app private data", tools["sync_web_data"], True, False),
    ]

    if skip_raw_download:
        stages = [stage for stage in stages if stage.id != "download_raw"]

    if false_like(os.environ.get("CSS_SYNC_WEB")):
        stages = [stage for stage in stages if stage.id != "sync_web_data"]

    return {
        "entrypoint": "pipeline/tools/full_pipeline.py",
        "status": "native_execution_scaffold",
        "mode": mode,
        "skip_raw_download": skip_raw_download,
        "python": env_or_default("CSS_PYTHON", sys.executable or "python"),
        "chains": CHAINS,
        "windows": WINDOWS,
        "genres": GENRES,
        "sync_mode_gold": sync_mode_gold,
        "mode_inc_rebuild": mode_inc_rebuild,
        "safe_execution_stages": sorted(SAFE_EXECUTION_STAGES),
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
                "executable": stage.executable,
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

    executable_stage_ids = {str(stage["id"]) for stage in stages if stage.get("executable") is True}
    if SAFE_EXECUTION_STAGES - executable_stage_ids:
        missing = sorted(SAFE_EXECUTION_STAGES - executable_stage_ids)
        raise ValueError(f"safe execution stages missing from contract: {missing}")


def find_stage(contract: dict[str, object], stage_id: str) -> dict[str, object]:
    stages = contract["stages"]
    if not isinstance(stages, list):
        raise TypeError("contract stages must be a list")

    for stage in stages:
        if isinstance(stage, dict) and stage.get("id") == stage_id:
            return stage

    raise ValueError(f"stage is not present in this contract: {stage_id}")


def command_for_stage(contract: dict[str, object], stage_id: str) -> list[str]:
    paths = contract["paths"]
    tools = contract["tools"]
    python = str(contract["python"])

    if not isinstance(paths, dict) or not isinstance(tools, dict):
        raise TypeError("contract paths/tools must be dictionaries")

    if stage_id == "validate_published_dataset":
        return [
            python,
            "-u",
            str(tools["validate_published_dataset"]),
            "--published-root",
            str(paths["published_root"]),
            "--chains",
            csv(CHAINS),
            "--genres",
            csv(GENRES),
            "--windows",
            csv(WINDOWS),
        ]

    raise ValueError(f"native execution is not implemented for stage: {stage_id}")


def run_command(command: list[str], cwd: Path, label: str) -> int:
    log(f"RUN {label}: {' '.join(command)}")
    completed = subprocess.run(command, cwd=str(cwd), check=False)
    log(f"DONE {label}: rc={completed.returncode}")
    return int(completed.returncode)


def run_stage(contract: dict[str, object], stage_id: str) -> int:
    if stage_id not in SAFE_EXECUTION_STAGES:
        raise ValueError(f"stage is not allowlisted for native execution scaffold: {stage_id}")

    stage = find_stage(contract, stage_id)
    if stage.get("mutates") is True:
        raise ValueError(f"refusing to execute mutating stage in scaffold: {stage_id}")
    if stage.get("executable") is not True:
        raise ValueError(f"stage is not marked executable in scaffold contract: {stage_id}")

    paths = contract["paths"]
    if not isinstance(paths, dict):
        raise TypeError("contract paths must be a dictionary")

    command = command_for_stage(contract, stage_id)
    root = Path(str(paths["root"]))
    return run_command(command, cwd=root, label=stage_id)


def print_contract_summary(contract: dict[str, object]) -> None:
    log("=== PIPELINE NATIVE ENTRYPOINT CONTRACT OK ===")
    log(f"mode={contract['mode']} skip_raw_download={contract['skip_raw_download']}")
    log(f"chains={','.join(CHAINS)} windows={','.join(str(window) for window in WINDOWS)}")
    log(f"stages={len(contract['stages'])}")
    for stage in contract["stages"]:
        log(f"stage={stage['id']} mutates={stage['mutates']} executable={stage['executable']}")


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve() if args.root else default_root()

    contract = build_contract(root=root, mode=args.mode, skip_raw_download=bool(args.skip_raw_download))
    validate_contract(contract)

    if args.dry_run:
        print_contract_summary(contract)
        if args.json:
            print(json.dumps(contract, indent=2, sort_keys=True))
        return 0

    execute_stages = list(dict.fromkeys(args.execute_stage or []))
    if not execute_stages:
        log("Full native pipeline execution is not enabled in this slice.")
        log("Use --dry-run for contract validation or --execute-stage validate_published_dataset for the scaffold smoke.")
        return 2

    log("=== PIPELINE NATIVE EXECUTION SCAFFOLD START ===")
    results: list[dict[str, object]] = []
    for stage_id in execute_stages:
        rc = run_stage(contract, stage_id)
        results.append({"stage": stage_id, "returncode": rc})
        log(f"stage={stage_id} rc={rc}")
        if rc != 0:
            log("=== PIPELINE NATIVE EXECUTION SCAFFOLD FAILED ===")
            if args.json:
                print(json.dumps({"contract": contract, "results": results}, indent=2, sort_keys=True))
            return rc

    log("=== PIPELINE NATIVE EXECUTION SCAFFOLD OK ===")
    if args.json:
        print(json.dumps({"contract": contract, "results": results}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
