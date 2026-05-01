// src/lib/auth/entitlements.test.ts
import {
  buildEntitlementSnapshot,
  createBasicEntitlement,
  createProEntitlement,
  createPublicEntitlement,
  evaluateFileEntitlement,
  getEntitledChainLabel,
  getHistoryDepthLabel,
  isWindowToken,
  validateDateRangeWithinHistory,
  windowTokenToDays,
} from "@/lib/auth/entitlements";

describe("auth/entitlements", () => {
  describe("windowTokenToDays", () => {
    it("returns null for latest", () => {
      expect(windowTokenToDays("latest")).toBeNull();
    });

    it("returns the correct day counts for dated windows", () => {
      expect(windowTokenToDays("7d")).toBe(7);
      expect(windowTokenToDays("30d")).toBe(30);
      expect(windowTokenToDays("90d")).toBe(90);
      expect(windowTokenToDays("180d")).toBe(180);
      expect(windowTokenToDays("365d")).toBe(365);
    });
  });

  describe("isWindowToken", () => {
    it("accepts valid window tokens", () => {
      expect(isWindowToken("latest")).toBe(true);
      expect(isWindowToken("7d")).toBe(true);
      expect(isWindowToken("30d")).toBe(true);
      expect(isWindowToken("90d")).toBe(true);
      expect(isWindowToken("180d")).toBe(true);
      expect(isWindowToken("365d")).toBe(true);
    });

    it("rejects invalid window tokens", () => {
      expect(isWindowToken("1d")).toBe(false);
      expect(isWindowToken("14d")).toBe(false);
      expect(isWindowToken("all")).toBe(false);
      expect(isWindowToken("")).toBe(false);
    });
  });

  describe("buildEntitlementSnapshot", () => {
    it("builds public snapshots with no access", () => {
      const snapshot = buildEntitlementSnapshot(createPublicEntitlement());

      expect(snapshot.tier).toBe("public");
      expect(snapshot.status).toBe("inactive");
      expect(snapshot.allowedChains).toEqual([]);
      expect(snapshot.allowedGenres).toEqual([]);
      expect(snapshot.allowedWindows).toEqual([]);
      expect(snapshot.maxWindowDays).toBe(0);
      expect(snapshot.historyDepthDays).toBe(0);
      expect(snapshot.fullHistory).toBe(false);
      expect(snapshot.customThresholdFeeds).toBe(false);
    });

    it("builds basic snapshots limited to the entitled chain and 90d windows", () => {
      const snapshot = buildEntitlementSnapshot(createBasicEntitlement("bitcoin"));

      expect(snapshot.tier).toBe("basic");
      expect(snapshot.status).toBe("active");
      expect(snapshot.entitledChain).toBe("bitcoin");
      expect(snapshot.allowedChains).toEqual(["bitcoin"]);
      expect(snapshot.allowedGenres).toEqual(["gold", "meta", "derived"]);
      expect(snapshot.allowedWindows).toEqual(["latest", "7d", "30d", "90d"]);
      expect(snapshot.maxWindowDays).toBe(90);
      expect(snapshot.historyDepthDays).toBe(90);
      expect(snapshot.fullHistory).toBe(false);
      expect(snapshot.customThresholdFeeds).toBe(false);
    });

    it("builds pro snapshots with all chains and 365d windows", () => {
      const snapshot = buildEntitlementSnapshot(createProEntitlement());

      expect(snapshot.tier).toBe("pro");
      expect(snapshot.status).toBe("active");
      expect(snapshot.entitledChain).toBeNull();
      expect(snapshot.allowedChains).toEqual([
        "bitcoin",
        "ethereum",
        "arbitrum",
        "base",
      ]);
      expect(snapshot.allowedGenres).toEqual(["gold", "meta", "derived"]);
      expect(snapshot.allowedWindows).toEqual([
        "latest",
        "7d",
        "30d",
        "90d",
        "180d",
        "365d",
      ]);
      expect(snapshot.maxWindowDays).toBe(365);
      expect(snapshot.historyDepthDays).toBe(365);
      expect(snapshot.fullHistory).toBe(false);
      expect(snapshot.customThresholdFeeds).toBe(true);
    });

    it("sets fullHistory when historyUnlocked is enabled", () => {
      const basicSnapshot = buildEntitlementSnapshot(
        createBasicEntitlement("ethereum", { historyUnlocked: true })
      );
      const proSnapshot = buildEntitlementSnapshot(
        createProEntitlement({ historyUnlocked: true })
      );

      expect(basicSnapshot.fullHistory).toBe(true);
      expect(basicSnapshot.historyDepthDays).toBeNull();

      expect(proSnapshot.fullHistory).toBe(true);
      expect(proSnapshot.historyDepthDays).toBeNull();
    });
  });

  describe("labels", () => {
    it("returns the correct entitled chain labels", () => {
      expect(
        getEntitledChainLabel(buildEntitlementSnapshot(createPublicEntitlement()))
      ).toBe("No API entitlement");

      expect(
        getEntitledChainLabel(
          buildEntitlementSnapshot(createBasicEntitlement("base"))
        )
      ).toBe("base");

      expect(
        getEntitledChainLabel(
          buildEntitlementSnapshot(createBasicEntitlement(null))
        )
      ).toBe("Selection required");

      expect(
        getEntitledChainLabel(buildEntitlementSnapshot(createProEntitlement()))
      ).toBe("All chains");
    });

    it("returns the correct history depth labels", () => {
      expect(
        getHistoryDepthLabel(buildEntitlementSnapshot(createPublicEntitlement()))
      ).toBe("No subscriber history access");

      expect(
        getHistoryDepthLabel(
          buildEntitlementSnapshot(createBasicEntitlement("bitcoin"))
        )
      ).toBe("90 days");

      expect(
        getHistoryDepthLabel(
          buildEntitlementSnapshot(createProEntitlement({ historyUnlocked: true }))
        )
      ).toBe("Full available history");
    });
  });

  describe("validateDateRangeWithinHistory", () => {
    it("allows requests without a date range", () => {
      const snapshot = buildEntitlementSnapshot(createBasicEntitlement("bitcoin"));

      expect(validateDateRangeWithinHistory(snapshot)).toEqual({
        ok: true,
        code: "ok",
      });
    });

    it("rejects partial date ranges", () => {
      const snapshot = buildEntitlementSnapshot(createBasicEntitlement("bitcoin"));

      expect(
        validateDateRangeWithinHistory(snapshot, "2026-01-01", null)
      ).toEqual({
        ok: false,
        code: "invalid_date_range",
        detail:
          "Both startDate and endDate must be present when date-range access is requested.",
      });
    });

    it("rejects invalid dates", () => {
      const snapshot = buildEntitlementSnapshot(createBasicEntitlement("bitcoin"));

      expect(
        validateDateRangeWithinHistory(snapshot, "not-a-date", "2026-01-05")
      ).toEqual({
        ok: false,
        code: "invalid_date_range",
        detail: "Date range contains an invalid ISO date.",
      });
    });

    it("rejects inverted date ranges", () => {
      const snapshot = buildEntitlementSnapshot(createBasicEntitlement("bitcoin"));

      expect(
        validateDateRangeWithinHistory(snapshot, "2026-01-10", "2026-01-05")
      ).toEqual({
        ok: false,
        code: "invalid_date_range",
        detail: "endDate must be on or after startDate.",
      });
    });

    it("rejects ranges beyond the allowed history depth", () => {
      const snapshot = buildEntitlementSnapshot(createBasicEntitlement("bitcoin"));

      const result = validateDateRangeWithinHistory(
        snapshot,
        "2026-01-01",
        "2026-04-05"
      );

      expect(result.ok).toBe(false);
      expect(result.code).toBe("forbidden_history_range");
      expect(result.detail).toContain("exceeds allowed history depth 90d");
    });

    it("allows long ranges when full history is unlocked", () => {
      const snapshot = buildEntitlementSnapshot(
        createProEntitlement({ historyUnlocked: true })
      );

      expect(
        validateDateRangeWithinHistory(snapshot, "2024-01-01", "2026-01-01")
      ).toEqual({
        ok: true,
        code: "ok",
      });
    });
  });

  describe("evaluateFileEntitlement", () => {
    it("rejects public users", () => {
      const result = evaluateFileEntitlement(createPublicEntitlement(), {
        chain: "bitcoin",
        genre: "meta",
        window: "7d",
      });

      expect(result.ok).toBe(false);
      expect(result.code).toBe("inactive_subscription");
      expect(result.detail).toBe(
        "Public users do not have authenticated file-delivery access."
      );
    });

    it("rejects inactive subscribers", () => {
      const result = evaluateFileEntitlement(
        createBasicEntitlement("bitcoin", { status: "inactive" }),
        {
          chain: "bitcoin",
          genre: "meta",
          window: "7d",
        }
      );

      expect(result.ok).toBe(false);
      expect(result.code).toBe("inactive_subscription");
      expect(result.detail).toBe("Subscription is not active.");
    });

    it("rejects requests for chains outside the basic entitlement", () => {
      const result = evaluateFileEntitlement(createBasicEntitlement("bitcoin"), {
        chain: "ethereum",
        genre: "meta",
        window: "7d",
      });

      expect(result.ok).toBe(false);
      expect(result.code).toBe("forbidden_chain");
      expect(result.detail).toContain("outside the subscriber entitlement");
    });

    it("rejects windows outside the basic entitlement", () => {
      const result = evaluateFileEntitlement(createBasicEntitlement("bitcoin"), {
        chain: "bitcoin",
        genre: "meta",
        window: "365d",
      });

      expect(result.ok).toBe(false);
      expect(result.code).toBe("forbidden_window");
      expect(result.detail).toContain("Window '365d'");
    });

    it("allows valid basic-scope requests", () => {
      const result = evaluateFileEntitlement(createBasicEntitlement("bitcoin"), {
        chain: "bitcoin",
        genre: "meta",
        window: "90d",
      });

      expect(result.ok).toBe(true);
      expect(result.code).toBe("ok");
      expect(result.snapshot.tier).toBe("basic");
      expect(result.snapshot.allowedChains).toEqual(["bitcoin"]);
    });

    it("allows pro requests across all chains and long windows", () => {
      const result = evaluateFileEntitlement(createProEntitlement(), {
        chain: "base",
        genre: "derived",
        window: "365d",
      });

      expect(result.ok).toBe(true);
      expect(result.code).toBe("ok");
      expect(result.snapshot.tier).toBe("pro");
      expect(result.snapshot.allowedChains).toEqual([
        "bitcoin",
        "ethereum",
        "arbitrum",
        "base",
      ]);
    });
  });
});