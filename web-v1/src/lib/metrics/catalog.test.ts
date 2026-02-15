// src/lib/metrics/catalog.test.ts
import { describe, expect, test } from "vitest";
import { METRIC_CATALOG } from "@/lib/metrics/catalog";

describe("METRIC_CATALOG invariants", () => {
  test("has entries", () => {
    expect(Object.keys(METRIC_CATALOG).length).toBeGreaterThan(0);
  });

  test("entry keys match and required fields exist", () => {
    for (const [k, entry] of Object.entries(METRIC_CATALOG)) {
      // Key consistency
      expect(entry.key).toBe(k);

      // Labels
      expect(typeof entry.label).toBe("string");
      expect(entry.label.length).toBeGreaterThan(0);
      expect(typeof entry.shortLabel).toBe("string");
      expect(entry.shortLabel.length).toBeGreaterThan(0);

      // Basic schema
      expect(entry.unit).toBeTruthy();
      expect(entry.format).toBeTruthy();
      expect(entry.category).toBeTruthy();

      // Doc blocks
      expect(entry.doc).toBeTruthy();
      expect(entry.doc.what).toBeTruthy();
      expect(entry.doc.how).toBeTruthy();
      expect(entry.doc.why).toBeTruthy();
      expect(entry.doc.value).toBeTruthy();

      for (const field of [entry.doc.what, entry.doc.how, entry.doc.why, entry.doc.value]) {
        expect(typeof field.basic).toBe("string");
        expect(field.basic.trim().length).toBeGreaterThan(0);
        expect(typeof field.advanced).toBe("string");
        expect(field.advanced.trim().length).toBeGreaterThan(0);
      }

      // Methodology block
      expect(entry.methodology).toBeTruthy();
      expect(typeof entry.methodology.definition).toBe("string");
      expect(entry.methodology.definition.trim().length).toBeGreaterThan(0);
      expect(typeof entry.methodology.computation).toBe("string");
      expect(entry.methodology.computation.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(entry.methodology.caveats)).toBe(true);

      // Anchors
      expect(entry.anchors).toBeTruthy();
      expect(typeof entry.anchors.methodology).toBe("string");
      expect(typeof entry.anchors.wiki).toBe("string");
      expect(entry.anchors.methodology.endsWith(`#${k}`)).toBe(true);
      expect(entry.anchors.wiki.endsWith(`#${k}`)).toBe(true);

      // Availability map is optional per chain, but if present it must have kind
      if (entry.availabilityByChain && typeof entry.availabilityByChain === "object") {
        for (const av of Object.values(entry.availabilityByChain)) {
          if (!av) continue;
          expect(typeof (av as any).kind).toBe("string");
          expect((av as any).kind.length).toBeGreaterThan(0);
        }
      }
    }
  });

  test("catalog keys are unique", () => {
    const keys = Object.keys(METRIC_CATALOG);
    expect(new Set(keys).size).toBe(keys.length);
  });
});