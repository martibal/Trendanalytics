from pathlib import Path

p = Path("api/regime_engine.py")
text = p.read_text(encoding="utf-8")
old = '''    if label == "HEATING":
        ok = bool(high(d) and heating(d))
        return ok, details, "regime axes require informative demand high with HEATING trend."
'''
new = '''    if label == "HEATING":
        core_demand_support = bool(high(d) and heating(d))
        calldata = ((regime.get("signals") or {}).get("nonempty_calldata_share") or {})
        eth_calldata_support = bool(
            str(regime.get("ruleset_id") or "") == "eth_l1_v2"
            and high(d)
            and bool(calldata.get("informative", False))
            and str(calldata.get("trend") or "") == "HEATING"
        )
        ok = bool(core_demand_support or eth_calldata_support)
        return ok, details, "regime axes require core demand HEATING support or the ETH v2 supplemental calldata HEATING rule."
'''
if old not in text:
    raise SystemExit("Expected HEATING reconciliation block not found; refusing broad edit.")
p.write_text(text.replace(old, new, 1), encoding="utf-8")

t = Path("generated-tests")
t.mkdir(exist_ok=True)
(t / "test_eth_heating_reconciliation.py").write_text('''import unittest\n\nfrom api.regime_engine import _regime_axis_support\n\n\nclass EthereumHeatingReconciliationTests(unittest.TestCase):\n    def test_eth_v2_calldata_heating_is_valid_support(self):\n        regime = {\n            "ruleset_id": "eth_l1_v2",\n            "axes": {\n                "demand": {"band_high": "HIGH", "band_low": "NORMAL", "trend": "COOLING", "informative_count": 2},\n                "friction": {"band_high": "NORMAL", "band_low": "NORMAL", "trend": "FLAT", "informative_count": 2},\n                "capacity": {"band_high": "NORMAL", "band_low": "NORMAL", "trend": "FLAT", "informative_count": 1},\n            },\n            "signals": {"nonempty_calldata_share": {"informative": True, "trend": "HEATING"}},\n        }\n        ok, _, _ = _regime_axis_support(regime, "HEATING")\n        self.assertTrue(ok)\n\n    def test_non_eth_profile_does_not_gain_calldata_exception(self):\n        regime = {\n            "ruleset_id": "l2_v1",\n            "axes": {\n                "demand": {"band_high": "HIGH", "band_low": "NORMAL", "trend": "COOLING", "informative_count": 2},\n                "friction": {"band_high": "NORMAL", "band_low": "NORMAL", "trend": "FLAT", "informative_count": 1},\n                "capacity": {"band_high": "NORMAL", "band_low": "NORMAL", "trend": "FLAT", "informative_count": 1},\n            },\n            "signals": {"nonempty_calldata_share": {"informative": True, "trend": "HEATING"}},\n        }\n        ok, _, _ = _regime_axis_support(regime, "HEATING")\n        self.assertFalse(ok)\n\n    def test_core_demand_heating_still_works(self):\n        regime = {\n            "ruleset_id": "eth_l1_v2",\n            "axes": {\n                "demand": {"band_high": "HIGH", "band_low": "NORMAL", "trend": "HEATING", "informative_count": 2},\n                "friction": {"band_high": "NORMAL", "band_low": "NORMAL", "trend": "FLAT", "informative_count": 2},\n                "capacity": {"band_high": "NORMAL", "band_low": "NORMAL", "trend": "FLAT", "informative_count": 1},\n            },\n            "signals": {},\n        }\n        ok, _, _ = _regime_axis_support(regime, "HEATING")\n        self.assertTrue(ok)\n\n\nif __name__ == "__main__":\n    unittest.main()\n''', encoding="utf-8")
