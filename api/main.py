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
GOLD_DIR = Path(os.getenv("GOLD_DIR", str(REPO_ROOT / "data" / "calculated" / "gold"))).resolve()
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

    # 1) Parquet if present (optional)
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

    # 2) JSON mode: prefer day-files YYYY-MM-DD.json (your intended contract)
    jdir = _gold_json_dir(chain, g)
    if not jdir.exists() or not jdir.is_dir():
        return pd.DataFrame()

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
            MAX_DAYS = int(os.getenv("GOLD_JSON_MAX_DAYS", "2000"))
        except Exception:
            MAX_DAYS = 2000
        if len(day_files) > MAX_DAYS:
            day_files = day_files[-MAX_DAYS:]

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

            if not rows:
                return pd.DataFrame()

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

    # 3) Fallback: aggregated files (last30d.json may be array; latest.json is single datapoint)
    p30 = jdir / "last30d.json"
    platest = jdir / "latest.json"
    src = p30 if p30.exists() else (platest if platest.exists() else None)
    if src is None:
        return pd.DataFrame()

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


def compute_overview(chain: str, *, asof: Optional[str] = None) -> Dict[str, Any]:
    if chain not in SUPPORTED_CHAINS:
        return {"chain": chain, "missing": True, "unsupported": True}

    gs = _load_gold_status(chain)
    df = _load_gold_df(chain, "daily")

    # Optional as-of slicing
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

    conf = _load_latest_confidence(chain)
    conf_score = conf.get("confidence_score")

    if conf_score is None or (isinstance(conf_score, float) and not math.isfinite(conf_score)):
        derived = _compute_confidence_from_gold(df, chain=chain, gold_status=gs)
        conf_score = derived
        conf = dict(conf or {})
        conf.update({
            "chain": chain,
            "missing": False if derived is not None else True,
            "date": (_last_gold_date_iso(df) or conf.get("date")),
            "confidence_score": float(derived) if derived is not None else None,
            "lag_days_vs_utc_today": _compute_lag_days((_last_gold_date_iso(df) or conf.get("date"))),
        })

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
    updated_through = _last_gold_date_iso(df)

    # Separate two concepts to avoid contradictory UI:
    data_confidence_score = float(conf_score) if isinstance(conf_score, (int, float)) and math.isfinite(float(conf_score)) else None

    publish_confidence: Dict[str, Any] = {
        "missing": True,
        "confidence_score": None,
        "threshold": None,
        "eligible": None,
        "reason": None,
    }
    try:
        gate = (regime or {}).get("gate") if isinstance(regime, dict) else None
        if isinstance(gate, dict) and gate.get("type") == "confidence_threshold":
            cs = gate.get("confidence_score")
            th = gate.get("threshold")
            if isinstance(cs, (int, float)) and math.isfinite(float(cs)):
                publish_confidence["confidence_score"] = float(cs)
                publish_confidence["missing"] = False
            if isinstance(th, (int, float)) and math.isfinite(float(th)):
                publish_confidence["threshold"] = float(th)
            if publish_confidence["confidence_score"] is not None and publish_confidence["threshold"] is not None:
                publish_confidence["eligible"] = bool(publish_confidence["confidence_score"] >= publish_confidence["threshold"])
            publish_confidence["reason"] = "confidence_threshold"
    except Exception:
        pass

    data_confidence: Dict[str, Any] = {
        "missing": data_confidence_score is None,
        "confidence_score": data_confidence_score,
        "date": conf.get("date") if isinstance(conf, dict) else None,
        "lag_days_vs_utc_today": conf.get("lag_days_vs_utc_today") if isinstance(conf, dict) else None,
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
