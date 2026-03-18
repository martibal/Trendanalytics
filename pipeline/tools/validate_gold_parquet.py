#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Validate the published dataset contract under data/published/v1.

Checks:
- dataset.json exists and parses
- contract.json exists and parses (and includes webekstra-required keys)
- per genre/chain: manifest.json exists and parses
- day files are ISO ordered, no duplicates
- if any day files exist: latest.json and lastXd.json exist for requested windows
- webekstra 4.2 (MUST): For META, validate meta.regime.signals exists and has expected format
  for at least one day per chain.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def _read_json(p: Path) -> Any:
    return json.loads(p.read_text(encoding="utf-8"))


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


def _fail(msg: str) -> None:
    raise SystemExit(f"[VALIDATE] FAIL: {msg}")


def _is_num(x: Any) -> bool:
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def _validate_contract(contract: Dict[str, Any]) -> None:
    # Minimal required surfaces for webekstra 4.2
    if not isinstance(contract, dict):
        _fail("contract.json is not an object")

    if contract.get("contract_version") != "v1":
        _fail(f"contract.json contract_version must be 'v1' (got {contract.get('contract_version')!r})")

    # Required default config for customer thresholding
    tcd = contract.get("threshold_config_default")
    if not isinstance(tcd, dict):
        _fail("contract.json missing threshold_config_default (object)")
    if tcd.get("version") != "v1":
        _fail("contract.json threshold_config_default.version must be 'v1'")

    # Required meta.regime.signals schema description
    meta = contract.get("meta")
    if not isinstance(meta, dict):
        _fail("contract.json missing meta (object)")

    regime = meta.get("regime")
    if not isinstance(regime, dict):
        _fail("contract.json missing meta.regime (object)")

    signals = regime.get("signals")
    if not isinstance(signals, dict):
        _fail("contract.json missing meta.regime.signals (object schema description)")

    # Basic sanity checks for window documentation
    windows = signals.get("windows")
    if not isinstance(windows, dict):
        _fail("contract.json meta.regime.signals.windows must exist (object)")

    for k in ("pct_90d_days", "z_robust_days", "momentum_short_days", "momentum_long_days"):
        if k not in windows:
            _fail(f"contract.json meta.regime.signals.windows missing key: {k}")


def _validate_meta_regime_signals(meta_obj: Dict[str, Any], *, where: str) -> None:
    if not isinstance(meta_obj, dict):
        _fail(f"{where}: meta json is not an object")

    regime = meta_obj.get("regime")
    if not isinstance(regime, dict):
        _fail(f"{where}: missing top-level 'regime' object")

    signals = regime.get("signals")
    if not isinstance(signals, dict) or len(signals) == 0:
        _fail(f"{where}: missing or empty regime.signals (expected object with metric entries)")

    allowed_axes = {"demand", "friction", "capacity"}

    # Validate a reasonable sample (but still deterministic):
    # - ensure every entry conforms to the required field-types.
    for metric_key, entry in signals.items():
        if not isinstance(metric_key, str) or not metric_key:
            _fail(f"{where}: regime.signals has non-string/empty metric key: {metric_key!r}")
        if not isinstance(entry, dict):
            _fail(f"{where}: regime.signals[{metric_key}] is not an object")

        axis = entry.get("axis")
        if axis not in allowed_axes:
            _fail(f"{where}: regime.signals[{metric_key}].axis must be one of {sorted(allowed_axes)} (got {axis!r})")

        # current may be null if missing; if present it must be numeric
        cur = entry.get("current", None)
        if cur is not None and not _is_num(cur):
            _fail(f"{where}: regime.signals[{metric_key}].current must be number|null (got {type(cur).__name__})")

        # required numeric fields
        for f in ("pct_90d", "z_robust", "momentum_7d_vs_30d"):
            v = entry.get(f, None)
            if not _is_num(v):
                _fail(f"{where}: regime.signals[{metric_key}].{f} must be a number (got {v!r})")

        # optional extras
        cur_raw = entry.get("current_raw", None)
        if cur_raw is not None and not _is_num(cur_raw):
            _fail(f"{where}: regime.signals[{metric_key}].current_raw must be number|null when present")

        transform = entry.get("transform", None)
        if transform is not None and not isinstance(transform, dict):
            _fail(f"{where}: regime.signals[{metric_key}].transform must be object|null when present")


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

    try:
        ds = _read_json(ds_path)
    except Exception as e:
        _fail(f"dataset.json parse error: {e}")

    for k in ("dataset_id", "revision_id", "computed_at_utc", "supported_chains", "supported_genres"):
        if k not in ds:
            _fail(f"dataset.json missing key: {k}")

    # webekstra 4.2 requires a contract.json if you use contract-based schema (you do).
    contract_path = published / "contract.json"
    if not contract_path.exists():
        _fail(f"Missing contract.json: {contract_path}")

    try:
        contract = _read_json(contract_path)
    except Exception as e:
        _fail(f"contract.json parse error: {e}")

    _validate_contract(contract)

    # For META, we must validate that regime.signals exists and has expected format
    # for at least one day per chain (prefer latest day file).
    meta_signals_validated: Dict[str, bool] = {c: False for c in chains}

    for genre in genres:
        for chain in chains:
            chain_dir = published / genre / chain
            if not chain_dir.exists():
                _fail(f"Missing directory: {chain_dir}")

            mf = chain_dir / "manifest.json"
            if not mf.exists():
                _fail(f"Missing manifest.json: {mf}")

            try:
                manifest = _read_json(mf)
            except Exception as e:
                _fail(f"manifest parse error ({genre}/{chain}): {e}")

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

            # webekstra 4.2: validate meta.regime.signals for at least one day per chain
            if genre == "meta" and len(day_files) > 0 and not meta_signals_validated.get(chain, False):
                # Prefer the actual latest day file (more reliable than latest.json if someone forgets to update it)
                sample_path = day_files[-1]
                try:
                    meta_obj = _read_json(sample_path)
                except Exception as e:
                    _fail(f"meta day-json parse error ({chain} {sample_path.name}): {e}")

                _validate_meta_regime_signals(meta_obj, where=f"meta/{chain}/{sample_path.name}")
                meta_signals_validated[chain] = True

    missing_meta_validation = [c for c, ok in meta_signals_validated.items() if not ok]
    if missing_meta_validation:
        _fail(
            "webekstra 4.2: meta.regime.signals was not validated for these chains "
            "(no meta day files found to validate): "
            + ", ".join(missing_meta_validation)
        )

    print("[VALIDATE] OK. Published dataset contract looks consistent (incl. meta.regime.signals).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())