# api/main.py
from __future__ import annotations

import os
import re
import json
import math
from dataclasses import dataclass
from datetime import date, datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import Response, FileResponse
from starlette.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from api.analog_engine import compute_analogs_and_forward_stats
from api.whn.service import infer_whn_from_gold
from api.market_scorecard import compute_market_scorecard
from api.regime_engine import compute_regime


APP_TITLE = "CSS API"
API_PREFIX = "/api/v1"
SUPPORTED_CHAINS = ["ethereum", "bitcoin", "base", "arbitrum"]

# --- Chain profiles (presentation semantics only) -----------------------------
CHAIN_TYPE_BY_CHAIN = {
    "bitcoin": "btc",
    "ethereum": "eth_l1",
    "base": "l2",
    "arbitrum": "l2",
}

PROFILE_BY_TYPE = {
    "btc": {
        "id": "btc",
        "label": "BTC",
        "hidden_metrics": [
            "gas_utilization_pct",
            "failed_tx_rate",
            "avg_gas_per_tx",
            "median_gas_price",
            "l2_burst_index",
        ],
        "capacity_proxy": ["avg_block_time_s", "median_fee_native"],
        "note": "BTC does not have EVM gas utilisation/failed-tx semantics; capacity is proxied by block time + fees.",
    },
    "eth_l1": {
        "id": "eth_l1",
        "label": "ETH L1",
        "hidden_metrics": [],
        "capacity_proxy": ["gas_utilization_pct"],
        "note": None,
    },
    "l2": {
        "id": "l2",
        "label": "L2",
        "hidden_metrics": [
            "gas_utilization_pct",
            "failed_tx_rate",
        ],
        "capacity_proxy": ["capacity_util_pct", "avg_block_time_s"],
        "note": "L2s use different fee/capacity mechanics; selected L1-only metrics are hidden.",
    },
}


def get_chain_profile(chain: str) -> dict:
    t = CHAIN_TYPE_BY_CHAIN.get(chain, "eth_l1")
    p = PROFILE_BY_TYPE.get(t, PROFILE_BY_TYPE["eth_l1"])
    return {
        "chain": chain,
        "type": t,
        "id": p["id"],
        "label": p["label"],
        "hidden_metrics": list(p.get("hidden_metrics", [])),
        "capacity_proxy": list(p.get("capacity_proxy", [])),
        "note": p.get("note"),
    }


REPO_ROOT = Path(__file__).resolve().parents[1]

# These reflect your actual pipeline output layout (junctions OK)
GOLD_DIR = Path(os.getenv("GOLD_DIR", str(REPO_ROOT / "data" / "published" / "v1" / "gold"))).resolve()
META_DIR = Path(os.getenv("META_DIR", str(REPO_ROOT / "data" / "calculated" / "meta"))).resolve()
GOLD_WEEKLY_DIR = Path(os.getenv("GOLD_WEEKLY_DIR", str(REPO_ROOT / "data" / "calculated" / "gold_weekly"))).resolve()
GOLD_STATUS_DIR = Path(os.getenv("GOLD_STATUS_DIR", str(REPO_ROOT / "data" / "calculated" / "ml_status"))).resolve()
CONFIDENCE_DIR = Path(os.getenv("CONFIDENCE_DIR", str(REPO_ROOT / "data" / "calculated" / "confidence"))).resolve()
CONFIDENCE_WEEKLY_DIR = Path(os.getenv("CONFIDENCE_WEEKLY_DIR", str(REPO_ROOT / "data" / "calculated" / "confidence_weekly"))).resolve()

WEB_DIST = (REPO_ROOT / "web" / "dist").resolve()

# Product policy: acceptable publish lag by chain (presentation)
PUBLISH_LAG_DAYS_POLICY = {
    "ethereum": 1,
    "bitcoin": 1,
    "base": 7,
    "arbitrum": 7,
}

CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.40"))


@dataclass(frozen=True)
class GoldCacheEntry:
    mtime_ns: int
    df: pd.DataFrame


_GOLD_CACHE: Dict[str, GoldCacheEntry] = {}

app = FastAPI(title=APP_TITLE)


# --- No-cache middleware for UI assets (eliminates build/cache confusion) -----
@app.middleware("http")
async def _no_cache_for_ui_assets(request: Request, call_next):
    resp = await call_next(request)

    path = request.url.path or ""
    if request.method == "GET" and not path.startswith(API_PREFIX):
        ct = (resp.headers.get("content-type") or "").lower()
        is_ui = (
            path == "/"
            or path.startswith("/assets/")
            or path.startswith("/data/")  # also avoid caching JSON for local dev clarity
            or path.endswith(".js")
            or path.endswith(".css")
            or path.endswith(".html")
            or path.endswith(".json")
        )
        if is_ui or ("text/html" in ct) or ("javascript" in ct) or ("text/css" in ct) or ("application/json" in ct):
            resp.headers["Cache-Control"] = "no-store, must-revalidate"
            resp.headers["Pragma"] = "no-cache"
            resp.headers["Expires"] = "0"
    return resp


# DevTools probe: avoid noisy 404s
@app.get("/.well-known/appspecific/com.chrome.devtools.json", include_in_schema=False)
def _chrome_devtools_probe() -> Response:
    return Response(status_code=204)


def _utc_today() -> date:
    now = datetime.now(timezone.utc)
    return date(now.year, now.month, now.day)


