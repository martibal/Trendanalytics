import { NextResponse } from "next/server";

import {
  buildRegimeCalendarRows,
  isAnalystKitChain,
  regimeCalendarToCsv,
} from "@/lib/analystKit";

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

  const rows = await buildRegimeCalendarRows(chain);
  const csv = regimeCalendarToCsv(rows);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="urd-atlas-${chain}-regime-calendar.csv"`,
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
