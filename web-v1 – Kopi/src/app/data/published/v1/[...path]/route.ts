// src/app/data/published/v1/[...path]/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs"; // needs Node fs access

function safeJoin(root: string, parts: string[]) {
  const joined = path.join(root, ...parts);
  const normalizedRoot = path.resolve(root) + path.sep;
  const normalizedJoined = path.resolve(joined);
  if (!normalizedJoined.startsWith(normalizedRoot)) {
    throw new Error("Path traversal blocked");
  }
  return normalizedJoined;
}

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    // web-v1 is D:\css\main\web-v1 => ..\data\published\v1
    const defaultRoot = path.resolve(process.cwd(), "..", "data", "published", "v1");
    const dataRoot = process.env.CSS_PUBLISHED_ROOT ? path.resolve(process.env.CSS_PUBLISHED_ROOT) : defaultRoot;

    const { path: parts } = await ctx.params;
    const safeParts = Array.isArray(parts) ? parts : [];
    const filePath = safeJoin(dataRoot, safeParts);

    const buf = await fs.readFile(filePath);

    // Convert Buffer -> Uint8Array so it satisfies BodyInit typings
    const body = new Uint8Array(buf);

    const headers: Record<string, string> = {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    };

    return new NextResponse(body, { status: 200, headers });
  } catch (err: any) {
    return NextResponse.json({ error: "Not found", detail: err?.message ?? String(err) }, { status: 404 });
  }
}