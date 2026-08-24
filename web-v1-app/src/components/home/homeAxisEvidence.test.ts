import { homeAxisEvidenceSummary, homeAxisNarrative, readHomeAxisEvidence } from "./homeAxisEvidence";

describe("homeAxisEvidence", () => {
  const ethereumCongested = {
    regime: {
      axes: {
        friction: {
          band_high: "HIGH",
          band_low: "NORMAL",
          informative_count: 2,
          trend: "HEATING",
        },
        capacity: {
          band_high: "HIGH",
          band_low: "NORMAL",
          informative_count: 1,
          trend: "HEATING",
        },
      },
    },
  };

  it("uses classifier bands instead of inferring state from a damped display score", () => {
    const text = homeAxisNarrative(ethereumCongested, "friction", 57.7);

    expect(text).toContain("high-side HIGH");
    expect(text).toContain("low-side NORMAL");
    expect(text).toContain("trend HEATING");
    expect(text).toContain("smoothed scorecard display value");
    expect(text).toContain("not the band threshold used to set the regime");
    expect(text).not.toMatch(/close to|little evidence|normal pressure/i);
  });

  it("preserves low-side evidence without converting the display score into a band", () => {
    const meta = {
      regime: {
        axes: {
          friction: {
            band_high: "NORMAL",
            band_low: "EXTREME_LOW",
            informative_count: 2,
            trend: "COOLING",
          },
        },
      },
    };

    expect(homeAxisEvidenceSummary(meta, "friction")).toBe(
      "High-side NORMAL · Low-side EXTREME_LOW · Trend COOLING · 2 informative signals",
    );
    expect(homeAxisNarrative(meta, "friction", 49.2)).toContain("low-side EXTREME_LOW");
  });

  it("falls back to the confidence candidate evidence when regime.axes is absent", () => {
    const meta = {
      confidence: {
        candidate_label: {
          components: {
            regime_axes: {
              capacity: {
                band_high: "HIGH",
                band_low: "NORMAL",
                informative_count: 1,
                trend: "HEATING",
              },
            },
          },
        },
      },
    };

    expect(readHomeAxisEvidence(meta, "capacity")).toEqual({
      bandHigh: "HIGH",
      bandLow: "NORMAL",
      trend: "HEATING",
      informativeCount: 1,
    });
  });

  it("does not manufacture a semantic axis reading when raw band evidence is unavailable", () => {
    const text = homeAxisNarrative({}, "demand", 50.0);

    expect(text).toContain("Classifier-band evidence is unavailable");
    expect(text).toContain("smoothed scorecard display value");
    expect(text).not.toMatch(/high activity|low activity|close to normal/i);
  });
});
