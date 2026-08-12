from __future__ import annotations

import json
from pathlib import Path

import scripts.validation_sensitivity_ablation as audit


_original_load_rows = audit.load_rows


def load_rows_with_pre_reconciliation_baseline():
    rows = _original_load_rows()
    for row in rows:
        path = audit.META_ROOT / row["chain"] / f'{row["date"]}.json'
        obj = json.loads(path.read_text(encoding="utf-8"))
        regime = obj.get("regime") or {}
        sanity = regime.get("sanity") or {}
        if bool(sanity.get("adjusted")) and sanity.get("from_label"):
            row["stored_candidate"] = sanity.get("from_label")
    return rows


audit.load_rows = load_rows_with_pre_reconciliation_baseline

if __name__ == "__main__":
    audit.main()
