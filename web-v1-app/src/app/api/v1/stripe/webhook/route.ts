// src/app/api/v1/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import { SubscriptionStatus, SubscriptionTier } from "@prisma/client";
import Stripe from "stripe";

import type { ChainId } from "@/config/chains";
import { db } from "@/lib/db";

type CheckoutPlan = "basic" | "pro";
type StripeKeyMode = "missing" | "test" | "live" | "restricted_test" | "restricted_live" | "unknown";

type WebhookJsonCode =
  | "ok"
  | "ignored"
  | "not_configured"
  | "bad_signature"
  | "webhook_error";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

const SUPPORTED_CHAINS: ChainId[] = ["bitcoin", "ethereum", "arbitrum", "base"];
const WEBHOOK_PROCESSING_STALE_AFTER_MS = 15 * 60 * 1000;

function jsonResponse(status: number, code: WebhookJsonCode, message: string) {
  return NextResponse.json(
    {
      code,
      message,
    },
    {
      status,
      headers: NO_STORE_HEADERS,
    }
  );
}

function detectStripeKeyMode(value: string | null | undefined): StripeKeyMode {
  const key = value?.trim();

  if (!key) return "missing";
  if (key.startsWith("sk_test_")) return "test";
  if (key.startsWith("sk_live_")) return "live";
  if (key.startsWith("rk_test_")) return "restricted_test";
  if (key.startsWith("rk_live_")) return "restricted_live";

  return "unknown";
}

function isProductionWebhookRequest(request: Request): boolean {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();

  return (
    process.env.VERCEL_ENV === "production" ||
    host === "urdatlas.com" ||
    host === "www.urdatlas.com"
  );
}
function getStripeSecretKey(): string | null {
  const keyName = ["STRIPE", "SECRET", "KEY"].join("_");
  return process.env[keyName]?.trim() || null;
}

function getWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;
}

function getStripeClient(): { stripe: Stripe | null; keyMode: StripeKeyMode } {
  const secretKey = getStripeSecretKey();
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

function normalizeChain(value: unknown): ChainId | null {
  if (typeof value !== "string") {
    return null;
  }

  return SUPPORTED_CHAINS.includes(value as ChainId) ? (value as ChainId) : null;
}

function parseBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "1";
}

function normalizePlan(value: unknown): CheckoutPlan | null {
  if (value === "basic" || value === "single-chain" || value === "single_chain") {
    return "basic";
  }

  if (value === "pro" || value === "research") {
    return "pro";
  }

  return null;
}

function normalizeStripeSubscriptionStatus(
  value: Stripe.Subscription.Status | string | null | undefined
) {
  if (value === "active" || value === "trialing" || value === "past_due") {
    return SubscriptionStatus.active;
  }

  return SubscriptionStatus.inactive;
}

function tierFromPlan(plan: CheckoutPlan | null): SubscriptionTier {
  return plan === "basic" ? SubscriptionTier.basic : SubscriptionTier.pro;
}

function historyUnlockedFromPlan(plan: CheckoutPlan | null, metadataValue: unknown): boolean {
  if (parseBoolean(metadataValue)) {
    return true;
  }

  return plan === "pro";
}

function entitledChainFromSession(session: Stripe.Checkout.Session): ChainId | null {
  const metadataChain = normalizeChain(session.metadata?.entitled_chain);

  if (metadataChain) {
    return metadataChain;
  }

  const customFields = Array.isArray(session.custom_fields) ? session.custom_fields : [];

  for (const field of customFields) {
    if (field.key !== "entitled_chain") {
      continue;
    }

    const value = field.dropdown?.value;
    const chain = normalizeChain(value);

    if (chain) {
      return chain;
    }
  }

  return null;
}

function getStripeObjectId(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }

  return null;
}

function getSubscriptionIdFromSession(session: Stripe.Checkout.Session): string | null {
  return getStripeObjectId(session.subscription);
}

function getCustomerIdFromSession(session: Stripe.Checkout.Session): string | null {
  return getStripeObjectId(session.customer);
}

