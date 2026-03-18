// src/app/api/health/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";

type Chain = "bitcoin" | "ethereum" | "arbitrum" | "base";
type Genre = "gold" | "meta" | "derived";

const CHAINS: Chain[] = ["bitcoin", "ethereum", "arbitrum", "base"];
const GENRES: Genre[] = ["gold", "meta", "derived"];

type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

function jsonError(code: string, message: string, status: number, details?: unknown) {
  const body: ApiError = { error: { code, message, details } };
  return NextResponse.json(body, { status });
}

function authEnabled(): boolean {
  return typeof process.env.EXPORT_TOKEN === "string" && process.env.EXPORT_TOKEN.trim().length > 0;
}

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function requireExportAuth(req: NextRequest): NextResponse | null {
  if (!authEnabled()) return null;

  const expected = (process.env.EXPORT_TOKEN ?? "").trim();
  const tokenFromHeader = extractBearerToken(req.headers.get("authorization"));
  const tokenFromQuery = new URL(req.url).searchParams.get("token")?.trim() || null;

  const token = tokenFromHeader ?? tokenFromQuery;
  if (!token || token !== expected) {
    return jsonError("UNAUTHORIZED", "Missing or invalid export token.", 401, {
      hint: "Provide Authorization: Bearer <token> (or ?token=... for testing).",
    });
  }
  return null;
}

