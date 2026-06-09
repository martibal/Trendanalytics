// src/app/api/v1/webhook/route.ts
import { NextResponse } from "next/server";

function deprecatedWebhookResponse() {
  return NextResponse.json(
    {
      code: "deprecated_webhook_endpoint",
      message: "Use /api/v1/stripe/webhook for Stripe webhook delivery.",
    },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST() {
  return deprecatedWebhookResponse();
}

export async function GET() {
  return deprecatedWebhookResponse();
}
