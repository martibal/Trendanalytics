// src/app/api/v1/checkout/route.ts
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import Stripe from "stripe";

import type { ChainId } from "@/config/chains";
import { db } from "@/lib/db";

import { validateSameOriginRequest } from "@/lib/security/origin";
type CheckoutPlan = "basic" | "pro";
type StripeKeyMode = "missing" | "test" | "live" | "restricted_test" | "restricted_live" | "unknown";

const TERMS_VERSION = "2026-04-13";

const CHAIN_OPTIONS: Array<{ label: string; value: ChainId }> = [
  { label: "Bitcoin", value: "bitcoin" },
  { label: "Ethereum", value: "ethereum" },
  { label: "Arbitrum", value: "arbitrum" },
  { label: "Base", value: "base" },
];

function detectStripeKeyMode(value: string | null | undefined): StripeKeyMode {
  const key = value?.trim();

  if (!key) return "missing";
  if (key.startsWith("sk_test_")) return "test";
  if (key.startsWith("sk_live_")) return "live";
  if (key.startsWith("rk_test_")) return "restricted_test";
  if (key.startsWith("rk_live_")) return "restricted_live";

  return "unknown";
}

function getStripeClient(): { stripe: Stripe | null; keyMode: StripeKeyMode } {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const keyMode = detectStripeKeyMode(secretKey);

  if (!secretKey) {
    return {
      stripe: null,
      keyMode,
    };
  }

  return {
    stripe: new Stripe(secretKey),
    keyMode,
  };
}

function getAppUrl(request: Request): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (configured) {
    const withProtocol = configured.startsWith("http")
      ? configured
      : `https://${configured}`;
    return withProtocol.replace(/\/+$/, "");
  }

  const url = new URL(request.url);
  return url.origin.replace(/\/+$/, "");
}

function isProductionCheckoutRequest(request: Request): boolean {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();

  return (
    process.env.VERCEL_ENV === "production" ||
    host === "urdatlas.com" ||
    host === "www.urdatlas.com"
  );
}

function jsonError(
  status: number,
  code:
    | "checkout_not_configured"
    | "auth_required"
    | "invalid_plan"
    | "account_error"
    | "stripe_error",
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

function normalizePlan(value: string | null | undefined): CheckoutPlan | null {
  if (value === "basic" || value === "single-chain" || value === "single_chain") {
    return "basic";
  }

  if (value === "pro" || value === "research") {
    return "pro";
  }

  return null;
}

async function readPlan(request: Request): Promise<CheckoutPlan | null> {
  const url = new URL(request.url);
  const fromQuery = normalizePlan(url.searchParams.get("plan"));

  if (fromQuery) {
    return fromQuery;
  }

  if (request.method !== "POST") {
    return null;
  }

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { plan?: unknown };
      return normalizePlan(typeof body.plan === "string" ? body.plan : null);
    }

    if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const formData = await request.formData();
      const plan = formData.get("plan");
      return normalizePlan(typeof plan === "string" ? plan : null);
    }
  } catch {
    return null;
  }

  return null;
}

function priceIdForPlan(plan: CheckoutPlan): string | null {
  const value =
    plan === "basic"
      ? process.env.STRIPE_PRICE_BASIC
      : process.env.STRIPE_PRICE_PRO;

  return value?.trim() || null;
}

function checkoutMetadata(params: {
  plan: CheckoutPlan;
  accountId: string;
  authProviderUserId: string;
}) {
  return {
    checkout_plan: params.plan,
    account_id: params.accountId,
    auth_provider_user_id: params.authProviderUserId,
    entitled_chain: params.plan === "basic" ? "checkout_selection" : "",
    history_unlocked: "false",
  };
}

async function getSignedInUser() {
  const authState = await auth();

  if (!authState.userId) {
    return null;
  }

  const user = await currentUser().catch(() => null);
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    (typeof authState.sessionClaims?.email === "string"
      ? authState.sessionClaims.email
      : typeof authState.sessionClaims?.email_address === "string"
        ? authState.sessionClaims.email_address
        : null);

  return {
    userId: authState.userId,
    email,
  };
}

async function resolveAccount(params: {
  authProviderUserId: string;
  email: string | null;
}) {
  try {
    const account = await db.account.upsert({
      where: {
        authProviderUserId: params.authProviderUserId,
      },
      update: {
        email: params.email,
      },
      create: {
        authProviderUserId: params.authProviderUserId,
        email: params.email,
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
      },
      include: {
        subscriptions: {
          orderBy: {
            updatedAt: "desc",
          },
          take: 1,
        },
      },
    });

    return account;
  } catch (error) {
    console.error("[checkout] account upsert failed", {
      authProviderUserId: params.authProviderUserId,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : String(error),
    });

    throw error;
  }
}

