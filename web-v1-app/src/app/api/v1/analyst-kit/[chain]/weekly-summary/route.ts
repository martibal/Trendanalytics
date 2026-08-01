import { NextResponse } from "next/server";

import { buildWeeklySummaryText, isAnalystKitChain } from "@/lib/analystKit";

type RouteContext = {
  params: Promise<{ chain: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: RouteContext) {
  const { chain } = await context.params;

  if (!isAnalystKitChain(chain)) {
    return NextResponse.json(
      {
        code: "not_found",
        message: "Unknown chain. Use bitcoin, ethereum, arbitrum or base.",
      },
      { status: 404 },
    );
  }

  const summary = await buildWeeklySummaryText(chain);

  return new NextResponse(summary, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `inline; filename="urd-atlas-${chain}-weekly-summary.txt"`,
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
