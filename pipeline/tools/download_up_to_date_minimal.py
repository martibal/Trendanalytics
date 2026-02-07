#!/usr/bin/env python3
import argparse
import datetime as dt
import json
import os
import re
import subprocess
import sys
from typing import Dict, List, Set, Tuple

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

S3_BASE = {
    "ethereum": "s3://aws-public-blockchain/v1.0/eth",
    "bitcoin":  "s3://aws-public-blockchain/v1.0/btc",
    "arbitrum": "s3://aws-public-blockchain/v1.1/sonarx/arbitrum",
    "base":     "s3://aws-public-blockchain/v1.1/sonarx/base",
}
TABLES = ["blocks", "transactions"]

def eprint(*a):
    print(*a, file=sys.stderr, flush=True)

def ensure_dir(p: str) -> None:
    os.makedirs(p, exist_ok=True)

def local_has_parquet(p: str) -> bool:
    if not os.path.isdir(p):
        return False
    for _, _, files in os.walk(p):
        for f in files:
            if f.endswith(".parquet"):
                return True
    return False

def local_day_dir(raw_root: str, chain: str, table: str, day: str) -> Tuple[str, str]:
    """Return both supported local layouts for a day."""
    a = os.path.join(raw_root, chain, table, day)
    b = os.path.join(raw_root, chain, table, f"date={day}")
    return a, b

