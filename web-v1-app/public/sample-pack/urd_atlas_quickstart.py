"""
Urd Atlas — Quickstart
======================
Laster sample pack zip lokalt og viser:
  1. Regime-label og confidence for ETH
  2. Alle driver-felter med z-score og percentil
  3. Eksempel på hvordan du splitter egne data på HEATING vs andre regimer

Krav: Python 3.8+, ingen eksterne avhengigheter utover standardbiblioteket.

Last ned zip fra: https://www.urdatlas.com/sample-pack/urd-atlas-public-sample-pack.zip
Legg zip-filen i samme mappe som dette scriptet, eller oppdater ZIP_PATH under.
"""

import json
import zipfile
from pathlib import Path

ZIP_PATH = Path("urd-atlas-public-sample-pack.zip")

# ---------------------------------------------------------------------------
# 1. Last inn ETH Meta (regime, confidence, drivers)
# ---------------------------------------------------------------------------

def load_json_from_zip(zf: zipfile.ZipFile, name_fragment: str) -> dict:
    matches = [n for n in zf.namelist() if name_fragment in n]
    if not matches:
        raise FileNotFoundError(f"Ingen fil i zip matcher: {name_fragment!r}")
    with zf.open(matches[0]) as f:
        return json.load(f)


with zipfile.ZipFile(ZIP_PATH) as zf:
    eth_meta    = load_json_from_zip(zf, "ethereum")   # ETH Meta
    eth_meta    = load_json_from_zip(zf, "ethereum/2026-03-31/meta.json")
    eth_gold    = load_json_from_zip(zf, "ethereum/2026-03-31/gold.json")
    eth_derived = load_json_from_zip(zf, "ethereum/2026-03-31/derived.json")
    eth_unknown = load_json_from_zip(zf, "2025-04-21/meta.json")   # UNKNOWN/DEGRADED eksempel


# ---------------------------------------------------------------------------
# 2. Regime-label og confidence
# ---------------------------------------------------------------------------

label      = eth_meta["status"]["label"]
confidence = eth_meta["confidence"]["confidence_score"]
as_of      = eth_meta["date"]
one_liner  = eth_meta["status"]["one_liner"]
det_hash   = eth_meta["regime"]["determinism_hash"]

print("=" * 60)
print(f"  ETH  —  {as_of}")
print("=" * 60)
print(f"  Regime     : {label}")
print(f"  Confidence : {confidence:.4f}")
print(f"  Summary    : {one_liner}")
print(f"  Hash       : {det_hash}")
print()

# Confidence gate: samme logikk som Urd Atlas bruker internt
CONFIDENCE_THRESHOLD = 0.40
if confidence >= 0.70:
    band = "Good"
elif confidence >= CONFIDENCE_THRESHOLD:
    band = "Caution"
else:
    band = "Degraded — label usikker, bruk med forsiktighet"

print(f"  Confidence band: {band}")
print()


# ---------------------------------------------------------------------------
# 3. Drivers — hva drev labelen
# ---------------------------------------------------------------------------

drivers = eth_meta.get("regime", {}).get("drivers", [])

print(f"  Drivers ({len(drivers)} topp-signaler):")
print(f"  {'Metrikk':<35} {'Akse':<10} {'Z-score':>8}  {'Pct 90d':>8}  {'Trend'}")
print(f"  {'-'*35} {'-'*10} {'-'*8}  {'-'*8}  {'-'*10}")
for d in drivers:
    print(
        f"  {d['metric']:<35} {d['axis']:<10} {d['z_robust']:>8.3f}"
        f"  {d['pct_90d']:>7.1f}%  {d['trend']}"
    )
print()


# ---------------------------------------------------------------------------
# 4. Scorecard — Demand / Friction / Capacity
# ---------------------------------------------------------------------------

dims = eth_meta.get("scorecard", {}).get("dimensions", {})
print("  Scorecard (0–100, 50 = nøytralt mot chain-historikk):")
for dim_name, dim in dims.items():
    score  = dim.get("score", 0)
    level  = dim.get("level", "—")
    bar    = "█" * int(score / 5) + "░" * (20 - int(score / 5))
    print(f"  {dim_name.capitalize():<10} [{bar}] {score:5.1f}  ({level})")
print()


# ---------------------------------------------------------------------------
# 5. UNKNOWN/DEGRADED — slik ser en degradert rad ut
# ---------------------------------------------------------------------------

u_label = eth_unknown["status"]["label"]
u_conf  = eth_unknown["confidence"]["confidence_score"]
u_date  = eth_unknown["date"]
print(f"  UNKNOWN/DEGRADED-eksempel  ({u_date})")
print(f"  Label      : {u_label}")
print(f"  Confidence : {u_conf:.4f}  → under terskel {CONFIDENCE_THRESHOLD}")
print()


# ---------------------------------------------------------------------------
# 6. Gold — rådata
# ---------------------------------------------------------------------------

gold_metrics = eth_gold.get("metrics", eth_gold)
print("  Gold-felter (rådata, native units):")
skip = {"chain", "date", "methodology_version"}
for k, v in gold_metrics.items():
    if k not in skip and not isinstance(v, dict):
        print(f"  {k:<40} {v}")
print()


# ---------------------------------------------------------------------------
# 7. Derived — MA7 / MA30 trendserier
# ---------------------------------------------------------------------------

derived_metrics = eth_derived.get("metrics", eth_derived)
ma7_fields = {k: v for k, v in derived_metrics.items() if k.endswith("__ma7") and v is not None}
print("  MA7-felter (7-dagers rullende snitt):")
for k, v in list(ma7_fields.items())[:5]:
    print(f"  {k:<45} {v:.4f}" if isinstance(v, float) else f"  {k:<45} {v}")
print()


# ---------------------------------------------------------------------------
# 8. Regime-kondisjonert split — slik bruker du dette i egne analyser
# ---------------------------------------------------------------------------

print("=" * 60)
print("  EKSEMPEL: Regime-kondisjonert split")
print("=" * 60)
print("""
  Tenk deg at du har en daglig tidsserie — returns, volum,
  spreads, hva som helst. Du vil se om den oppfører seg
  annerledes i HEATING vs STABLE/CHEAP.

  Med Urd Atlas API (Pro) henter du historisk Meta JSON:

    import requests

    API_KEY = "ua_..."
    url = "https://www.urdatlas.com/api/v1/files/meta/ethereum/last365d/latest.json"
    data = requests.get(url, headers={"Authorization": f"Bearer {API_KEY}"}).json()

    # Bygg et regime-kart: dato → label
    regime_map = {
        row["date"]: row["status"]["label"]
        for row in data["rows"]
        if row["confidence"]["confidence_score"] >= 0.70   # kun high-confidence
    }

    # Koble mot egne data
    import pandas as pd
    df = pd.read_csv("min_data.csv", parse_dates=["date"])
    df["regime"] = df["date"].dt.strftime("%Y-%m-%d").map(regime_map)

    # Split
    heating  = df[df["regime"] == "HEATING"]["returns"]
    stable   = df[df["regime"] == "STABLE"]["returns"]

    print(heating.describe())
    print(stable.describe())

  Hvert regime-label er hash-forankret — du vet at du
  backtester på nøyaktig det som ble publisert live
  den datoen, ikke en rekonstruksjon.
""")

print("  Ferdig. Abonner på https://www.urdatlas.com for API-tilgang.")
