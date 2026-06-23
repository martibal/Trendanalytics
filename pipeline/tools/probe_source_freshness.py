#!/usr/bin/env python3
"""Publish upstream source-freshness diagnostics for the Urd Atlas dataset.

This probe is read-only against the upstream public AWS blockchain bucket. It
does not download raw data and does not require AWS credentials.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import subprocess
from typing import Any, Dict, List, Optional, Set, Tuple

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

S3_BASE = {
    "ethereum": "s3://aws-public-blockchain/v1.0/eth",
    "bitcoin": "s3://aws-public-blockchain/v1.0/btc",
    "arbitrum": "s3://aws-public-blockchain/v1.1/sonarx/arbitrum",
    "base": "s3://aws-public-blockchain/v1.1/sonarx/base",
}

TABLES = ("blocks", "transactions")
PUBLISHED_GENRES = ("gold", "derived", "meta")


def utc_now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0)


def parse_day(value: Any) -> Optional[dt.date]:
    if not isinstance(value, str) or not DATE_RE.match(value):
        return None
    try:
        return dt.date.fromisoformat(value)
    except ValueError:
        return None


def fmt_day(value: Optional[dt.date]) -> Optional[str]:
    return value.isoformat() if value else None


def lag_days(day: Optional[dt.date], today: dt.date) -> Optional[int]:
    if day is None:
        return None
    return max(0, (today - day).days)


def expected_delay_days(chain: str) -> int:
    return 8 if chain in {"arbitrum", "base"} else 1


def chain_cutoff(chain: str, today: dt.date, lag_l1_days: int, lag_l2_days: int) -> dt.date:
    lag = lag_l2_days if chain in {"arbitrum", "base"} else lag_l1_days
    return today - dt.timedelta(days=max(0, int(lag)))


def parse_day_from_prefix(name: str) -> Optional[str]:
    cleaned = name.rstrip("/").strip()
    if cleaned.startswith("date="):
        candidate = cleaned.split("=", 1)[1].strip()
        return candidate if DATE_RE.match(candidate) else None
    return cleaned if DATE_RE.match(cleaned) else None


def aws_list_available_days(chain: str, table: str) -> Tuple[Set[str], Optional[str]]:
    base = S3_BASE[chain]
    prefix = f"{base}/{table}/"
    proc = subprocess.run(
        ["aws", "s3", "ls", prefix, "--no-sign-request"],
        capture_output=True,
        text=True,
    )

    if proc.returncode != 0:
        stderr = (proc.stderr or "").strip()
        stdout = (proc.stdout or "").strip()
        detail = stderr or stdout or f"aws s3 ls returned {proc.returncode}"
        return set(), detail[:500]

    days: Set[str] = set()
    for raw_line in proc.stdout.splitlines():
        line = raw_line.strip()
        if not line.startswith("PRE "):
            continue
        maybe_day = parse_day_from_prefix(line[4:].strip())
        if maybe_day:
            days.add(maybe_day)

    return days, None


def load_json(path: str) -> Optional[Dict[str, Any]]:
    if not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as handle:
            value = json.load(handle)
        return value if isinstance(value, dict) else None
    except Exception:
        return None


def latest_published_from_dataset(published_root: str, chain: str) -> Optional[str]:
    dataset = load_json(os.path.join(published_root, "dataset.json"))
    if not dataset:
        return None

    asof_by_genre = dataset.get("asof_by_genre_chain")
    if not isinstance(asof_by_genre, dict):
        return None

    candidates: List[dt.date] = []
    for genre in PUBLISHED_GENRES:
        genre_map = asof_by_genre.get(genre)
        if not isinstance(genre_map, dict):
            continue
        parsed = parse_day(genre_map.get(chain))
        if parsed:
            candidates.append(parsed)

    if not candidates:
        return None

    return min(candidates).isoformat()


def latest_published_from_files(published_root: str, chain: str) -> Optional[str]:
    candidates: List[dt.date] = []

    for genre in PUBLISHED_GENRES:
        chain_dir = os.path.join(published_root, genre, chain)
        if not os.path.isdir(chain_dir):
            continue

        genre_days: List[dt.date] = []
        for name in os.listdir(chain_dir):
            if not name.endswith(".json"):
                continue
            parsed = parse_day(name[:-5])
            if parsed:
                genre_days.append(parsed)

        if genre_days:
            candidates.append(max(genre_days))

    if not candidates:
        return None

    return min(candidates).isoformat()


def latest_published_day(published_root: str, chain: str) -> Optional[str]:
    return latest_published_from_dataset(published_root, chain) or latest_published_from_files(
        published_root, chain
    )


def reason_for(
    *,
    published_asof: Optional[dt.date],
    latest_available_source_date: Optional[dt.date],
    source_errors: List[str],
) -> Tuple[str, str]:
    if source_errors:
        return (
            "source_check_unavailable",
            "The upstream AWS source freshness check did not complete cleanly for this chain.",
        )

    if latest_available_source_date is None:
        return (
            "source_no_dates_detected",
            "No dated upstream AWS source partitions were detected for this chain.",
        )

    if published_asof is None:
        return (
            "published_asof_unknown",
            "Published freshness could not be compared because the latest published data-load date is unavailable.",
        )

    if latest_available_source_date > published_asof:
        return (
            "source_newer_than_published",
            "The upstream AWS source has newer complete data than the currently published dataset.",
        )

    if latest_available_source_date == published_asof:
        return (
            "source_not_newer_than_published",
            "No newer complete data is currently available from the upstream AWS source.",
        )

    return (
        "published_newer_than_source_listing",
        "Published data is newer than the latest complete upstream AWS source date observed by the source check.",
    )


def build_chain_record(
    chain: str,
    published_root: str,
    now: dt.datetime,
    lag_l1_days: int,
    lag_l2_days: int,
) -> Dict[str, Any]:
    today = now.date()
    cutoff = chain_cutoff(chain, today, lag_l1_days, lag_l2_days)
    published_str = latest_published_day(published_root, chain)
    published_day = parse_day(published_str)

    tables: Dict[str, Any] = {}
    source_errors: List[str] = []
    table_effective_days: List[dt.date] = []
    table_available_days: List[dt.date] = []

    for table in TABLES:
        days, error = aws_list_available_days(chain, table)
        parsed_days = sorted(day for day in (parse_day(d) for d in days) if day is not None)

        latest_any = parsed_days[-1] if parsed_days else None
        latest_effective_candidates = [d for d in parsed_days if d <= cutoff]
        latest_effective = latest_effective_candidates[-1] if latest_effective_candidates else None

        if latest_any:
            table_available_days.append(latest_any)
        if latest_effective:
            table_effective_days.append(latest_effective)

        if error:
            source_errors.append(f"{table}: {error}")

        tables[table] = {
            "s3_prefix": f"{S3_BASE[chain]}/{table}/",
            "latest_available_date": fmt_day(latest_any),
            "latest_effective_date": fmt_day(latest_effective),
            "partition_count": len(parsed_days),
            "error": error,
        }

    latest_available_source_date = (
        min(table_effective_days) if len(table_effective_days) == len(TABLES) else None
    )
    latest_seen_source_partition_date = max(table_available_days) if table_available_days else None

    reason_code, reason = reason_for(
        published_asof=published_day,
        latest_available_source_date=latest_available_source_date,
        source_errors=source_errors,
    )

    last_run_at_utc = now.isoformat().replace("+00:00", "Z")
    last_run_date = now.date().isoformat()
    last_data_load_date = fmt_day(published_day)
    latest_available_source_date_str = fmt_day(latest_available_source_date)

    return {
        "chain": chain,
        "last_run_at_utc": last_run_at_utc,
        "last_run_date": last_run_date,
        "last_data_load_date": last_data_load_date,
        "latest_available_source_date": latest_available_source_date_str,
        "latest_seen_source_partition_date": fmt_day(latest_seen_source_partition_date),
        "source_cutoff_date": cutoff.isoformat(),
        "published_asof": last_data_load_date,
        "source_latest_available": latest_available_source_date_str,
        "source_effective_latest": latest_available_source_date_str,
        "tables": tables,
        "expected_delay_days": expected_delay_days(chain),
        "observed_lag_days": lag_days(published_day, today),
        "source_effective_lag_days": lag_days(latest_available_source_date, today),
        "source_is_newer_than_published": bool(
            published_day is not None
            and latest_available_source_date is not None
            and latest_available_source_date > published_day
        ),
        "source_is_not_newer_than_published": bool(
            published_day is not None
            and latest_available_source_date is not None
            and latest_available_source_date <= published_day
        ),
        "reason_code": reason_code,
        "reason": reason,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True, help="Repo root")
    parser.add_argument("--published-root", default="data/published/v1", help="Published dataset root")
    parser.add_argument("--chains", default="bitcoin,ethereum,arbitrum,base", help="Comma-separated chains")
    parser.add_argument("--lag-l1-days", type=int, default=1)
    parser.add_argument("--lag-l2-days", type=int, default=7)
    parser.add_argument("--out", default="", help="Output JSON path. Defaults to <published-root>/source-freshness.json")
    args = parser.parse_args()

    root = os.path.abspath(args.root)
    published_root = args.published_root
    if not os.path.isabs(published_root):
        published_root = os.path.join(root, published_root)

    chains = [chain.strip().lower() for chain in args.chains.split(",") if chain.strip()]
    unknown = [chain for chain in chains if chain not in S3_BASE]
    if unknown:
        raise SystemExit(f"Unknown chains: {', '.join(unknown)}")

    now = utc_now()

    records = {
        chain: build_chain_record(chain, published_root, now, args.lag_l1_days, args.lag_l2_days)
        for chain in chains
    }

    output = {
        "schema": "urd_atlas.source_freshness.v1",
        "generated_at_utc": now.isoformat().replace("+00:00", "Z"),
        "last_run_at_utc": now.isoformat().replace("+00:00", "Z"),
        "last_run_date": now.date().isoformat(),
        "source": "aws-public-blockchain",
        "date_fields": {
            "last_run_date": "UTC date when this source freshness probe ran.",
            "last_data_load_date": "Latest complete date currently published for the chain.",
            "latest_available_source_date": "Latest complete date available from the AWS source after source lag policy is applied.",
        },
        "table_policy": "latest_available_source_date is the oldest latest-effective date across blocks and transactions",
        "lags": {
            "l1_days": int(args.lag_l1_days),
            "l2_days": int(args.lag_l2_days),
        },
        "chains": records,
    }

    out_path = args.out.strip() or os.path.join(published_root, "source-freshness.json")
    if not os.path.isabs(out_path):
        out_path = os.path.join(root, out_path)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as handle:
        json.dump(output, handle, indent=2, sort_keys=True)
        handle.write("\n")

    print(f"[DONE] wrote source freshness report: {out_path}")
    for chain, record in records.items():
        print(
            "[SOURCE] "
            f"{chain}: last_run={record['last_run_date']} "
            f"last_data_load={record['last_data_load_date']} "
            f"latest_available_source={record['latest_available_source_date']} "
            f"reason_code={record['reason_code']}"
        )


if __name__ == "__main__":
    main()