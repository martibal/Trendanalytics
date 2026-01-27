# api/whn/service.py
from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
import math

from api.whn.models import WHNResponse, WHNSignal

@dataclass(frozen=True)
class WHNConfig:
    lookback_days: int = 30
    z_high: float = 3.0
    z_medium: float = 2.0

def _mean(xs: List[float]) -> float:
    return sum(xs) / max(len(xs), 1)

def _std(xs: List[float], mu: float) -> float:
    if len(xs) < 2:
        return 0.0
    var = sum((x - mu) ** 2 for x in xs) / (len(xs) - 1)
    return math.sqrt(var)

def _zscore(current: float, hist: List[float]) -> float:
    mu = _mean(hist)
    sd = _std(hist, mu)
    if sd == 0.0:
        return 0.0
    return (current - mu) / sd

def _severity(z: float, cfg: WHNConfig) -> str:
    az = abs(z)
    if az >= cfg.z_high:
        return "high"
    if az >= cfg.z_medium:
        return "medium"
    return "low"

def _mk_signal(kind: str, severity: str, title: str, explanation: str, metric: str, date: str, z: float) -> WHNSignal:
    return WHNSignal(
        kind=kind,  # type: ignore
        severity=severity,  # type: ignore
        title=title,
        explanation=explanation,
        metric=metric,
        date=date,
        z_score=round(z, 3),
    )

def infer_whn_from_gold(
    chain: str,
    gold_rows: List[Dict[str, Any]],
    cfg: Optional[WHNConfig] = None
) -> WHNResponse:
    """
    MVP-inferens:
    - Tar siste dag som "current"
    - Sammenligner utvalgte metrikker mot foregående lookback_days-1 med z-score
    - Returnerer top signals
    """
    cfg = cfg or WHNConfig()
    if not gold_rows:
        return WHNResponse(chain=chain, as_of="", lookback_days=cfg.lookback_days, signals=[], summary="No data.")

    # Sorter etter dato (YYYY-MM-DD) stigende
    rows = sorted(gold_rows, key=lambda r: r.get("date", ""))

    # Bruk siste cfg.lookback_days rader hvis tilgjengelig
    window = rows[-cfg.lookback_days:] if len(rows) >= cfg.lookback_days else rows
    current = window[-1]
    hist = window[:-1]

    as_of = str(current.get("date", ""))[:10]

    # Hvilke metrikker vi vurderer
    metrics: List[Tuple[str, str, str]] = [
        ("tx_count_daily", "tx_count_spike", "Transactions"),
        ("failed_tx_rate", "failed_tx_spike", "Failed tx rate"),
        ("median_tx_fee_native", "fee_spike", "Median tx fee (native units)"),
        ("gas_utilization_pct", "gas_util_shift", "Gas utilization"),
        ("unique_active_addresses", "active_addr_spike", "Active addresses"),
        ("avg_block_time_sec", "block_time_shift", "Avg block time (sec)"),
        ("value_transferred_native", "value_transfer_spike", "Value transferred (native)"),
    ]

    signals: List[Tuple[float, WHNSignal]] = []

    for metric, kind, title_prefix in metrics:
        if not isinstance(current.get(metric), (int, float)):
            continue
        cur_val = float(current[metric])

        hist_vals = [float(r[metric]) for r in hist if isinstance(r.get(metric), (int, float))]
        if len(hist_vals) < 7:
            # ikke nok historikk til robust z-score
            continue

        z = _zscore(cur_val, hist_vals)
        sev = _severity(z, cfg)

        # Filtrer bort lav støy
        if abs(z) < cfg.z_medium:
            continue

        direction = "up" if z > 0 else "down"
        title = f"{title_prefix} anomaly ({direction})"
        explanation = (
            f"{metric} is {direction} vs last {len(hist_vals)} days baseline. "
            f"z={z:.2f}, current={cur_val:.4g}."
        )

        signals.append((abs(z), _mk_signal(kind, sev, title, explanation, metric, as_of, z)))

    # Sorter mest “interessant” først
    signals_sorted = [s for _, s in sorted(signals, key=lambda t: t[0], reverse=True)]
    top = signals_sorted[:5]

    if not top:
        summary = "No strong pattern match: metrics are within normal recent ranges."
    else:
        summary = "Detected notable deviations in recent on-chain metrics."

    return WHNResponse(
        chain=chain,
        as_of=as_of,
        lookback_days=len(window),
        signals=top,
        summary=summary
    )
