// src/lib/utils/formatters.test.ts
import {
  formatCompactNumber,
  formatDateUtc,
  formatDurationDays,
  formatInteger,
  formatIsoDate,
  formatLast4,
  formatNumber,
  formatPercent,
  formatSignedPercent,
  formatWindowLabel,
} from "@/lib/utils/formatters";

describe("utils/formatters", () => {
  describe("formatCompactNumber", () => {
    it("returns em dash for nullish and invalid values", () => {
      expect(formatCompactNumber(null)).toBe("—");
      expect(formatCompactNumber(undefined)).toBe("—");
      expect(formatCompactNumber(Number.NaN)).toBe("—");
      expect(formatCompactNumber(Number.POSITIVE_INFINITY)).toBe("—");
    });

    it("formats larger values compactly", () => {
      expect(formatCompactNumber(1200)).toBe("1.2K");
      expect(formatCompactNumber(2500000)).toBe("2.5M");
    });
  });

  describe("formatInteger", () => {
    it("returns em dash for invalid values", () => {
      expect(formatInteger(null)).toBe("—");
      expect(formatInteger(undefined)).toBe("—");
      expect(formatInteger(Number.NaN)).toBe("—");
    });

    it("rounds and formats integers", () => {
      expect(formatInteger(1234.4)).toBe("1,234");
      expect(formatInteger(1234.6)).toBe("1,235");
    });
  });

  describe("formatNumber", () => {
    it("returns em dash for invalid values", () => {
      expect(formatNumber(null)).toBe("—");
      expect(formatNumber(undefined)).toBe("—");
      expect(formatNumber(Number.NaN)).toBe("—");
    });

    it("formats decimals with configurable precision", () => {
      expect(formatNumber(12.3456)).toBe("12.35");
      expect(formatNumber(12.3456, 3)).toBe("12.346");
    });
  });

  describe("formatPercent", () => {
    it("returns em dash for invalid values", () => {
      expect(formatPercent(null)).toBe("—");
      expect(formatPercent(undefined)).toBe("—");
      expect(formatPercent(Number.NaN)).toBe("—");
    });

    it("treats input as percent by default", () => {
      expect(formatPercent(12.5)).toBe("12.5%");
      expect(formatPercent(-4)).toBe("-4%");
    });

    it("can treat input as fraction", () => {
      expect(
        formatPercent(0.125, { inputIsFraction: true, maximumFractionDigits: 1 })
      ).toBe("12.5%");
    });
  });

  describe("formatSignedPercent", () => {
    it("returns em dash for invalid values", () => {
      expect(formatSignedPercent(null)).toBe("—");
      expect(formatSignedPercent(undefined)).toBe("—");
      expect(formatSignedPercent(Number.NaN)).toBe("—");
    });

    it("adds plus sign for positive values", () => {
      expect(formatSignedPercent(12.5)).toBe("+12.5%");
    });

    it("leaves zero and negative values unchanged", () => {
      expect(formatSignedPercent(0)).toBe("0%");
      expect(formatSignedPercent(-8.2)).toBe("-8.2%");
    });
  });

  describe("formatDateUtc", () => {
    it("returns em dash for missing and invalid values", () => {
      expect(formatDateUtc(null)).toBe("—");
      expect(formatDateUtc(undefined)).toBe("—");
      expect(formatDateUtc("not-a-date")).toBe("—");
    });

    it("formats utc date without time by default", () => {
      expect(formatDateUtc("2026-03-15T22:18:41.000Z")).toBe("15 Mar 2026");
    });

    it("can include utc time", () => {
      expect(
        formatDateUtc("2026-03-15T22:18:41.000Z", { includeTime: true })
      ).toContain("15 Mar 2026");
    });
  });

  describe("formatIsoDate", () => {
    it("returns em dash for missing and invalid values", () => {
      expect(formatIsoDate(null)).toBe("—");
      expect(formatIsoDate(undefined)).toBe("—");
      expect(formatIsoDate("not-a-date")).toBe("—");
    });

    it("formats as YYYY-MM-DD", () => {
      expect(formatIsoDate("2026-03-15T22:18:41.000Z")).toBe("2026-03-15");
    });
  });

  describe("formatWindowLabel", () => {
    it("returns em dash for missing values", () => {
      expect(formatWindowLabel(null)).toBe("—");
      expect(formatWindowLabel(undefined)).toBe("—");
      expect(formatWindowLabel("")).toBe("—");
    });

    it("formats latest and day windows", () => {
      expect(formatWindowLabel("latest")).toBe("Latest");
      expect(formatWindowLabel("7d")).toBe("7 days");
      expect(formatWindowLabel("365d")).toBe("365 days");
    });

    it("falls back to original token for unknown patterns", () => {
      expect(formatWindowLabel("custom-window")).toBe("custom-window");
    });
  });

  describe("formatDurationDays", () => {
    it("returns em dash for invalid values", () => {
      expect(formatDurationDays(null)).toBe("—");
      expect(formatDurationDays(undefined)).toBe("—");
      expect(formatDurationDays(Number.NaN)).toBe("—");
    });

    it("formats singular and plural day labels", () => {
      expect(formatDurationDays(0)).toBe("0 days");
      expect(formatDurationDays(1)).toBe("1 day");
      expect(formatDurationDays(7)).toBe("7 days");
      expect(formatDurationDays(7.4)).toBe("7 days");
    });
  });

  describe("formatLast4", () => {
    it("returns em dash for missing values", () => {
      expect(formatLast4(null)).toBe("—");
      expect(formatLast4(undefined)).toBe("—");
      expect(formatLast4("")).toBe("—");
      expect(formatLast4("   ")).toBe("—");
    });

    it("returns the last four characters", () => {
      expect(formatLast4("abcd1234")).toBe("1234");
      expect(formatLast4("9999")).toBe("9999");
      expect(formatLast4("abc")).toBe("abc");
    });
  });
});