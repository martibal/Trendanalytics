// src/app/api/export/day/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

type Chain = "bitcoin" | "ethereum" | "arbitrum" | "base";
type Genre = "gold" | "meta" | "derived";

type ApiError = { error: { code: string; message: string; details?: unknown } };

function jsonError(code: string, message: string, status: number, details?: unknown) {
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

function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

async function readJsonWithRawSafe(filePath: string): Promise<{ json: unknown; raw: string } | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const json = JSON.parse(raw) as unknown;
    return { json, raw };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const chain = parseChain(url.searchParams.get("chain"));
  const genre = parseGenre(url.searchParams.get("genre"));
  const date = url.searchParams.get("date");

  if (!chain) return jsonError("BAD_REQUEST", "Missing or invalid chain.", 400);
  if (!genre) return jsonError("BAD_REQUEST", "Missing or invalid genre.", 400, { allowed: ["gold", "meta", "derived"] });
  if (!date || !isISODate(date)) return jsonError("BAD_REQUEST", "Missing or invalid date. Use YYYY-MM-DD.", 400);

  const filePath = path.join(process.cwd(), "public", "data", "published", "v1", genre, chain, `${date}.json`);
  const payload = await readJsonWithRawSafe(filePath);
  if (!payload) return jsonError("NOT_FOUND", "Day file not found.", 404, { chain, genre, date });

  return NextResponse.json(
    { chain, genre, date, data: payload.json, raw: payload.raw },
    { status: 200, headers: { "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=86400" } }
  );
}