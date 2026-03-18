// src/app/api/v1/checkout/portal/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";

import { getCurrentAccountView } from "@/lib/auth/account";

const HAS_CLERK_KEYS =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  Boolean(process.env.CLERK_SECRET_KEY);

function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return null;
  }

  return new Stripe(secretKey);
}

function getReturnUrl(origin: string): string {
  return `${origin}/dashboard?portal=return`;
}

function jsonError(
  status: number,
  code:
    | "unauthenticated"
    | "forbidden"
    | "portal_not_configured"
    | "server_error",
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

export async function POST(request: Request) {
  const stripe = getStripeClient();

  if (!stripe) {
    return jsonError(
      503,
      "portal_not_configured",
      "Stripe Customer Portal is not configured.",
      "Missing STRIPE_SECRET_KEY."
    );
  }

  if (!HAS_CLERK_KEYS) {
    return jsonError(
      503,
      "portal_not_configured",
      "Authentication is not configured.",
      "Clerk environment variables are missing."
    );
  }

  const { userId } = await auth();

  if (!userId) {
    return jsonError(
      401,
      "unauthenticated",
      "You must be signed in to open the billing portal.",
      "missing_authenticated_session"
    );
  }

  const accountView = await getCurrentAccountView();

  if (!accountView.isAuthenticated || !accountView.account) {
    return jsonError(
      403,
      "forbidden",
      "No subscriber account is linked to this signed-in user.",
      "missing_account_mapping"
    );
  }

  if (!accountView.account.stripeCustomerId) {
    return jsonError(
      403,
      "forbidden",
      "This account does not have a Stripe customer linked yet.",
      "missing_stripe_customer_id"
    );
  }

  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: accountView.account.stripeCustomerId,
      return_url: getReturnUrl(origin),
    });

    if (!session.url) {
      return jsonError(
        500,
        "server_error",
        "Stripe portal session was created without a redirect URL.",
        "missing_portal_url"
      );
    }

    return NextResponse.json(
      {
        code: "ok",
        portalUrl: session.url,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Stripe portal session creation error.";

    return jsonError(
      500,
      "server_error",
      "Failed to create Stripe Customer Portal session.",
      message
    );
  }
}