function getCustomerIdFromSubscription(subscription: Stripe.Subscription): string | null {
  return getStripeObjectId(subscription.customer);
}

function getSubscriptionMetadata(subscription: Stripe.Subscription) {
  return subscription.metadata ?? {};
}

function getSubscriptionCurrentPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const raw = (subscription as unknown as { current_period_end?: unknown }).current_period_end;

  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return null;
  }

  return new Date(raw * 1000);
}

async function retrieveSubscriptionForCheckout(
  stripe: Stripe,
  subscriptionId: string | null
): Promise<Stripe.Subscription | null> {
  if (!subscriptionId) {
    return null;
  }

  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.warn("[stripe-webhook] failed to retrieve subscription for checkout", {
      subscriptionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function syncCheckoutSessionCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<"ok" | "ignored"> {
  const stripeCustomerId = getCustomerIdFromSession(session);
  const stripeSubscriptionId = getSubscriptionIdFromSession(session);
  const accountId = session.client_reference_id ?? session.metadata?.account_id ?? null;
  const authProviderUserId = session.metadata?.auth_provider_user_id ?? null;
  const plan = normalizePlan(session.metadata?.checkout_plan);
  const tier = tierFromPlan(plan);
  const retrievedSubscription = await retrieveSubscriptionForCheckout(stripe, stripeSubscriptionId);
  const metadata = retrievedSubscription ? getSubscriptionMetadata(retrievedSubscription) : (session.metadata ?? {});
  const entitledChain =
    tier === SubscriptionTier.basic
      ? entitledChainFromSession(session) ?? normalizeChain(metadata.entitled_chain)
      : null;
  const historyUnlocked = historyUnlockedFromPlan(
    plan,
    metadata.history_unlocked ?? session.metadata?.history_unlocked
  );
  const status = normalizeStripeSubscriptionStatus(retrievedSubscription?.status ?? "active");
  const currentPeriodEnd = retrievedSubscription ? getSubscriptionCurrentPeriodEnd(retrievedSubscription) : null;

  if (!stripeCustomerId || !stripeSubscriptionId || !accountId) {
    console.warn("[stripe-webhook] checkout.session.completed missing required identifiers", {
      hasStripeCustomerId: Boolean(stripeCustomerId),
      hasStripeSubscriptionId: Boolean(stripeSubscriptionId),
      hasAccountId: Boolean(accountId),
    });
    return "ignored";
  }

  await db.$transaction(async (tx) => {
    if (authProviderUserId) {
      await tx.account.updateMany({
        where: {
          id: accountId,
          authProviderUserId,
        },
        data: {
          termsAcceptedAt: new Date(),
        },
      });
    }

    await tx.subscription.upsert({
      where: {
        stripeCustomerId,
      },
      update: {
        stripeSubscriptionId,
        tier,
        historyUnlocked,
        entitledChain,
        status,
        currentPeriodEnd,
      },
      create: {
        accountId,
        stripeCustomerId,
        stripeSubscriptionId,
        tier,
        historyUnlocked,
        entitledChain,
        status,
        currentPeriodEnd,
      },
    });
  });

  console.info("[stripe-webhook] checkout.session.completed synced", {
    stripeCustomerId,
    stripeSubscriptionId,
    tier,
    entitledChain,
    status,
  });

  return "ok";
}

function subscriptionPlan(subscription: Stripe.Subscription): CheckoutPlan | null {
  const metadata = getSubscriptionMetadata(subscription);
  const fromMetadata = normalizePlan(metadata.checkout_plan);

  if (fromMetadata) {
    return fromMetadata;
  }

  const priceIds = subscription.items.data
    .map((item) => item.price.id)
    .filter((id): id is string => typeof id === "string");

  const basicPrice = process.env.STRIPE_PRICE_BASIC?.trim();
  const proPrice = process.env.STRIPE_PRICE_PRO?.trim();

  if (basicPrice && priceIds.includes(basicPrice)) {
    return "basic";
  }

  if (proPrice && priceIds.includes(proPrice)) {
    return "pro";
  }

  return null;
}

async function syncSubscriptionEvent(
  subscription: Stripe.Subscription,
  forcedStatus?: SubscriptionStatus
): Promise<"ok" | "ignored"> {
  const stripeSubscriptionId = subscription.id;
  const stripeCustomerId = getCustomerIdFromSubscription(subscription);
  const metadata = getSubscriptionMetadata(subscription);
  const accountId = typeof metadata.account_id === "string" ? metadata.account_id : null;
  const plan = subscriptionPlan(subscription);
  const tier = tierFromPlan(plan);
  const entitledChain =
    tier === SubscriptionTier.basic ? normalizeChain(metadata.entitled_chain) : null;
  const historyUnlocked = historyUnlockedFromPlan(plan, metadata.history_unlocked);
  const status = forcedStatus ?? normalizeStripeSubscriptionStatus(subscription.status);
  const currentPeriodEnd = getSubscriptionCurrentPeriodEnd(subscription);

  if (!stripeCustomerId || !stripeSubscriptionId) {
    console.warn("[stripe-webhook] subscription event missing required Stripe identifiers", {
      hasStripeCustomerId: Boolean(stripeCustomerId),
      hasStripeSubscriptionId: Boolean(stripeSubscriptionId),
    });
    return "ignored";
  }

  let synced = false;

  await db.$transaction(async (tx) => {
    const existing = await tx.subscription.findFirst({
      where: {
        OR: [
          {
            stripeSubscriptionId,
          },
          {
            stripeCustomerId,
          },
        ],
      },
      select: {
        id: true,
        accountId: true,
      },
    });

    const resolvedAccountId = existing?.accountId ?? accountId;

    if (!resolvedAccountId) {
      console.warn("[stripe-webhook] subscription event has no account binding", {
        stripeCustomerId,
        stripeSubscriptionId,
      });
      return;
    }

    await tx.subscription.upsert({
      where: {
        stripeCustomerId,
      },
      update: {
        stripeSubscriptionId,
        tier,
        historyUnlocked,
        entitledChain,
        status,
        currentPeriodEnd,
      },
      create: {
        accountId: resolvedAccountId,
        stripeCustomerId,
        stripeSubscriptionId,
        tier,
        historyUnlocked,
        entitledChain,
        status,
        currentPeriodEnd,
      },
    });

    synced = true;
  });

  if (!synced) {
    return "ignored";
  }

  console.info("[stripe-webhook] subscription event synced", {
    stripeCustomerId,
    stripeSubscriptionId,
    tier,
    entitledChain,
    status,
  });

  return "ok";
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}


type WebhookReplayDecision = "created" | "duplicate" | "reprocess";

function isWebhookProcessingStale(receivedAt: Date): boolean {
  return Date.now() - receivedAt.getTime() > WEBHOOK_PROCESSING_STALE_AFTER_MS;
}

async function resetStripeWebhookEventForReplay(stripeEventId: string): Promise<void> {
  await db.stripeWebhookEvent.updateMany({
    where: {
      stripeEventId,
    },
    data: {
      status: "processing",
      processedAt: null,
      errorCode: null,
    },
  });
}

async function recordStripeWebhookEventReceived(event: Stripe.Event): Promise<WebhookReplayDecision> {
  try {
    await db.stripeWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        status: "processing",
      },
    });

    return "created";
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const existing = await db.stripeWebhookEvent.findUnique({
      where: {
        stripeEventId: event.id,
      },
      select: {
        status: true,
        receivedAt: true,
      },
    });

    if (!existing) {
      console.info("[stripe-webhook] duplicate event race ignored", {
        stripeEventId: event.id,
        type: event.type,
      });

      return "duplicate";
    }

    if (existing.status === "failed") {
      console.warn("[stripe-webhook] failed event replay accepted", {
        stripeEventId: event.id,
        type: event.type,
      });

      await resetStripeWebhookEventForReplay(event.id);
      return "reprocess";
    }

    if (existing.status === "processing" && isWebhookProcessingStale(existing.receivedAt)) {
      console.warn("[stripe-webhook] stale processing event replay accepted", {
        stripeEventId: event.id,
        type: event.type,
      });

      await resetStripeWebhookEventForReplay(event.id);
      return "reprocess";
    }

    console.info("[stripe-webhook] duplicate event ignored", {
      stripeEventId: event.id,
      type: event.type,
      status: existing.status,
    });

    return "duplicate";
  }
}
async function markStripeWebhookEvent(
  event: Stripe.Event,
  status: "processed" | "ignored" | "failed",
  errorCode?: string
): Promise<void> {
  await db.stripeWebhookEvent.updateMany({
    where: {
      stripeEventId: event.id,
    },
    data: {
      status,
      processedAt: new Date(),
      errorCode: errorCode ?? null,
    },
  });
}
async function handleVerifiedEvent(stripe: Stripe, event: Stripe.Event): Promise<"ok" | "ignored"> {
  switch (event.type) {
    case "checkout.session.completed":
      return syncCheckoutSessionCompleted(stripe, event.data.object as Stripe.Checkout.Session);

    case "customer.subscription.updated":
      return syncSubscriptionEvent(event.data.object as Stripe.Subscription);

    case "customer.subscription.deleted":
      return syncSubscriptionEvent(event.data.object as Stripe.Subscription, SubscriptionStatus.inactive);

    default:
      return "ignored";
  }
}

