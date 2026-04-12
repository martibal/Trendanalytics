// src/app/api/v1/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";
import { getCurrentAccountView } from "@/lib/auth/account";
import type { ChainId } from "@/config/chains";

type CheckoutPlan = "basic" | "pro" | "history_addon";

type CheckoutRequestBody = {
  plan?: string;
  chain?: string; // Required for basic — the chain the subscriber is entitled to
};

const VALID_CHAINS: ChainId[] = ["bitcoin", "ethereum", "arbitrum", "base"];

const HAS_CLERK_KEYS =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  Boolean(process.env.CLERK_SECRET_KEY);

function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey);
}

function isCheckoutPlan(value: string): value is CheckoutPlan {
  return value === "basic" || value === "pro" || value === "history_addon";
}

function isValidChain(value: string): value is ChainId {
  return VALID_CHAINS.includes(value as ChainId);
}

function getPriceIdForPlan(plan: CheckoutPlan): string | null {
  if (plan === "basic") return process.env.STRIPE_PRICE_BASIC ?? null;
  if (plan === "pro") return process.env.STRIPE_PRICE_PRO ?? null;
  return process.env.STRIPE_PRICE_HISTORY_ADDON ?? null;
}

function getModeForPlan(plan: CheckoutPlan): Stripe.Checkout.SessionCreateParams.Mode {
  return plan === "history_addon" ? "payment" : "subscription";
}

function jsonError(
  status: number,
  code: "unauthenticated" | "forbidden" | "invalid_request" | "checkout_not_configured" | "server_error",
  message: string,
  detail?: string
) {
  return NextResponse.json({ code, message, detail: detail ?? null }, { status });
}

async function parseBody(request: Request): Promise<CheckoutRequestBody> {
  try {
    const body = (await request.json()) as CheckoutRequestBody | null;
    return body ?? {};
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const stripe = getStripeClient();

  if (!stripe) {
    return jsonError(503, "checkout_not_configured", "Stripe checkout is not configured.", "Missing STRIPE_SECRET_KEY.");
  }

  if (!HAS_CLERK_KEYS) {
    return jsonError(503, "checkout_not_configured", "Authentication is not configured.", "Clerk environment variables are missing.");
  }

  const { userId } = await auth();

  if (!userId) {
    return jsonError(401, "unauthenticated", "You must be signed in to start checkout.", "missing_authenticated_session");
  }

  const accountView = await getCurrentAccountView();

  if (!accountView.isAuthenticated || !accountView.account) {
    return jsonError(403, "forbidden", "No subscriber account is linked to this signed-in user.", "missing_account_mapping");
  }

  const body = await parseBody(request);
  const plan = typeof body.plan === "string" ? body.plan.trim() : "";

  if (!isCheckoutPlan(plan)) {
    return jsonError(400, "invalid_request", "Invalid checkout plan.", "Allowed values: basic, pro, history_addon.");
  }

  // For basic plans, the chain must be provided in the request body
  let entitledChain: string = accountView.account.entitledChain ?? "";

  if (plan === "basic") {
    const chainFromBody = typeof body.chain === "string" ? body.chain.trim() : "";
    if (!chainFromBody || !isValidChain(chainFromBody)) {
      return jsonError(400, "invalid_request", "A valid chain is required for the Basic plan.", "Allowed values: bitcoin, ethereum, arbitrum, base.");
    }
    entitledChain = chainFromBody;
  }

  const priceId = getPriceIdForPlan(plan);

  if (!priceId) {
    return jsonError(503, "checkout_not_configured", "Stripe price is not configured for the requested plan.", `Missing env for plan '${plan}'.`);
  }

  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const mode = getModeForPlan(plan);

  const metadata: Record<string, string> = {
    account_id: accountView.account.accountId,
    auth_provider_user_id: userId,
    checkout_plan: plan,
    current_tier: accountView.account.tier,
    current_status: accountView.account.status,
    entitled_chain: entitledChain,
    history_unlocked: String(accountView.account.historyUnlocked),
  };

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/#plans?checkout=cancelled`,
    client_reference_id: accountView.account.accountId,
    metadata,
    allow_promotion_codes: true,
  };

  if (accountView.account.email) {
    sessionParams.customer_email = accountView.account.email;
  }

  if (mode === "subscription") {
    sessionParams.subscription_data = { metadata };
  } else {
    sessionParams.payment_intent_data = { metadata };
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      return jsonError(500, "server_error", "Stripe session was created without a redirect URL.", "missing_checkout_url");
    }

    return NextResponse.json({ code: "ok", checkoutUrl: session.url, sessionId: session.id, plan, mode }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Stripe session creation error.";
    return jsonError(500, "server_error", "Failed to create Stripe checkout session.", message);
  }
}
