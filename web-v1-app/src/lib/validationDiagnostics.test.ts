/**
 * @jest-environment node
 */

export {};

import {
  buildValidationDiagnostics,
  normalizeValidationLabel,
  validationDateFromRow,
} from "@/lib/validationDiagnostics";

describe("lib/validationDiagnostics", () => {
  it("normalizes supported labels and falls back to UNKNOWN/DEGRADED", () => {
    expect(normalizeValidationLabel("stable")).toBe("STABLE");
    expect(normalizeValidationLabel("HEATING")).toBe("HEATING");
    expect(normalizeValidationLabel("unexpected")).toBe("UNKNOWN/DEGRADED");
  });

  it("uses the best available observation date", () => {
    expect(validationDateFromRow({ date: "2026-01-03" })).toBe("2026-01-03");
    expect(validationDateFromRow({ updated_through: "2026-01-02" })).toBe("2026-01-02");
    expect(validationDateFromRow({ regime: { asof_date: "2026-01-01" } })).toBe("2026-01-01");
  });

  it("computes class, transition, confidence and run diagnostics", () => {
    const diagnostics = buildValidationDiagnostics([
      { date: "2026-01-03", status: { label: "HEATING" }, confidence: { confidence_score: 0.72 } },
      { date: "2026-01-01", status: { label: "STABLE" }, confidence: { confidence_score: 0.91 } },
      { date: "2026-01-02", status: { label: "STABLE" }, confidence: { confidence_score: 0.64 } },
      { date: "2026-01-04", status: { label: "CHEAP" }, confidence: { confidence_score: 0.21 } },
      { date: "2026-01-05", status: { label: "CHEAP" } },
    ]);

    expect(diagnostics.observations).toBe(5);
    expect(diagnostics.firstDate).toBe("2026-01-01");
    expect(diagnostics.lastDate).toBe("2026-01-05");
    expect(diagnostics.latest).toBe("CHEAP");
    expect(diagnostics.counts.STABLE).toBe(2);
    expect(diagnostics.counts.HEATING).toBe(1);
    expect(diagnostics.counts.CHEAP).toBe(2);
    expect(diagnostics.transitions).toBe(2);
    expect(diagnostics.transitionsPer100Observations).toBe(40);
    expect(diagnostics.medianRunLength).toBe(2);
    expect(diagnostics.confidenceBuckets.good).toBe(2);
    expect(diagnostics.confidenceBuckets.caution).toBe(1);
    expect(diagnostics.confidenceBuckets.degraded).toBe(1);
    expect(diagnostics.confidenceBuckets.missing).toBe(1);
    expect(diagnostics.usableConfidenceShare).toBe(0.4);
  });
});
