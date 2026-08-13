from __future__ import annotations

import unittest

from api.main import _status_from_regime_and_scorecard


def _axis(*, high: str = "NORMAL", low: str = "NORMAL", trend: str = "FLAT") -> dict:
    return {
        "band_high": high,
        "band_low": low,
        "trend": trend,
        "informative_count": 1,
    }


def _regime(label: str, *, drivers: list[dict] | None = None) -> dict:
    axes = {
        "demand": _axis(),
        "friction": _axis(),
        "capacity": _axis(),
    }
    if label == "CHEAP":
        axes["friction"] = _axis(low="LOW")
    elif label == "HEATING":
        axes["demand"] = _axis(high="HIGH", trend="HEATING")
    elif label == "CONGESTED":
        axes["friction"] = _axis(high="HIGH")
        axes["capacity"] = _axis(high="HIGH")
    return {
        "label": label,
        "drivers": drivers or [],
        "sanity": {"support_basis": "regime_axes", "support_reason": "test"},
        "axes": axes,
    }


def _scorecard() -> dict:
    return {
        "dimensions": {
            "demand": {"level": "Normal", "score": 50.0},
            "friction": {"level": "Normal", "score": 50.0},
            "capacity": {"level": "Balanced", "score": 50.0},
        },
        "regime_support": {},
    }


class StatusTextDriverFallbackTests(unittest.TestCase):
    def test_cheap_without_specific_driver_omits_fake_driver_clause(self) -> None:
        status = _status_from_regime_and_scorecard(_regime("CHEAP"), _scorecard())
        self.assertEqual(
            status["one_liner"],
            "Lower-friction regime: regime-axis evidence shows low friction, with no high capacity pressure.",
        )
        self.assertNotIn("published regime-axis evidence", status["one_liner"])

    def test_heating_without_specific_driver_omits_fake_driver_clause(self) -> None:
        status = _status_from_regime_and_scorecard(_regime("HEATING"), _scorecard())
        self.assertEqual(
            status["one_liner"],
            "Demand-led heating: regime-axis evidence shows elevated demand with a heating trend.",
        )
        self.assertNotIn("published regime-axis evidence", status["one_liner"])

    def test_congested_without_specific_drivers_keeps_axis_evidence_only(self) -> None:
        status = _status_from_regime_and_scorecard(_regime("CONGESTED"), _scorecard())
        self.assertEqual(
            status["one_liner"],
            "Congested regime: regime-axis evidence shows elevated friction and capacity pressure.",
        )
        self.assertNotIn("published regime-axis evidence", status["one_liner"])

    def test_concrete_driver_name_is_still_rendered(self) -> None:
        drivers = [
            {
                "axis": "friction",
                "metric": "median_tx_fee_native",
                "z_robust": -2.4,
                "pct_90d": 10.0,
            }
        ]
        status = _status_from_regime_and_scorecard(
            _regime("CHEAP", drivers=drivers),
            _scorecard(),
        )
        self.assertEqual(
            status["one_liner"],
            "Lower-friction regime: regime-axis evidence shows low friction from median transaction fee, with no high capacity pressure.",
        )


if __name__ == "__main__":
    unittest.main()
