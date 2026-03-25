// src/fixtures/meta-fixtures.test.ts
import cautionFixture from "@/fixtures/meta-caution.json";
import unknownDegradedFixture from "@/fixtures/meta-unknown-degraded.json";
import allNullFixture from "@/fixtures/meta-all-null.json";
import stableFixture from "@/fixtures/meta-stable.json";
import cheapFixture from "@/fixtures/meta-cheap.json";
import congestedFixture from "@/fixtures/meta-congested.json";
import heatingFixture from "@/fixtures/meta-heating.json";
import { isChainId, isJsonObject } from "@/lib/types/json";

describe("fixtures/meta", () => {
  it("loads the caution fixture with a caution-tier confidence profile", () => {
    expect(isJsonObject(cautionFixture)).toBe(true);
    expect(isChainId(cautionFixture.chain)).toBe(true);

    expect(cautionFixture.chain).toBe("ethereum");
    expect(cautionFixture.status.label).toBe("HEATING");
    expect(cautionFixture.confidence.confidence_score).toBe(0.55);
    expect(cautionFixture.confidence.lag_days_vs_utc_today).toBe(0);

    expect(cautionFixture.publish_confidence.confidence_label).toBe("Caution");
    expect(Array.isArray(cautionFixture.publish_confidence.reasons)).toBe(true);
    expect(cautionFixture.publish_confidence.reasons.length).toBeGreaterThan(0);

    expect(cautionFixture.regime.label).toBe("HEATING");
    expect(cautionFixture.regime.window_days).toBe(90);

    expect(Array.isArray(cautionFixture.scorecard.dimensions)).toBe(true);
    expect(cautionFixture.scorecard.dimensions).toHaveLength(3);
    expect(cautionFixture.scorecard.dimensions.map((row) => row.key)).toEqual([
      "demand",
      "capacity",
      "friction",
    ]);
  });

  it("loads the unknown/degraded fixture with a sub-threshold confidence gate", () => {
    expect(isJsonObject(unknownDegradedFixture)).toBe(true);
    expect(isChainId(unknownDegradedFixture.chain)).toBe(true);

    expect(unknownDegradedFixture.chain).toBe("arbitrum");
    expect(unknownDegradedFixture.status.label).toBe("UNKNOWN/DEGRADED");
    expect(unknownDegradedFixture.status.color).toBe("gray");

    expect(unknownDegradedFixture.confidence.confidence_score).toBe(0.32);
    expect(unknownDegradedFixture.confidence.lag_days_vs_utc_today).toBe(8);

    expect(unknownDegradedFixture.publish_confidence.eligible).toBe(false);
    expect(unknownDegradedFixture.publish_confidence.reason).toBe(
      "confidence_below_threshold"
    );

    expect(unknownDegradedFixture.regime.label).toBe("UNKNOWN/DEGRADED");
    expect(unknownDegradedFixture.regime.window_days).toBe(90);

    expect(Array.isArray(unknownDegradedFixture.scorecard.dimensions)).toBe(true);
    expect(unknownDegradedFixture.scorecard.dimensions).toHaveLength(3);
    expect(Array.isArray(unknownDegradedFixture.drivers)).toBe(true);
    expect(unknownDegradedFixture.drivers).toHaveLength(1);
    expect(unknownDegradedFixture.drivers[0].metric).toBe("tx_count_daily");
    expect(unknownDegradedFixture.drivers[0].current).toBeNull();
  });

  it("loads the all-null fixture and preserves null-safe degraded structure", () => {
    expect(isJsonObject(allNullFixture)).toBe(true);
    expect(isChainId(allNullFixture.chain)).toBe(true);

    expect(allNullFixture.chain).toBe("base");
    expect(allNullFixture.updated_through).toBeNull();
    expect(allNullFixture.date).toBeNull();

    expect(allNullFixture.status.label).toBe("UNKNOWN/DEGRADED");
    expect(allNullFixture.status.color).toBe("gray");
    expect(allNullFixture.status.one_liner).toBeNull();

    expect(allNullFixture.confidence.confidence_score).toBeNull();
    expect(allNullFixture.confidence.lag_days_vs_utc_today).toBeNull();

    expect(allNullFixture.publish_confidence.eligible).toBe(false);
    expect(allNullFixture.publish_confidence.reason).toBe("missing_required_inputs");

    expect(allNullFixture.regime.label).toBe("UNKNOWN/DEGRADED");
    expect(allNullFixture.regime.detail).toBeNull();
    expect(allNullFixture.regime.asof_date).toBeNull();
    expect(allNullFixture.regime.window_days).toBeNull();

    expect(Array.isArray(allNullFixture.scorecard.dimensions)).toBe(true);
    expect(allNullFixture.scorecard.dimensions).toHaveLength(3);

    for (const dimension of allNullFixture.scorecard.dimensions) {
      expect(dimension.score).toBeNull();
      expect(dimension.level).toBeNull();
      expect(dimension.coverage_factor).toBeNull();
      expect(dimension.effective_confidence).toBeNull();
    }

    expect(Array.isArray(allNullFixture.drivers)).toBe(true);
    expect(allNullFixture.drivers).toHaveLength(0);
  });

  it("loads the stable fixture", () => {
    expect(isJsonObject(stableFixture)).toBe(true);
    expect(isChainId(stableFixture.chain)).toBe(true);

    expect(stableFixture.chain).toBe("bitcoin");
    expect(stableFixture.status.label).toBe("STABLE");
    expect(stableFixture.status.color).toBe("green");
    expect(stableFixture.confidence.confidence_score).toBe(0.91);
    expect(stableFixture.confidence.lag_days_vs_utc_today).toBe(0);
    expect(stableFixture.publish_confidence.eligible).toBe(true);
    expect(stableFixture.regime.label).toBe("STABLE");
    expect(stableFixture.regime.window_days).toBe(90);
    expect(stableFixture.scorecard.dimensions).toHaveLength(3);
    expect(stableFixture.drivers).toHaveLength(1);
  });

  it("loads the cheap fixture", () => {
    expect(isJsonObject(cheapFixture)).toBe(true);
    expect(isChainId(cheapFixture.chain)).toBe(true);

    expect(cheapFixture.chain).toBe("ethereum");
    expect(cheapFixture.status.label).toBe("CHEAP");
    expect(cheapFixture.status.color).toBe("blue");
    expect(cheapFixture.confidence.confidence_score).toBe(0.88);
    expect(cheapFixture.confidence.lag_days_vs_utc_today).toBe(0);
    expect(cheapFixture.publish_confidence.eligible).toBe(true);
    expect(cheapFixture.regime.label).toBe("CHEAP");
    expect(cheapFixture.regime.window_days).toBe(90);
    expect(cheapFixture.scorecard.dimensions).toHaveLength(3);
    expect(cheapFixture.drivers).toHaveLength(1);
  });

  it("loads the congested fixture", () => {
    expect(isJsonObject(congestedFixture)).toBe(true);
    expect(isChainId(congestedFixture.chain)).toBe(true);

    expect(congestedFixture.chain).toBe("base");
    expect(congestedFixture.status.label).toBe("CONGESTED");
    expect(congestedFixture.status.color).toBe("red");
    expect(congestedFixture.confidence.confidence_score).toBe(0.86);
    expect(congestedFixture.confidence.lag_days_vs_utc_today).toBe(0);
    expect(congestedFixture.publish_confidence.eligible).toBe(true);
    expect(congestedFixture.regime.label).toBe("CONGESTED");
    expect(congestedFixture.regime.window_days).toBe(90);
    expect(congestedFixture.scorecard.dimensions).toHaveLength(3);
    expect(congestedFixture.drivers).toHaveLength(1);
  });

  it("loads the heating fixture", () => {
    expect(isJsonObject(heatingFixture)).toBe(true);
    expect(isChainId(heatingFixture.chain)).toBe(true);

    expect(heatingFixture.chain).toBe("arbitrum");
    expect(heatingFixture.status.label).toBe("HEATING");
    expect(heatingFixture.status.color).toBe("yellow");
    expect(heatingFixture.confidence.confidence_score).toBe(0.84);
    expect(heatingFixture.confidence.lag_days_vs_utc_today).toBe(0);
    expect(heatingFixture.publish_confidence.eligible).toBe(true);
    expect(heatingFixture.regime.label).toBe("HEATING");
    expect(heatingFixture.regime.window_days).toBe(90);
    expect(heatingFixture.scorecard.dimensions).toHaveLength(3);
    expect(heatingFixture.drivers).toHaveLength(1);
  });
});