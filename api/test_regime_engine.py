from __future__ import annotations

import json
import math
import re
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
import pandas as pd

from api import regime_engine


REPO_ROOT = Path(__file__).resolve().parents[1]
META_ROOT = REPO_ROOT / "data" / "published" / "v1" / "meta"
DATE_FILE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}\.json$")
EXPECTED_LABELS = {"STABLE", "HEATING", "CONGESTED", "CHEAP", "UNKNOWN/DEGRADED"}


class RegimePrimitiveRegressionTests(unittest.TestCase):
    def test_robust_z_uses_mad_scaling(self) -> None:
        values = np.array([1.0, 2.0, 3.0, 4.0, 100.0])
        current = 10.0
        median = float(np.median(values))
        mad = float(np.median(np.abs(values - median)))
        expected = 0.6745 * (current - median) / mad
        standard_z = (current - median) / float(np.std(values))

        actual = regime_engine._robust_z(values, current)

        self.assertAlmostEqual(actual, expected, places=12)
        self.assertNotAlmostEqual(actual, standard_z, places=6)

    def test_robust_z_falls_back_to_standard_deviation_when_mad_zero(self) -> None:
        values = np.array([1.0, 1.0, 1.0, 1.0, 2.0])
        current = 2.0
        expected = (current - 1.0) / float(np.std(values))

        actual = regime_engine._robust_z(values, current)

        self.assertTrue(math.isfinite(actual))
        self.assertAlmostEqual(actual, expected, places=12)

    def test_robust_z_constant_series_returns_zero(self) -> None:
        self.assertEqual(regime_engine._robust_z(np.ones(40), 1.0), 0.0)

    def test_percentile_rank_uses_mid_rank_for_ties(self) -> None:
        values = np.array([1.0, 2.0, 2.0, 2.0, 3.0])
        # less=1, equal=3 => (1 + 0.5*3) / 5 = 0.5
        self.assertAlmostEqual(regime_engine._percentile_rank(values, 2.0), 50.0, places=12)

    def test_percentile_rank_constant_series_is_neutral(self) -> None:
        # Regression guard for the historical Arbitrum/Base false-CONGESTED failure mode.
        self.assertEqual(regime_engine._percentile_rank(np.full(90, 2.0), 2.0), 50.0)

    def test_series_is_informative_boundaries(self) -> None:
        self.assertFalse(regime_engine._series_is_informative(np.arange(29.0), min_points=30))
        self.assertFalse(regime_engine._series_is_informative(np.ones(30), min_points=30))
        self.assertFalse(
            regime_engine._series_is_informative(
                np.linspace(0.0, 5e-13, 30), min_points=30, eps=1e-12
            )
        )
        # Exactly 30 points, >1 unique value and spread > eps. MAD is zero here,
        # but finite standard deviation makes the distribution informative.
        just_informative = np.array([0.0] * 29 + [1.0])
        self.assertTrue(regime_engine._series_is_informative(just_informative, min_points=30))

    def test_signal_for_metric_uses_180d_z_baseline_and_90d_percentile_baseline(self) -> None:
        values = np.linspace(1.0, 200.0, 200)
        df = pd.DataFrame(
            {
                "date": pd.date_range("2025-01-01", periods=len(values), freq="D"),
                "metric": values,
            }
        )

        signal = regime_engine._signal_for_metric(df, "metric")
        self.assertIsNotNone(signal)
        assert signal is not None

        series = pd.Series(values)
        hist180 = regime_engine._window_values(series, 180)
        hist90 = regime_engine._window_values(series, 90)
        mean7 = regime_engine._mean_last(series, 7)
        mean30 = regime_engine._mean_last(series, 30)
        assert mean7 is not None and mean30 is not None

        # Contract note: z-score and momentum intentionally use the 180-day baseline,
        # while percentile rank intentionally uses only the trailing 90-day distribution.
        expected_z = regime_engine._robust_z(hist180, values[-1])
        expected_pct = regime_engine._percentile_rank(hist90, values[-1])
        expected_momentum = (
            regime_engine._robust_z(hist180, mean7)
            - regime_engine._robust_z(hist180, mean30)
        )

        self.assertAlmostEqual(signal["z_robust"], expected_z, places=12)
        self.assertAlmostEqual(signal["pct_90d"], expected_pct, places=12)
        self.assertAlmostEqual(signal["momentum_7d_vs_30d"], expected_momentum, places=12)
        self.assertNotAlmostEqual(
            signal["pct_90d"],
            regime_engine._percentile_rank(hist180, values[-1]),
            places=6,
        )


