#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
export_landing_hero.py

Generates a web-friendly landing contract under:

  data/published/v1/landing/<chain>/

Outputs:
  hero.json                     (default window payload)
  last{w}d.json                 (payload per window)
  manifest.json                 (landing manifest per chain)

Purpose:
- Make landing fast + stable: 1 fetch per chain per window (or 1 for default)
- Avoid browser loops over day partitions
- Enforce a consistent schema across chains, even when gold/derived/meta differ slightly

Input contract:
  data/published/v1/{gold,derived,meta}/<chain>/last{w}d.json

Notes:
- meta window items use confidence.date for the date key (no top-level date)
- If meta window missing, confidence/regime will be null but the series still exports
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


# -----------------------------
# IO helpers
# -----------------------------

def _ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def _read_json(p: Path) -> Any:
    return json.loads(p.read_text(encoding="utf-8"))


def _write_json(p: Path, obj: Any) -> None:
    tmp = p.with_suffix(p.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")
    tmp.replace(p)


def _safe_num(x: Any) -> Optional[float]:
    if isinstance(x, (int, float)) and x == x and x not in (float("inf"), float("-inf")):
        return float(x)
    return None


# -----------------------------
# Landing contract schema
# -----------------------------

@dataclass(frozen=True)
class LandingMetricSpec:
    hero_metric: str
    micro_activity: str
    micro_friction: str
    micro_capacity: str


DEFAULT_SPEC = LandingMetricSpec(
    hero_metric="tx_count_daily",
    micro_activity="tx_count_daily",
    micro_friction="median_tx_fee_native",
    micro_capacity="avg_block_time_sec",
)


# -----------------------------
# Window loading + merge
# -----------------------------

def _load_window_files(
    published_root: Path,
    chain: str,
    window_days: int,
) -> Tuple[Optional[List[Dict[str, Any]]], Optional[List[Dict[str, Any]]], Optional[List[Dict[str, Any]]]]:
    gold_p = published_root / "gold" / chain / f"last{window_days}d.json"
    der_p = published_root / "derived" / chain / f"last{window_days}d.json"
    meta_p = published_root / "meta" / chain / f"last{window_days}d.json"

    gold = _read_json(gold_p) if gold_p.exists() else None
    derived = _read_json(der_p) if der_p.exists() else None
    meta = _read_json(meta_p) if meta_p.exists() else None

    # We expect lists (90 items etc.). If someone wraps, tolerate but refuse silently.
    if gold is not None and not isinstance(gold, list):
        gold = None
    if derived is not None and not isinstance(derived, list):
        derived = None
    if meta is not None and not isinstance(meta, list):
        meta = None

    return gold, derived, meta


def _meta_date(item: Dict[str, Any]) -> Optional[str]:
    # In your meta window items, the date is typically in confidence.date
    dt = item.get("date")
    if isinstance(dt, str) and dt:
        return dt
    conf = item.get("confidence") or {}
    dt2 = conf.get("date")
    if isinstance(dt2, str) and dt2:
        return dt2
    return None


def _meta_confidence(item: Dict[str, Any]) -> Optional[float]:
    conf = item.get("confidence") or {}
    # meta window: confidence.confidence_score
    v = conf.get("confidence_score")
    n = _safe_num(v)
    if n is not None:
        return n
    # fallback keys if schema changes
    n = _safe_num(conf.get("score")) or _safe_num(conf.get("score_7d")) or _safe_num(item.get("confidence_score"))
    return n


def _meta_regime_label(item: Dict[str, Any]) -> Optional[str]:
    reg = item.get("regime") or {}
    lab = reg.get("label")
    if isinstance(lab, str) and lab:
        return lab
    # tolerate regime_label
    lab2 = item.get("regime_label")
    if isinstance(lab2, str) and lab2:
        return lab2
    return None


def _derived_metrics(item: Dict[str, Any]) -> Dict[str, Any]:
    d = item.get("derived") or {}
    m = d.get("metrics")
    if isinstance(m, dict):
        return m
    # tolerate file.metrics
    m2 = item.get("metrics")
    return m2 if isinstance(m2, dict) else {}


def _build_series_for_window(
    chain: str,
    window_days: int,
    gold: List[Dict[str, Any]],
    derived: Optional[List[Dict[str, Any]]],
    meta: Optional[List[Dict[str, Any]]],
    spec: LandingMetricSpec,
) -> List[Dict[str, Any]]:
    # index derived by date
    der_map: Dict[str, Dict[str, Any]] = {}
    if derived:
        for d in derived:
            dt = d.get("date")
            if isinstance(dt, str) and dt:
                der_map[dt] = d

    # index meta by date (confidence.date)
    meta_map: Dict[str, Dict[str, Any]] = {}
    if meta:
        for m in meta:
            dt = _meta_date(m)
            if dt:
                meta_map[dt] = m

    out: List[Dict[str, Any]] = []
    hero = spec.hero_metric

    for g in gold:
        dt = g.get("date")
        if not isinstance(dt, str) or not dt:
            continue

        daily = _safe_num(g.get(hero))
        d_item = der_map.get(dt)
        m_item = meta_map.get(dt)

        ma7 = None
        ma30 = None
        if d_item:
            m = _derived_metrics(d_item)
            ma7 = _safe_num(m.get(f"{hero}__ma7"))
            ma30 = _safe_num(m.get(f"{hero}__ma30"))

        conf = _meta_confidence(m_item) if m_item else None
        regime = _meta_regime_label(m_item) if m_item else None

        out.append(
            {
                "date": dt,
                "daily": daily,
                "ma7": ma7,
                "ma30": ma30,
                "confidence": conf,
                "regime": regime,
            }
        )

    return out


def _last_point(series: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not series:
        return None
    return series[-1]


def _pct_delta(a: Optional[float], b: Optional[float]) -> Optional[float]:
    if a is None or b is None:
        return None
    denom = abs(b)
    if denom == 0:
        return None
    return (a - b) / denom * 100.0


def _micro_from_window(
    chain: str,
    window_days: int,
    gold: List[Dict[str, Any]],
    derived: Optional[List[Dict[str, Any]]],
    meta: Optional[List[Dict[str, Any]]],
    spec: LandingMetricSpec,
) -> Dict[str, Any]:
    """
    Micro snapshot is computed from the LAST date in the window.
    We compute MA7 vs MA30 deltas where possible.
    """
    # Build per-date maps
    der_map: Dict[str, Dict[str, Any]] = {}
    if derived:
        for d in derived:
            dt = d.get("date")
            if isinstance(dt, str) and dt:
                der_map[dt] = d

    meta_map: Dict[str, Dict[str, Any]] = {}
    if meta:
        for m in meta:
            dt = _meta_date(m)
            if dt:
                meta_map[dt] = m

    last_gold = gold[-1] if gold else None
    if not last_gold:
        return {}

    dt = last_gold.get("date")
    if not isinstance(dt, str) or not dt:
        return {}

    d_item = der_map.get(dt)
    m_item = meta_map.get(dt)

    def pack(metric: str) -> Dict[str, Any]:
        daily = _safe_num(last_gold.get(metric)) if last_gold else None
        ma7 = None
        ma30 = None
        if d_item:
            dm = _derived_metrics(d_item)
            ma7 = _safe_num(dm.get(f"{metric}__ma7"))
            ma30 = _safe_num(dm.get(f"{metric}__ma30"))
        return {
            "metric": metric,
            "date": dt,
            "daily": daily,
            "ma7": ma7,
            "ma30": ma30,
            "ma7_vs_ma30_pct": _pct_delta(ma7, ma30),
        }

    conf = _meta_confidence(m_item) if m_item else None
    regime = _meta_regime_label(m_item) if m_item else None

    return {
        "date": dt,
        "confidence": conf,
        "regime": regime,
        "activity": pack(spec.micro_activity),
        "friction": pack(spec.micro_friction),
        "capacity": pack(spec.micro_capacity),
    }


# -----------------------------
# Export
# -----------------------------

def export_landing(
    *,
    published_root: Path,
    out_root: Path,
    chains: List[str],
    windows_supported: List[int],
    default_window_days: int,
    spec: LandingMetricSpec = DEFAULT_SPEC,
) -> Dict[str, Any]:
    """
    Returns a summary dict.
    """
    published_root = published_root.resolve()
    out_root = out_root.resolve()
    _ensure_dir(out_root)

    # For each chain, export windows that exist (gold+derived required, meta optional).
    summary: Dict[str, Any] = {"chains": {}, "out_root": str(out_root)}

    for chain in chains:
        chain_out = out_root / chain
        _ensure_dir(chain_out)

        # Determine which windows are actually available
        available: List[int] = []
        per_window_stats: Dict[int, Dict[str, Any]] = {}

        for w in windows_supported:
            gold, derived, meta = _load_window_files(published_root, chain, w)
            if gold is None or derived is None:
                # gold+derived required for a proper landing series
                continue
            series = _build_series_for_window(chain, w, gold, derived, meta, spec)
            micro = _micro_from_window(chain, w, gold, derived, meta, spec)

            # Save per-window landing file
            payload = {
                "chain": chain,
                "window_days": w,
                "hero_metric": spec.hero_metric,
                "series": series,
                "micro": micro,
            }
            _write_json(chain_out / f"last{w}d.json", payload)

            available.append(w)
            per_window_stats[w] = {
                "points": len(series),
                "has_meta": bool(meta),
                "asof": series[-1]["date"] if series else "",
            }

        available = sorted(available)

        # Choose default window:
        # - prefer requested default if present
        # - else prefer largest available
        chosen = None
        if default_window_days in available:
            chosen = default_window_days
        elif available:
            chosen = max(available)

        # Write hero.json (default window payload embedded)
        hero_payload: Dict[str, Any] = {
            "chain": chain,
            "default_window_days": chosen,
            "windows_available": available,
            "hero_metric": spec.hero_metric,
        }

        if chosen is not None:
            hero_payload["default"] = _read_json(chain_out / f"last{chosen}d.json")
        else:
            hero_payload["default"] = None

        _write_json(chain_out / "hero.json", hero_payload)

        # Write chain manifest
        manifest = {
            "chain": chain,
            "default_window_days": chosen,
            "windows_available": available,
            "hero_metric": spec.hero_metric,
            "files": {
                "hero": "hero.json",
                "windows": {w: f"last{w}d.json" for w in available},
            },
            "stats": per_window_stats,
        }
        _write_json(chain_out / "manifest.json", manifest)

        summary["chains"][chain] = {
            "default_window_days": chosen,
            "windows_available": available,
            "stats": per_window_stats,
        }

    # Global landing manifest
    global_manifest = {
        "schema_version": "landing.v1",
        "hero_metric": spec.hero_metric,
        "default_window_days_requested": default_window_days,
        "chains": summary["chains"],
    }
    _write_json(out_root / "manifest.json", global_manifest)

    return summary


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


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--published-root", required=True, help="data/published/v1 root")
    ap.add_argument("--out-root", required=True, help="Output root for landing (typically data/published/v1/landing)")
    ap.add_argument("--chains", default="bitcoin,ethereum,arbitrum,base", help="Comma-separated chains")
    ap.add_argument("--windows", default="7,30,90,180,365", help="Comma-separated windows")
    ap.add_argument("--default-window", type=int, default=180, help="Default window days for hero.json if available")
    ap.add_argument("--hero-metric", default=DEFAULT_SPEC.hero_metric, help="Hero metric key, e.g. tx_count_daily")
    args = ap.parse_args()

    published = Path(args.published_root).resolve()
    out_root = Path(args.out_root).resolve()

    chains = _parse_list(args.chains)
    windows = _parse_windows(args.windows)
    default_window_days = int(args.default_window)
    hero_metric = str(args.hero_metric)

    spec = LandingMetricSpec(
        hero_metric=hero_metric,
        micro_activity=DEFAULT_SPEC.micro_activity,
        micro_friction=DEFAULT_SPEC.micro_friction,
        micro_capacity=DEFAULT_SPEC.micro_capacity,
    )

    summary = export_landing(
        published_root=published,
        out_root=out_root,
        chains=chains,
        windows_supported=windows,
        default_window_days=default_window_days,
        spec=spec,
    )

    print("[LANDING] OK out_root=", out_root)
    for c, info in summary["chains"].items():
        print(f"[LANDING] chain={c} windows={info.get('windows_available')} default={info.get('default_window_days')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
