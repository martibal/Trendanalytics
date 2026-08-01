import { NextResponse } from "next/server";

import { buildStarterNotebook } from "@/lib/analystKit";

export const dynamic = "force-dynamic";

export async function GET() {
  return new NextResponse(JSON.stringify(buildStarterNotebook(), null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/x-ipynb+json; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"urd-atlas-analyst-kit-starter.ipynb\"",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