def _parse_iso_date(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()


def _compute_lag_days(date_iso: Optional[str]) -> Optional[int]:
    if not date_iso:
        return None
    try:
        d = _parse_iso_date(date_iso)
    except Exception:
        return None
    return (_utc_today() - d).days


def _last_gold_date_iso(df: Optional[pd.DataFrame]) -> Optional[str]:
    if df is None or getattr(df, "empty", True):
        return None
    col = "date" if "date" in df.columns else ("day" if "day" in df.columns else None)
    if col is None:
        return None
    v = df.iloc[-1][col]
    if v is None:
        return None
    try:
        if hasattr(v, "date") and not isinstance(v, str):
            return v.date().isoformat()
    except Exception:
        pass
    try:
        ts = pd.to_datetime(v, errors="coerce", utc=False)
        if pd.isna(ts):
            return None
        return ts.date().isoformat()
    except Exception:
        return None


def _gold_path(chain: str, granularity: str = "daily") -> Path:
    g = (granularity or "daily").lower().strip()
    if g == "weekly":
        return GOLD_WEEKLY_DIR / f"{chain}.parquet"
    return GOLD_DIR / f"{chain}.parquet"


def _status_path(chain: str) -> Path:
    return GOLD_STATUS_DIR / f"{chain}.json"


def _confidence_dir(chain: str) -> Path:
    return CONFIDENCE_DIR / chain


def _confidence_weekly_path(chain: str) -> Path:
    return CONFIDENCE_WEEKLY_DIR / f"{chain}.parquet"


def _load_confidence_series(chain: str, granularity: str = "daily") -> pd.DataFrame:
    g = (granularity or "daily").lower().strip()
    if g == "weekly":
        p = _confidence_weekly_path(chain)
        if not p.exists():
            return pd.DataFrame()
        try:
            return pd.read_parquet(p)
        except Exception:
            return pd.DataFrame()

    cdir = _confidence_dir(chain)
    if not cdir.exists() or not cdir.is_dir():
        return pd.DataFrame()

    rows = []
    for pj in sorted(cdir.glob("*.parquet")):
        try:
            d = pd.read_parquet(pj)
            if d is None or d.empty:
                continue
            rows.append(d)
        except Exception:
            continue
    if rows:
        return pd.concat(rows, ignore_index=True)

    for js in sorted(cdir.glob("*.json")):
        try:
            obj = json.loads(js.read_text(encoding="utf-8"))
            if not isinstance(obj, dict):
                continue
            rows.append(pd.DataFrame([obj]))
        except Exception:
            continue
    if rows:
        return pd.concat(rows, ignore_index=True)
    return pd.DataFrame()


def _slice_confidence_df(df: pd.DataFrame, *, max_rows: Optional[int] = None) -> List[Dict[str, Any]]:
    if df is None or df.empty:
        return []
    d = df.copy()

    if "date" not in d.columns and "day" in d.columns:
        d = d.rename(columns={"day": "date"})
    if "date" in d.columns:
        d["date"] = pd.to_datetime(d["date"], errors="coerce")
        d = d.dropna(subset=["date"]).sort_values("date")
    elif "week" in d.columns:
        d["week"] = pd.to_datetime(d["week"], errors="coerce")
        d = d.dropna(subset=["week"]).sort_values("week")

    if max_rows:
        try:
            d = d.tail(int(max_rows))
        except Exception:
            pass

    out = d.to_dict(orient="records")
    for r in out:
        if "date" in r:
            try:
                r["date"] = pd.to_datetime(r["date"]).date().isoformat()
            except Exception:
                pass
        if "week" in r:
            try:
                r["week"] = pd.to_datetime(r["week"]).date().isoformat()
            except Exception:
                pass
    return out


def _status_from_regime_and_scorecard(regime: Dict[str, Any], scorecard: Dict[str, Any]) -> Dict[str, Any]:
    lab = (regime or {}).get("label")
    if lab == "UNKNOWN/DEGRADED":
        return {
            "label": "UNKNOWN/DEGRADED",
            "color": "gray",
            "one_liner": (regime.get("gate", {}) or {}).get("explanation")
            or "Data quality is insufficient for a reliable conclusion.",
        }

    color = {
        "STABLE": "green",
        "HEATING": "yellow",
        "CONGESTED": "red",
        "CHEAP": "blue",
    }.get(str(lab), "yellow")

    dims = (scorecard or {}).get("dimensions", {}) if isinstance(scorecard, dict) else {}
    d_lv = (dims.get("demand") or {}).get("level")
    f_lv = (dims.get("friction") or {}).get("level")
    c_lv = (dims.get("capacity") or {}).get("level")

    parts = []
    if d_lv:
        parts.append(f"Demand: {d_lv}")
    if f_lv:
        parts.append(f"Friction: {f_lv}")
    if c_lv:
        parts.append(f"Capacity: {c_lv}")

    one = "; ".join(parts) if parts else "Market conditions derived from the latest weekly window."
    return {"label": str(lab) if lab else "—", "color": color, "one_liner": one}


def _gold_json_dir(chain: str, granularity: str = "daily") -> Path:
    g = (granularity or "daily").lower().strip()
    if g == "weekly":
        return GOLD_WEEKLY_DIR / chain
    return GOLD_DIR / chain


def _load_gold_df(chain: str, granularity: str = "daily") -> pd.DataFrame:
    g = (granularity or "daily").lower().strip()
    cache_key = f"{chain}|{g}"

    # 1) Canonical source of truth: published day-files YYYY-MM-DD.json.
    #    This avoids stale calculated parquet silently overriding the web contract.
    jdir = _gold_json_dir(chain, g)
    if jdir.exists() and jdir.is_dir():
        day_files: list[Path] = []
        try:
            for pth in jdir.glob("*.json"):
                if re.match(r"^\d{4}-\d{2}-\d{2}\.json$", pth.name):
                    day_files.append(pth)
        except Exception:
            day_files = []

        if day_files:
            day_files = sorted(day_files, key=lambda p: p.name)

            try:
                max_days = int(os.getenv("GOLD_JSON_MAX_DAYS", "5000"))
            except Exception:
                max_days = 5000
            if len(day_files) > max_days:
                day_files = day_files[-max_days:]

            try:
                latest_mtime = max(p.stat().st_mtime_ns for p in day_files)
                ent = _GOLD_CACHE.get(cache_key)
                if ent and ent.mtime_ns == latest_mtime:
                    return ent.df

                rows: list[dict] = []
                for pth in day_files:
                    try:
                        obj = json.loads(pth.read_text(encoding="utf-8", errors="replace"))
                        if isinstance(obj, dict):
                            rows.append(obj)
                    except Exception:
                        continue

                if rows:
                    df = pd.DataFrame(rows)
                    if "date" not in df.columns and "day" in df.columns:
                        df = df.rename(columns={"day": "date"})
                    if "date" in df.columns:
                        dtv = pd.to_datetime(df["date"], errors="coerce", utc=False)
                        df = df.assign(date=dtv.dt.date).dropna(subset=["date"]).sort_values("date").reset_index(drop=True)
                    _GOLD_CACHE[cache_key] = GoldCacheEntry(mtime_ns=latest_mtime, df=df)
                    return df
            except Exception:
                return pd.DataFrame()

        # 2) Fallback inside same published tree: aggregated JSON views.
        p30 = jdir / "last30d.json"
        platest = jdir / "latest.json"
        src = p30 if p30.exists() else (platest if platest.exists() else None)
        if src is not None:
            try:
                st = src.stat()
                ent = _GOLD_CACHE.get(cache_key)
                if ent and ent.mtime_ns == st.st_mtime_ns:
                    return ent.df

                obj = json.loads(src.read_text(encoding="utf-8", errors="replace"))
                if isinstance(obj, list):
                    df = pd.DataFrame(obj)
                elif isinstance(obj, dict):
                    df = pd.DataFrame([obj])
                else:
                    return pd.DataFrame()

                if "date" not in df.columns and "day" in df.columns:
                    df = df.rename(columns={"day": "date"})
                if "date" in df.columns:
                    dtv = pd.to_datetime(df["date"], errors="coerce", utc=False)
                    df = df.assign(date=dtv.dt.date).dropna(subset=["date"]).sort_values("date").reset_index(drop=True)

                _GOLD_CACHE[cache_key] = GoldCacheEntry(mtime_ns=st.st_mtime_ns, df=df)
                return df
            except Exception:
                return pd.DataFrame()

    # 3) Last-resort fallback: parquet if no published JSON contract is available.
    p = _gold_path(chain, g)
    if p.exists():
        st = p.stat()
        ent = _GOLD_CACHE.get(cache_key)
        if ent and ent.mtime_ns == st.st_mtime_ns:
            return ent.df
        try:
            df = pd.read_parquet(p)
        except Exception:
            return pd.DataFrame()
        _GOLD_CACHE[cache_key] = GoldCacheEntry(mtime_ns=st.st_mtime_ns, df=df)
        return df

    return pd.DataFrame()


def _compute_confidence_from_gold(df: pd.DataFrame, *, chain: str, gold_status: Optional[dict] = None) -> Optional[float]:
    if df is None or df.empty:
        return 0.0

    d = df.copy()
    if "date" not in d.columns and "day" in d.columns:
        d = d.rename(columns={"day": "date"})
    if "date" not in d.columns:
        return 0.0

    d["date"] = pd.to_datetime(d["date"], errors="coerce")
    d = d.dropna(subset=["date"]).sort_values("date")
    if d.empty:
        return 0.0

    asof = d["date"].iloc[-1].date()
    lag_days = (_utc_today() - asof).days
    freshness = math.exp(-max(0, lag_days) / 7.0)

    recent_start = d["date"].iloc[-1] - pd.Timedelta(days=30)
    r = d[d["date"] >= recent_start].copy()
    if r.empty:
        r = d.tail(min(len(d), 30)).copy()

    if gold_status and isinstance(gold_status, dict):
        for k in ("confidence_score", "confidence_numeric", "confidence", "score"):
            v = gold_status.get(k)
            if isinstance(v, (int, float)) and math.isfinite(float(v)):
                return float(max(0.0, min(1.0, float(v))))

    base_fields = ["tx_count_daily", "median_tx_fee_native", "median_tx_value_native", "avg_block_time_sec"]
    if chain != "bitcoin":
        base_fields.append("unique_active_addresses")
    if chain in ("ethereum",):
        base_fields.append("gas_utilization_pct")

    present = [c for c in base_fields if c in r.columns]
    if not present:
        completeness = 0.0
    else:
        rates = []
        for c in present:
            s = pd.to_numeric(r[c], errors="coerce")
            rates.append(float(s.notna().mean()))
        completeness = float(sum(rates) / len(rates))

    n = len(d)
    suff = float(max(0.0, min(1.0, n / 120.0)))
    conf = freshness * completeness * suff
    return float(max(0.0, min(1.0, conf)))


def _compute_confidence_snapshot_from_gold(
    df: pd.DataFrame,
    *,
    chain: str,
    gold_status: Optional[dict] = None,
    asof_date: Optional[date] = None,
) -> Dict[str, Any]:
    """Compute confidence for a specific historical as-of date.

    This helper is meant for META history rebuilds. It intentionally excludes
    "freshness vs today" from the confidence score so old rows are not penalized
    merely for being old. Freshness remains available as a separate lag field.
    """
    if df is None or df.empty:
        target_asof = asof_date.isoformat() if hasattr(asof_date, "isoformat") else None
        return {
            "chain": chain,
            "missing": True,
            "date": target_asof,
            "asof_date": target_asof,
            "confidence_score": 0.0,
            "lag_days_vs_asof_date": None,
            "lag_days_vs_utc_today": _compute_lag_days(target_asof),
            "semantics": "evidence_sufficiency_asof_date",
            "source": "gold_snapshot",
            "components": {
                "metric_coverage": 0.0,
                "recent_density": 0.0,
                "history_depth": 0.0,
            },
        }

    d = df.copy()
    if "date" not in d.columns and "day" in d.columns:
        d = d.rename(columns={"day": "date"})
    if "date" not in d.columns:
        target_asof = asof_date.isoformat() if hasattr(asof_date, "isoformat") else None
        return {
            "chain": chain,
            "missing": True,
            "date": target_asof,
            "asof_date": target_asof,
            "confidence_score": 0.0,
            "lag_days_vs_asof_date": None,
            "lag_days_vs_utc_today": _compute_lag_days(target_asof),
            "semantics": "evidence_sufficiency_asof_date",
            "source": "gold_snapshot",
            "components": {
                "metric_coverage": 0.0,
                "recent_density": 0.0,
                "history_depth": 0.0,
            },
        }

    d["date"] = pd.to_datetime(d["date"], errors="coerce")
    d = d.dropna(subset=["date"]).sort_values("date")
    if d.empty:
        target_asof = asof_date.isoformat() if hasattr(asof_date, "isoformat") else None
        return {
            "chain": chain,
            "missing": True,
            "date": target_asof,
            "asof_date": target_asof,
            "confidence_score": 0.0,
            "lag_days_vs_asof_date": None,
            "lag_days_vs_utc_today": _compute_lag_days(target_asof),
            "semantics": "evidence_sufficiency_asof_date",
            "source": "gold_snapshot",
            "components": {
                "metric_coverage": 0.0,
                "recent_density": 0.0,
                "history_depth": 0.0,
            },
        }

    target_asof = asof_date or d["date"].iloc[-1].date()
    d = d[d["date"].dt.date <= target_asof].copy()
    if d.empty:
        return {
            "chain": chain,
            "missing": True,
            "date": target_asof.isoformat(),
            "asof_date": target_asof.isoformat(),
            "confidence_score": 0.0,
            "lag_days_vs_asof_date": None,
            "lag_days_vs_utc_today": _compute_lag_days(target_asof.isoformat()),
            "semantics": "evidence_sufficiency_asof_date",
            "source": "gold_snapshot",
            "components": {
                "metric_coverage": 0.0,
                "recent_density": 0.0,
                "history_depth": 0.0,
            },
        }

    last_obs = d["date"].iloc[-1].date()
    lag_days_vs_asof = max(0, (target_asof - last_obs).days)

    if gold_status and isinstance(gold_status, dict):
        for k in ("confidence_score", "confidence_numeric", "confidence", "score"):
            v = gold_status.get(k)
            if isinstance(v, (int, float)) and math.isfinite(float(v)):
                score = float(max(0.0, min(1.0, float(v))))
                return {
                    "chain": chain,
                    "missing": False,
                    "date": target_asof.isoformat(),
                    "asof_date": target_asof.isoformat(),
                    "confidence_score": score,
                    "lag_days_vs_asof_date": lag_days_vs_asof,
                    "lag_days_vs_utc_today": _compute_lag_days(target_asof.isoformat()),
                    "semantics": "evidence_sufficiency_asof_date",
                    "source": "gold_status",
                    "components": {
                        "metric_coverage": None,
                        "recent_density": None,
                        "history_depth": None,
                    },
                }

    recent_start = pd.Timestamp(target_asof) - pd.Timedelta(days=29)
    r = d[d["date"] >= recent_start].copy()
    if r.empty:
        r = d.tail(min(len(d), 30)).copy()

    base_fields = ["tx_count_daily", "median_tx_fee_native", "median_tx_value_native", "avg_block_time_sec"]
    if chain != "bitcoin":
        base_fields.append("unique_active_addresses")
    if chain in ("ethereum",):
        base_fields.append("gas_utilization_pct")

    present = [c for c in base_fields if c in r.columns]
    if present:
        rates = []
        for c in present:
            s = pd.to_numeric(r[c], errors="coerce")
            rates.append(float(s.notna().mean()))
        metric_coverage = float(sum(rates) / len(rates))
    else:
        metric_coverage = 0.0

    recent_days_observed = int(r["date"].dt.date.nunique()) if "date" in r.columns else len(r)
    recent_density = float(max(0.0, min(1.0, recent_days_observed / 30.0)))

    history_days = int(d["date"].dt.date.nunique())
    history_depth = float(max(0.0, min(1.0, history_days / 120.0)))

    # Weighted blend for smoother, less "mechanical" scores than a raw product.
    score = (
        0.50 * metric_coverage
        + 0.30 * recent_density
        + 0.20 * history_depth
    )

    score = float(max(0.0, min(1.0, score)))

    return {
        "chain": chain,
        "missing": False,
        "date": target_asof.isoformat(),
        "asof_date": target_asof.isoformat(),
        "confidence_score": score,
        "lag_days_vs_asof_date": lag_days_vs_asof,
        "lag_days_vs_utc_today": _compute_lag_days(target_asof.isoformat()),
        "semantics": "evidence_sufficiency_asof_date",
        "source": "gold_snapshot",
        "components": {
            "metric_coverage": metric_coverage,
            "recent_density": recent_density,
            "history_depth": history_depth,
        },
    }


def _slice_gold_df(df: pd.DataFrame, date_from: Optional[str], date_to: Optional[str], max_rows: Optional[int]) -> List[Dict[str, Any]]:
    if df is None or df.empty:
        return []
    if "date" not in df.columns and "day" in df.columns:
        df = df.rename(columns={"day": "date"})
    if "date" not in df.columns:
        return []

    ddf = df.copy()
    if not pd.api.types.is_datetime64_any_dtype(ddf["date"]):
        ddf["date"] = pd.to_datetime(ddf["date"], errors="coerce")

    ddf = ddf.dropna(subset=["date"]).sort_values("date")

    if date_from:
        try:
            ddf = ddf[ddf["date"] >= pd.to_datetime(date_from)]
        except Exception:
            pass
    if date_to:
        try:
            ddf = ddf[ddf["date"] <= pd.to_datetime(date_to)]
        except Exception:
            pass

    if max_rows:
        try:
            ddf = ddf.tail(int(max_rows))
        except Exception:
            pass

    out = ddf.to_dict(orient="records")
    for r in out:
        try:
            iso = pd.to_datetime(r.get("date")).date().isoformat()
            r["date"] = iso
            r.setdefault("day", iso)
        except Exception:
            pass
        r.setdefault("chain", None)
    return out


def _load_gold_status(chain: str) -> Dict[str, Any]:
    try:
        p = _status_path(chain)
        if p.exists():
            obj = json.loads(p.read_text(encoding="utf-8", errors="replace"))
            if isinstance(obj, dict):
                obj.setdefault("chain", chain)
                obj.setdefault("missing", False)
                return obj
    except Exception:
        pass

    # Fallback: derive minimal status from gold JSON latest.json
    try:
        jdir = _gold_json_dir(chain, "daily")
        latest = jdir / "latest.json"
        if latest.exists():
            obj = json.loads(latest.read_text(encoding="utf-8", errors="replace"))
            dt = obj.get("date") if isinstance(obj, dict) else None
            return {
                "chain": chain,
                "missing": False,
                "features_last_date": dt,
                "features_lag_days_vs_utc_today": None,
                "note": "Fallback status derived from gold JSON (no pipeline ml_status present).",
            }
    except Exception:
        pass

    return {"chain": chain, "missing": True, "features_last_date": None, "features_lag_days_vs_utc_today": None}


def _load_latest_confidence(chain: str) -> Dict[str, Any]:
    cdir = _confidence_dir(chain)
    if not cdir.exists() or not cdir.is_dir():
        return {"chain": chain, "missing": True, "date": None, "confidence_score": None, "lag_days_vs_utc_today": None}

    files = sorted(cdir.glob("*.json"))
    if not files:
        return {"chain": chain, "missing": True, "date": None, "confidence_score": None, "lag_days_vs_utc_today": None}

    latest = files[-1]
    try:
        obj = json.loads(latest.read_text(encoding="utf-8"))
        if not isinstance(obj, dict):
            obj = {}
    except Exception:
        obj = {}

    date_iso = obj.get("date") or obj.get("day") or obj.get("asof")
    score = obj.get("confidence_score", obj.get("score"))

    return {
        "chain": chain,
        "missing": False if (date_iso or score is not None) else True,
        "date": date_iso,
        "confidence_score": score,
        "lag_days_vs_utc_today": _compute_lag_days(date_iso),
        "raw": obj,
    }


@app.get("/healthz")
def healthz() -> Dict[str, Any]:
    return {
        "ok": True,
        "gold_dir": str(GOLD_DIR),
        "meta_dir": str(META_DIR),
        "has_gold_dir": GOLD_DIR.exists(),
        "has_meta_dir": META_DIR.exists(),
        "web_dist_exists": WEB_DIST.exists(),
    }


@app.get(f"{API_PREFIX}/profile/{{chain}}")
def chain_profile(chain: str):
    if chain not in SUPPORTED_CHAINS:
        raise HTTPException(status_code=404, detail=f"Unknown chain: {chain}")
    return get_chain_profile(chain)


@app.get(f"{API_PREFIX}/confidence/{{chain}}")
def confidence(chain: str) -> Dict[str, Any]:
    if chain not in SUPPORTED_CHAINS:
        return {"chain": chain, "missing": True, "unsupported": True, "date": None, "confidence_score": None, "lag_days_vs_utc_today": None}
    return _load_latest_confidence(chain)


@app.get(f"{API_PREFIX}/confidence_series/{{chain}}")
def confidence_series(
    chain: str,
    granularity: str = Query("daily"),
    max_rows: Optional[int] = Query(None, ge=1, le=5000),
) -> List[Dict[str, Any]]:
    if chain not in SUPPORTED_CHAINS:
        return []
    g = (granularity or "daily").lower().strip()
    if g not in {"daily", "weekly"}:
        raise HTTPException(status_code=400, detail="granularity must be daily|weekly")
    df = _load_confidence_series(chain, g)
    return _slice_confidence_df(df, max_rows=max_rows)




LOGICAL_METRIC_ALIASES: Dict[str, List[str]] = {
    "tx_count_daily": ["tx_count_daily"],
    "block_count_daily": ["block_count_daily"],
    "value_transferred_native": ["value_transferred_native"],
    "median_tx_value_native": ["median_tx_value_native"],
    "median_tx_fee_native": ["median_tx_fee_native", "median_fee_native"],
    "failed_tx_rate": ["failed_tx_rate"],
    "gas_utilization_pct": ["gas_utilization_pct"],
    "unique_active_addresses": ["unique_active_addresses"],
    "avg_block_time_sec": ["avg_block_time_sec", "avg_block_time_s"],
}

CHAIN_REQUIRED_LOGICAL_METRICS: Dict[str, List[str]] = {
    "bitcoin": [
        "tx_count_daily",
        "block_count_daily",
        "value_transferred_native",
        "median_tx_value_native",
        "avg_block_time_sec",
    ],
    "ethereum": [
        "tx_count_daily",
        "block_count_daily",
        "value_transferred_native",
        "median_tx_value_native",
        "median_tx_fee_native",
        "failed_tx_rate",
        "gas_utilization_pct",
        "unique_active_addresses",
        "avg_block_time_sec",
    ],
    "arbitrum": [
        "tx_count_daily",
        "block_count_daily",
        "value_transferred_native",
        "median_tx_value_native",
        "median_tx_fee_native",
        "unique_active_addresses",
        "avg_block_time_sec",
    ],
    "base": [
        "tx_count_daily",
        "block_count_daily",
        "value_transferred_native",
        "median_tx_value_native",
        "median_tx_fee_native",
        "unique_active_addresses",
        "avg_block_time_sec",
    ],
}


def _normalize_gold_daily_df(df: Optional[pd.DataFrame]) -> pd.DataFrame:
    if df is None or getattr(df, "empty", True):
        return pd.DataFrame()
    d = df.copy()
    if "date" not in d.columns and "day" in d.columns:
        d = d.rename(columns={"day": "date"})
    if "date" in d.columns:
        d["date"] = pd.to_datetime(d["date"], errors="coerce").dt.date
        d = d.dropna(subset=["date"]).sort_values("date").reset_index(drop=True)
    return d


def _logical_metric_value(row: pd.Series, logical_name: str) -> Any:
    for candidate in LOGICAL_METRIC_ALIASES.get(logical_name, [logical_name]):
        if candidate in row.index:
            return row.get(candidate)
    return None


def _is_present_value(value: Any) -> bool:
    if value is None:
        return False
    try:
        return bool(pd.notna(value))
    except Exception:
        return False


def _required_metrics_for_chain(chain: str) -> List[str]:
    return list(CHAIN_REQUIRED_LOGICAL_METRICS.get(chain, CHAIN_REQUIRED_LOGICAL_METRICS["ethereum"]))


def _row_metric_coverage(row: pd.Series, chain: str) -> Optional[float]:
    required = _required_metrics_for_chain(chain)
    if not required:
        return None
    present = 0
    total = 0
    for logical_name in required:
        total += 1
        if _is_present_value(_logical_metric_value(row, logical_name)):
            present += 1
    if total <= 0:
        return None
    return present / total


def _freshness_factor_asof(lag_days: Optional[int], chain: str) -> Optional[float]:
    if lag_days is None:
        return None
    expected = int(PUBLISH_LAG_DAYS_POLICY.get(chain, 1))
    soft = expected + (1 if expected <= 1 else 3)
    hard = expected + (3 if expected <= 1 else 8)
    if lag_days <= expected:
        return 1.0
    if lag_days >= hard:
        return 0.0
    if lag_days <= soft:
        span = max(1, soft - expected)
        return max(0.70, 1.0 - ((lag_days - expected) / span) * 0.30)
    span = max(1, hard - soft)
    return max(0.0, 0.70 - ((lag_days - soft) / span) * 0.70)


def _compute_data_quality_details(df: Optional[pd.DataFrame], *, chain: str, gold_status: Optional[Dict[str, Any]] = None, asof_date: Optional[str] = None) -> Dict[str, Any]:
    d = _normalize_gold_daily_df(df)
    if d.empty:
        return {
            "score": None,
            "updated_through": None,
            "lag_days_vs_asof_date": None,
            "components": {
                "current_row_coverage": None,
                "recent_metric_coverage": None,
                "recent_density": None,
                "history_depth": None,
                "freshness_asof": None,
            },
        }

    latest_row = d.iloc[-1]
    updated_through = latest_row["date"].isoformat() if hasattr(latest_row["date"], "isoformat") else str(latest_row["date"])

    if asof_date:
        try:
            asof_dt = _parse_iso_date(asof_date)
        except Exception:
            asof_dt = latest_row["date"]
    else:
        asof_dt = latest_row["date"]

    lag_days_vs_asof_date = max(0, (asof_dt - latest_row["date"]).days)

    current_row_coverage = _row_metric_coverage(latest_row, chain)

    recent_start = asof_dt - timedelta(days=29)
    recent_rows = d[d["date"] >= recent_start].copy()
    expected_recent_days = 30
    observed_recent_days = int(recent_rows["date"].nunique()) if not recent_rows.empty else 0
    recent_density = min(1.0, observed_recent_days / expected_recent_days)

    if not recent_rows.empty:
        row_coverages = [
            _row_metric_coverage(row, chain)
            for _, row in recent_rows.iterrows()
        ]
        row_coverages = [float(v) for v in row_coverages if isinstance(v, (int, float)) and math.isfinite(float(v))]
        recent_metric_coverage = (sum(row_coverages) / len(row_coverages)) if row_coverages else current_row_coverage
    else:
        recent_metric_coverage = current_row_coverage

    history_depth = min(1.0, float(d["date"].nunique()) / 90.0)
    freshness_asof = _freshness_factor_asof(lag_days_vs_asof_date, chain)

    weighted_parts = [
        (current_row_coverage, 0.30),
        (recent_metric_coverage, 0.20),
        (recent_density, 0.20),
        (history_depth, 0.15),
        (freshness_asof, 0.15),
    ]
    num = 0.0
    den = 0.0
    for value, weight in weighted_parts:
        if isinstance(value, (int, float)) and math.isfinite(float(value)):
            num += float(value) * weight
            den += weight
    score = None if den <= 0 else max(0.0, min(1.0, num / den))

    return {
        "score": score,
        "updated_through": updated_through,
        "lag_days_vs_asof_date": lag_days_vs_asof_date,
        "components": {
            "current_row_coverage": current_row_coverage,
            "recent_metric_coverage": recent_metric_coverage,
            "recent_density": recent_density,
            "history_depth": history_depth,
            "freshness_asof": freshness_asof,
        },
    }


def _compute_confidence_from_gold(df: Optional[pd.DataFrame], *, chain: str, gold_status: Optional[Dict[str, Any]] = None) -> Optional[float]:
    details = _compute_data_quality_details(df, chain=chain, gold_status=gold_status)
    value = details.get("score")
    return float(value) if isinstance(value, (int, float)) and math.isfinite(float(value)) else None


def _score_level_margin(score: Optional[float], level: Optional[str]) -> Optional[float]:
    if score is None or not isinstance(score, (int, float)) or not math.isfinite(float(score)):
        return None
    s = float(score)
    norm = str(level or "").strip().lower()
    if not norm:
        if s >= 67:
            norm = "high"
        elif s <= 33:
            norm = "low"
        else:
            norm = "normal"
    if norm in {"balanced"}:
        norm = "normal"
    if norm in {"normal", "neutral"}:
        margin = min(max(0.0, s - 33.0), max(0.0, 67.0 - s))
        return max(0.0, min(1.0, margin / 17.0))
    if norm in {"high", "elevated", "heating", "congested"}:
        return max(0.0, min(1.0, (s - 67.0) / 33.0))
    if norm in {"low", "cheap", "cooling"}:
        return max(0.0, min(1.0, (33.0 - s) / 33.0))
    if s >= 67:
        return max(0.0, min(1.0, (s - 67.0) / 33.0))
    if s <= 33:
        return max(0.0, min(1.0, (33.0 - s) / 33.0))
    return max(0.0, min(1.0, min(s - 33.0, 67.0 - s) / 17.0))


def _driver_signal_support(regime: Optional[Dict[str, Any]], *, stable_mode: bool = False) -> Optional[float]:
    drivers = []
    if isinstance(regime, dict):
        raw = regime.get("drivers")
        if isinstance(raw, list):
            drivers = raw[:5]
    zs: List[float] = []
    for driver in drivers:
        if not isinstance(driver, dict):
            continue
        z = driver.get("z_robust")
        if isinstance(z, (int, float)) and math.isfinite(float(z)):
            zs.append(max(0.0, min(1.0, abs(float(z)) / 3.0)))
    if not zs:
        return None
    mean_z = sum(zs) / len(zs)
    if stable_mode:
        return max(0.0, min(1.0, 1.0 - mean_z))
    return mean_z


def _compute_label_clarity(scorecard: Optional[Dict[str, Any]], regime: Optional[Dict[str, Any]]) -> Optional[float]:
    if not isinstance(scorecard, dict):
        return None

    dims = ((scorecard.get("dimensions") or {}) if isinstance(scorecard.get("dimensions"), dict) else {})
    valid_scores: List[float] = []
    margins: List[float] = []
    for axis in ("demand", "friction", "capacity"):
        block = dims.get(axis) if isinstance(dims.get(axis), dict) else {}
        score = block.get("score")
        level = block.get("level")
        if isinstance(score, (int, float)) and math.isfinite(float(score)):
            valid_scores.append(float(score))
        margin = _score_level_margin(score if isinstance(score, (int, float)) else None, level if isinstance(level, str) else None)
        if isinstance(margin, (int, float)) and math.isfinite(float(margin)):
            margins.append(float(margin))

    if not valid_scores and not margins:
        return None

    axis_margin = (sum(margins) / len(margins)) if margins else None
    neutrality = max(0.0, min(1.0, 1.0 - (sum(abs(v - 50.0) for v in valid_scores) / max(1, len(valid_scores))) / 17.0)) if valid_scores else None

    label = ""
    if isinstance(regime, dict):
        label = str(regime.get("label") or "").upper().strip()

    if label in {"", "UNKNOWN/DEGRADED"}:
        return 0.0

    if label == "STABLE":
        driver_support = _driver_signal_support(regime, stable_mode=True)
        parts = [
            (neutrality, 0.60),
            (axis_margin, 0.25),
            (driver_support, 0.15),
        ]
    else:
        driver_support = _driver_signal_support(regime, stable_mode=False)
        parts = [
            (axis_margin, 0.65),
            (driver_support, 0.35),
        ]

    num = 0.0
    den = 0.0
    for value, weight in parts:
        if isinstance(value, (int, float)) and math.isfinite(float(value)):
            num += float(value) * weight
            den += weight
    if den <= 0:
        return None
    return max(0.0, min(1.0, num / den))


def _build_confidence_payload(
    df: Optional[pd.DataFrame],
    *,
    chain: str,
    gold_status: Optional[Dict[str, Any]] = None,
    scorecard: Optional[Dict[str, Any]] = None,
    regime: Optional[Dict[str, Any]] = None,
    asof_date: Optional[str] = None,
) -> Dict[str, Any]:
    details = _compute_data_quality_details(df, chain=chain, gold_status=gold_status, asof_date=asof_date)
    data_quality_score = details.get("score")
    label_confidence_score = _compute_label_clarity(scorecard, regime)

    if isinstance(data_quality_score, (int, float)) and math.isfinite(float(data_quality_score)):
        if isinstance(label_confidence_score, (int, float)) and math.isfinite(float(label_confidence_score)):
            confidence_score = max(0.0, min(1.0, math.sqrt(float(data_quality_score) * float(label_confidence_score))))
        else:
            confidence_score = float(data_quality_score)
    else:
        confidence_score = None

    updated_through = details.get("updated_through")
    effective_date = updated_through or asof_date

    return {
        "chain": chain,
        "missing": confidence_score is None,
        "date": effective_date,
        "asof_date": asof_date,
        "updated_through": updated_through,
        "confidence_score": confidence_score,
        "data_quality_score": float(data_quality_score) if isinstance(data_quality_score, (int, float)) and math.isfinite(float(data_quality_score)) else None,
        "label_confidence_score": float(label_confidence_score) if isinstance(label_confidence_score, (int, float)) and math.isfinite(float(label_confidence_score)) else None,
        "lag_days_vs_asof_date": details.get("lag_days_vs_asof_date"),
        "lag_days_vs_utc_today": _compute_lag_days(effective_date),
        "semantics": "combined_data_quality_and_label_stability",
        "source": "gold_history",
        "components": details.get("components") or {},
    }


def compute_overview(chain: str, *, asof: Optional[str] = None) -> Dict[str, Any]:
    if chain not in SUPPORTED_CHAINS:
        return {"chain": chain, "missing": True, "unsupported": True}

    gs = _load_gold_status(chain)
    df = _load_gold_df(chain, "daily")

    if asof:
        try:
            asof_dt = pd.to_datetime(asof, errors="raise")
        except Exception:
            raise HTTPException(status_code=400, detail=f"asof must be YYYY-MM-DD, got: {asof}")

        if df is not None and not df.empty:
            ddf = df.copy()
            if "date" not in ddf.columns and "day" in ddf.columns:
                ddf = ddf.rename(columns={"day": "date"})
            if "date" in ddf.columns:
                if not pd.api.types.is_datetime64_any_dtype(ddf["date"]):
                    ddf["date"] = pd.to_datetime(ddf["date"], errors="coerce")
                ddf = ddf.dropna(subset=["date"]).sort_values("date")
                ddf = ddf[ddf["date"] <= asof_dt]
                df = ddf

    if df is None or df.empty:
        return {
            "chain": chain,
            "missing": True,
            "profile": get_chain_profile(chain),
            "gold_status": gs,
            "confidence": {
                "chain": chain,
                "missing": True,
                "date": None,
                "confidence_score": None,
                "data_quality_score": None,
                "label_confidence_score": None,
                "lag_days_vs_asof_date": None,
                "lag_days_vs_utc_today": None,
                "semantics": "combined_data_quality_and_label_stability",
                "components": {},
            },
            "data_confidence": {"missing": True, "confidence_score": None, "date": None, "lag_days_vs_asof_date": None, "lag_days_vs_utc_today": None, "components": {}, "semantics": "data_quality_and_history_coverage_only"},
            "publish_confidence": {"missing": True, "confidence_score": None, "threshold": CONFIDENCE_THRESHOLD, "eligible": None, "reason": "missing_confidence"},
            "scorecard": {},
            "regime": {},
            "updated_through": None,
            "publish_lag_days_policy": PUBLISH_LAG_DAYS_POLICY.get(chain, 1),
            "tier_used": "standard",
            "status": {"label": "UNKNOWN/DEGRADED", "one_liner": None, "color": "gray"},
        }

    asof_iso = _last_gold_date_iso(df)

    data_quality_seed = _compute_confidence_from_gold(df, chain=chain, gold_status=gs)

    preliminary_scorecard = compute_market_scorecard(df, chain=chain, confidence_score=data_quality_seed, window_days=7)
    preliminary_regime = compute_regime(
        df,
        chain=chain,
        profile=get_chain_profile(chain),
        asof_date=preliminary_scorecard.get("asof_date"),
        window_days=7,
        confidence_score=data_quality_seed,
        confidence_threshold=CONFIDENCE_THRESHOLD,
    )

    conf = _build_confidence_payload(
        df,
        chain=chain,
        gold_status=gs,
        scorecard=preliminary_scorecard,
        regime=preliminary_regime,
        asof_date=asof_iso,
    )
    conf_score = conf.get("confidence_score")

    scorecard = compute_market_scorecard(df, chain=chain, confidence_score=conf_score, window_days=7)
    regime = compute_regime(
        df,
        chain=chain,
        profile=get_chain_profile(chain),
        asof_date=scorecard.get("asof_date"),
        window_days=7,
        confidence_score=conf_score,
        confidence_threshold=CONFIDENCE_THRESHOLD,
    )

    status = _status_from_regime_and_scorecard(regime, scorecard)
    missing = bool(gs.get("missing", False) and (df is None or df.empty))
    updated_through = conf.get("updated_through") or _last_gold_date_iso(df)

    data_confidence_score = conf.get("data_quality_score")

    publish_confidence: Dict[str, Any] = {
        "missing": conf_score is None,
        "confidence_score": conf_score,
        "threshold": CONFIDENCE_THRESHOLD,
        "eligible": bool(conf_score >= CONFIDENCE_THRESHOLD) if isinstance(conf_score, (int, float)) and math.isfinite(float(conf_score)) else None,
        "reason": "combined_confidence_threshold" if isinstance(conf_score, (int, float)) and math.isfinite(float(conf_score)) else "missing_confidence",
    }

    data_confidence: Dict[str, Any] = {
        "missing": data_confidence_score is None,
        "confidence_score": data_confidence_score,
        "date": updated_through,
        "lag_days_vs_asof_date": conf.get("lag_days_vs_asof_date"),
        "lag_days_vs_utc_today": conf.get("lag_days_vs_utc_today"),
        "components": conf.get("components") or {},
        "semantics": "data_quality_and_history_coverage_only",
    }

    return {
        "chain": chain,
        "missing": missing,
        "profile": get_chain_profile(chain),
        "gold_status": gs,
        "confidence": conf,
        "data_confidence": data_confidence,
        "publish_confidence": publish_confidence,
        "scorecard": scorecard,
        "regime": regime,
        "updated_through": updated_through,
        "publish_lag_days_policy": PUBLISH_LAG_DAYS_POLICY.get(chain, 1),
        "tier_used": "standard",
        "status": status,
    }


@app.get(f"{API_PREFIX}/overview")
def overview(chain: str = Query(...), asof: Optional[str] = Query(None)) -> Dict[str, Any]:
    return compute_overview(chain, asof=asof)


@app.get(f"{API_PREFIX}/gold/{{chain}}")
def gold(
    chain: str,
    granularity: str = Query("daily"),
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    max_rows: Optional[int] = Query(None, ge=1, le=5000),
) -> List[Dict[str, Any]]:
    if chain not in SUPPORTED_CHAINS:
        return []
    g = (granularity or "daily").lower().strip()
    if g not in {"daily", "weekly"}:
        raise HTTPException(status_code=400, detail="granularity must be daily|weekly")
    dfrom = from_ or date_from
    dto = to or date_to
    df = _load_gold_df(chain, g)
    return _slice_gold_df(df, dfrom, dto, max_rows)


# --- NEW: window endpoint that respects your storage model --------------------
@app.get(f"{API_PREFIX}/gold_window")
def gold_window(
    chain: str = Query(...),
    days: int = Query(30, ge=1, le=4000),
) -> JSONResponse:
    """
    Returns an array of daily datapoints for the last N available days by scanning:
      data/calculated/gold/<chain>/YYYY-MM-DD.json

    This matches your contract:
      - latest.json is 1 datapoint
      - date-files are 1 datapoint each
      - last30d.json may exist as an optimization, but is not required for 90/180.
    """
    if chain not in SUPPORTED_CHAINS:
        raise HTTPException(status_code=404, detail=f"Unknown chain: {chain}")

    # only allow the UI windows you actually use (keeps API stable)
    if days not in (30, 90, 180):
        raise HTTPException(status_code=400, detail="days must be one of 30, 90, 180")

    jdir = _gold_json_dir(chain, "daily")
    if not jdir.exists():
        raise HTTPException(status_code=404, detail=f"gold json dir not found for chain={chain}: {jdir}")

    # Collect day-files
    day_files = [p for p in jdir.glob("*.json") if re.match(r"^\d{4}-\d{2}-\d{2}\.json$", p.name)]
    if not day_files:
        raise HTTPException(status_code=404, detail=f"no daily day-files found for chain={chain} in {jdir}")

    # Sort by date, take last N
    day_files.sort(key=lambda p: p.name)
    selected = day_files[-days:]

    out: list[dict] = []
    for pth in selected:
        try:
            obj = json.loads(pth.read_text(encoding="utf-8", errors="replace"))
            if isinstance(obj, dict):
                out.append(obj)
        except Exception:
            # skip corrupt file but keep going
            continue

    if not out:
        raise HTTPException(status_code=500, detail=f"day-files exist but none were readable for chain={chain}")

    # Ensure chronological order (already, but keep deterministic)
    out.sort(key=lambda r: str(r.get("date") or r.get("day") or ""))

    return JSONResponse(out)


@app.get(f"{API_PREFIX}/analogs/{{chain}}")
def analogs(
    chain: str,
    horizon_days: int = Query(7, ge=1, le=30),
    k: int = Query(5, ge=1, le=25),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> Dict[str, Any]:
    if chain not in SUPPORTED_CHAINS:
        raise HTTPException(status_code=404, detail=f"Unsupported chain '{chain}'")
    df = _load_gold_df(chain)
    rows = _slice_gold_df(df, date_from, date_to, None)
    if len(rows) < 90:
        raise HTTPException(status_code=400, detail="Not enough history for analogs")
    return compute_analogs_and_forward_stats(chain=chain, gold_rows=rows, horizon_days=horizon_days, k=k)


@app.get(f"{API_PREFIX}/whn/{{chain}}")
def whn(chain: str) -> Dict[str, Any]:
    if chain not in SUPPORTED_CHAINS:
        raise HTTPException(status_code=404, detail=f"Unsupported chain '{chain}'")
    df = _load_gold_df(chain)
    rows = _slice_gold_df(df, None, None, None)
    if not rows:
        raise HTTPException(status_code=400, detail="No gold rows")
    return infer_whn_from_gold(chain=chain, gold_rows=rows)


# --- Static mounts ------------------------------------------------------------
# IMPORTANT: mounts must be placed before "/" mount.

# if GOLD_DIR.exists():
#     app.mount("/data/css_json", StaticFiles(directory=str(GOLD_DIR), html=False), name="css_json")
# else:
#     print(f"[WARN] GOLD_DIR not found: {GOLD_DIR}")

if GOLD_DIR.exists():
    # app.mount("/data/css_json", StaticFiles(directory=str(GOLD_DIR), html=False), name="css_json")
    print("[INFO] /data/css_json served via FileResponse route (not StaticFiles)")
else:
    print(f"[WARN] GOLD_DIR not found: {GOLD_DIR}")



# if META_DIR.exists():
#     app.mount("/data/css_json_meta", StaticFiles(directory=str(META_DIR), html=False), name="css_json_meta")
# else:
#     print(f"[WARN] META_DIR not found: {META_DIR}")

if META_DIR.exists():
    # app.mount("/data/css_json_meta", StaticFiles(directory=str(META_DIR), html=False), name="css_json_meta")
    print("[INFO] /data/css_json_meta served via FileResponse route (not StaticFiles)")
else:
    print(f"[WARN] META_DIR not found: {META_DIR}")



@app.get("/data/css_json/{chain}/{filename}")
def get_css_json(chain: str, filename: str):
    p = GOLD_DIR / chain / filename
    if not p.exists():
        raise HTTPException(status_code=404, detail=f"Not found: {chain}/{filename}")
    return FileResponse(str(p))

@app.get("/data/css_json_meta/{chain}/{filename}")
def get_css_json_meta(chain: str, filename: str):
    p = META_DIR / chain / filename
    if not p.exists():
        raise HTTPException(status_code=404, detail=f"Not found: {chain}/{filename}")
    return FileResponse(str(p))



if WEB_DIST.exists():
    app.mount("/", StaticFiles(directory=str(WEB_DIST), html=True), name="web")
else:
    print(f"[WARN] WEB_DIST not found: {WEB_DIST}")


def main() -> None:
    import uvicorn
    uvicorn.run("api.main:app", host="127.0.0.1", port=8000, reload=False, log_level="info")


if __name__ == "__main__":
    main()
