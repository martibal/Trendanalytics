import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs"; // IMPORTANT: needs Node fs access

function safeJoin(root: string, parts: string[]) {
  // Prevent path traversal
  const joined = path.join(root, ...parts);
  const normalizedRoot = path.resolve(root) + path.sep;
  const normalizedJoined = path.resolve(joined);
  if (!normalizedJoined.startsWith(normalizedRoot)) {
    throw new Error("Path traversal blocked");
  }
  return normalizedJoined;
}

export async function GET(
  _req: Request,
  ctx: { params: { path: string[] } }
) {
  try {
    // Default to project root sibling: D:\css\main\data\published\v1
    // web-v1 is D:\css\main\web-v1 => ../../data/published/v1
    const defaultRoot = path.resolve(process.cwd(), "..", "data", "published", "v1");
    const dataRoot = process.env.CSS_PUBLISHED_ROOT
      ? path.resolve(process.env.CSS_PUBLISHED_ROOT)
      : defaultRoot;

    const parts = ctx.params.path || [];
    const filePath = safeJoin(dataRoot, parts);

    const buf = await fs.readFile(filePath);

    // Most files are JSON; keep simple/robust
    const headers: Record<string, string> = {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    };

    return new NextResponse(buf, { status: 200, headers });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Not found", detail: err?.message ?? String(err) },
      { status: 404 }
    );
  }
}