def aws_run(cmd: List[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True)

def _parse_day_from_prefix(name: str) -> str | None:
    """
    Accept both:
      - date=YYYY-MM-DD
      - YYYY-MM-DD
    """
    name = name.rstrip("/").strip()
    if name.startswith("date="):
        cand = name.split("=", 1)[1].strip()
        return cand if DATE_RE.match(cand) else None
    return name if DATE_RE.match(name) else None

def aws_list_available_days(chain: str, table: str, base: str) -> Set[str]:
    """
    List available days on S3 by listing the table prefix once.
    Works for BOTH layouts:
      - .../<table>/date=YYYY-MM-DD/
      - .../<table>/YYYY-MM-DD/
    """
    prefix = f"{base}/{table}/"
    p = aws_run(["aws", "s3", "ls", prefix, "--no-sign-request"])
    if p.returncode != 0:
        eprint(f"[ERR] aws s3 ls failed for {chain}/{table}: rc={p.returncode}")
        if p.stderr.strip():
            eprint(p.stderr.strip())
        return set()

    days: Set[str] = set()
    # aws s3 ls prints lines like:
    #   PRE date=2026-02-03/
    #   PRE 2026-02-03/
    for line in p.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("PRE "):
            name = line[4:].strip()
            d = _parse_day_from_prefix(name)
            if d:
                days.add(d)

    return days

def aws_sync_day(src: str, dst: str) -> int:
    return subprocess.run(
        ["aws", "s3", "sync", src, dst, "--no-sign-request", "--only-show-errors"]
    ).returncode

def chain_cutoff(chain: str, today: dt.date, lag_l1: int, lag_l2: int) -> dt.date:
    lag = lag_l2 if chain in ("arbitrum", "base") else lag_l1
    return today - dt.timedelta(days=max(0, int(lag)))

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, help="Repo root (for reports/)")
    ap.add_argument("--raw-root", required=True, help="Local raw root")
    ap.add_argument("--start", required=True, help="ISO date YYYY-MM-DD (inclusive)")
    ap.add_argument("--chains", default="bitcoin,ethereum,arbitrum,base", help="Comma-separated chains")
    ap.add_argument("--lag-l1-days", type=int, default=1, help="Safety lag for L1 (BTC/ETH)")
    ap.add_argument("--lag-l2-days", type=int, default=7, help="Safety lag for L2 (ARB/BASE)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    try:
        start = dt.date.fromisoformat(args.start)
    except ValueError:
        raise SystemExit(f"--start must be YYYY-MM-DD, got: {args.start}")

    chains = [c.strip().lower() for c in (args.chains or "").split(",") if c.strip()]
    for c in chains:
        if c not in S3_BASE:
            raise SystemExit(f"Unknown chain in --chains: {c}")

    today = dt.date.today()

    report: Dict[str, object] = {
        "started_at": dt.datetime.now().isoformat(timespec="seconds"),
        "start": args.start,
        "dry_run": bool(args.dry_run),
        "lags": {"l1_days": int(args.lag_l1_days), "l2_days": int(args.lag_l2_days)},
        "cutoff_by_chain": {c: chain_cutoff(c, today, args.lag_l1_days, args.lag_l2_days).isoformat() for c in chains},
        "summary": {},
        "failures": [],
        "planned_downloads": [],
        "skipped_existing": [],
        "notes": [
            "Supports both S3 layouts: .../date=YYYY-MM-DD/ and .../YYYY-MM-DD/",
            "Downloads are limited to [start, cutoff_by_chain] per chain (safety lag).",
        ],
    }

    # Sanity: aws cli must exist
    try:
        v = subprocess.run(["aws", "--version"], capture_output=True, text=True)
        if v.returncode != 0:
            eprint("[ERR] aws cli not available or returned non-zero from aws --version")
            if v.stderr.strip():
                eprint(v.stderr.strip())
    except FileNotFoundError:
        raise SystemExit("AWS CLI not found. Install 'aws' and ensure it is on PATH.")

    for chain in chains:
        base = S3_BASE[chain]
        cutoff = chain_cutoff(chain, today, args.lag_l1_days, args.lag_l2_days)

        for table in TABLES:
            print(f"[INFO] Listing available days on S3: {chain}/{table}", flush=True)
            available = aws_list_available_days(chain, table, base)
            if not available:
                report["summary"][f"{chain}:{table}"] = 0
                continue

            # Filter to [start, cutoff]
            avail_dates = sorted(
                d for d in available
                if dt.date.fromisoformat(d) >= start and dt.date.fromisoformat(d) <= cutoff
            )

            missing: List[str] = []
            skipped: List[str] = []

            for day in avail_dates:
                d1, d2 = local_day_dir(args.raw_root, chain, table, day)
                if local_has_parquet(d1) or local_has_parquet(d2):
                    skipped.append(day)
                else:
                    missing.append(day)

            report["summary"][f"{chain}:{table}"] = len(missing)
            report["skipped_existing"] += [{"chain": chain, "table": table, "day": d} for d in skipped]
            report["planned_downloads"] += [{"chain": chain, "table": table, "day": d} for d in missing]

            if not missing:
                print(f"[OK] {chain}/{table}: nothing to download (missing=0, skipped_existing={len(skipped)})", flush=True)
                continue

            print(f"[PLAN] {chain}/{table}: will download {len(missing)} day(s), skip {len(skipped)} existing day(s)", flush=True)

            for day in missing:
                if args.dry_run:
                    print(f"[DRYRUN] would download: {chain} {table} {day}", flush=True)
                    continue

                # Try both S3 layouts:
                #   .../<table>/date=YYYY-MM-DD/
                #   .../<table>/YYYY-MM-DD/
                src_a = f"{base}/{table}/date={day}/"
                src_b = f"{base}/{table}/{day}/"

                dst = os.path.join(args.raw_root, chain, table, day)
                ensure_dir(dst)

                print(f"[GET] {chain} {table} {day}", flush=True)

                rc = aws_sync_day(src_a, dst)
                if rc != 0 or not local_has_parquet(dst):
                    # fallback layout
                    rc2 = aws_sync_day(src_b, dst)
                    if rc2 != 0 or not local_has_parquet(dst):
                        eprint(f"[FAIL] {chain} {table} {day} (rc_a={rc}, rc_b={rc2})")
                        report["failures"].append({
                            "chain": chain, "table": table, "day": day,
                            "reason": f"sync failed rc_a={rc} rc_b={rc2}",
                            "tried": [src_a, src_b],
                        })
                    else:
                        print(f"[OK] {chain} {table} {day} (layout=plain)", flush=True)
                else:
                    print(f"[OK] {chain} {table} {day} (layout=date=)", flush=True)

    out = os.path.join(args.root, "reports", "download_up_to_date_minimal.json")
    ensure_dir(os.path.dirname(out))
    with open(out, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("[DONE] report:", out, flush=True)

if __name__ == "__main__":
    main()