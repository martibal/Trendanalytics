from __future__ import annotations

import copy
import json
import math
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

ROOT = Path(__file__).resolve().parents[1]
META_ROOT = ROOT / "data" / "published" / "v1" / "meta"
OUT = ROOT / "validation-output"
CHAINS = ("bitcoin", "ethereum", "arbitrum", "base")

BASE = {
    "high_z": 1.5,
    "extreme_z": 2.5,
    "high_pct": 80.0,
    "extreme_pct": 90.0,
    "trend_eps": 0.15,
}


def is_dated_json(path: Path) -> bool:
    return bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}\.json", path.name))


def load_rows() -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for chain in CHAINS:
        folder = META_ROOT / chain
        for path in sorted(p for p in folder.glob("*.json") if is_dated_json(p)):
            obj = json.loads(path.read_text(encoding="utf-8"))
            regime = obj.get("regime") or {}
            cand = (((obj.get("confidence") or {}).get("candidate_label") or {}).get("components") or {}).get("candidate_label")
            if cand is None:
                cand = (((obj.get("confidence") or {}).get("candidate_label") or {}).get("label"))
            rows.append({
                "chain": chain,
                "date": obj.get("date") or path.stem,
                "profile_type": ((obj.get("profile") or {}).get("type")) or ({"bitcoin":"btc","ethereum":"eth_l1"}.get(chain,"l2")),
                "ruleset_id": regime.get("ruleset_id"),
                "stored_candidate": cand,
                "published_label": regime.get("label"),
                "confidence_score": ((obj.get("confidence") or {}).get("confidence_score")),
                "confidence_threshold": ((regime.get("gate") or {}).get("threshold", 0.4)),
                "signals": regime.get("signals") or {},
            })
    return rows


def thresholds(scale: float, mode: str) -> Dict[str, float]:
    t = dict(BASE)
    if mode in ("z", "all"):
        t["high_z"] = BASE["high_z"] * scale
        t["extreme_z"] = BASE["extreme_z"] * scale
    if mode in ("pct", "all"):
        # Scale distance from neutral 50, preserving high/low symmetry.
        t["high_pct"] = 50.0 + (BASE["high_pct"] - 50.0) * scale
        t["extreme_pct"] = 50.0 + (BASE["extreme_pct"] - 50.0) * scale
    if mode in ("trend", "all"):
        t["trend_eps"] = BASE["trend_eps"] * scale
    return t


def band(sig: Dict[str, Any], t: Dict[str, float]) -> str:
    if not bool(sig.get("informative", True)):
        return "NORMAL"
    pct = float(sig.get("pct_90d", 50.0))
    z = float(sig.get("z_robust", 0.0))
    if pct >= t["extreme_pct"] or z >= t["extreme_z"]:
        return "EXTREME_HIGH"
    if pct >= t["high_pct"] or z >= t["high_z"]:
        return "HIGH"
    low_ext_pct = 100.0 - t["extreme_pct"]
    low_pct = 100.0 - t["high_pct"]
    if pct <= low_ext_pct or z <= -t["extreme_z"]:
        return "EXTREME_LOW"
    if pct <= low_pct or z <= -t["high_z"]:
        return "LOW"
    return "NORMAL"


def trend(sig: Dict[str, Any], t: Dict[str, float]) -> str:
    mom = float(sig.get("momentum_7d_vs_30d", 0.0))
    if mom >= t["trend_eps"]:
        return "HEATING"
    if mom <= -t["trend_eps"]:
        return "COOLING"
    return "FLAT"


def aggregate(signals: List[Tuple[str, Dict[str, Any]]], t: Dict[str, float]) -> Dict[str, Any]:
    informative: List[Tuple[str, Dict[str, Any]]] = [(m, s) for m, s in signals if bool(s.get("informative", True))]
    if not informative:
        return {"band_high":"NORMAL", "band_low":"NORMAL", "trend":"FLAT", "informative_count":0}

    bands = [band(s, t) for _, s in informative]
    bh = "EXTREME_HIGH" if "EXTREME_HIGH" in bands else ("HIGH" if "HIGH" in bands else "NORMAL")
    bl = "EXTREME_LOW" if "EXTREME_LOW" in bands else ("LOW" if "LOW" in bands else "NORMAL")
    top = sorted(
        informative,
        key=lambda ms: (
            abs(float(ms[1].get("z_robust", 0.0))),
            abs(float(ms[1].get("momentum_7d_vs_30d", 0.0))),
            str(ms[0]),
        ),
        reverse=True,
    )[:2]
    mom_avg = sum(float(s.get("momentum_7d_vs_30d", 0.0)) for _, s in top) / len(top)
    tr = "HEATING" if mom_avg >= t["trend_eps"] else ("COOLING" if mom_avg <= -t["trend_eps"] else "FLAT")
    return {"band_high": bh, "band_low": bl, "trend": tr, "informative_count": len(informative)}


