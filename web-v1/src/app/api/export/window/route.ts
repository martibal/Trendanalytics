import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";

type Chain = "bitcoin" | "ethereum" | "arbitrum" | "base";
type Genre = "gold" | "meta" | "derived";
type Window = "7" | "30" | "90" | "180" | "365";

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

function parseWindow(s: string | null): Window | null {
  if (!s) return null;
  const v = s.toLowerCase();
  if (v === "7" || v === "30" || v === "90" || v === "180" || v === "365") return v;
  return null;
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

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const chain = parseChain(url.searchParams.get("chain"));
  const genre = parseGenre(url.searchParams.get("genre"));
  const window = parseWindow(url.searchParams.get("window"));

  if (!chain) return jsonError("INVALID_CHAIN", "Invalid chain. Use bitcoin|ethereum|arbitrum|base.", 400);
  if (!genre) return jsonError("INVALID_GENRE", "Invalid genre. Use gold|meta|derived.", 400);
  if (!window) return jsonError("INVALID_WINDOW", "Invalid window. Use 7|30|90|180|365.", 400);

  const root = path.join(process.cwd(), "public", "data", "published", "v1");

  const datasetJson = await readJsonSafe(path.join(root, "dataset.json"));
  const dataset_id: string | null = typeof datasetJson?.dataset_id === "string" ? datasetJson.dataset_id : null;
  const revision_id: number | null = parseRevisionId(datasetJson?.revision_id);

  const cacheKey = `${dataset_id ?? "no_dataset"}|${revision_id ?? "no_revision"}|export_window|${genre}|${chain}|${window}`;
  const etag = `W/"${crypto.createHash("sha256").update(cacheKey).digest("hex")}"`;
  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  }

  const filePath = path.join(root, genre, chain, `last${window}d.json`);
  const data = await readJsonSafe(filePath);

  if (data === null) {
    return jsonError("NOT_FOUND", "Not found or invalid JSON.", 404, {
      dataset_id,
      revision_id,
      chain,
      genre,
      window,
      expected_path: filePath,
    });
  }

  return NextResponse.json(
    {
      dataset_id,
      revision_id,
      chain,
      genre,
      window,
      data,
    },
    {
      status: 200,
      headers: {
        ETag: etag,
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}