class PublishedRegimeReplayTests(unittest.TestCase):
    """Replay real published regime evidence through today's classification rules.

    The primitive tests above validate signal mathematics. These tests deliberately use the
    exact signal evidence stored in historical META rows, then call compute_regime directly.
    That makes the published row the oracle while keeping CI fast and deterministic.
    """

    fixtures: dict[str, dict]

    @classmethod
    def setUpClass(cls) -> None:
        cls.fixtures = cls._discover_published_fixtures()
        missing = EXPECTED_LABELS.difference(cls.fixtures)
        if missing:
            raise AssertionError(
                "Published META corpus does not contain unadjusted fixtures for: "
                + ", ".join(sorted(missing))
            )

    @classmethod
    def _discover_published_fixtures(cls) -> dict[str, dict]:
        found: dict[str, dict] = {}
        for chain_dir in sorted(p for p in META_ROOT.iterdir() if p.is_dir()):
            for path in sorted(chain_dir.iterdir(), reverse=True):
                if not DATE_FILE_RE.match(path.name):
                    continue
                try:
                    payload = json.loads(path.read_text(encoding="utf-8-sig"))
                except (OSError, json.JSONDecodeError):
                    continue
                regime = payload.get("regime") if isinstance(payload, dict) else None
                if not isinstance(regime, dict):
                    continue
                label = str(regime.get("label") or "").upper()
                if label not in EXPECTED_LABELS or label in found:
                    continue
                sanity = regime.get("sanity") if isinstance(regime.get("sanity"), dict) else {}
                if bool(sanity.get("adjusted", False)):
                    continue
                signals = regime.get("signals")
                profile = payload.get("profile")
                if not isinstance(signals, dict) or not isinstance(profile, dict):
                    continue
                found[label] = {
                    "path": path,
                    "payload": payload,
                }
                if set(found) == EXPECTED_LABELS:
                    return found
        return found

    def _replay(self, expected_label: str) -> None:
        fixture = self.fixtures[expected_label]
        payload = fixture["payload"]
        published_regime = payload["regime"]
        published_signals = published_regime["signals"]
        profile = payload["profile"]
        chain = str(payload["chain"])
        asof_date = str(payload["date"])

        confidence = payload.get("confidence") if isinstance(payload.get("confidence"), dict) else {}
        confidence_score = confidence.get("confidence_score")
        gate = published_regime.get("gate") if isinstance(published_regime.get("gate"), dict) else {}
        threshold = float(gate.get("threshold", 0.40))

        def replay_metric(_df: pd.DataFrame, metric: str):
            stored = published_signals.get(metric)
            if not isinstance(stored, dict):
                return None
            return {"metric": metric, **stored}

        def replay_blocktime(_df: pd.DataFrame, **_kwargs):
            stored = published_signals.get("blocktime_instability")
            if not isinstance(stored, dict):
                return None
            return {"metric": "blocktime_instability", **stored}

        dummy = pd.DataFrame({"date": [asof_date]})
        with patch.object(regime_engine, "_signal_for_metric", side_effect=replay_metric), patch.object(
            regime_engine,
            "_signal_for_blocktime_instability",
            side_effect=replay_blocktime,
        ):
            actual = regime_engine.compute_regime(
                dummy,
                chain=chain,
                profile=profile,
                asof_date=asof_date,
                confidence_score=confidence_score,
                confidence_threshold=threshold,
            )

        self.assertEqual(
            actual["label"],
            expected_label,
            msg=f"Historical fixture mismatch: {fixture['path'].relative_to(REPO_ROOT)}",
        )

    def test_published_stable_row_replays_as_stable(self) -> None:
        self._replay("STABLE")

    def test_published_heating_row_replays_as_heating(self) -> None:
        self._replay("HEATING")

    def test_published_congested_row_replays_as_congested(self) -> None:
        self._replay("CONGESTED")

    def test_published_cheap_row_replays_as_cheap(self) -> None:
        self._replay("CHEAP")

    def test_published_degraded_row_replays_as_degraded(self) -> None:
        self._replay("UNKNOWN/DEGRADED")


if __name__ == "__main__":
    unittest.main()
