import { NextResponse } from "next/server";

import { buildFeatureSchema } from "@/lib/analystKit";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(buildFeatureSchema(), {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
