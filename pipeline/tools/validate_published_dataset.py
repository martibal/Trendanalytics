#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Validate the published dataset contract under data/published/v1.

Checks (v1):
- dataset.json exists and is STRICT JSON (no NaN/Infinity) and contains required keys
- contract.json exists and is STRICT JSON and contains required contract keys
- dataset.json includes:
    - coverage summary per chain/genre: days/from/to/asof
    - derived_definition (explicit definition of derived layer)
- contract.json includes:
    - derived_definition
    - meta.confidence.gating_threshold_default
    - gate section (no backfill; derived in UI)
- per genre/chain:
    - manifest.json exists and parses (STRICT JSON)
    - day files are ISO ordered, no duplicates
    - if any day files exist: latest.json and lastXd.json exist for requested windows
    - manifest.asof matches last day file (if present)
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List, Optional


def _fail(msg: str) -> None:
    raise SystemExit(f"[VALIDATE] FAIL: {msg}")


def _strict_parse_constant(x: str) -> Any:
    # Python's json module can parse NaN/Infinity by default (non-standard JSON).
    # We forbid it explicitly.
    raise ValueError(f"Non-standard JSON constant encountered: {x}")


def _read_json_strict(p: Path) -> Any:
    try:
        txt = p.read_text(encoding="utf-8")
    except Exception as e:
        _fail(f"Could not read JSON file: {p} ({e})")

    try:
        return json.loads(txt, parse_constant=_strict_parse_constant)
    except Exception as e:
        _fail(f"STRICT JSON parse error: {p} ({e})")


def _parse_list(s: str) -> List[str]:
    return [x.strip() for x in (s or "").split(",") if x.strip()]


def _parse_windows(s: str) -> List[int]:
    out: List[int] = []
    for part in (s or "").split(","):
        part = part.strip()
        if not part:
            continue
        n = int(part)
        if n > 0:
            out.append(n)
    return sorted(set(out))


def _require_keys(obj: Any, keys: List[str], ctx: str) -> None:
    if not isinstance(obj, dict):
        _fail(f"{ctx} must be an object/dict")
    for k in keys:
        if k not in obj:
            _fail(f"{ctx} missing key: {k}")


def _get_path(obj: Any, path: str, ctx: str) -> Any:
    """
    Path is dot-separated, e.g. "meta.confidence.gating_threshold_default".
    Returns value or fails with a precise message.
    """
    cur = obj
    for part in path.split("."):
        if not isinstance(cur, dict):
            _fail(f"{ctx} expected object at '{part}' while resolving '{path}'")
        if part not in cur:
            _fail(f"{ctx} missing required path: {path}")
        cur = cur[part]
    return cur


def _require_coverage(ds: Dict[str, Any], chains: List[str], genres: List[str]) -> None:
    _require_keys(ds, ["coverage"], "dataset.json")
    cov = ds["coverage"]
    if not isinstance(cov, dict):
        _fail("dataset.json.coverage must be an object")

    for chain in chains:
        if chain not in cov:
            _fail(f"dataset.json.coverage missing chain: {chain}")
        cobj = cov[chain]
        if not isinstance(cobj, dict):
            _fail(f"dataset.json.coverage.{chain} must be an object")

        for genre in genres:
            if genre not in cobj:
                _fail(f"dataset.json.coverage.{chain} missing genre: {genre}")
            gobj = cobj[genre]
            if not isinstance(gobj, dict):
                _fail(f"dataset.json.coverage.{chain}.{genre} must be an object")
            for k in ("days", "from", "to", "asof"):
                if k not in gobj:
                    _fail(f"dataset.json.coverage.{chain}.{genre} missing key: {k}")

            days = gobj.get("days")
            if not isinstance(days, int):
                _fail(f"dataset.json.coverage.{chain}.{genre}.days must be int")

            # from/to/asof may be empty string when days==0
            for k in ("from", "to", "asof"):
                v = gobj.get(k)
                if not isinstance(v, str):
                    _fail(f"dataset.json.coverage.{chain}.{genre}.{k} must be string")

            if days == 0:
                # allow empties
                continue

            # If days > 0, require ISO date strings with minimal shape (YYYY-MM-DD)
            for k in ("from", "to", "asof"):
                v = gobj.get(k, "")
                if len(v) != 10 or v[4] != "-" or v[7] != "-":
                    _fail(f"dataset.json.coverage.{chain}.{genre}.{k} must be YYYY-MM-DD when days>0 (got '{v}')")


def _require_derived_definition(ds: Dict[str, Any]) -> Dict[str, Any]:
    _require_keys(ds, ["derived_definition"], "dataset.json")
    dd = ds["derived_definition"]
    if not isinstance(dd, dict):
        _fail("dataset.json.derived_definition must be an object")

    # Minimal contract for v1 derived definition
    for k in ("schema_version", "windows_days", "method", "min_periods", "suffix_format"):
        if k not in dd:
            _fail(f"dataset.json.derived_definition missing key: {k}")

    if not isinstance(dd["schema_version"], str):
        _fail("dataset.json.derived_definition.schema_version must be string")

    if not isinstance(dd["windows_days"], list) or not all(isinstance(x, int) and x > 0 for x in dd["windows_days"]):
        _fail("dataset.json.derived_definition.windows_days must be a list of positive ints")

    if dd["method"] not in ("rolling_mean",):
        _fail("dataset.json.derived_definition.method must be 'rolling_mean' (v1)")

    if not isinstance(dd["min_periods"], int) or dd["min_periods"] < 1:
        _fail("dataset.json.derived_definition.min_periods must be int >= 1")

    if not isinstance(dd["suffix_format"], str) or "{window}" not in dd["suffix_format"]:
        _fail("dataset.json.derived_definition.suffix_format must be string containing '{window}'")

    return dd


