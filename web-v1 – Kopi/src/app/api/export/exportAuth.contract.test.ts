// src/app/api/export/exportAuth.contract.test.ts
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import * as fsMod from "fs";

import { GET as GET_MANIFEST } from "@/app/api/export/manifest/route";
import { GET as GET_DAILY } from "@/app/api/export/daily/route";

function getHeader(res: Response, name: string): string | null {
  return res.headers.get(name) ?? res.headers.get(name.toLowerCase()) ?? res.headers.get(name.toUpperCase());
}

function makeReq(url: string, headers?: Record<string, string>) {
  return new NextRequest(url, { headers });
}

function normalizePath(p: string) {
  return p.replace(/\\/g, "/");
}

function endsWithNormalized(p: string, suffix: string) {
  return normalizePath(p).endsWith(normalizePath(suffix));
}

const ORIGINAL_EXPORT_TOKEN = process.env.EXPORT_TOKEN;

beforeEach(() => {
  // Force gating ON for these tests.
  process.env.EXPORT_TOKEN = "test_token_123";
});

afterEach(() => {
  if (typeof ORIGINAL_EXPORT_TOKEN === "string") process.env.EXPORT_TOKEN = ORIGINAL_EXPORT_TOKEN;
  else delete process.env.EXPORT_TOKEN;

  vi.restoreAllMocks();
});

function mkDatasetJson(dataset_id = "ds_auth", revision_id = 999) {
  return JSON.stringify({ dataset_id, revision_id }, null, 2);
}

describe("Export API — token gate (EXPORT_TOKEN) disables shared caching and enforces auth", () => {
  test("manifest: missing token => 401", async () => {
    const spy = vi.spyOn(fsMod.promises, "readFile");

    // Even on 401, the handler should not read files (but we don't assert that strictly here).
    const url = "http://localhost/api/export/manifest?chain=bitcoin&genre=gold";
    const res = await GET_MANIFEST(makeReq(url));

    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body?.error?.code).toBe("UNAUTHORIZED");

    spy.mockRestore();
  });

  test("manifest: valid token => 200 with private no-store + Vary: Authorization, and no 304 even if If-None-Match matches", async () => {
    const spy = vi.spyOn(fsMod.promises, "readFile");

    const datasetRaw = mkDatasetJson("ds_auth_m", 1);
    const manifestRaw = JSON.stringify(
      {
        asof: "2026-02-14",
        available_days: ["2026-02-10", "2026-02-11", "2026-02-12"],
      },
      null,
      2
    );

    spy.mockImplementation(async (filePath: any) => {
      const p = String(filePath);
      if (endsWithNormalized(p, "public/data/published/v1/dataset.json")) return datasetRaw as any;
      if (endsWithNormalized(p, "public/data/published/v1/gold/bitcoin/manifest.json")) return manifestRaw as any;
      return Promise.reject(new Error(`Unexpected readFile path: ${p}`));
    });

    const url = "http://localhost/api/export/manifest?chain=bitcoin&genre=gold";
    const authHeader = { authorization: "Bearer test_token_123" };

    const r1 = await GET_MANIFEST(makeReq(url, authHeader));
    expect(r1.status).toBe(200);

    const cacheControl1 = getHeader(r1, "cache-control");
    const vary1 = getHeader(r1, "vary");
    expect(cacheControl1).toBe("private, no-store");
    expect(vary1).toBe("Authorization");

    const etag1 = getHeader(r1, "etag");
    expect(etag1).toBeTruthy();

    // Even with If-None-Match equal, when gated we must NOT return 304 (private/no-store).
    const r2 = await GET_MANIFEST(
      makeReq(url, {
        authorization: "Bearer test_token_123",
        "if-none-match": etag1!,
      })
    );
    expect(r2.status).toBe(200);

    const cacheControl2 = getHeader(r2, "cache-control");
    const vary2 = getHeader(r2, "vary");
    expect(cacheControl2).toBe("private, no-store");
    expect(vary2).toBe("Authorization");
  });

  test("daily: valid token => 200 with private no-store + Vary: Authorization", async () => {
    const spy = vi.spyOn(fsMod.promises, "readFile");

    const datasetRaw = mkDatasetJson("ds_auth_d", 2);
    const dailyRaw = JSON.stringify({ tx_count_daily: 123 }, null, 0);

    spy.mockImplementation(async (filePath: any) => {
      const p = String(filePath);
      if (endsWithNormalized(p, "public/data/published/v1/dataset.json")) return datasetRaw as any;
      if (endsWithNormalized(p, "public/data/published/v1/gold/arbitrum/2026-02-14.json")) return dailyRaw as any;
      return Promise.reject(new Error(`Unexpected readFile path: ${p}`));
    });

    const url = "http://localhost/api/export/daily?chain=arbitrum&genre=gold&date=2026-02-14";
    const res = await GET_DAILY(makeReq(url, { authorization: "Bearer test_token_123" }));

    expect(res.status).toBe(200);
    expect(getHeader(res, "cache-control")).toBe("private, no-store");
    expect(getHeader(res, "vary")).toBe("Authorization");
  });

  test("daily: wrong token => 401", async () => {
    const url = "http://localhost/api/export/daily?chain=arbitrum&genre=gold&date=2026-02-14";
    const res = await GET_DAILY(makeReq(url, { authorization: "Bearer WRONG" }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body?.error?.code).toBe("UNAUTHORIZED");
  });
});