def classify(row: Dict[str, Any], t: Dict[str, float], remove_metric: Optional[str] = None) -> str:
    sigs = copy.deepcopy(row["signals"])
    if remove_metric:
        sigs.pop(remove_metric, None)

    profile = row["profile_type"]
    calldata = sigs.get("nonempty_calldata_share") if profile == "eth_l1" else None

    grouped: Dict[str, List[Tuple[str, Dict[str, Any]]]] = {"demand":[], "friction":[], "capacity":[]}
    for metric, sig in sigs.items():
        axis = str(sig.get("axis") or "")
        if axis not in grouped:
            continue
        # ETH calldata is supplemental evidence and is intentionally excluded from the core Demand axis.
        if profile == "eth_l1" and metric == "nonempty_calldata_share":
            continue
        grouped[axis].append((metric, sig))

    d = aggregate(grouped["demand"], t)
    f = aggregate(grouped["friction"], t)
    c = aggregate(grouped["capacity"], t)

    def high(ax: Dict[str, Any]) -> bool:
        return ax["band_high"] in ("HIGH", "EXTREME_HIGH") and int(ax["informative_count"]) > 0
    def extreme_high(ax: Dict[str, Any]) -> bool:
        return ax["band_high"] == "EXTREME_HIGH" and int(ax["informative_count"]) > 0
    def low(ax: Dict[str, Any]) -> bool:
        return ax["band_low"] in ("LOW", "EXTREME_LOW") and int(ax["informative_count"]) > 0

    demand_high = high(d)
    friction_high = high(f)
    friction_low = low(f)
    capacity_high = high(c)
    capacity_low = low(c)
    capacity_extreme = extreme_high(c)

    if profile == "btc":
        if friction_high and capacity_high:
            return "CONGESTED"
        if friction_low and not capacity_high:
            return "CHEAP"
        if demand_high and d["trend"] == "HEATING":
            return "HEATING"
        return "STABLE"

    if profile == "eth_l1":
        calldata_heating = bool(
            calldata
            and bool(calldata.get("informative", True))
            and trend(calldata, t) == "HEATING"
        )
        if (friction_high and capacity_high) or (capacity_extreme and c["trend"] == "HEATING"):
            return "CONGESTED"
        if friction_low and (capacity_low or not capacity_high):
            return "CHEAP"
        if demand_high and d["trend"] == "HEATING":
            return "HEATING"
        if demand_high and calldata_heating:
            return "HEATING"
        return "STABLE"

    if (friction_high and capacity_high) or (capacity_extreme and c["trend"] == "HEATING"):
        return "CONGESTED"
    if friction_low and (capacity_low or not capacity_high):
        return "CHEAP"
    if demand_high and d["trend"] == "HEATING":
        return "HEATING"
    return "STABLE"


def relevant_metrics(rows: Iterable[Dict[str, Any]]) -> Dict[str, List[str]]:
    by_chain: Dict[str, set[str]] = defaultdict(set)
    for row in rows:
        for metric, sig in row["signals"].items():
            axis = sig.get("axis")
            if axis in ("demand", "friction", "capacity"):
                by_chain[row["chain"]].add(metric)
    return {c: sorted(v) for c, v in by_chain.items()}