async function handleCheckout(request: Request) {
  const { stripe, keyMode } = getStripeClient();

  if (!stripe) {
    return jsonError(
      503,
      "checkout_not_configured",
      "Checkout is not configured.",
      "Missing STRIPE_SECRET_KEY."
    );
  }

  const plan = await readPlan(request);

  if (!plan) {
    return jsonError(
      400,
      "invalid_plan",
      "Invalid checkout plan.",
      "Expected plan=basic or plan=pro."
    );
  }

  const priceId = priceIdForPlan(plan);

  console.info("[checkout] runtime Stripe configuration", {
    vercelEnv: process.env.VERCEL_ENV ?? null,
    requestHost: new URL(request.url).hostname,
    stripeSecretMode: keyMode,
    plan,
    priceId,
    hasBasicPrice: Boolean(process.env.STRIPE_PRICE_BASIC?.trim()),
    hasProPrice: Boolean(process.env.STRIPE_PRICE_PRO?.trim()),
  });

  if (isProductionCheckoutRequest(request) && keyMode !== "live") {
    return jsonError(
      503,
      "checkout_not_configured",
      "Production checkout is not configured correctly.",
      `Production checkout is using a ${keyMode} Stripe key at runtime. Expected STRIPE_SECRET_KEY to start with sk_live_.`
    );
  }

  if (!priceId) {
    return jsonError(
      503,
      "checkout_not_configured",
      "Checkout is not configured.",
      plan === "basic" ? "Missing STRIPE_PRICE_BASIC." : "Missing STRIPE_PRICE_PRO."
    );
  }

  let signedInUser: Awaited<ReturnType<typeof getSignedInUser>>;

  try {
    signedInUser = await getSignedInUser();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[checkout] auth lookup failed", { message });

    return jsonError(
      401,
      "auth_required",
      "Sign in is required before checkout.",
      message
    );
  }

  if (!signedInUser) {
    const appUrl = getAppUrl(request);
    const returnUrl = `${appUrl}/api/v1/checkout?plan=${plan}`;
    const signInUrl = new URL("/sign-in", appUrl);
    signInUrl.searchParams.set("redirect_url", returnUrl);

    return NextResponse.redirect(signInUrl);
  }

  let account: Awaited<ReturnType<typeof resolveAccount>>;

  try {
    account = await resolveAccount({
      authProviderUserId: signedInUser.userId,
      email: signedInUser.email,
    });
  } catch (error) {
    return jsonError(
      500,
      "account_error",
      "Checkout account preparation failed.",
      error instanceof Error ? error.message : String(error)
    );
  }

  const appUrl = getAppUrl(request);
  const metadata = checkoutMetadata({
    plan,
    accountId: account.id,
    authProviderUserId: signedInUser.userId,
  });

  const existingStripeCustomerId = account.subscriptions[0]?.stripeCustomerId ?? null;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    client_reference_id: account.id,
    metadata,
    subscription_data: {
      metadata,
    },
    success_url: `${appUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/#pricing`,
  };

  if (existingStripeCustomerId) {
    sessionParams.customer = existingStripeCustomerId;
  } else if (signedInUser.email) {
    sessionParams.customer_email = signedInUser.email;
  }

  if (plan === "basic") {
    sessionParams.custom_fields = [
      {
        key: "entitled_chain",
        label: {
          type: "custom",
          custom: "Select chain",
        },
        type: "dropdown",
        dropdown: {
          options: CHAIN_OPTIONS.map((chain) => ({
            label: chain.label,
            value: chain.value,
          })),
        },
      },
    ];
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      return jsonError(
        500,
        "stripe_error",
        "Stripe Checkout did not return a redirect URL."
      );
    }

    return NextResponse.redirect(session.url, { status: 303 });
  } catch (error) {
    console.error("[checkout] Stripe session creation failed", {
      plan,
      priceId,
      stripeSecretMode: keyMode,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : String(error),
    });

    return jsonError(
      500,
      "stripe_error",
      "Stripe Checkout session creation failed.",
      error instanceof Error ? error.message : String(error)
    );
  }
}


function checkoutNavigationError(detail: string) {
  return NextResponse.json(
    {
      code: "checkout_navigation_not_allowed",
      message: "Checkout must be started from Urd Atlas.",
      detail,
    },
    {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function validateCheckoutNavigationRequest(request: Request) {
  const secFetchSite = request.headers.get("sec-fetch-site")?.toLowerCase() ?? null;

  if (secFetchSite === "cross-site") {
    return {
      ok: false as const,
      response: checkoutNavigationError("Cross-site checkout navigation is not allowed."),
    };
  }

  return { ok: true as const };
}
export async function GET(request: Request) {
  const navigationGuard = validateCheckoutNavigationRequest(request);

  if (!navigationGuard.ok) {
    return navigationGuard.response;
  }

  return handleCheckout(request);
}

export async function POST(request: Request) {
    const originGuard = validateSameOriginRequest(request);

  if (!originGuard.ok) {
    return originGuard.response;
  }
return handleCheckout(request);
}


