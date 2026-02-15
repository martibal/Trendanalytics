import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";

type Chain = "bitcoin" | "ethereum" | "arbitrum" | "base";
type Genre = "gold" | "meta" | "derived";

type ApiError = {
  error: {
    code: string;
    message: string;
    details?: any;
  };
};

function jsonError(code: string, message: string, status: number, details?: any) {
  const body: ApiError = { error: { code, message, details } };
  return NextResponse.json(body, { status });
}

function parseChain(s: string | null): Chain | null {
  if (!s) return null;
  const v = s.toLowerCase();
  if (v === "bitcoin" || v === "ethereum" || v === "arbitrum" || v === "base") return v;
  return null;
}

function parseGenre(s: string | null): Genre | null {
  if (!s) return null;
  const v = s.toLowerCase();
  if (v === "gold" || v === "meta" || v === "derived") return v;
  return null;
}

function isValidISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function normalizeAvailableDays(v: any): string[] {
  const raw: string[] = Array.isArray(v) ? v : [];
  const kept = raw.filter((d) => typeof d === "string" && isValidISODate(d));
  return Array.from(new Set(kept)).sort();
}

function stableHashStringList(xs: string[]): string {
  const h = crypto.createHash("sha256");
  for (const s of xs) {
    h.update(s);
    h.update("|");
  }
  return h.digest("hex");
}

async function readJsonSafe(filePath: string): Promise<any | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseRevisionId(v: any): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
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
  // With token gate: never allow shared caching.
  if (authEnabled()) {
    const h: Record<string, string> = {
      "Cache-Control": "private, no-store",
      Vary: "Authorization",
    };
    if (etag) h.ETag = etag;
    return h;
  }

  // Without gate: allow CDN caching (etag changes by manifest content signature).
  const h: Record<string, string> = {
    "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
  };
  if (etag) h.ETag = etag;
  return h;
}

export async function GET(req: NextRequest) {
  // Optional subscriber gate
  const authResp = requireExportAuth(req);
  if (authResp) return authResp;

  const url = new URL(req.url);

  // Query params:
  // - chain (required): bitcoin|ethereum|arbitrum|base
  // - genre (required): gold|meta|derived
  const chain = parseChain(url.searchParams.get("chain"));
  const genre = parseGenre(url.searchParams.get("genre"));

  if (!chain) return jsonError("INVALID_CHAIN", "Invalid chain. Use bitcoin|ethereum|arbitrum|base.", 400);
  if (!genre) return jsonError("INVALID_GENRE", "Invalid genre. Use gold|meta|derived.", 400);

  const root = path.join(process.cwd(), "public", "data", "published", "v1");

  // Dataset metadata (optional; do not hard-fail if missing)
  const datasetJson = await readJsonSafe(path.join(root, "dataset.json"));
  const dataset_id: string | null = typeof datasetJson?.dataset_id === "string" ? datasetJson.dataset_id : null;
  const revision_id: number | null = parseRevisionId(datasetJson?.revision_id);

  const filePath = path.join(root, genre, chain, "manifest.json");
  const data = await readJsonSafe(filePath);

  if (data === null) {
    return jsonError("NOT_FOUND", "Not found or invalid JSON.", 404, {
      dataset_id,
      revision_id,
      chain,
      genre,
      expected_path: filePath,
    });
  }

  // ETag identity must change when manifest content changes (not only dataset/revision).
  const asof: string | null = typeof (data as any)?.asof === "string" ? (data as any).asof : null;
  const available_days = normalizeAvailableDays((data as any)?.available_days);
  const available_days_hash = stableHashStringList(available_days).slice(0, 16);

  const cacheKey = [
    dataset_id ?? "no_dataset",
    revision_id ?? "no_revision",
    "export_manifest",
    genre,
    chain,
    asof && isValidISODate(asof) ? `asof=${asof}` : "asof=none",
    `available_days_hash=${available_days_hash}`,
    `available_days_count=${available_days.length}`,
  ].join("|");
  const etag = `W/"${crypto.createHash("sha256").update(cacheKey).digest("hex")}"`;

  if (!authEnabled()) {
    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: headersFor(req, etag) });
    }
  }

  return NextResponse.json({ dataset_id, revision_id, chain, genre, data }, { status: 200, headers: headersFor(req, etag) });
}