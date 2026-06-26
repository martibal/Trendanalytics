/**
 * @jest-environment node
 */

import * as fs from "fs";
import * as path from "path";

type JsonObject = Record<string, unknown>;

const PUBLIC_DIR = path.join(process.cwd(), "public");
const SAMPLE_PACK_DIR = path.join(PUBLIC_DIR, "sample-pack");
const PAGE_SOURCE_PATH = path.join(__dirname, "page.tsx");

const EXPECTED_SAMPLE_JSON_HREFS = [
  "/sample-pack/arbitrum/2026-03-25/derived.json",
  "/sample-pack/arbitrum/2026-03-25/gold.json",
  "/sample-pack/arbitrum/2026-03-25/meta.json",
  "/sample-pack/ethereum/2025-04-21/meta.json",
  "/sample-pack/ethereum/2026-03-31/derived.json",
  "/sample-pack/ethereum/2026-03-31/gold.json",
  "/sample-pack/ethereum/2026-03-31/meta.json",
] as const;

const EXPECTED_SAMPLE_PACK_HREFS = [
  ...EXPECTED_SAMPLE_JSON_HREFS,
  "/sample-pack/urd-atlas-public-sample-pack.zip",
] as const;

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function publicFilePathFromHref(href: string): string {
  if (!href.startsWith("/")) {
    throw new Error(`Expected public href to start with "/": ${href}`);
  }

  return path.join(PUBLIC_DIR, ...href.slice(1).split("/"));
}

function samplePackHrefFromFilePath(filePath: string): string {
  const relative = path.relative(PUBLIC_DIR, filePath).split(path.sep).join("/");
  return `/${relative}`;
}

function listFilesRecursive(root: string): string[] {
  const entries = fs.readdirSync(root, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      return listFilesRecursive(fullPath);
    }

    return [fullPath];
  });
}

function extractSamplePackHrefsFromPage(): string[] {
  const source = fs.readFileSync(PAGE_SOURCE_PATH, "utf8");
  const matches = source.matchAll(/["'](\/sample-pack\/[^"']+)["']/g);

  return uniqueSorted(Array.from(matches, (match) => match[1]));
}

function readJsonFile(href: string): JsonObject {
  const filePath = publicFilePathFromHref(href);
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  expect(isJsonObject(parsed)).toBe(true);

  return parsed as JsonObject;
}

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function expectStringField(object: JsonObject, field: string, expected?: string): string {
  const value = object[field];

  expect(typeof value).toBe("string");

  if (expected !== undefined) {
    expect(value).toBe(expected);
  }

  return value as string;
}

function expectNumberField(object: JsonObject, field: string): number {
  const value = object[field];

  expect(typeof value).toBe("number");
  expect(Number.isFinite(value)).toBe(true);

  return value as number;
}

function expectObjectField(object: JsonObject, field: string): JsonObject {
  const value = object[field];

  expect(isJsonObject(value)).toBe(true);

  return value as JsonObject;
}

function expectArrayField(object: JsonObject, field: string): unknown[] {
  const value = object[field];

  expect(Array.isArray(value)).toBe(true);

  return value as unknown[];
}

