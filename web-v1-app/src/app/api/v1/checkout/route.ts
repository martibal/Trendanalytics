// src/app/api/v1/checkout/route.ts
import { NextResponse } from "next/server";

function jsonError(
  status: number,
  code: "checkout_disabled",
  message: string,
  detail?: string
) {
  return NextResponse.json({ code, message, detail: detail ?? null }, { status });
}

export async function POST() {
  return jsonError(
    503,
    "checkout_disabled",
    "Checkout is temporarily unavailable.",
    "Payments are disabled until business registration and live billing setup are complete."
  );
}
