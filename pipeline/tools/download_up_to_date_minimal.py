#!/usr/bin/env python3
import argparse
import datetime as dt
import json
import os
import re
import subprocess
import sys
from typing import Dict, List, Optional, Set, Tuple

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

S3_BASE = {
    "ethereum": "s3://aws-public-blockchain/v1.0/eth",
    "bitcoin":  "s3://aws-public-blockchain/v1.0/btc",
    "arbitrum": "s3://aws-public-blockchain/v1.1/sonarx/arbitrum",
    "base":     "s3://aws-public-blockchain/v1.1/sonarx/base",
}
TABLES = ["blocks", "transactions"]
PUBLISHED_GENRE_PREFERENCE = ["gold", "derived"]


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


def aws_command() -> List[str]:
    override_py = os.environ.get("CSS_AWS_CLI_PY")
    if override_py:
        return [sys.executable, override_py]
    return ["aws"]


def aws_run(cmd: List[str]) -> subprocess.CompletedProcess:
    if cmd and cmd[0] == "aws":
        cmd = cmd[1:]
    return subprocess.run(aws_command() + cmd, capture_output=True, text=True)


def _parse_day_from_prefix(name: str) -> Optional[str]:
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


def aws_list_available_days(chain: str, table: str, base: str) -> Tuple[Set[str], Optional[str]]:
    """
    List available days on S3 by listing the table prefix once.
    Works for BOTH layouts:
      - .../<table>/date=YYYY-MM-DD/
      - .../<table>/YYYY-MM-DD/

    Returns (days, error). A source listing error is explicit because the
    pipeline must fail closed instead of silently treating "source unavailable"
    as "nothing new exists".
    """
    prefix = f"{base}/{table}/"
    p = aws_run(["aws", "s3", "ls", prefix, "--no-sign-request"])
    if p.returncode != 0:
        detail = (p.stderr or p.stdout or f"aws s3 ls returned {p.returncode}").strip()
        eprint(f"[ERR] aws s3 ls failed for {chain}/{table}: rc={p.returncode}")
        if detail:
            eprint(detail)
        return set(), detail[:500]

    days: Set[str] = set()
    for line in p.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("PRE "):
            name = line[4:].strip()
            d = _parse_day_from_prefix(name)
            if d:
                days.add(d)

    return days, None


def aws_sync_day(src: str, dst: str) -> int:
    return subprocess.run(
        aws_command() + ["s3", "sync", src, dst, "--no-sign-request", "--only-show-errors"]
    ).returncode


def chain_cutoff(chain: str, today: dt.date, lag_l1: int, lag_l2: int) -> dt.date:
    lag = lag_l2 if chain in ("arbitrum", "base") else lag_l1
    return today - dt.timedelta(days=max(0, int(lag)))


def iter_published_days(published_root: str, chain: str) -> Set[str]:
    """
    Derive already-published daily coverage for a chain by scanning the most
    authoritative published day-json genre available.

    Preference order:
      1. gold/<chain>/YYYY-MM-DD.json
      2. derived/<chain>/YYYY-MM-DD.json

    Window files (latest/last7d/etc.) and manifests are ignored.
    """
    for genre in PUBLISHED_GENRE_PREFERENCE:
        genre_chain_root = os.path.join(published_root, genre, chain)
        if not os.path.isdir(genre_chain_root):
            continue

        days: Set[str] = set()
        for entry in os.scandir(genre_chain_root):
            if not entry.is_file():
                continue
            if not entry.name.endswith(".json"):
                continue
            day = entry.name[:-5]
            if DATE_RE.match(day):
                days.add(day)

        if days:
            return days

    return set()


