// src/lib/utils/freshness.test.ts
import {
  computeAgeDays,
  computeFreshnessState,
  evaluateFreshness,
  freshnessStateLabel,
  FRESHNESS_POLICIES,
  getFreshnessDetail,
  getFreshnessPolicy,
  isFreshnessWarning,
  normalizeAsOfDate,
} from "@/lib/utils/freshness";

describe("utils/freshness", () => {
  describe("normalizeAsOfDate", () => {
    it("returns null for missing and invalid values", () => {
      expect(normalizeAsOfDate(null)).toBeNull();
      expect(normalizeAsOfDate(undefined)).toBeNull();
      expect(normalizeAsOfDate("not-a-date")).toBeNull();
    });

    it("returns a valid Date for valid inputs", () => {
      const result = normalizeAsOfDate("2026-03-15T00:00:00.000Z");
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe("2026-03-15T00:00:00.000Z");
    });
  });

  describe("getFreshnessPolicy", () => {
    it("returns chain-specific policies for btc/eth", () => {
      expect(getFreshnessPolicy("bitcoin")).toEqual(FRESHNESS_POLICIES.bitcoin);
      expect(getFreshnessPolicy("ethereum")).toEqual(FRESHNESS_POLICIES.ethereum);
    });

    it("returns chain-specific policies for arb/base", () => {
      expect(getFreshnessPolicy("arbitrum")).toEqual(FRESHNESS_POLICIES.arbitrum);
      expect(getFreshnessPolicy("base")).toEqual(FRESHNESS_POLICIES.base);
    });

    it("falls back to default policy for unknown chain ids", () => {
      expect(getFreshnessPolicy("unknown-chain")).toEqual({
        expectedLagDays: 1,
        warnAfterDays: 2,
        failAfterDays: 4,
      });
    });

    it("falls back to default policy for nullish chain ids", () => {
      expect(getFreshnessPolicy(null)).toEqual({
        expectedLagDays: 1,
        warnAfterDays: 2,
        failAfterDays: 4,
      });
      expect(getFreshnessPolicy(undefined)).toEqual({
        expectedLagDays: 1,
        warnAfterDays: 2,
        failAfterDays: 4,
      });
    });
  });

  describe("computeAgeDays", () => {
    it("returns null when either date is invalid", () => {
      expect(computeAgeDays(null, "2026-03-18T00:00:00.000Z")).toBeNull();
      expect(computeAgeDays("2026-03-15T00:00:00.000Z", "bad-date")).toBeNull();
    });

    it("returns whole elapsed days", () => {
      expect(
        computeAgeDays("2026-03-15T00:00:00.000Z", "2026-03-18T00:00:00.000Z")
      ).toBe(3);
    });

    it("floors fractional days", () => {
      expect(
        computeAgeDays("2026-03-15T12:00:00.000Z", "2026-03-18T00:00:00.000Z")
      ).toBe(2);
    });

    it("never returns negative values for future as-of dates", () => {
      expect(
        computeAgeDays("2026-03-20T00:00:00.000Z", "2026-03-18T00:00:00.000Z")
      ).toBe(0);
    });
  });

  describe("computeFreshnessState", () => {
    const btcPolicy = FRESHNESS_POLICIES.bitcoin;

    it("returns unknown for nullish or invalid age", () => {
      expect(computeFreshnessState(null, btcPolicy)).toBe("unknown");
      expect(computeFreshnessState(Number.NaN, btcPolicy)).toBe("unknown");
      expect(computeFreshnessState(Number.POSITIVE_INFINITY, btcPolicy)).toBe("unknown");
    });

    it("returns ok below the warn threshold", () => {
      expect(computeFreshnessState(0, btcPolicy)).toBe("ok");
      expect(computeFreshnessState(1, btcPolicy)).toBe("ok");
    });

    it("returns warn at or above warn threshold and below fail threshold", () => {
      expect(computeFreshnessState(2, btcPolicy)).toBe("warn");
      expect(computeFreshnessState(3, btcPolicy)).toBe("warn");
    });

    it("returns fail at or above fail threshold", () => {
      expect(computeFreshnessState(4, btcPolicy)).toBe("fail");
      expect(computeFreshnessState(10, btcPolicy)).toBe("fail");
    });
  });

  describe("getFreshnessDetail", () => {
    it("returns appropriate detail strings", () => {
      expect(getFreshnessDetail("unknown", null)).toContain("could not be determined");
      expect(getFreshnessDetail("ok", 1)).toContain("within the expected schedule");
      expect(getFreshnessDetail("warn", 3)).toContain("delayed beyond the expected schedule");
      expect(getFreshnessDetail("fail", 8)).toContain("significantly stale");
    });
  });

  describe("evaluateFreshness", () => {
    it("evaluates bitcoin freshness using the fast-chain thresholds", () => {
      const result = evaluateFreshness({
        chainId: "bitcoin",
        asOfDate: "2026-03-16T00:00:00.000Z",
        now: "2026-03-18T00:00:00.000Z",
      });

      expect(result).toEqual({
        state: "warn",
        ageDays: 2,
        expectedLagDays: 1,
        warnAfterDays: 2,
        failAfterDays: 4,
        asOfDate: "2026-03-16",
        detail: "Data appears delayed beyond the expected schedule (2d old).",
      });
    });

    it("evaluates base freshness using the slower-chain thresholds", () => {
      const result = evaluateFreshness({
        chainId: "base",
        asOfDate: "2026-03-09T00:00:00.000Z",
        now: "2026-03-18T00:00:00.000Z",
      });

      expect(result).toEqual({
        state: "ok",
        ageDays: 9,
        expectedLagDays: 7,
        warnAfterDays: 10,
        failAfterDays: 15,
        asOfDate: "2026-03-09",
        detail: "Data freshness is within the expected schedule (9d old).",
      });
    });

    it("returns fail when slow-chain freshness exceeds fail threshold", () => {
      const result = evaluateFreshness({
        chainId: "arbitrum",
        asOfDate: "2026-03-01T00:00:00.000Z",
        now: "2026-03-18T00:00:00.000Z",
      });

      expect(result.state).toBe("fail");
      expect(result.ageDays).toBe(17);
      expect(result.warnAfterDays).toBe(10);
      expect(result.failAfterDays).toBe(15);
      expect(result.detail).toContain("significantly stale");
    });

    it("returns unknown when as-of date is missing", () => {
      const result = evaluateFreshness({
        chainId: "ethereum",
        asOfDate: null,
        now: "2026-03-18T00:00:00.000Z",
      });

      expect(result).toEqual({
        state: "unknown",
        ageDays: null,
        expectedLagDays: 1,
        warnAfterDays: 2,
        failAfterDays: 4,
        asOfDate: null,
        detail:
          "Freshness could not be determined because the as-of date is missing or invalid.",
      });
    });
  });

  describe("isFreshnessWarning", () => {
    it("flags warn and fail only", () => {
      expect(isFreshnessWarning("ok")).toBe(false);
      expect(isFreshnessWarning("unknown")).toBe(false);
      expect(isFreshnessWarning("warn")).toBe(true);
      expect(isFreshnessWarning("fail")).toBe(true);
    });
  });

  describe("freshnessStateLabel", () => {
    it("returns display labels", () => {
      expect(freshnessStateLabel("ok")).toBe("OK");
      expect(freshnessStateLabel("warn")).toBe("WARN");
      expect(freshnessStateLabel("fail")).toBe("FAIL");
      expect(freshnessStateLabel("unknown")).toBe("UNKNOWN");
    });
  });
});