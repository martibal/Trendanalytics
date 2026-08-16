from __future__ import annotations

import math
import unittest
from unittest.mock import patch

import pandas as pd

from api import confidence_engine


class ConfidenceFormulaRegressionTests(unittest.TestCase):
    def _build_payload_for_scores(self, data_quality: float, label_confidence: float):
        with patch.object(
            confidence_engine,
            "compute_data_quality_details_v2",
            return_value={
                "score": data_quality,
                "updated_through": "2026-01-01",
                "lag_days_vs_asof_date": 0,
                "components": {},
            },
        ), patch.object(
            confidence_engine,
            "compute_label_confidence_details_v2",
            return_value={
                "score": label_confidence,
                "label": "STABLE",
                "components": {},
            },
        ):
            return confidence_engine.build_confidence_payload_v2(
                pd.DataFrame({"date": ["2026-01-01"]}),
                chain="bitcoin",
                asof_date="2026-01-01",
            )

    def test_confidence_score_is_geometric_mean(self) -> None:
        data_quality = 0.81
        label_confidence = 0.64
        payload = self._build_payload_for_scores(data_quality, label_confidence)
        self.assertAlmostEqual(
            payload["confidence_score"],
            math.sqrt(data_quality * label_confidence),
            places=12,
        )

    def test_confidence_gate_is_strictly_below_default_threshold(self) -> None:
        threshold = confidence_engine.DEFAULT_CONFIDENCE_THRESHOLD
        cases = (
            (threshold - 1e-6, True),
            (threshold, False),
            (threshold + 1e-6, False),
        )
        for target_score, expected_gated in cases:
            with self.subTest(target_score=target_score):
                # With data quality fixed at 1.0, label confidence = target^2 gives
                # sqrt(1.0 * target^2) == target.
                payload = self._build_payload_for_scores(1.0, target_score * target_score)
                self.assertAlmostEqual(payload["confidence_score"], target_score, places=12)
                self.assertEqual(
                    payload["candidate_label"]["withheld_by_confidence_gate"],
                    expected_gated,
                )


class ChainSignalProfileRegressionTests(unittest.TestCase):
    @staticmethod
    def _complete_required_frame(chain: str) -> pd.DataFrame:
        profile = confidence_engine.CHAIN_SIGNAL_PROFILES[chain]
        frame = pd.DataFrame(
            {
                "date": pd.date_range("2025-01-01", periods=180, freq="D"),
            }
        )
        for idx, metric in enumerate(profile.required_for_confidence, start=1):
            frame[metric] = float(idx)
        return frame

    def test_structurally_not_applicable_fields_do_not_penalize_but_required_fields_do(self) -> None:
        for chain, profile in confidence_engine.CHAIN_SIGNAL_PROFILES.items():
            with self.subTest(chain=chain):
                frame = self._complete_required_frame(chain)
                asof = frame.iloc[-1]["date"].date().isoformat()

                complete = confidence_engine.compute_data_quality_details_v2(
                    frame,
                    chain=chain,
                    asof_date=asof,
                )
                self.assertAlmostEqual(complete["score"], 1.0, places=12)

                # Structurally non-applicable fields are intentionally absent from the
                # complete frame. Adding them must not improve a score that is already 1.0.
                with_structural_fields = frame.copy()
                for metric in profile.structurally_not_applicable:
                    with_structural_fields[metric] = 123.0
                structural = confidence_engine.compute_data_quality_details_v2(
                    with_structural_fields,
                    chain=chain,
                    asof_date=asof,
                )
                self.assertAlmostEqual(structural["score"], complete["score"], places=12)

                required = profile.required_for_confidence[0]
                missing_required = frame.drop(columns=[required])
                degraded = confidence_engine.compute_data_quality_details_v2(
                    missing_required,
                    chain=chain,
                    asof_date=asof,
                )
                self.assertLess(degraded["score"], complete["score"])
                self.assertIn(required, degraded["components"]["required_metrics"])
                self.assertEqual(
                    set(profile.structurally_not_applicable),
                    set(degraded["components"]["structurally_not_applicable"]),
                )

    def test_bitcoin_evm_only_fields_are_excluded_from_confidence_denominator(self) -> None:
        profile = confidence_engine.CHAIN_SIGNAL_PROFILES["bitcoin"]
        self.assertIn("gas_utilization_pct", profile.structurally_not_applicable)
        self.assertIn("failed_tx_rate", profile.structurally_not_applicable)
        self.assertNotIn("gas_utilization_pct", profile.required_for_confidence)
        self.assertNotIn("failed_tx_rate", profile.required_for_confidence)


if __name__ == "__main__":
    unittest.main()