export async function POST(request: Request) {
  const { stripe, keyMode } = getStripeClient();
  const webhookSecret = getWebhookSecret();

  if (!stripe || !webhookSecret) {
    console.error("[stripe-webhook] webhook not configured", {
      hasStripeClient: Boolean(stripe),
      hasWebhookSecret: Boolean(webhookSecret),
    });

    return jsonResponse(503, "not_configured", "Stripe webhook is not configured.");
  }

  if (isProductionWebhookRequest(request) && keyMode !== "live") {
    console.error("[stripe-webhook] production webhook rejected non-live Stripe key", {
      stripeSecretMode: keyMode,
      requestHost: new URL(request.url).hostname,
    });

    return jsonResponse(503, "not_configured", "Stripe webhook is not configured for production.");
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.warn("[stripe-webhook] missing stripe-signature header");
    return jsonResponse(400, "bad_signature", "Missing Stripe signature.");
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.warn("[stripe-webhook] invalid signature", {
      error: error instanceof Error ? error.message : String(error),
    });

    return jsonResponse(400, "bad_signature", "Invalid Stripe signature.");
  }

  try {
    const replayDecision = await recordStripeWebhookEventReceived(event);

    if (replayDecision === "duplicate") {
      return jsonResponse(200, "ignored", "Stripe webhook event already processed.");
    }
  } catch (error) {
    console.error("[stripe-webhook] replay persistence failed", {
      type: event.type,
      error: error instanceof Error ? error.message : String(error),
    });

    return jsonResponse(500, "webhook_error", "Stripe webhook replay persistence failed.");
  }

  try {
    const result = await handleVerifiedEvent(stripe, event);
    await markStripeWebhookEvent(
      event,
      result === "ok" ? "processed" : "ignored"
    );

    return jsonResponse(
      200,
      result,
      result === "ok" ? "Stripe webhook processed." : "Stripe webhook event ignored."
    );
  } catch (error) {
    console.error("[stripe-webhook] processing failed", {
      type: event.type,
      error: error instanceof Error ? error.message : String(error),
    });

    await markStripeWebhookEvent(event, "failed", "processing_failed").catch((markError) => {
      console.warn("[stripe-webhook] failed to mark webhook event as failed", {
        type: event.type,
        error: markError instanceof Error ? markError.message : String(markError),
      });
    });

    return jsonResponse(500, "webhook_error", "Stripe webhook processing failed.");
  }
}
