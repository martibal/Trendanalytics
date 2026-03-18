// src/app/api/export/exportEtag.contract.test.ts
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Route handlers
import { GET as GET_MANIFEST } from "@/app/api/export/manifest/route";
import { GET as GET_DAILY } from "@/app/api/export/daily/route";
import { GET as GET_WINDOW } from "@/app/api/export/window/route";

import * as fsMod from "fs";

function getHeader(res: Response, name: string): string | null {
  return res.headers.get(name) ?? res.headers.get(name.toLowerCase()) ?? res.headers.get(name.toUpperCase());
}

function req(url: string, headers?: Record<string, string>) {
  return new NextRequest(url, { headers });
}

const ORIGINAL_EXPORT_TOKEN = process.env.EXPORT_TOKEN;

beforeEach(() => {
  // Ensure token gate is OFF in tests so we can assert 304/ETag behavior.
  delete process.env.EXPORT_TOKEN;
});

afterEach(() => {
  // Restore env
  if (typeof ORIGINAL_EXPORT_TOKEN === "string") process.env.EXPORT_TOKEN = ORIGINAL_EXPORT_TOKEN;
  else delete process.env.EXPORT_TOKEN;

  vi.restoreAllMocks();
});

function mkDatasetJson(dataset_id = "ds_test", revision_id = 123) {
  return JSON.stringify({ dataset_id, revision_id }, null, 2);
}

