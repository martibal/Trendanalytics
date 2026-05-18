#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Audit Confidence v2 against currently published META rows.

The audit compares the currently published confidence fields to a recomputed
Confidence v2 output generated from the local Gold evidence surface. It does not
invent target values; it records whether any increase is explained by profile-aware
data quality, label-specific evidence, or both.

Usage from repo root:
  python pipeline/tools/audit_confidence_v2.py --root . --max-days 365

Outputs:
  reports/confidence_v2_audit.json
  reports/confidence_v2_audit.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import os
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


CHAINS = ("bitcoin", "ethereum", "arbitrum", "base")


def _safe_float(value: Any) -> Optional[float]:
    try:
        v = float(value)
    except Exception:
        return None
    if not math.isfinite(v):
        return None
    return float(v)


def _read_json(path: Path) -> Optional[Dict[str, Any]]:
    try:
        obj = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    return obj if isinstance(obj, dict) else None


def _date_files(meta_dir: Path, max_days: Optional[int]) -> List[Path]:
    files = []
    for p in meta_dir.glob("*.json"):
        if p.name in {"latest.json"} or (p.name.startswith("last") and p.name.endswith("d.json")):
            continue
        try:
            # validate date stem
            import datetime as dt
            dt.date.fromisoformat(p.stem)
        except Exception:
            continue
        files.append(p)
    files.sort(key=lambda p: p.stem)
    if max_days and max_days > 0:
        files = files[-int(max_days):]
    return files


def _explain_change(old_obj: Dict[str, Any], new_obj: Dict[str, Any]) -> List[str]:
    reasons: List[str] = []
    old_conf = old_obj.get("confidence") if isinstance(old_obj.get("confidence"), dict) else {}
    new_conf = new_obj.get("confidence") if isinstance(new_obj.get("confidence"), dict) else {}

    old_dq = _safe_float(old_conf.get("data_quality_score"))
    new_dq = _safe_float(new_conf.get("data_quality_score"))
    old_lc = _safe_float(old_conf.get("label_confidence_score"))
    new_lc = _safe_float(new_conf.get("label_confidence_score"))

    if old_dq is not None and new_dq is not None and new_dq > old_dq + 1e-9:
        reasons.append("profile_aware_data_quality_increase")
    if old_lc is not None and new_lc is not None and new_lc > old_lc + 1e-9:
        reasons.append("label_specific_evidence_increase")

    components = new_conf.get("components") if isinstance(new_conf.get("components"), dict) else {}
    dq_components = components.get("data_quality") if isinstance(components.get("data_quality"), dict) else {}
    excluded = dq_components.get("structurally_not_applicable") if isinstance(dq_components, dict) else None
    optional = dq_components.get("optional_not_penalized") if isinstance(dq_components, dict) else None
    if excluded:
        reasons.append("structurally_not_applicable_fields_excluded")
    if optional:
        reasons.append("optional_fields_not_penalized")

    label_components = components.get("label_confidence") if isinstance(components.get("label_confidence"), dict) else {}
    if label_components.get("uses_score_raw") is True:
        reasons.append("label_confidence_uses_raw_evidence_not_display_score")

    if not reasons:
        reasons.append("no_increase_or_no_positive_component_change")
    return sorted(set(reasons))


def _flatten_row(chain: str, date: str, old_obj: Dict[str, Any], new_obj: Dict[str, Any]) -> Dict[str, Any]:
    old_conf = old_obj.get("confidence") if isinstance(old_obj.get("confidence"), dict) else {}
    new_conf = new_obj.get("confidence") if isinstance(new_obj.get("confidence"), dict) else {}
    old_score = _safe_float(old_conf.get("confidence_score"))
    new_score = _safe_float(new_conf.get("confidence_score"))
    delta = None if old_score is None or new_score is None else new_score - old_score
    reasons = _explain_change(old_obj, new_obj)

    return {
        "chain": chain,
        "date": date,
        "old_label": ((old_obj.get("regime") or {}) if isinstance(old_obj.get("regime"), dict) else {}).get("label"),
        "new_label": ((new_obj.get("regime") or {}) if isinstance(new_obj.get("regime"), dict) else {}).get("label"),
        "old_confidence_score": old_score,
        "new_confidence_score": new_score,
        "delta_confidence_score": delta,
        "old_data_quality_score": _safe_float(old_conf.get("data_quality_score")),
        "new_data_quality_score": _safe_float(new_conf.get("data_quality_score")),
        "old_label_confidence_score": _safe_float(old_conf.get("label_confidence_score")),
        "new_label_confidence_score": _safe_float(new_conf.get("label_confidence_score")),
        "new_candidate_label": (new_conf.get("candidate_label") or {}).get("label") if isinstance(new_conf.get("candidate_label"), dict) else None,
        "new_withheld_by_confidence_gate": (new_conf.get("candidate_label") or {}).get("withheld_by_confidence_gate") if isinstance(new_conf.get("candidate_label"), dict) else None,
        "reason_for_change": ";".join(reasons),
    }