def change_summary(rows: List[Dict[str, Any]], labels: List[str], baseline: List[str]) -> Dict[str, Any]:
    changed = [i for i, (a, b) in enumerate(zip(labels, baseline)) if a != b]
    by_chain: Dict[str, Dict[str, Any]] = {}
    for chain in CHAINS:
        idx = [i for i, r in enumerate(rows) if r["chain"] == chain]
        ch = [i for i in idx if labels[i] != baseline[i]]
        transitions = Counter((baseline[i], labels[i]) for i in ch)
        by_chain[chain] = {
            "n": len(idx),
            "changed": len(ch),
            "changed_pct": round(100.0 * len(ch) / len(idx), 4) if idx else 0.0,
            "top_transitions": [{"from":a,"to":b,"count":n} for (a,b),n in transitions.most_common(8)],
        }
    transitions_all = Counter((baseline[i], labels[i]) for i in changed)
    return {
        "n": len(rows),
        "changed": len(changed),
        "changed_pct": round(100.0 * len(changed) / len(rows), 4) if rows else 0.0,
        "by_chain": by_chain,
        "top_transitions": [{"from":a,"to":b,"count":n} for (a,b),n in transitions_all.most_common(12)],
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    rows = load_rows()
    if not rows:
        raise SystemExit("No dated meta rows found")

    baseline_t = dict(BASE)
    baseline = [classify(r, baseline_t) for r in rows]
    mismatches = []
    for row, got in zip(rows, baseline):
        expected = row.get("stored_candidate")
        if expected and expected != got:
            mismatches.append({"chain":row["chain"], "date":row["date"], "stored":expected, "reconstructed":got})

    # This is a hard audit precondition: sensitivity results are meaningful only if the
    # reconstructed classifier reproduces the stored candidate-label history.
    baseline_reproduction = {
        "rows": len(rows),
        "mismatches": len(mismatches),
        "mismatch_pct": round(100.0 * len(mismatches) / len(rows), 6),
        "examples": mismatches[:30],
    }

    sensitivity: Dict[str, Any] = {}
    for mode in ("z", "pct", "trend", "all"):
        sensitivity[mode] = {}
        for scale in (0.90, 0.95, 1.05, 1.10):
            t = thresholds(scale, mode)
            labs = [classify(r, t) for r in rows]
            sensitivity[mode][f"{scale:.2f}"] = {
                "thresholds": t,
                **change_summary(rows, labs, baseline),
            }

    metrics = relevant_metrics(rows)
    ablation: Dict[str, Any] = {}
    for chain in CHAINS:
        chain_rows = [r for r in rows if r["chain"] == chain]
        chain_base = [classify(r, baseline_t) for r in chain_rows]
        ablation[chain] = {}
        for metric in metrics.get(chain, []):
            labs = [classify(r, baseline_t, remove_metric=metric) for r in chain_rows]
            ablation[chain][metric] = change_summary(chain_rows, labs, chain_base)

    report = {
        "audit": "urd_atlas_internal_validation_sensitivity_ablation_v1",
        "scope": {
            "rows": len(rows),
            "chains": {c: sum(1 for r in rows if r["chain"] == c) for c in CHAINS},
            "first_date": {c: min(r["date"] for r in rows if r["chain"] == c) for c in CHAINS},
            "last_date": {c: max(r["date"] for r in rows if r["chain"] == c) for c in CHAINS},
            "target": "core candidate-label classifier; confidence gate and downstream scorecard reconciliation are held outside the perturbation",
        },
        "baseline_thresholds": BASE,
        "baseline_reproduction": baseline_reproduction,
        "sensitivity": sensitivity,
        "ablation": ablation,
    }
    (OUT / "validation-sensitivity-ablation.json").write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")

    lines = [
        "# Urd Atlas — Sensitivity & Ablation Validation v1",
        "",
        f"Rows evaluated: **{len(rows)}**",
        f"Baseline reconstruction mismatches: **{len(mismatches)} ({baseline_reproduction['mismatch_pct']}%)**",
        "",
        "## Sensitivity — combined thresholds",
        "",
        "| Perturbation | Changed candidate labels | Percent |",
        "|---|---:|---:|",
    ]
    for scale in (0.90, 0.95, 1.05, 1.10):
        s = sensitivity["all"][f"{scale:.2f}"]
        pct = int(round((scale - 1.0) * 100))
        lines.append(f"| {pct:+d}% | {s['changed']} / {s['n']} | {s['changed_pct']}% |")

    lines += ["", "## Sensitivity by threshold family", ""]
    for mode in ("z", "pct", "trend"):
        lines += [f"### {mode}", "", "| Perturbation | Changed | Percent |", "|---|---:|---:|"]
        for scale in (0.90, 0.95, 1.05, 1.10):
            s = sensitivity[mode][f"{scale:.2f}"]
            pct = int(round((scale - 1.0) * 100))
            lines.append(f"| {pct:+d}% | {s['changed']} | {s['changed_pct']}% |")
        lines.append("")

    lines += ["## Ablation — impact by signal", ""]
    for chain in CHAINS:
        lines += [f"### {chain}", "", "| Removed signal | Changed | Percent |", "|---|---:|---:|"]
        items = sorted(ablation[chain].items(), key=lambda kv: kv[1]["changed_pct"], reverse=True)
        for metric, s in items:
            lines.append(f"| `{metric}` | {s['changed']} | {s['changed_pct']}% |")
        lines.append("")

    if mismatches:
        lines += [
            "## Baseline reproduction warning",
            "",
            "The reconstructed classifier did not reproduce every stored candidate label. Sensitivity and ablation results should therefore be interpreted cautiously until these mismatches are explained.",
        ]
    else:
        lines += [
            "## Baseline reproduction",
            "",
            "The reconstructed classifier reproduced the stored candidate-label history exactly. This satisfies the audit precondition for interpreting the counterfactual sensitivity and ablation runs.",
        ]

    (OUT / "validation-sensitivity-ablation.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({
        "rows": len(rows),
        "baseline_mismatches": len(mismatches),
        "combined_sensitivity": {k:v["changed_pct"] for k,v in sensitivity["all"].items()},
        "outputs": [str(OUT / "validation-sensitivity-ablation.json"), str(OUT / "validation-sensitivity-ablation.md")],
    }, indent=2))


if __name__ == "__main__":
    main()
