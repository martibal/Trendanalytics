import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";

export async function GET() {
  // Optional: if someone hits /data/published/v1
  return NextResponse.json(
    { ok: true, hint: "Try /data/published/v1/dataset.json" },
    { status: 200 }
  );
}
