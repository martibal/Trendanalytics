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
    # Important: flush progress quickly even under GUI by not capturing stdout unless necessary.
    return subprocess.run(cmd, capture_output=True, text=True)

def aws_list_available_days(chain: str, table: str, base: str) -> Set[str]:
    """List available days on S3 by listing the table prefix once."""
    prefix = f"{base}/{table}/"
    p = aws_run(["aws", "s3", "ls", prefix, "--no-sign-request"])
    if p.returncode != 0:
        eprint(f"[ERR] aws s3 ls failed for {chain}/{table}: rc={p.returncode}")
        if p.stderr.strip():
            eprint(p.stderr.strip())
        return set()

    days: Set[str] = set()
    # Expect lines like: '                           PRE date=2026-01-10/'
    for line in p.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        # aws s3 ls prints 'PRE <name>/' for "folders"
        if line.startswith("PRE "):
            name = line[4:].rstrip("/").strip()
            if name.startswith("date="):
                cand = name.split("=", 1)[1]
                if DATE_RE.match(cand):
                    days.add(cand)
    return days

def aws_sync_day(src: str, dst: str) -> int:
    # Only-show-errors keeps output small; we provide our own progress lines.
    return subprocess.run(
        ["aws", "s3", "sync", src, dst, "--no-sign-request", "--only-show-errors"]
    ).returncode

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, help="Repo root (for reports/)")
    ap.add_argument("--raw-root", required=True, help="Local raw root")
    ap.add_argument("--start", required=True, help="ISO date YYYY-MM-DD (inclusive)")
    ap.add_argument("--publish-lag-days", type=int, default=1,
                    help="Safety lag; do not try to ingest the newest N days")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    try:
        start = dt.date.fromisoformat(args.start)
    except ValueError:
        raise SystemExit(f"--start must be YYYY-MM-DD, got: {args.start}")

    today = dt.date.today()
    cutoff = today - dt.timedelta(days=max(0, int(args.publish_lag_days)))

    report: Dict[str, object] = {
        "started_at": dt.datetime.now().isoformat(timespec="seconds"),
        "start": args.start,
        "cutoff": cutoff.isoformat(),
        "dry_run": bool(args.dry_run),
        "summary": {},
        "failures": [],
        "planned_downloads": [],
        "skipped_existing": [],
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

    for chain, base in S3_BASE.items():
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

                src = f"{base}/{table}/date={day}/"
                dst = os.path.join(args.raw_root, chain, table, day)
                ensure_dir(dst)
                print(f"[GET] {chain} {table} {day}", flush=True)
                rc = aws_sync_day(src, dst)
                if rc != 0 or not local_has_parquet(dst):
                    eprint(f"[FAIL] {chain} {table} {day} (rc={rc})")
                    report["failures"].append({"chain": chain, "table": table, "day": day, "reason": f"sync failed rc={rc}"})
                else:
                    print(f"[OK] {chain} {table} {day}", flush=True)

    out = os.path.join(args.root, "reports", "download_up_to_date_minimal.json")
    ensure_dir(os.path.dirname(out))
    with open(out, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("[DONE] report:", out, flush=True)

if __name__ == "__main__":
    main()
