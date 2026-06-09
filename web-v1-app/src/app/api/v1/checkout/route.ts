// src/app/api/v1/checkout/route.ts
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import Stripe from "stripe";

import type { ChainId } from "@/config/chains";
import { db } from "@/lib/db";

import { validateSameOriginRequest } from "@/lib/security/origin";
import { enforcePreAuthRateLimit } from "@/lib/security/preAuthRateLimit";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
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

function isProductionCheckoutRequest(request: Request): boolean {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();

  return (
    process.env.VERCEL_ENV === "production" ||
    host === "urdatlas.com" ||
    host === "www.urdatlas.com"
  );
}

function getConfiguredAppUrl(): string | null {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (!configured) {
    return null;
  }

  const withProtocol = configured.startsWith("http")
    ? configured
    : `https://${configured}`;

  return withProtocol.replace(/\/+$/, "");
}

function getAppUrl(request: Request): string | null {
  const configured = getConfiguredAppUrl();

  if (configured) {
    return configured;
  }

  if (isProductionCheckoutRequest(request)) {
    return null;
  }

  const url = new URL(request.url);
  return url.origin.replace(/\/+$/, "");
}
function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

function logCheckoutInfo(message: string, data: Record<string, unknown>): void {
  if (isProductionRuntime()) {
    console.info(message, {
      plan: data.plan ?? null,
      requestHost: data.requestHost ?? null,
      stripeSecretMode: data.stripeSecretMode ?? null,
      hasBasicPrice: data.hasBasicPrice ?? null,
      hasProPrice: data.hasProPrice ?? null,
    });
    return;
  }

  console.info(message, data);
}

function logCheckoutError(message: string, data: Record<string, unknown>): void {
  if (isProductionRuntime()) {
    const error = data.error;

    console.error(message, {
      plan: data.plan ?? null,
      requestHost: data.requestHost ?? null,
      stripeSecretMode: data.stripeSecretMode ?? null,
      error:
        error && typeof error === "object" && "name" in error
          ? { name: (error as { name?: unknown }).name }
          : null,
    });
    return;
  }

  console.error(message, data);
}

function publicCheckoutErrorDetail(status: number, code: string, detail?: string): string | null {
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production") {
    return detail ?? null;
  }

  if (status === 400 || code === "invalid_plan") {
    return "invalid_plan";
  }

  if (status === 401 || code === "auth_required") {
    return "auth_required";
  }

  if (status === 503 || code === "checkout_not_configured") {
    return "checkout_not_configured";
  }

  if (status === 500 || code === "account_error" || code === "stripe_error") {
    return "server_error";
  }

  return "server_error";
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
      detail: publicCheckoutErrorDetail(status, code, detail),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
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
    logCheckoutError("[checkout] account upsert failed", {
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

  logCheckoutInfo("[checkout] runtime Stripe configuration", {
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
  const appUrl = getAppUrl(request);

  if (!appUrl) {
    return jsonError(
      503,
      "checkout_not_configured",
      "Production checkout redirect origin is not configured.",
      "checkout_redirect_origin_not_configured"
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
      const returnUrl = `${appUrl}/api/v1/checkout?plan=${plan}`;
    const signInUrl = new URL("/sign-in", appUrl);
    signInUrl.searchParams.set("redirect_url", returnUrl);

    const response = NextResponse.redirect(signInUrl);
    response.headers.set("Cache-Control", "no-store");
    return response;
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

    const response = NextResponse.redirect(session.url, { status: 303 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    logCheckoutError("[checkout] Stripe session creation failed", {
      plan,
      priceId,
      requestHost: new URL(request.url).hostname,
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


export async function GET() {
  return NextResponse.json(
    {
      code: "method_not_allowed",
      message: "Checkout must be started with POST.",
      detail: "method_not_allowed",
    },
    {
      status: 405,
      headers: {
        Allow: "POST",
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request: Request) {
  const originGuard = validateSameOriginRequest(request);

  if (!originGuard.ok) {
    return originGuard.response;
  }

  const preAuthRateLimit = await enforcePreAuthRateLimit(request, "checkout-api");

  if (!preAuthRateLimit.ok) {
    return preAuthRateLimit.response;
  }
  return handleCheckout(request);
}