def _summary(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    by_chain: Dict[str, Dict[str, Any]] = {}
    for chain in CHAINS:
        cr = [r for r in rows if r["chain"] == chain]
        if not cr:
            continue
        old_scores = [r["old_confidence_score"] for r in cr if isinstance(r.get("old_confidence_score"), (int, float))]
        new_scores = [r["new_confidence_score"] for r in cr if isinstance(r.get("new_confidence_score"), (int, float))]
        by_chain[chain] = {
            "rows": len(cr),
            "old_avg_confidence": sum(old_scores) / len(old_scores) if old_scores else None,
            "new_avg_confidence": sum(new_scores) / len(new_scores) if new_scores else None,
            "old_share_below_0_40": sum(1 for v in old_scores if v < 0.40) / len(old_scores) if old_scores else None,
            "new_share_below_0_40": sum(1 for v in new_scores if v < 0.40) / len(new_scores) if new_scores else None,
            "increases": sum(1 for r in cr if isinstance(r.get("delta_confidence_score"), (int, float)) and r["delta_confidence_score"] > 1e-9),
            "decreases": sum(1 for r in cr if isinstance(r.get("delta_confidence_score"), (int, float)) and r["delta_confidence_score"] < -1e-9),
        }
    return {
        "methodology": "confidence_v2_profile_evidence",
        "rows": len(rows),
        "by_chain": by_chain,
        "largest_increases": sorted(
            [r for r in rows if isinstance(r.get("delta_confidence_score"), (int, float))],
            key=lambda r: r["delta_confidence_score"],
            reverse=True,
        )[:20],
        "largest_decreases": sorted(
            [r for r in rows if isinstance(r.get("delta_confidence_score"), (int, float))],
            key=lambda r: r["delta_confidence_score"],
        )[:20],
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="Repository root")
    ap.add_argument("--published-root", default=None, help="Published v1 root. Defaults to <root>/data/published/v1")
    ap.add_argument("--max-days", type=int, default=365, help="Max day files per chain to audit; 0 means all")
    ap.add_argument("--out-dir", default=None, help="Output directory. Defaults to <root>/reports")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))

    published_root = Path(args.published_root).resolve() if args.published_root else (root / "data" / "published" / "v1")
    out_dir = Path(args.out_dir).resolve() if args.out_dir else (root / "reports")
    out_dir.mkdir(parents=True, exist_ok=True)

    # Ensure api.main reads the published Gold tree unless caller overrides env explicitly.
    os.environ.setdefault("GOLD_DIR", str(published_root / "gold"))

    from api.main import compute_overview  # noqa: WPS433 intentional runtime import after sys.path/env setup

    rows: List[Dict[str, Any]] = []
    for chain in CHAINS:
        meta_dir = published_root / "meta" / chain
        if not meta_dir.exists():
            continue
        for path in _date_files(meta_dir, None if args.max_days == 0 else args.max_days):
            old_obj = _read_json(path)
            if not old_obj:
                continue
            try:
                new_obj = compute_overview(chain, asof=path.stem)
            except Exception as exc:
                rows.append({
                    "chain": chain,
                    "date": path.stem,
                    "error": str(exc),
                })
                continue
            rows.append(_flatten_row(chain, path.stem, old_obj, new_obj))

    json_path = out_dir / "confidence_v2_audit.json"
    csv_path = out_dir / "confidence_v2_audit.csv"

    payload = {
        "summary": _summary([r for r in rows if "error" not in r]),
        "errors": [r for r in rows if "error" in r],
        "rows": rows,
    }
    json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    fieldnames = sorted({k for row in rows for k in row.keys()})
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {json_path}")
    print(f"Wrote {csv_path}")


if __name__ == "__main__":
    main()