def _require_contract(published: Path, dataset: Dict[str, Any], derived_definition: Dict[str, Any]) -> Dict[str, Any]:
    cpath = published / "contract.json"
    if not cpath.exists():
        _fail(f"Missing contract.json: {cpath}")

    contract = _read_json_strict(cpath)

    _require_keys(contract, ["contract_version", "methodology_version", "schema_versions", "derived_definition"], "contract.json")

    if contract.get("contract_version") != "v1":
        _fail(f"contract.json.contract_version must be 'v1' (got '{contract.get('contract_version')}')")

    # Ensure the contract is at least aligned with dataset methodology/schema
    mv_ds = dataset.get("methodology_version")
    mv_ct = contract.get("methodology_version")
    if mv_ds and mv_ct and mv_ds != mv_ct:
        _fail(f"methodology_version mismatch dataset vs contract: dataset={mv_ds} contract={mv_ct}")

    # Check derived definition exists and matches key fields
    dd2 = contract.get("derived_definition")
    if not isinstance(dd2, dict):
        _fail("contract.json.derived_definition must be an object")

    for k in ("schema_version", "windows_days", "method", "min_periods", "suffix_format"):
        if k not in dd2:
            _fail(f"contract.json.derived_definition missing key: {k}")

    # Compatibility check (not necessarily deep equality, but key fields must match)
    for k in ("schema_version", "method", "min_periods", "suffix_format"):
        if dd2.get(k) != derived_definition.get(k):
            _fail(f"derived_definition mismatch for '{k}': dataset={derived_definition.get(k)} contract={dd2.get(k)}")

    w1 = list(derived_definition.get("windows_days", []))
    w2 = list(dd2.get("windows_days", []))
    if sorted(w1) != sorted(w2):
        _fail(f"derived_definition.windows_days mismatch: dataset={w1} contract={w2}")

    # Confidence gating threshold
    thr = _get_path(contract, "meta.confidence.gating_threshold_default", "contract.json")
    if not isinstance(thr, (int, float)):
        _fail("contract.json.meta.confidence.gating_threshold_default must be number")
    if float(thr) < 0.0 or float(thr) > 1.0:
        _fail("contract.json.meta.confidence.gating_threshold_default must be in [0,1]")

    # Gate section presence (policy is enforced in UI; no backfill)
    gate_type = _get_path(contract, "gate.type", "contract.json")
    if not isinstance(gate_type, str) or not gate_type:
        _fail("contract.json.gate.type must be a non-empty string")

    return contract


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--published-root", required=True, help="data/published/v1")
    ap.add_argument("--chains", default="bitcoin,ethereum,arbitrum,base")
    ap.add_argument("--genres", default="gold,meta,derived")
    ap.add_argument("--windows", default="7,30,90,180,365")
    args = ap.parse_args()

    published = Path(args.published_root).resolve()
    chains = _parse_list(args.chains)
    genres = _parse_list(args.genres)
    windows = _parse_windows(args.windows)

    ds_path = published / "dataset.json"
    if not ds_path.exists():
        _fail(f"Missing dataset.json: {ds_path}")

    dataset = _read_json_strict(ds_path)

    _require_keys(
        dataset,
        [
            "dataset_id",
            "revision_id",
            "computed_at_utc",
            "supported_chains",
            "supported_genres",
            "windows_supported",
            "schema_versions",
            "methodology_version",
        ],
        "dataset.json",
    )

    # Ensure supported lists contain what we intend to validate
    if not isinstance(dataset["supported_chains"], list) or not all(isinstance(x, str) for x in dataset["supported_chains"]):
        _fail("dataset.json.supported_chains must be list[str]")
    if not isinstance(dataset["supported_genres"], list) or not all(isinstance(x, str) for x in dataset["supported_genres"]):
        _fail("dataset.json.supported_genres must be list[str]")

    # Web3-required additions
    _require_coverage(dataset, chains=chains, genres=genres)
    derived_definition = _require_derived_definition(dataset)

    # Contract presence + key checks
    _require_contract(published, dataset=dataset, derived_definition=derived_definition)

    # Per-genre/chain directory validation
    for genre in genres:
        for chain in chains:
            chain_dir = published / genre / chain
            if not chain_dir.exists():
                _fail(f"Missing directory: {chain_dir}")

            mf = chain_dir / "manifest.json"
            if not mf.exists():
                _fail(f"Missing manifest.json: {mf}")

            manifest = _read_json_strict(mf)

            day_files = sorted(chain_dir.glob("????-??-??.json"))
            days = [p.stem for p in day_files]

            if len(days) != len(set(days)):
                _fail(f"Duplicate day files in {chain_dir}")
            if days != sorted(days):
                _fail(f"Day files not ISO-ordered in {chain_dir}")

            if len(days) > 0:
                if not (chain_dir / "latest.json").exists():
                    _fail(f"Missing latest.json for {genre}/{chain}")

                for w in windows:
                    wf = chain_dir / f"last{w}d.json"
                    if not wf.exists():
                        _fail(f"Missing last{w}d.json for {genre}/{chain}")

                asof = manifest.get("asof", "")
                if asof and asof != days[-1]:
                    _fail(f"Manifest asof mismatch for {genre}/{chain}: manifest={asof} actual={days[-1]}")

    print("[VALIDATE] OK. Published dataset + contract look consistent (STRICT JSON, coverage + derived_definition present).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())