def get_published_days_by_chain(published_root: Optional[str], chains: List[str]) -> Dict[str, Set[str]]:
    days_by_chain: Dict[str, Set[str]] = {c: set() for c in chains}
    if not published_root:
        return days_by_chain
    if not os.path.isdir(published_root):
        eprint(f"[WARN] published root not found, falling back to legacy raw-driven behavior: {published_root}")
        return days_by_chain

    for chain in chains:
        days_by_chain[chain] = iter_published_days(published_root, chain)
    return days_by_chain


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True, help="Repo root (for reports/)")
    ap.add_argument("--raw-root", required=True, help="Local raw root")
    ap.add_argument("--published-root", default="", help="Published JSON root used as state reference (recommended: data/published/v1)")
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

    published_root = (args.published_root or "").strip() or None

    today = dt.date.today()
    published_days_by_chain = get_published_days_by_chain(published_root, chains)

    report: Dict[str, object] = {
        "started_at": dt.datetime.now().isoformat(timespec="seconds"),
        "start": args.start,
        "published_root": published_root,
        "dry_run": bool(args.dry_run),
        "lags": {"l1_days": int(args.lag_l1_days), "l2_days": int(args.lag_l2_days)},
        "cutoff_by_chain": {c: chain_cutoff(c, today, args.lag_l1_days, args.lag_l2_days).isoformat() for c in chains},
        "published_days_by_chain": {c: len(published_days_by_chain.get(c, set())) for c in chains},
        "summary": {},
        "failures": [],
        "planned_downloads": [],
        "skipped_existing": [],
        "skipped_published": [],
        "notes": [
            "Supports both S3 layouts: .../date=YYYY-MM-DD/ and .../YYYY-MM-DD/",
            "Downloads are limited to [start, cutoff_by_chain] per chain (safety lag).",
            "If --published-root is provided, already-published day-json files are treated as state and are not re-downloaded.",
            "Source listing and download failures are fail-closed and return a non-zero exit code.",
        ],
    }

    try:
        v = aws_run(["--version"])
        if v.returncode != 0:
            eprint("[ERR] aws cli not available or returned non-zero from aws --version")
            if v.stderr.strip():
                eprint(v.stderr.strip())
    except FileNotFoundError:
        raise SystemExit("AWS CLI not found. Install 'aws' and ensure it is on PATH.")

    for chain in chains:
        base = S3_BASE[chain]
        cutoff = chain_cutoff(chain, today, args.lag_l1_days, args.lag_l2_days)
        published_days = published_days_by_chain.get(chain, set())

        for table in TABLES:
            print(f"[INFO] Listing available days on S3: {chain}/{table}", flush=True)
            available, list_error = aws_list_available_days(chain, table, base)
            if list_error:
                report["summary"][f"{chain}:{table}"] = {
                    "missing_raw_unpublished": 0,
                    "skipped_existing_raw": 0,
                    "skipped_already_published": 0,
                    "source_listing_failed": True,
                }
                report["failures"].append({
                    "chain": chain,
                    "table": table,
                    "day": None,
                    "stage": "list_available_days",
                    "reason": list_error,
                    "tried": [f"{base}/{table}/"],
                })
                continue

            if not available:
                report["summary"][f"{chain}:{table}"] = {
                    "missing_raw_unpublished": 0,
                    "skipped_existing_raw": 0,
                    "skipped_already_published": 0,
                    "source_listing_failed": False,
                }
                continue

            avail_dates = sorted(
                d for d in available
                if dt.date.fromisoformat(d) >= start and dt.date.fromisoformat(d) <= cutoff
            )

            missing: List[str] = []
            skipped_existing: List[str] = []
            skipped_published: List[str] = []

            for day in avail_dates:
                if day in published_days:
                    skipped_published.append(day)
                    continue

                d1, d2 = local_day_dir(args.raw_root, chain, table, day)
                if local_has_parquet(d1) or local_has_parquet(d2):
                    skipped_existing.append(day)
                else:
                    missing.append(day)

            report["summary"][f"{chain}:{table}"] = {
                "missing_raw_unpublished": len(missing),
                "skipped_existing_raw": len(skipped_existing),
                "skipped_already_published": len(skipped_published),
                "source_listing_failed": False,
            }
            report["skipped_existing"] += [{"chain": chain, "table": table, "day": d} for d in skipped_existing]
            report["skipped_published"] += [{"chain": chain, "table": table, "day": d} for d in skipped_published]
            report["planned_downloads"] += [{"chain": chain, "table": table, "day": d} for d in missing]

            if not missing:
                print(
                    f"[OK] {chain}/{table}: nothing to download "
                    f"(missing_unpublished=0, skipped_existing={len(skipped_existing)}, skipped_published={len(skipped_published)})",
                    flush=True,
                )
                continue

            print(
                f"[PLAN] {chain}/{table}: will download {len(missing)} unpublished missing day(s), "
                f"skip {len(skipped_existing)} existing raw day(s), skip {len(skipped_published)} already-published day(s)",
                flush=True,
            )

            for day in missing:
                if args.dry_run:
                    print(f"[DRYRUN] would download: {chain} {table} {day}", flush=True)
                    continue

                src_a = f"{base}/{table}/date={day}/"
                src_b = f"{base}/{table}/{day}/"

                dst = os.path.join(args.raw_root, chain, table, day)
                ensure_dir(dst)

                print(f"[GET] {chain} {table} {day}", flush=True)

                rc = aws_sync_day(src_a, dst)
                if rc != 0 or not local_has_parquet(dst):
                    rc2 = aws_sync_day(src_b, dst)
                    if rc2 != 0 or not local_has_parquet(dst):
                        eprint(f"[FAIL] {chain} {table} {day} (rc_a={rc}, rc_b={rc2})")
                        report["failures"].append({
                            "chain": chain,
                            "table": table,
                            "day": day,
                            "stage": "sync_day",
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

    failure_count = len(report["failures"])
    if failure_count:
        eprint(f"[FAIL] source download/listing failures: {failure_count}; see report: {out}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
