// src/app/api/v1/checkout/portal/route.ts
import { NextResponse } from "next/server";

function jsonError(
  status: number,
  code: "portal_disabled",
  message: string,
  detail?: string
) {
  return NextResponse.json(
    {
      code,
      message,
      detail: detail ?? null,
    },
    { status }
  );
}

export async function POST() {
  return jsonError(
    503,
    "portal_disabled",
    "Billing portal is temporarily unavailable.",
    "Payments are disabled until business registration and billing setup are complete."
  );
}
