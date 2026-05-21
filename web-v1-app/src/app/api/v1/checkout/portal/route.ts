// src/app/api/v1/checkout/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { getCurrentAccountView } from "@/lib/auth/account";

import { validateSameOriginRequest } from "@/lib/security/origin";
function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    return null;
  }

  return new Stripe(secretKey);
}

type PortalErrorCode =
  | "portal_not_configured"
  | "unauthenticated"
  | "subscription_not_connected"
  | "server_error";

function publicPortalErrorDetail(status: number, code: string, detail?: string): string | null {
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production") {
    return detail ?? null;
  }

  if (status === 401 || code === "unauthenticated") {
    return "unauthenticated";
  }

  if (status === 409 || code === "subscription_not_connected") {
    return "subscription_not_connected";
  }

  if (status === 503 || code === "portal_not_configured") {
    return "portal_not_configured";
  }

  return "server_error";
}
function jsonError(
  status: number,
  code: PortalErrorCode,
  message: string,
  detail?: string
) {
  return NextResponse.json(
    {
      code,
      message,
      detail: publicPortalErrorDetail(status, code, detail),
    },
    { status }
  );
}

function dashboardReturnUrl(request: NextRequest) {
  return new URL("/dashboard?billing=portal-return", request.nextUrl.origin).toString();
}

export async function POST(request: NextRequest) {
    const originGuard = validateSameOriginRequest(request);

  if (!originGuard.ok) {
    return originGuard.response;
  }
const stripe = getStripeClient();

  if (!stripe) {
    return jsonError(
      503,
      "portal_not_configured",
      "Stripe customer portal is not configured.",
      "Missing STRIPE_SECRET_KEY."
    );
  }

  let accountView: Awaited<ReturnType<typeof getCurrentAccountView>>;

  try {
    accountView = await getCurrentAccountView();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown account lookup error.";
    return jsonError(
      500,
      "server_error",
      "Could not load the current account before opening the billing portal.",
      message
    );
  }

  if (!accountView.isAuthenticated) {
    return jsonError(
      401,
      "unauthenticated",
      "Sign in before opening billing management.",
      "No authenticated subscriber session was found."
    );
  }

  const stripeCustomerId = accountView.account?.stripeCustomerId?.trim() ?? "";

  if (!stripeCustomerId) {
    return jsonError(
      409,
      "subscription_not_connected",
      "Billing is not connected for this account yet.",
      "The account does not have a Stripe customer id. Complete checkout before opening the customer portal."
    );
  }

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: dashboardReturnUrl(request),
    });

    if (!portalSession.url) {
      return jsonError(
        502,
        "server_error",
        "Stripe did not return a billing portal URL.",
        "billingPortal.sessions.create returned no URL."
      );
    }

    return NextResponse.redirect(portalSession.url, { status: 303 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Stripe portal error.";

    return jsonError(
      500,
      "server_error",
      "Could not create a Stripe customer portal session.",
      message
    );
  }
}
