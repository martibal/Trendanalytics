#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

CHAINS = {
    "bitcoin": "btc",
    "ethereum": "eth",
}
METRIC = "TxCnt"
DEFAULT_API_ROOT = "https://community-api.coinmetrics.io/v4"


def _parse_day(value: str) -> date:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).date()


def _load_local_history(root: Path, chain: str, lookback_days: int) -> list[dict[str, Any]]:
    chain_dir = root / chain
    rows: list[dict[str, Any]] = []
    for path in sorted(chain_dir.glob("20??-??-??.json"), reverse=True):
        try:
            obj = json.loads(path.read_text(encoding="utf-8"))
            day = date.fromisoformat(str(obj["date"]))
            tx_count = int(obj["tx_count_daily"])
        except Exception:
            continue
        rows.append({"date": day, "tx_count_daily": tx_count, "path": str(path)})
        if len(rows) >= lookback_days + 1:
            break
    if not rows:
        latest = chain_dir / "latest.json"
        if latest.exists():
            obj = json.loads(latest.read_text(encoding="utf-8"))
            rows.append(
                {
                    "date": date.fromisoformat(str(obj["date"])),
                    "tx_count_daily": int(obj["tx_count_daily"]),
                    "path": str(latest),
                }
            )
    return sorted(rows, key=lambda row: row["date"])


def _fetch_coinmetrics(
    asset: str,
    start: date,
    end: date,
    *,
    api_root: str,
    timeout_seconds: int,
) -> dict[date, int]:
    params = urllib.parse.urlencode(
        {
            "assets": asset,
            "metrics": METRIC,
            "frequency": "1d",
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "page_size": 100,
        }
    )
    url = f"{api_root.rstrip('/')}/timeseries/asset-metrics?{params}"
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "urd-atlas-external-crosscheck/1.0",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
        payload = json.loads(response.read().decode("utf-8"))
    out: dict[date, int] = {}
    for row in payload.get("data", []):
        if row.get(METRIC) in (None, "") or not row.get("time"):
            continue
        try:
            out[_parse_day(str(row["time"]))] = int(float(row[METRIC]))
        except Exception:
            continue
    return out


def _compare_chain(
    root: Path,
    chain: str,
    asset: str,
    *,
    tolerance: float,
    lookback_days: int,
    api_root: str,
    timeout_seconds: int,
) -> dict[str, Any]:
    local = _load_local_history(root, chain, lookback_days)
    if not local:
        return {"chain": chain, "status": "error", "reason": "no_local_gold_history"}

    start = local[0]["date"]
    end = local[-1]["date"]
    external = _fetch_coinmetrics(
        asset,
        start,
        end,
        api_root=api_root,
        timeout_seconds=timeout_seconds,
    )
    overlap = [row for row in local if row["date"] in external]
    if not overlap:
        return {
            "chain": chain,
            "status": "error",
            "reason": "no_overlapping_external_day",
            "local_range": [start.isoformat(), end.isoformat()],
        }

    row = overlap[-1]
    local_value = int(row["tx_count_daily"])
    external_value = int(external[row["date"]])
    denominator = max(abs(external_value), 1)
    relative_diff = abs(local_value - external_value) / denominator
    return {
        "chain": chain,
        "asset": asset,
        "status": "ok" if relative_diff <= tolerance else "drift",
        "date": row["date"].isoformat(),
        "metric_local": "tx_count_daily",
        "metric_external": METRIC,
        "local_value": local_value,
        "external_value": external_value,
        "relative_diff": round(relative_diff, 6),
        "tolerance": tolerance,
        "local_path": row["path"],
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Cross-check Urd Atlas BTC/ETH daily transaction counts against Coin Metrics Community API."
    )
    parser.add_argument("--published-root", default="data/published/v1/gold")
    parser.add_argument("--tolerance", type=float, default=0.10)
    parser.add_argument("--lookback-days", type=int, default=7)
    parser.add_argument("--timeout-seconds", type=int, default=30)
    parser.add_argument("--api-root", default=DEFAULT_API_ROOT)
    parser.add_argument("--report", default="reports/external-data-crosscheck.json")
    args = parser.parse_args()

    if not (0.0 <= args.tolerance <= 1.0):
        parser.error("--tolerance must be between 0 and 1")

    root = Path(args.published_root)
    results: list[dict[str, Any]] = []
    try:
        for chain, asset in CHAINS.items():
            results.append(
                _compare_chain(
                    root,
                    chain,
                    asset,
                    tolerance=args.tolerance,
                    lookback_days=args.lookback_days,
                    api_root=args.api_root,
                    timeout_seconds=args.timeout_seconds,
                )
            )
    except Exception as exc:
        payload = {
            "status": "source_unavailable",
            "checked_at_utc": datetime.now(timezone.utc).isoformat(),
            "source": "Coin Metrics Community API",
            "metric": METRIC,
            "error": f"{type(exc).__name__}: {exc}",
            "chains": results,
        }
        text = json.dumps(payload, indent=2, sort_keys=True)
        print(text)
        report = Path(args.report)
        report.parent.mkdir(parents=True, exist_ok=True)
        report.write_text(text + "\n", encoding="utf-8")
        return 2

    payload = {
        "status": "ok" if all(r.get("status") == "ok" for r in results) else "drift",
        "checked_at_utc": datetime.now(timezone.utc).isoformat(),
        "source": "Coin Metrics Community API",
        "source_api_root": args.api_root,
        "metric": METRIC,
        "purpose": "Independent operational cross-check; not an input to regime classification.",
        "chains": results,
    }
    text = json.dumps(payload, indent=2, sort_keys=True)
    print(text)
    report = Path(args.report)
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(text + "\n", encoding="utf-8")

    failures = [r for r in results if r.get("status") != "ok"]
    if failures:
        print(
            "EXTERNAL DATA CROSS-CHECK FAILED: "
            + ", ".join(f"{r.get('chain')}={r.get('status')}" for r in failures),
            file=sys.stderr,
        )
        return 1
    print("EXTERNAL DATA CROSS-CHECK PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
