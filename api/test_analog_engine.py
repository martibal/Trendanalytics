from __future__ import annotations

import unittest

import numpy as np
import pandas as pd

from api import analog_engine


class AnalogEngineRegressionTests(unittest.TestCase):
    @staticmethod
    def _normal_frame(days: int = 260) -> pd.DataFrame:
        x = np.arange(days, dtype=float)
        return pd.DataFrame(
            {
                "date": pd.date_range("2025-01-01", periods=days, freq="D"),
                "tx_count_daily": 100_000.0 + 1500.0 * np.sin(x / 8.0) + 12.0 * x,
                "median_tx_fee_native": 0.001 + 0.0002 * np.cos(x / 11.0) + 1e-7 * x,
                "gas_utilization_pct": 55.0 + 7.0 * np.sin(x / 13.0),
                "avg_block_time_sec": 12.0 + 0.6 * np.cos(x / 9.0),
            }
        )

    def test_main_function_returns_analogs_and_forward_stats_for_normal_input(self) -> None:
        frame = self._normal_frame()
        cfg = analog_engine.AnalogConfig(
            baseline_window_days=30,
            lookback_days_max=220,
            exclude_last_days=7,
            min_bucket_size=3,
            k_analogs=8,
        )

        result = analog_engine.compute_analogs_and_forward_stats(
            frame,
            horizons=(1, 3, 7),
            cfg=cfg,
        )

        self.assertNotIn("error", result)
        self.assertEqual(result["as_of"], frame.iloc[-1]["date"].date().isoformat())
        self.assertGreater(result["diagnostics"]["candidate_days"], 0)
        self.assertGreater(result["diagnostics"]["k_returned"], 0)
        self.assertLessEqual(result["diagnostics"]["k_returned"], cfg.k_analogs)
        self.assertEqual(result["forward_stats"]["horizons"], [1, 3, 7])
        self.assertIn("by_horizon", result["forward_stats"])
        self.assertIn("1", {str(k) for k in result["forward_stats"]["by_horizon"].keys()})

    def test_main_function_handles_empty_input(self) -> None:
        result = analog_engine.compute_analogs_and_forward_stats(pd.DataFrame({"date": []}))
        self.assertEqual(result, {"error": "empty_gold_df"})

    def test_main_function_reports_feature_boundary_when_history_is_insufficient(self) -> None:
        frame = self._normal_frame(days=40)
        result = analog_engine.compute_analogs_and_forward_stats(
            frame,
            as_of=frame.iloc[5]["date"].date().isoformat(),
            cfg=analog_engine.AnalogConfig(baseline_window_days=30),
        )
        self.assertEqual(result["error"], "as_of_not_eligible_for_features")

    def test_main_function_reports_no_supported_metrics(self) -> None:
        frame = pd.DataFrame(
            {
                "date": pd.date_range("2026-01-01", periods=60, freq="D"),
                "unrelated_metric": np.arange(60, dtype=float),
            }
        )
        result = analog_engine.compute_analogs_and_forward_stats(frame)
        self.assertEqual(result["error"], "no_supported_metrics_in_gold_df")

    def test_bucket_boundaries_are_inclusive(self) -> None:
        cfg = analog_engine.AnalogConfig()
        self.assertEqual(analog_engine._bucketize_z(cfg.bucket_bins_z[0], cfg.bucket_bins_z), "LOW")
        self.assertEqual(analog_engine._bucketize_z(cfg.bucket_bins_z[1], cfg.bucket_bins_z), "HIGH")
        self.assertEqual(analog_engine._bucketize_trend(-cfg.bucket_bins_trend, cfg.bucket_bins_trend), "DOWN")
        self.assertEqual(analog_engine._bucketize_trend(cfg.bucket_bins_trend, cfg.bucket_bins_trend), "UP")
        self.assertEqual(analog_engine._bucketize_conf(cfg.bucket_bins_conf[0], cfg.bucket_bins_conf), "LOW")
        self.assertEqual(analog_engine._bucketize_conf(cfg.bucket_bins_conf[1], cfg.bucket_bins_conf), "HIGH")


if __name__ == "__main__":
    unittest.main()
