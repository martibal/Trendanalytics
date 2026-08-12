from __future__ import annotations

import json

import scripts.validation_sensitivity_ablation as audit


_original_load_rows = audit.load_rows
CURRENT_RULESETS = {"btc_v2", "eth_l1_v2", "l2_v1"}


def load_rows_with_current_ruleset_baseline():
    rows = []
    for row in _original_load_rows():
        if row.get("ruleset_id") not in CURRENT_RULESETS:
            continue
        path = audit.META_ROOT / row["chain"] / f'{row["date"]}.json'
        obj = json.loads(path.read_text(encoding="utf-8"))
        regime = obj.get("regime") or {}
        sanity = regime.get("sanity") or {}
        gate = regime.get("gate") or {}

        if bool(sanity.get("adjusted")) and sanity.get("from_label"):
            expected = sanity.get("from_label")
        elif gate.get("status") == "gated":
            candidate = (((obj.get("confidence") or {}).get("candidate_label") or {}).get("components") or {}).get("candidate_label")
            if candidate is None:
                candidate = (((obj.get("confidence") or {}).get("candidate_label") or {}).get("label"))
            expected = candidate
        else:
            expected = regime.get("label")

        row["stored_candidate"] = expected
        rows.append(row)
    return rows


audit.load_rows = load_rows_with_current_ruleset_baseline

if __name__ == "__main__":
    audit.main()
