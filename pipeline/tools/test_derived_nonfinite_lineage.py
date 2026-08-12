#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import json
import math
import tempfile
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("export_derived_json_history.py")
spec = importlib.util.spec_from_file_location("export_derived_json_history", MODULE_PATH)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def main() -> int:
    gold = {
        "date": "2026-08-05",
        "chain": "arbitrum",
        "capacity_util_pct": float("nan"),
        "finite_metric": 1.25,
        "nested": {"positive_inf": float("inf"), "negative_inf": float("-inf")},
    }

    canonical = module._canonical_json_bytes(gold)
    parsed = json.loads(canonical.decode("utf-8"))
    assert parsed["capacity_util_pct"] is None
    assert parsed["nested"]["positive_inf"] is None
    assert parsed["nested"]["negative_inf"] is None
    assert parsed["finite_metric"] == 1.25
    assert b"NaN" not in canonical
    assert b"Infinity" not in canonical

    expected = hashlib.sha256(canonical).hexdigest()
    assert module._sha256_json(gold) == expected
    assert module._sha256_json(gold) == module._sha256_json(gold)

    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "derived.json"
        module._write_json(path, {"value": float("nan"), "finite": 2.5})
        raw = path.read_text(encoding="utf-8")
        obj = json.loads(raw)
        assert obj == {"finite": 2.5, "value": None}
        assert "NaN" not in raw and "Infinity" not in raw

    assert math.isnan(gold["capacity_util_pct"]), "normalization must not mutate source objects"
    print("derived non-finite lineage regression OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
