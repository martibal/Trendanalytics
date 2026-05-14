#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from datetime import date, timedelta

import pandas as pd


def _find_repo_root(start: Path) -> Path:
    start = start.resolve()
    for p in [start] + list(start.parents):
        if (p / "api").is_dir() and ((p / "web").is_dir() or (p / "pipeline").is_dir()):
            return p
    return start.parents[1]


def _repo_root() -> Path:
    return _find_repo_root(Path(__file__).resolve())


@dataclass(frozen=True)
class SyncConfig:
    repo_root: Path
    gold_root: Path
    out_root: Path
    mode: str
    windows: list[int]


def _ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def _parse_windows(s: str) -> list[int]:
    out: list[int] = []
    for part in (s or "").split(","):
        part = part.strip()
        if not part:
            continue
        n = int(part)
        if n <= 0:
            continue
        out.append(n)
    return sorted(set(out))


def _write_json(path: Path, obj: Any) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")
    tmp.replace(path)


def _is_day_stem(stem: str) -> bool:
    # YYYY-MM-DD
    return len(stem) == 10 and stem[4] == "-" and stem[7] == "-" and stem[:4].isdigit()


def _load_records_from_day_files(chain_out: Path) -> list[dict]:
    """
    Source of truth for UI windows: the day JSON files that actually exist on disk.
    This avoids "incremental mode" drift where parquet may be shorter than the accumulated day files.
    """
    day_files = [p for p in chain_out.glob("*.json") if _is_day_stem(p.stem)]
    day_files.sort(key=lambda p: p.stem)  # lexical sort works for YYYY-MM-DD
    records: list[dict] = []
    for p in day_files:
        try:
            rec = json.loads(p.read_text(encoding="utf-8"))
            records.append(rec)
        except Exception:
            # If a single day file is corrupt, skip it rather than breaking publish
            continue
    return records


def _materialize_windows_from_disk(chain_out: Path, windows: list[int]) -> None:
    records = _load_records_from_day_files(chain_out)
    if not records:
        return
    _write_json(chain_out / "latest.json", records[-1])
    
    # Use the latest date as anchor, filter by calendar days
    latest_date_str = records[-1].get("date", "")
    try:
        latest_date = date.fromisoformat(latest_date_str)
    except ValueError:
        # Fallback to row-count if date is unparseable
        for w in windows:
            tail = records[-w:] if len(records) >= w else records
            _write_json(chain_out / f"last{w}d.json", tail)
        return

    for w in windows:
        if w <= 0:
            continue
        cutoff = latest_date - timedelta(days=w - 1)
        cutoff_str = cutoff.isoformat()
        tail = [r for r in records if r.get("date", "") >= cutoff_str]
        _write_json(chain_out / f"last{w}d.json", tail)

def _sync_chain(cfg: SyncConfig, chain: str) -> int:
    gold_parquet = cfg.gold_root / f"{chain}.parquet"
    if not gold_parquet.exists():
        print(f"[SYNC] {chain}: missing parquet: {gold_parquet}")
        return 0

    df = pd.read_parquet(gold_parquet)
    if df.empty:
        print(f"[SYNC] {chain}: empty parquet: {gold_parquet}")
        return 0

    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    else:
        raise ValueError(f"[SYNC] {chain}: missing 'date' column in {gold_parquet}")

    if "chain" not in df.columns:
        df["chain"] = chain

    df = df.sort_values("date").reset_index(drop=True)

    chain_out = cfg.out_root / chain
    _ensure_dir(chain_out)

    cols = list(df.columns)
    for c in ["date", "chain"]:
        if c in cols:
            cols.remove(c)
    cols = ["date", "chain"] + cols

    records = df[cols].to_dict(orient="records")

    wrote = 0
    if cfg.mode == "incremental":
        existing_days = {p.stem for p in chain_out.glob("*.json") if _is_day_stem(p.stem)}
        for rec in records:
            day = rec["date"]
            if day in existing_days:
                continue
            _write_json(chain_out / f"{day}.json", rec)
            wrote += 1
    else:
        for rec in records:
            day = rec["date"]
            _write_json(chain_out / f"{day}.json", rec)
            wrote += 1

    # IMPORTANT: build latest/lastXd from day files on disk (not from parquet-only records)
    _materialize_windows_from_disk(chain_out, cfg.windows)

    print(f"[SYNC] {chain}: wrote {wrote} day-file(s), latest/lastXd refreshed (from day-files)")
    return wrote


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-root", default="", help="Override repo root (optional)")
    ap.add_argument("--gold-root", default="", help="Override gold parquet root (optional)")
    ap.add_argument("--out-root", default="", help="Override output JSON root (optional)")
    ap.add_argument("--chains", default="bitcoin,ethereum,arbitrum,base", help="Comma-separated chain list")
    ap.add_argument("--mode", default=os.getenv("SYNC_MODE", "incremental"), choices=["incremental", "full"])
    ap.add_argument("--windows", default=os.getenv("SYNC_WINDOWS", "7,30,90,180,365"))

    args = ap.parse_args()

    repo_root = Path(args.repo_root).resolve() if args.repo_root else _repo_root()

    gold_root = Path(args.gold_root).resolve() if args.gold_root else (
        Path(os.getenv("GOLD_ROOT", str(repo_root / "pipeline" / "_work" / "prod" / "gold"))).resolve()
    )
    out_root = Path(args.out_root).resolve() if args.out_root else (
        Path(os.getenv("GOLD_JSON_ROOT", str(repo_root / "data" / "calculated" / "gold"))).resolve()
    )

    windows = _parse_windows(args.windows)
    chains = [c.strip() for c in (args.chains or "").split(",") if c.strip()]

    cfg = SyncConfig(repo_root=repo_root, gold_root=gold_root, out_root=out_root, mode=args.mode, windows=windows)

    total = 0
    for chain in chains:
        total += _sync_chain(cfg, chain)

    print(f"[SYNC] done. chains={len(chains)} total_new_day_files={total}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