describe("api-docs/samples sample-pack structure", () => {
  it("links only to sample-pack files that exist physically under public/sample-pack", () => {
    const pageHrefs = extractSamplePackHrefsFromPage();

    expect(pageHrefs).toEqual([...EXPECTED_SAMPLE_PACK_HREFS].sort());

    for (const href of pageHrefs) {
      const filePath = publicFilePathFromHref(href);

      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.statSync(filePath).isFile()).toBe(true);
      expect(fs.statSync(filePath).size).toBeGreaterThan(0);
    }
  });

  it("lists every public sample-pack JSON file on the sample-pack page", () => {
    const publicJsonHrefs = uniqueSorted(
      listFilesRecursive(SAMPLE_PACK_DIR)
        .filter((filePath) => filePath.endsWith(".json"))
        .map(samplePackHrefFromFilePath)
    );

    const pageJsonHrefs = extractSamplePackHrefsFromPage().filter((href) =>
      href.endsWith(".json")
    );

    expect(publicJsonHrefs).toEqual([...EXPECTED_SAMPLE_JSON_HREFS].sort());
    expect(pageJsonHrefs).toEqual(publicJsonHrefs);
  });

  it("keeps gold samples on the expected chain/date structure", () => {
    const goldSamples = [
      {
        href: "/sample-pack/ethereum/2026-03-31/gold.json",
        chain: "ethereum",
        date: "2026-03-31",
        requiredMetrics: [
          "tx_count_daily",
          "median_tx_fee_native",
          "gas_utilization_pct",
          "failed_tx_rate",
          "avg_block_time_sec",
          "block_count_daily",
        ],
      },
      {
        href: "/sample-pack/arbitrum/2026-03-25/gold.json",
        chain: "arbitrum",
        date: "2026-03-25",
        requiredMetrics: [
          "tx_count_daily",
          "median_tx_fee_native",
          "failed_tx_rate",
          "avg_block_time_sec",
          "block_count_daily",
        ],
      },
    ];

    for (const sample of goldSamples) {
      const json = readJsonFile(sample.href);

      expectStringField(json, "chain", sample.chain);
      expectStringField(json, "date", sample.date);
      expectStringField(json, "updated_through", sample.date);

      for (const metric of sample.requiredMetrics) {
        expectNumberField(json, metric);
      }
    }
  });

  it("keeps derived samples on the expected chain/date and moving-average structure", () => {
    const derivedSamples = [
      {
        href: "/sample-pack/ethereum/2026-03-31/derived.json",
        chain: "ethereum",
        date: "2026-03-31",
        requiredMetrics: [
          "tx_count_daily__ma7",
          "tx_count_daily__ma30",
          "median_tx_fee_native__ma7",
          "median_tx_fee_native__ma30",
          "gas_utilization_pct__ma7",
          "gas_utilization_pct__ma30",
        ],
      },
      {
        href: "/sample-pack/arbitrum/2026-03-25/derived.json",
        chain: "arbitrum",
        date: "2026-03-25",
        requiredMetrics: [
          "tx_count_daily__ma7",
          "tx_count_daily__ma30",
          "median_tx_fee_native__ma7",
          "median_tx_fee_native__ma30",
        ],
      },
    ];

    for (const sample of derivedSamples) {
      const json = readJsonFile(sample.href);

      expectStringField(json, "chain", sample.chain);
      expectStringField(json, "date", sample.date);
      expectStringField(json, "updated_through", sample.date);

      for (const metric of sample.requiredMetrics) {
        expectNumberField(json, metric);
      }
    }
  });

  it("keeps meta samples on the expected confidence, gate, regime, and driver structure", () => {
    const metaSamples = [
      {
        href: "/sample-pack/ethereum/2026-03-31/meta.json",
        chain: "ethereum",
        date: "2026-03-31",
        label: "CONGESTED",
        requiresDrivers: true,
      },
      {
        href: "/sample-pack/ethereum/2025-04-21/meta.json",
        chain: "ethereum",
        date: "2025-04-21",
        label: "UNKNOWN/DEGRADED",
        requiresDrivers: false,
      },
      {
        href: "/sample-pack/arbitrum/2026-03-25/meta.json",
        chain: "arbitrum",
        date: "2026-03-25",
        label: "HEATING",
        requiresDrivers: true,
      },
    ];

    for (const sample of metaSamples) {
      const json = readJsonFile(sample.href);

      expectStringField(json, "chain", sample.chain);
      expectStringField(json, "date", sample.date);
      expectStringField(json, "updated_through", sample.date);
      expectStringField(json, "methodology_version");

      const status = expectObjectField(json, "status");
      expectStringField(status, "label", sample.label);
      expectStringField(status, "one_liner");

      const publishConfidence = expectObjectField(json, "publish_confidence");
      expectNumberField(publishConfidence, "threshold");

      const confidence = expectObjectField(json, "confidence");
      expectNumberField(confidence, "confidence_score");
      expectNumberField(confidence, "lag_days_vs_utc_today");
      expectNumberField(confidence, "data_quality_score");
      expectNumberField(confidence, "label_confidence_score");

      const regime = expectObjectField(json, "regime");
      expectStringField(regime, "label", sample.label);
      expectStringField(regime, "asof_date", sample.date);
      expectStringField(regime, "ruleset_id");
      expectNumberField(regime, "window_days");
      expectStringField(regime, "determinism_hash");

      const drivers = expectArrayField(regime, "drivers");

      if (sample.requiresDrivers) {
        expect(drivers.length).toBeGreaterThan(0);
      }

      for (const driver of drivers) {
        expect(isJsonObject(driver)).toBe(true);

        const driverObject = driver as JsonObject;

        expectStringField(driverObject, "axis");
        expectStringField(driverObject, "metric");
        expectStringField(driverObject, "trend");
        expectNumberField(driverObject, "z_robust");
        expectNumberField(driverObject, "pct_90d");
        expectNumberField(driverObject, "momentum_7d_vs_30d");
        expectNumberField(driverObject, "current");
      }
    }
  });

  it("keeps ethereum and arbitrum bundle files internally aligned by chain and date", () => {
    const bundles = [
      {
        chain: "ethereum",
        date: "2026-03-31",
        hrefs: [
          "/sample-pack/ethereum/2026-03-31/gold.json",
          "/sample-pack/ethereum/2026-03-31/derived.json",
          "/sample-pack/ethereum/2026-03-31/meta.json",
        ],
      },
      {
        chain: "arbitrum",
        date: "2026-03-25",
        hrefs: [
          "/sample-pack/arbitrum/2026-03-25/gold.json",
          "/sample-pack/arbitrum/2026-03-25/derived.json",
          "/sample-pack/arbitrum/2026-03-25/meta.json",
        ],
      },
    ];

    for (const bundle of bundles) {
      for (const href of bundle.hrefs) {
        const json = readJsonFile(href);

        expectStringField(json, "chain", bundle.chain);
        expectStringField(json, "date", bundle.date);
        expectStringField(json, "updated_through", bundle.date);
      }
    }
  });

  it("keeps the degraded ethereum sample below the public confidence threshold", () => {
    const json = readJsonFile("/sample-pack/ethereum/2025-04-21/meta.json");

    const status = expectObjectField(json, "status");
    const publishConfidence = expectObjectField(json, "publish_confidence");
    const confidence = expectObjectField(json, "confidence");
    const regime = expectObjectField(json, "regime");

    expectStringField(status, "label", "UNKNOWN/DEGRADED");
    expectStringField(regime, "label", "UNKNOWN/DEGRADED");

    const threshold = expectNumberField(publishConfidence, "threshold");
    const confidenceScore = expectNumberField(confidence, "confidence_score");

    expect(confidenceScore).toBeLessThan(threshold);
    expect(expectArrayField(regime, "drivers")).toHaveLength(0);
  });
});
