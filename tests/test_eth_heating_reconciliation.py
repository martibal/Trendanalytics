import unittest

from api.regime_engine import _regime_axis_support


class EthereumHeatingReconciliationTests(unittest.TestCase):
    def test_eth_v2_calldata_heating_is_valid_support(self):
        regime = {
            "ruleset_id": "eth_l1_v2",
            "axes": {
                "demand": {"band_high": "HIGH", "band_low": "NORMAL", "trend": "COOLING", "informative_count": 2},
                "friction": {"band_high": "NORMAL", "band_low": "NORMAL", "trend": "FLAT", "informative_count": 2},
                "capacity": {"band_high": "NORMAL", "band_low": "NORMAL", "trend": "FLAT", "informative_count": 1},
            },
            "signals": {"nonempty_calldata_share": {"informative": True, "trend": "HEATING"}},
        }
        ok, _, _ = _regime_axis_support(regime, "HEATING")
        self.assertTrue(ok)

    def test_non_eth_profile_does_not_gain_calldata_exception(self):
        regime = {
            "ruleset_id": "l2_v1",
            "axes": {
                "demand": {"band_high": "HIGH", "band_low": "NORMAL", "trend": "COOLING", "informative_count": 2},
                "friction": {"band_high": "NORMAL", "band_low": "NORMAL", "trend": "FLAT", "informative_count": 1},
                "capacity": {"band_high": "NORMAL", "band_low": "NORMAL", "trend": "FLAT", "informative_count": 1},
            },
            "signals": {"nonempty_calldata_share": {"informative": True, "trend": "HEATING"}},
        }
        ok, _, _ = _regime_axis_support(regime, "HEATING")
        self.assertFalse(ok)

    def test_core_demand_heating_still_works(self):
        regime = {
            "ruleset_id": "eth_l1_v2",
            "axes": {
                "demand": {"band_high": "HIGH", "band_low": "NORMAL", "trend": "HEATING", "informative_count": 2},
                "friction": {"band_high": "NORMAL", "band_low": "NORMAL", "trend": "FLAT", "informative_count": 2},
                "capacity": {"band_high": "NORMAL", "band_low": "NORMAL", "trend": "FLAT", "informative_count": 1},
            },
            "signals": {},
        }
        ok, _, _ = _regime_axis_support(regime, "HEATING")
        self.assertTrue(ok)


if __name__ == "__main__":
    unittest.main()