function headersFor(req: NextRequest, etag?: string) {
  if (authEnabled()) {
    const h: Record<string, string> = {
      "Cache-Control": "private, no-store",
      Vary: "Authorization",
    };
    if (etag) h.ETag = etag;
    return h;
  }

  const h: Record<string, string> = {
    "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  };
  if (etag) h.ETag = etag;
  return h;
}

function isValidISODate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

async function readJsonSafe(filePath: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/**
 * Health must be tolerant: meta/latest.json is not a simple {date, rows} structure.
 * We extract a "best effort" date from multiple possible locations.
 */
function extractBestDate(obj: unknown): string | null {
  const r = asRecord(obj);
  if (!r) return null;

  // Common case (gold/latest.json, derived/latest.json, and meta/latest.json variants)
  if (isValidISODate(r["date"])) return r["date"];

  // Sometimes manifests or other objects use asof/updated_through
  if (isValidISODate(r["asof"])) return r["asof"];
  if (isValidISODate(r["updated_through"])) return r["updated_through"];

  // Meta payload: nested shapes
  const regime = asRecord(r["regime"]);
  if (regime && isValidISODate(regime["asof_date"])) return regime["asof_date"];

  const scorecard = asRecord(r["scorecard"]);
  if (scorecard && isValidISODate(scorecard["asof_date"])) return scorecard["asof_date"];

  const confidence = asRecord(r["confidence"]);
  if (confidence && isValidISODate(confidence["date"])) return confidence["date"];

  const goldStatus = asRecord(r["gold_status"]);
  if (goldStatus && isValidISODate(goldStatus["features_last_date"])) return goldStatus["features_last_date"];

  return null;
}

function parseRevisionId(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function stableHashStringList(xs: string[]): string {
  const h = crypto.createHash("sha256");
  for (const s of xs) {
    h.update(s);
    h.update("|");
  }
  return h.digest("hex");
}

export async function GET(req: NextRequest) {
  // Optional subscriber gate (same pattern as export routes)
  const authResp = requireExportAuth(req);
  if (authResp) return authResp;

  const root = path.join(process.cwd(), "public", "data", "published", "v1");

  const problems: Array<{ level: "error" | "warn"; code: string; detail: string }> = [];
  const info: Record<string, unknown> = {};

  // 1) dataset.json (global contract)
  const datasetPath = path.join(root, "dataset.json");
  const datasetRaw = await readJsonSafe(datasetPath);
  const dataset = asRecord(datasetRaw);

  const dataset_id: string | null =
    dataset && typeof dataset["dataset_id"] === "string" ? (dataset["dataset_id"] as string) : null;
  const revision_id: number | null = dataset ? parseRevisionId(dataset["revision_id"]) : null;

  info["dataset"] = {
    dataset_id,
    revision_id,
    computed_at_utc: dataset && typeof dataset["computed_at_utc"] === "string" ? (dataset["computed_at_utc"] as string) : null,
    methodology_version:
      dataset && typeof dataset["methodology_version"] === "string" ? (dataset["methodology_version"] as string) : null,
  };

  if (!datasetRaw) {
    problems.push({ level: "error", code: "DATASET_MISSING", detail: `Missing or unreadable dataset.json at ${datasetPath}` });
  } else {
    if (!dataset_id) problems.push({ level: "error", code: "DATASET_ID_MISSING", detail: "dataset.json missing dataset_id" });
    if (revision_id === null) {
      problems.push({
        level: "error",
        code: "REVISION_ID_INVALID",
        detail: "dataset.json revision_id missing/invalid (expected number)",
      });
    }
  }

  // 2) per genre/chain: manifest + latest
  const checks: Array<{
    genre: Genre;
    chain: Chain;
    manifest: { ok: boolean; asof: string | null; path: string };
    latest: { ok: boolean; date: string | null; path: string };
    aligned: boolean | null;
  }> = [];

  // Do I/O in parallel for speed
  const jobs: Array<Promise<void>> = [];
  for (const genre of GENRES) {
    for (const chain of CHAINS) {
      jobs.push(
        (async () => {
          const manifestPath = path.join(root, genre, chain, "manifest.json");
          const latestPath = path.join(root, genre, chain, "latest.json");

          const [manifestRaw, latestRaw] = await Promise.all([readJsonSafe(manifestPath), readJsonSafe(latestPath)]);
          const manifest = asRecord(manifestRaw);

          const manifestAsof: string | null =
            manifest && isValidISODate(manifest["asof"]) ? (manifest["asof"] as string) : null;

          const latestDate: string | null = extractBestDate(latestRaw);

          const okManifest = !!manifestRaw && !!manifestAsof;
          const okLatest = !!latestRaw && !!latestDate;

          checks.push({
            genre,
            chain,
            manifest: {
              ok: okManifest,
              asof: manifestAsof,
              path: manifestPath,
            },
            latest: {
              ok: okLatest,
              date: latestDate,
              path: latestPath,
            },
            aligned: okManifest && okLatest ? manifestAsof === latestDate : null,
          });

          if (!manifestRaw) {
            problems.push({ level: "error", code: "MANIFEST_MISSING", detail: `Missing ${genre}/${chain}/manifest.json` });
          } else if (!manifestAsof) {
            problems.push({
              level: "error",
              code: "MANIFEST_ASOF_INVALID",
              detail: `Invalid/missing asof in ${genre}/${chain}/manifest.json`,
            });
          }

          if (!latestRaw) {
            problems.push({ level: "warn", code: "LATEST_MISSING", detail: `Missing ${genre}/${chain}/latest.json` });
          } else if (!latestDate) {
            problems.push({
              level: "warn",
              code: "LATEST_DATE_MISSING",
              detail: `Could not extract date from ${genre}/${chain}/latest.json`,
            });
          }

          if (okManifest && okLatest && manifestAsof !== latestDate) {
            problems.push({
              level: "warn",
              code: "LATEST_DATE_MISMATCH",
              detail: `${genre}/${chain}: manifest.asof=${manifestAsof} but latest.date=${latestDate}`,
            });
          }
        })()
      );
    }
  }

  await Promise.all(jobs);

  // Stable ordering (so ETag stays deterministic)
  checks.sort((a, b) => {
    const k1 = `${a.genre}|${a.chain}`;
    const k2 = `${b.genre}|${b.chain}`;
    return k1.localeCompare(k2);
  });

  problems.sort((a, b) => {
    const k1 = `${a.level}|${a.code}|${a.detail}`;
    const k2 = `${b.level}|${b.code}|${b.detail}`;
    return k1.localeCompare(k2);
  });

  info["checks"] = checks;

  const hasError = problems.some((p) => p.level === "error");
  const status = hasError ? 500 : 200;

  // ETag should change when health-relevant content changes (not only dataset/revision)
  const checksSignature = checks.map((c) => {
    return [
      c.genre,
      c.chain,
      `m=${c.manifest.ok ? "1" : "0"}`,
      `asof=${c.manifest.asof ?? "none"}`,
      `l=${c.latest.ok ? "1" : "0"}`,
      `date=${c.latest.date ?? "none"}`,
      `aligned=${c.aligned === null ? "null" : c.aligned ? "1" : "0"}`,
    ].join(",");
  });

  const problemsSignature = problems.map((p) => `${p.level}|${p.code}|${p.detail}`);

  const signatureHash = stableHashStringList([...checksSignature, ...problemsSignature]).slice(0, 16);
  const etag = `W/"${crypto
    .createHash("sha256")
    .update(
      [
        dataset_id ?? "no_dataset",
        revision_id ?? "no_revision",
        "health",
        `sig=${signatureHash}`,
        `checks=${checks.length}`,
        `problems=${problems.length}`,
      ].join("|")
    )
    .digest("hex")}"`;

  // Only honor If-None-Match for unauthenticated responses (shared cache).
  if (!authEnabled()) {
    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: headersFor(req, etag) });
    }
  }

  return NextResponse.json(
    {
      ok: !hasError,
      problems,
      info,
    },
    { status, headers: headersFor(req, etag) }
  );
}