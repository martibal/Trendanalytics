// src/fixtures/meta-regime-coverage.test.ts
import cautionFixture from "@/fixtures/meta-caution.json";
import unknownDegradedFixture from "@/fixtures/meta-unknown-degraded.json";
import allNullFixture from "@/fixtures/meta-all-null.json";
import stableFixture from "@/fixtures/meta-stable.json";
import cheapFixture from "@/fixtures/meta-cheap.json";
import congestedFixture from "@/fixtures/meta-congested.json";
import heatingFixture from "@/fixtures/meta-heating.json";

describe("fixtures/meta regime coverage", () => {
  const fixtures = [
    cautionFixture,
    unknownDegradedFixture,
    allNullFixture,
    stableFixture,
    cheapFixture,
    congestedFixture,
    heatingFixture,
  ];

  it("covers all canonical regime labels at least once", () => {
    const labels = new Set(fixtures.map((fixture) => fixture.status.label));

    expect(labels).toEqual(
      new Set([
        "STABLE",
        "CHEAP",
        "HEATING",
        "CONGESTED",
        "UNKNOWN/DEGRADED",
      ])
    );
  });

  it("keeps degraded fixtures aligned between status and regime labels", () => {
    expect(unknownDegradedFixture.status.label).toBe("UNKNOWN/DEGRADED");
    expect(unknownDegradedFixture.regime.label).toBe("UNKNOWN/DEGRADED");

    expect(allNullFixture.status.label).toBe("UNKNOWN/DEGRADED");
    expect(allNullFixture.regime.label).toBe("UNKNOWN/DEGRADED");
  });

  it("keeps non-degraded fixtures aligned between status and regime labels", () => {
    for (const fixture of [
      stableFixture,
      cheapFixture,
      heatingFixture,
      congestedFixture,
      cautionFixture,
    ]) {
      expect(fixture.status.label).toBe(fixture.regime.label);
    }
  });

  it("contains at least one caution-confidence fixture below good confidence threshold", () => {
    expect(cautionFixture.confidence.confidence_score).toBeGreaterThanOrEqual(0.4);
    expect(cautionFixture.confidence.confidence_score).toBeLessThan(0.7);
  });

  it("contains degraded fixtures that represent both low-confidence and missing-data failure modes", () => {
    expect(unknownDegradedFixture.publish_confidence.eligible).toBe(false);
    expect(unknownDegradedFixture.publish_confidence.reason).toBe(
      "confidence_below_threshold"
    );

    expect(allNullFixture.publish_confidence.eligible).toBe(false);
    expect(allNullFixture.publish_confidence.reason).toBe("missing_required_inputs");
  });

  it("uses unique determinism hashes across all fixtures", () => {
    const hashes = fixtures.map((fixture) => fixture.regime.determinism_hash);
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it("covers all four chains across the fixture set", () => {
    const chains = new Set(fixtures.map((fixture) => fixture.chain));

    expect(chains).toEqual(
      new Set(["bitcoin", "ethereum", "arbitrum", "base"])
    );
  });
});