describe("Export API — ETag changes when underlying content changes", () => {
  test("manifest ETag changes when available_days content changes (even if length is similar)", async () => {
    // NOTE: fs.promises.readFile has overloads; vitest spy typing + TS can disagree.
    // Cast promises to any to keep `tsc --noEmit` happy without changing runtime behavior.
    const spy = vi.spyOn(fsMod.promises as any, "readFile");

    const datasetRaw = mkDatasetJson("ds_m", 1);

    const manifestA = JSON.stringify(
      {
        asof: "2026-02-14",
        available_days: ["2026-02-10", "2026-02-11", "2026-02-12"],
      },
      null,
      2
    );

    const manifestB = JSON.stringify(
      {
        asof: "2026-02-14",
        // same length, different content => ETag MUST differ
        available_days: ["2026-02-10", "2026-02-11", "2026-02-13"],
      },
      null,
      2
    );

    // First run: dataset + manifestA
    spy.mockImplementation(async (filePath: any) => {
      const p = String(filePath);
      if (p.endsWith(pathSep("dataset.json"))) return datasetRaw as any;
      if (p.endsWith(pathSep("gold/bitcoin/manifest.json"))) return manifestA as any;
      return Promise.reject(new Error(`Unexpected readFile path: ${p}`));
    });

    const url = "http://localhost/api/export/manifest?chain=bitcoin&genre=gold";
    const r1 = await GET_MANIFEST(req(url));
    expect(r1.status).toBe(200);
    const etag1 = getHeader(r1, "etag");
    expect(etag1).toBeTruthy();

    // Second run: dataset + manifestB (same inputs, changed manifest content)
    spy.mockImplementation(async (filePath: any) => {
      const p = String(filePath);
      if (p.endsWith(pathSep("dataset.json"))) return datasetRaw as any;
      if (p.endsWith(pathSep("gold/bitcoin/manifest.json"))) return manifestB as any;
      return Promise.reject(new Error(`Unexpected readFile path: ${p}`));
    });

    const r2 = await GET_MANIFEST(req(url));
    expect(r2.status).toBe(200);
    const etag2 = getHeader(r2, "etag");
    expect(etag2).toBeTruthy();

    expect(etag2).not.toBe(etag1);
  });

  test("daily ETag changes when the daily file content changes", async () => {
    // NOTE: cast to any for overload-friendly spy typing under TS
    const spy = vi.spyOn(fsMod.promises as any, "readFile");

    const datasetRaw = mkDatasetJson("ds_d", 2);

    const dailyA = JSON.stringify({ tx_count_daily: 100, foo: "A" }, null, 0);
    const dailyB = JSON.stringify({ tx_count_daily: 101, foo: "A" }, null, 0);

    const url = "http://localhost/api/export/daily?chain=arbitrum&genre=gold&date=2026-02-14";

    // First run -> dailyA
    spy.mockImplementation(async (filePath: any) => {
      const p = String(filePath);
      if (p.endsWith(pathSep("dataset.json"))) return datasetRaw as any;
      if (p.endsWith(pathSep("gold/arbitrum/2026-02-14.json"))) return dailyA as any;
      return Promise.reject(new Error(`Unexpected readFile path: ${p}`));
    });

    const r1 = await GET_DAILY(req(url));
    expect(r1.status).toBe(200);
    const etag1 = getHeader(r1, "etag");
    expect(etag1).toBeTruthy();

    // Second run -> dailyB
    spy.mockImplementation(async (filePath: any) => {
      const p = String(filePath);
      if (p.endsWith(pathSep("dataset.json"))) return datasetRaw as any;
      if (p.endsWith(pathSep("gold/arbitrum/2026-02-14.json"))) return dailyB as any;
      return Promise.reject(new Error(`Unexpected readFile path: ${p}`));
    });

    const r2 = await GET_DAILY(req(url));
    expect(r2.status).toBe(200);
    const etag2 = getHeader(r2, "etag");
    expect(etag2).toBeTruthy();

    expect(etag2).not.toBe(etag1);
  });

  test("window ETag changes when the window file content changes", async () => {
    // NOTE: cast to any for overload-friendly spy typing under TS
    const spy = vi.spyOn(fsMod.promises as any, "readFile");

    const datasetRaw = mkDatasetJson("ds_w", 3);

    const windowA = JSON.stringify({ window: "last30d", points: [1, 2, 3] }, null, 0);
    const windowB = JSON.stringify({ window: "last30d", points: [1, 2, 4] }, null, 0);

    const url = "http://localhost/api/export/window?chain=base&genre=derived&window=30";

    // First run -> windowA
    spy.mockImplementation(async (filePath: any) => {
      const p = String(filePath);
      if (p.endsWith(pathSep("dataset.json"))) return datasetRaw as any;
      if (p.endsWith(pathSep("derived/base/last30d.json"))) return windowA as any;
      return Promise.reject(new Error(`Unexpected readFile path: ${p}`));
    });

    const r1 = await GET_WINDOW(req(url));
    expect(r1.status).toBe(200);
    const etag1 = getHeader(r1, "etag");
    expect(etag1).toBeTruthy();

    // Second run -> windowB
    spy.mockImplementation(async (filePath: any) => {
      const p = String(filePath);
      if (p.endsWith(pathSep("dataset.json"))) return datasetRaw as any;
      if (p.endsWith(pathSep("derived/base/last30d.json"))) return windowB as any;
      return Promise.reject(new Error(`Unexpected readFile path: ${p}`));
    });

    const r2 = await GET_WINDOW(req(url));
    expect(r2.status).toBe(200);
    const etag2 = getHeader(r2, "etag");
    expect(etag2).toBeTruthy();

    expect(etag2).not.toBe(etag1);
  });

  test("daily 304 works when If-None-Match equals current ETag", async () => {
    // NOTE: cast to any for overload-friendly spy typing under TS
    const spy = vi.spyOn(fsMod.promises as any, "readFile");

    const datasetRaw = mkDatasetJson("ds_304", 4);
    const daily = JSON.stringify({ x: 1 }, null, 0);

    const url = "http://localhost/api/export/daily?chain=ethereum&genre=meta&date=2026-02-14";

    spy.mockImplementation(async (filePath: any) => {
      const p = String(filePath);
      if (p.endsWith(pathSep("dataset.json"))) return datasetRaw as any;
      if (p.endsWith(pathSep("meta/ethereum/2026-02-14.json"))) return daily as any;
      return Promise.reject(new Error(`Unexpected readFile path: ${p}`));
    });

    const r1 = await GET_DAILY(req(url));
    expect(r1.status).toBe(200);
    const etag = getHeader(r1, "etag");
    expect(etag).toBeTruthy();

    const r304 = await GET_DAILY(req(url, { "if-none-match": etag! }));
    expect(r304.status).toBe(304);
  });
});

/**
 * Helper: windows-safe suffix matching for mocked paths.
 * We only need suffix matching; route code uses path.join which differs by OS separator.
 */
function pathSep(s: string) {
  // Accept both Windows and POSIX separators in a single "endsWith" pattern.
  // We'll normalize by checking both variants at callsite via a simple replace.
  // Here we return the POSIX form, and the matcher checks both.
  // But to keep the spy mock readable, we implement endsWith on both forms below.
  return s.replace(/\\/g, "/");
}

// Patch String.endsWith checks to accept both path separators in our mock comparisons.
const _endsWith = String.prototype.endsWith;
String.prototype.endsWith = function (searchString: any, endPosition?: any) {
  const self = String(this).replace(/\\/g, "/");
  const needle = String(searchString).replace(/\\/g, "/");
  return _endsWith.call(self, needle, endPosition);
};