// src/app/api/notables/route.test.ts
import { describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/notables/route";
import * as fsMod from "fs";

function getHeader(res: Response, name: string): string | null {
  return res.headers.get(name) ?? res.headers.get(name.toLowerCase()) ?? res.headers.get(name.toUpperCase());
}

function parseISODateUTC(s: string): number {
  const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
  return Date.UTC(y, m - 1, d);
}

function diffDaysUTC(aISO: string, bISO: string): number {
  const a = parseISODateUTC(aISO);
  const b = parseISODateUTC(bISO);
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
}

async function callNotables(params: { chain: string; window?: number; limit?: number; ifNoneMatch?: string }) {
  const url = new URL("http://localhost/api/notables");
  url.searchParams.set("chain", params.chain);
  if (typeof params.window === "number") url.searchParams.set("window", String(params.window));
  if (typeof params.limit === "number") url.searchParams.set("limit", String(params.limit));

  const headers: Record<string, string> = {};
  if (params.ifNoneMatch) headers["if-none-match"] = params.ifNoneMatch;

  const req = new NextRequest(url.toString(), { headers });
  const res = await GET(req);
  return res;
}

function collectAllNarrativeStrings(body: any): Array<{ path: string; text: string }> {
  const out: Array<{ path: string; text: string }> = [];

  if (Array.isArray(body?.notes)) {
    for (let i = 0; i < body.notes.length; i++) {
      if (typeof body.notes[i] === "string") out.push({ path: `notes[${i}]`, text: body.notes[i] });
    }
  }

  if (Array.isArray(body?.notables)) {
    for (let i = 0; i < body.notables.length; i++) {
      const n = body.notables[i];

      if (typeof n?.interpretation?.basic === "string") {
        out.push({ path: `notables[${i}].interpretation.basic`, text: n.interpretation.basic });
      }
      if (Array.isArray(n?.interpretation?.advanced)) {
        for (let j = 0; j < n.interpretation.advanced.length; j++) {
          if (typeof n.interpretation.advanced[j] === "string") {
            out.push({ path: `notables[${i}].interpretation.advanced[${j}]`, text: n.interpretation.advanced[j] });
          }
        }
      }
      if (Array.isArray(n?.caveats)) {
        for (let j = 0; j < n.caveats.length; j++) {
          if (typeof n.caveats[j] === "string") out.push({ path: `notables[${i}].caveats[${j}]`, text: n.caveats[j] });
        }
      }
    }
  }

  return out;
}

describe("Notables route (API) — schema + caching", () => {
  test("returns 200 and expected top-level schema", async () => {
    const res = await callNotables({ chain: "bitcoin", window: 30, limit: 12 });
    expect(res.status).toBe(200);

    const etag = getHeader(res, "etag");
    expect(etag).toBeTruthy();

    const cacheControl = getHeader(res, "cache-control");
    expect(cacheControl).toBeTruthy();

    const body = await res.json();

    expect(body).toHaveProperty("dataset_id");
    expect(body).toHaveProperty("revision_id");

    expect(body).toHaveProperty("chain", "bitcoin");
    expect(body).toHaveProperty("window_days");
    expect(typeof body.window_days).toBe("number");

    expect(body).toHaveProperty("start");
    expect(typeof body.start).toBe("string");
    expect(body.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    expect(body).toHaveProperty("end");
    expect(typeof body.end).toBe("string");
    expect(body.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    expect(body).toHaveProperty("freshness");
    expect(body.freshness).toHaveProperty("asof");
    expect(typeof body.freshness.asof).toBe("string");
    expect(body.freshness.asof).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    expect(body.freshness).toHaveProperty("lag_days");
    expect(typeof body.freshness.lag_days).toBe("number");

    expect(body).toHaveProperty("notables");
    expect(Array.isArray(body.notables)).toBe(true);

    expect(body).toHaveProperty("notes");
    expect(Array.isArray(body.notes)).toBe(true);
  });

  test("ETag is deterministic for same inputs (same run)", async () => {
    const res1 = await callNotables({ chain: "arbitrum", window: 90, limit: 12 });
    expect(res1.status).toBe(200);
    const etag1 = getHeader(res1, "etag");
    expect(etag1).toBeTruthy();
    const body1 = await res1.json();

    const res2 = await callNotables({ chain: "arbitrum", window: 90, limit: 12 });
    expect(res2.status).toBe(200);
    const etag2 = getHeader(res2, "etag");
    expect(etag2).toBe(etag1);
    const body2 = await res2.json();

    expect(JSON.stringify(body2)).toBe(JSON.stringify(body1));
  });

  test("ETag differs for different limit values (response identity includes limit)", async () => {
    const resA = await callNotables({ chain: "arbitrum", window: 90, limit: 7 });
    expect(resA.status).toBe(200);
    const etagA = getHeader(resA, "etag");
    expect(etagA).toBeTruthy();
    const bodyA = await resA.json();

    const resB = await callNotables({ chain: "arbitrum", window: 90, limit: 12 });
    expect(resB.status).toBe(200);
    const etagB = getHeader(resB, "etag");
    expect(etagB).toBeTruthy();
    const bodyB = await resB.json();

    expect(etagA).not.toBe(etagB);

    // Sanity: both comply with limit.
    expect(Array.isArray(bodyA.notables)).toBe(true);
    expect(Array.isArray(bodyB.notables)).toBe(true);
    expect(bodyA.notables.length).toBeLessThanOrEqual(7);
    expect(bodyB.notables.length).toBeLessThanOrEqual(12);
  });

  test("If-None-Match returns 304", async () => {
    const res1 = await callNotables({ chain: "base", window: 30, limit: 12 });
    expect(res1.status).toBe(200);
    const etag = getHeader(res1, "etag");
    expect(etag).toBeTruthy();

    const res304 = await callNotables({ chain: "base", window: 30, limit: 12, ifNoneMatch: etag! });
    expect(res304.status).toBe(304);
  });

  test("notables (if any) conform to minimum structure", async () => {
    const res = await callNotables({ chain: "ethereum", window: 180, limit: 20 });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(Array.isArray(body.notables)).toBe(true);

    for (const n of body.notables as any[]) {
      expect(typeof n.metric).toBe("string");
      expect(n.metric.length).toBeGreaterThan(0);

      expect(typeof n.label).toBe("string");
      expect(n.label.length).toBeGreaterThan(0);

      expect(typeof n.category).toBe("string");
      expect(n.category.length).toBeGreaterThan(0);

      expect(typeof n.score).toBe("number");

      expect(Array.isArray(n.kind)).toBe(true);
      expect(n.kind.length).toBeGreaterThan(0);
      for (const k of n.kind) {
        expect(["Level", "Trend", "Volatility", "DataQuality"]).toContain(k);
      }

      expect(n).toHaveProperty("signals");
      expect(n.signals).toHaveProperty("level");
      expect(n.signals.level).toHaveProperty("label");
      expect(["Low", "Typical", "Elevated", "Extreme"]).toContain(n.signals.level.label);
      expect(n.signals.level).toHaveProperty("percentile");
      expect(n.signals.level).toHaveProperty("method");
      expect(["meta_percentile", "window_rank"]).toContain(n.signals.level.method);

      expect(n.signals).toHaveProperty("trend");
      expect(["Rising", "Falling", "Flat"]).toContain(n.signals.trend.label);
      expect(["Weak", "Moderate", "Strong"]).toContain(n.signals.trend.strength);
      expect(n.signals.trend).toHaveProperty("slope_ma30");

      expect(n.signals).toHaveProperty("volatility");
      expect(["Stable", "Variable", "Highly variable"]).toContain(n.signals.volatility.label);
      expect(n.signals.volatility).toHaveProperty("cv_daily");

      expect(n.signals).toHaveProperty("coverage");
      expect(typeof n.signals.coverage.expected_days).toBe("number");
      expect(typeof n.signals.coverage.present_days).toBe("number");
      expect(Array.isArray(n.signals.coverage.missing_days)).toBe(true);
      expect(typeof n.signals.coverage.nonNull_ratio).toBe("number");

      expect(n.signals).toHaveProperty("freshness");
      expect(typeof n.signals.freshness.asof).toBe("string");
      expect(typeof n.signals.freshness.lag_days).toBe("number");

      expect(n).toHaveProperty("interpretation");
      expect(typeof n.interpretation.basic).toBe("string");
      expect(n.interpretation.basic.trim().length).toBeGreaterThan(0);

      expect(Array.isArray(n.interpretation.advanced)).toBe(true);
      for (const line of n.interpretation.advanced) {
        expect(typeof line).toBe("string");
        expect(line.trim().length).toBeGreaterThan(0);
      }

      expect(Array.isArray(n.caveats)).toBe(true);

      expect(n).toHaveProperty("links");
      expect(typeof n.links.methodology).toBe("string");
      expect(n.links.methodology.length).toBeGreaterThan(0);
      expect(typeof n.links.wiki).toBe("string");
      expect(n.links.wiki.length).toBeGreaterThan(0);
    }
  });
});

describe("Notables route (API) — methodology invariants", () => {
  test("limit is enforced (never returns more than limit)", async () => {
    const limit = 7;
    const res = await callNotables({ chain: "bitcoin", window: 365, limit });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(Array.isArray(body.notables)).toBe(true);
    expect(body.notables.length).toBeLessThanOrEqual(limit);
  });

  test("sorting: score desc, then label asc (as implemented in route.ts)", async () => {
    const res = await callNotables({ chain: "ethereum", window: 365, limit: 50 });
    expect(res.status).toBe(200);
    const body = await res.json();

    const ns = body.notables as any[];
    expect(Array.isArray(ns)).toBe(true);

    for (let i = 1; i < ns.length; i++) {
      const prev = ns[i - 1];
      const cur = ns[i];

      if (prev.score !== cur.score) {
        expect(prev.score).toBeGreaterThanOrEqual(cur.score);
      } else {
        expect(String(prev.label).localeCompare(String(cur.label)) <= 0).toBe(true);
      }
    }
  });

  test("window consistency: end equals freshness.asof, start is (window_days-1) days before end", async () => {
    const window = 180;
    const res = await callNotables({ chain: "arbitrum", window, limit: 12 });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.end).toBe(body.freshness.asof);

    const delta = diffDaysUTC(body.end, body.start);
    expect(delta).toBe(window - 1);
  });
});

describe("Notables route (API) — content guardrails (price-agnostic, non-naive)", () => {
  test("generated narrative does not contain currency formats or price narrative patterns", async () => {
    const res = await callNotables({ chain: "bitcoin", window: 365, limit: 25 });
    expect(res.status).toBe(200);
    const body = await res.json();

    const texts = collectAllNarrativeStrings(body);

    const hardForbidden: Array<{ name: string; re: RegExp }> = [
      { name: "dollar sign", re: /\$/ },
      { name: "€ symbol", re: /€/ },
      { name: "£ symbol", re: /£/ },
      { name: "USD literal", re: /\bUSD\b/i },
      { name: "EUR literal", re: /\bEUR\b/i },
      { name: "NOK literal", re: /\bNOK\b/i },
      { name: "price target phrase", re: /\bprice\s+target\b/i },
      { name: "priced at phrase", re: /\bpriced\s+at\b/i },
      { name: "market cap phrase", re: /\bmarket\s*cap\b/i },
      { name: "number + fiat", re: /\b\d[\d,._]*\s*(USD|EUR|NOK)\b/i },
    ];

    const priceWord = /\bprice\b/i;
    const allowedPriceContexts: RegExp[] = [
      /\bno\s+price\b/i,
      /\bno\s+price\s+data\b/i,
      /\bprice[-\s]?agnostic\b/i,
      /\bwithout\s+using\s+price\b/i,
      /\bwithout\s+using\s+any\s+price\b/i,
      /\bwithout\s+using\s+any\s+price\s+data\b/i,
    ];

    const hits: Array<{ path: string; name: string; snippet: string }> = [];

    for (const { path, text } of texts) {
      for (const p of hardForbidden) {
        if (p.re.test(text)) {
          const snippet = text.length > 220 ? text.slice(0, 220) + "…" : text;
          hits.push({ path, name: p.name, snippet });
        }
      }

      if (priceWord.test(text)) {
        const ok = allowedPriceContexts.some((re) => re.test(text));
        if (!ok) {
          const snippet = text.length > 220 ? text.slice(0, 220) + "…" : text;
          hits.push({ path, name: "price word outside allowed disclaimer contexts", snippet });
        }
      }
    }

    expect(
      hits,
      hits.length
        ? `Found currency/price-narrative patterns in generated narrative:\n` +
            hits.map((h) => `- ${h.path} [${h.name}] ${JSON.stringify(h.snippet)}`).join("\n")
        : undefined
    ).toEqual([]);
  });
});

describe("Notables route (API) — content guardrails (strong advice/prediction patterns, with negation allowances)", () => {
  test("generated narrative avoids strong advice/prediction phrases unless explicitly negated/disclaimed", async () => {
    const res = await callNotables({ chain: "ethereum", window: 365, limit: 25 });
    expect(res.status).toBe(200);
    const body = await res.json();

    const texts = collectAllNarrativeStrings(body);

    const strongPatterns: Array<{ name: string; re: RegExp }> = [
      { name: "buy now", re: /\bbuy\s+now\b/i },
      { name: "sell now", re: /\bsell\s+now\b/i },
      { name: "good time to buy", re: /\bgood\s+time\s+to\s+buy\b/i },
      { name: "good time to sell", re: /\bgood\s+time\s+to\s+sell\b/i },
      { name: "we recommend", re: /\bwe\s+recommend\b/i },
      { name: "our recommendation", re: /\bour\s+recommendation\b/i },
      { name: "price will", re: /\bprice\s+will\b/i },
      { name: "will go up/down", re: /\bwill\s+go\s+(up|down)\b/i },
      { name: "guaranteed", re: /\bguarantee(d)?\b/i },
      { name: "sure thing", re: /\bsure\s+thing\b/i },
    ];

    const negationAllow: RegExp[] = [
      /\bdoes\s+not\b/i,
      /\bdo\s+not\b/i,
      /\bnot\s+investment\s+advice\b/i,
      /\bno\s+advice\b/i,
      /\bno\s+recommendations?\b/i,
      /\bno\s+forecasts?\b/i,
      /\bdoes\s+not\s+tell\s+you\s+whether\s+or\s+not\s+to\s+(buy|sell)\b/i,
      /\bdoes\s+not\s+tell\s+you\s+whether\s+to\s+(buy|sell)\b/i,
    ];

    const hits: Array<{ path: string; name: string; snippet: string }> = [];

    for (const { path, text } of texts) {
      const t = String(text);

      for (const p of strongPatterns) {
        if (!p.re.test(t)) continue;

        const negOk = negationAllow.some((re) => re.test(t));
        if (!negOk) {
          const snippet = t.length > 240 ? t.slice(0, 240) + "…" : t;
          hits.push({ path, name: p.name, snippet });
        }
      }
    }

    expect(
      hits,
      hits.length
        ? `Found strong advice/prediction patterns without explicit negation/disclaimer:\n` +
            hits.map((h) => `- ${h.path} [${h.name}] ${JSON.stringify(h.snippet)}`).join("\n")
        : undefined
    ).toEqual([]);
  });
});

describe("Notables route (API) — performance guardrail (mem-cache reduces I/O)", () => {
  test("second call with same inputs reads fewer files (cache hit)", async () => {
    const spy = vi.spyOn(fsMod.promises, "readFile");

    try {
      const params = { chain: "arbitrum", window: 347, limit: 19 };

      spy.mockClear();
      const r1 = await callNotables(params);
      expect(r1.status).toBe(200);
      await r1.json();
      const reads1 = spy.mock.calls.length;

      spy.mockClear();
      const r2 = await callNotables(params);
      expect(r2.status).toBe(200);
      await r2.json();
      const reads2 = spy.mock.calls.length;

      expect(reads2).toBeLessThan(reads1);
      expect(reads2).toBeLessThanOrEqual(6);
      expect(reads1).toBeGreaterThan(10);
    } finally {
      spy.mockRestore();
    }
  });
});