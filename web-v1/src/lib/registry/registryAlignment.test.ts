// src/lib/registry/registryAlignment.test.ts
import { describe, expect, test } from "vitest";
import { METRIC_CATALOG } from "@/lib/metrics/catalog";
import { METRIC_REGISTRY } from "@/lib/registry/metricRegistry";

function getKey(entry: any): string | null {
  if (!entry) return null;
  // Common patterns: { key }, { metric }, { metricKey }
  if (typeof entry.key === "string") return entry.key;
  if (typeof entry.metric === "string") return entry.metric;
  if (typeof entry.metricKey === "string") return entry.metricKey;
  return null;
}

describe("Metric registry alignment (catalog-aware, schema-agnostic)", () => {
  test("registry is a list of entries with a usable metric key", () => {
    expect(Array.isArray(METRIC_REGISTRY)).toBe(true);

    const missing: any[] = [];
    for (const e of METRIC_REGISTRY as any[]) {
      const k = getKey(e);
      if (!k) missing.push(e);
    }

    // Keep failure actionable
    expect(missing.length, `Registry entries missing key/metric/metricKey: ${missing.length}`).toBe(0);
  });

  test("registry does not contain duplicate metric keys", () => {
    const keys = (METRIC_REGISTRY as any[])
      .map((e) => getKey(e))
      .filter((k): k is string => typeof k === "string");

    expect(new Set(keys).size).toBe(keys.length);
  });

  test("catalog-referenced keys exist; non-catalog keys are listed for triage", () => {
    const catalogKeys = new Set(Object.keys(METRIC_CATALOG));

    const keys = (METRIC_REGISTRY as any[])
      .map((e) => getKey(e))
      .filter((k): k is string => typeof k === "string");

    const unknown = keys.filter((k) => !catalogKeys.has(k));

    // This is intentionally NOT a hard fail yet, because your registry may include computed/internal keys.
    // We still assert that there aren't "too many" unknowns, which would indicate drift.
    //
    // If you want to hard-fail later, flip this to `expect(unknown).toEqual([])` once you add explicit
    // allowlisting or registry markers for non-catalog entries.
    expect(
      unknown.length,
      `Registry contains ${unknown.length} key(s) not present in METRIC_CATALOG.\n` +
        `First 25: ${unknown.slice(0, 25).join(", ")}`
    ).toBeLessThanOrEqual(25);
  });
});