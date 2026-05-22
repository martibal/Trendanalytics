// src/app/api/v1/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { ApiKeyStatus, SubscriptionStatus, SubscriptionTier } from "@prisma/client";

import { db } from "@/lib/db";
import { enforcePreAuthRateLimit } from "@/lib/security/preAuthRateLimit";

type StripeSubscriptionWithOptionalCurrentPeriodEnd = Stripe.Subscription & {
  current_period_end?: number | null;
};

function getStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return null;
  }

  return new Stripe(secretKey);
}

function publicWebhookErrorDetail(
  status: number,
  code: "webhook_not_configured" | "invalid_signature" | "server_error",
  detail?: string
): string | null {
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production") {
    return detail ?? null;
  }

  if (status === 400 || code === "invalid_signature") {
    return "invalid_signature";
  }

  if (status === 503 || code === "webhook_not_configured") {
    return "webhook_not_configured";
  }

  return "server_error";
}
function jsonError(
  status: number,
  code: "webhook_not_configured" | "invalid_signature" | "server_error",
  message: string,
  detail?: string
) {
  return NextResponse.json(
    {
      code,
      message,
      detail: publicWebhookErrorDetail(status, code, detail),
    },
    { status }
  );
}

function normalizeTier(value: string | null | undefined): SubscriptionTier {
  return value === "pro" ? SubscriptionTier.pro : SubscriptionTier.basic;
}

function normalizeEntitledChain(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (
    trimmed === "bitcoin" ||
    trimmed === "ethereum" ||
    trimmed === "arbitrum" ||
    trimmed === "base"
  ) {
    return trimmed;
  }

  return null;
}

function getSelectedCheckoutChain(session: Stripe.Checkout.Session): string | null {
  const customField = session.custom_fields?.find(
    (field) => field.key === "entitled_chain"
  );

  const selected =
    customField && customField.type === "dropdown"
      ? customField.dropdown?.value
      : null;

  return normalizeEntitledChain(selected ?? session.metadata?.entitled_chain);
}

function normalizeHistoryUnlocked(value: string | null | undefined): boolean {
  return value === "true";
}

function toSubscriptionStatus(
  value: Stripe.Subscription.Status | null | undefined
): SubscriptionStatus {
  return value === "active" || value === "trialing"
    ? SubscriptionStatus.active
    : SubscriptionStatus.inactive;
}

function toPeriodEndDate(unixSeconds: number | null | undefined): Date | null {
  if (!unixSeconds || unixSeconds <= 0) {
    return null;
  }

  return new Date(unixSeconds * 1000);
}

function toApiKeyStatusForSubscriptionStatus(
  status: SubscriptionStatus
): ApiKeyStatus {
  return status === SubscriptionStatus.active
    ? ApiKeyStatus.active
    : ApiKeyStatus.suspended;
}

function getSubscriptionCurrentPeriodEnd(
  subscription: Stripe.Subscription
): Date | null {
  const topLevelPeriodEnd = (
    subscription as StripeSubscriptionWithOptionalCurrentPeriodEnd
  ).current_period_end;

  if (typeof topLevelPeriodEnd === "number" && topLevelPeriodEnd > 0) {
    return toPeriodEndDate(topLevelPeriodEnd);
  }

  const itemPeriodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number" && value > 0);

  if (itemPeriodEnds.length === 0) {
    return null;
  }

  return toPeriodEndDate(Math.max(...itemPeriodEnds));
}

async function upsertAccountAndSubscriptionFromCheckoutSession(
  session: Stripe.Checkout.Session
) {
  const metadata = session.metadata ?? {};
  const accountId = metadata.account_id?.trim() || session.client_reference_id?.trim() || "";
  const authProviderUserId = metadata.auth_provider_user_id?.trim() || "";
  const email =
    typeof session.customer_details?.email === "string" &&
    session.customer_details.email.trim().length > 0
      ? session.customer_details.email.trim()
      : typeof session.customer_email === "string" &&
          session.customer_email.trim().length > 0
        ? session.customer_email.trim()
        : null;

  if (!accountId || !authProviderUserId) {
    throw new Error(
      "checkout.session.completed missing account_id or auth_provider_user_id in metadata."
    );
  }

  const tier = normalizeTier(metadata.checkout_plan);
  const entitledChain = tier === SubscriptionTier.pro ? null : getSelectedCheckoutChain(session);
  const historyUnlocked = normalizeHistoryUnlocked(metadata.history_unlocked);

  await db.account.upsert({
    where: { id: accountId },
    update: {
      authProviderUserId,
      email,
    },
    create: {
      id: accountId,
      authProviderUserId,
      email,
    },
  });

  if (session.mode === "subscription" && typeof session.customer === "string") {
    await db.subscription.upsert({
      where: { stripeCustomerId: session.customer },
      update: {
        stripeSubscriptionId:
          typeof session.subscription === "string" ? session.subscription : null,
        tier,
        historyUnlocked,
        entitledChain,
        status: SubscriptionStatus.active,
        currentPeriodEnd: null,
      },
      create: {
        accountId,
        stripeCustomerId: session.customer,
        stripeSubscriptionId:
          typeof session.subscription === "string" ? session.subscription : null,
        tier,
        historyUnlocked,
        entitledChain,
        status: SubscriptionStatus.active,
        currentPeriodEnd: null,
      },
    });

    await db.apiKey.updateMany({
      where: { accountId },
      data: { status: ApiKeyStatus.active },
    });
  }
}

async function syncSubscriptionFromStripe(
  subscription: Stripe.Subscription,
  eventType: Stripe.Event.Type
) {
  const metadata = subscription.metadata ?? {};
  const accountId = metadata.account_id?.trim() || "";
  const authProviderUserId = metadata.auth_provider_user_id?.trim() || "";
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : "";
  const subscriptionId = subscription.id;
  const tier = normalizeTier(metadata.checkout_plan);
  const entitledChain = normalizeEntitledChain(metadata.entitled_chain);
  const historyUnlocked = normalizeHistoryUnlocked(metadata.history_unlocked);

  if (!customerId) {
    throw new Error("Stripe subscription event missing string customer id.");
  }

  const nextStatus =
    eventType === "customer.subscription.deleted"
      ? SubscriptionStatus.inactive
      : toSubscriptionStatus(subscription.status);

  let resolvedAccountId = accountId;

  if (resolvedAccountId) {
    await db.account.upsert({
      where: { id: resolvedAccountId },
      update: authProviderUserId
        ? {
            authProviderUserId,
          }
        : {},
      create: {
        id: resolvedAccountId,
        authProviderUserId: authProviderUserId || `stripe:${customerId}`,
        email: null,
      },
    });
  } else {
    const existing = await db.subscription.findUnique({
      where: { stripeCustomerId: customerId },
      select: { accountId: true },
    });

    if (existing?.accountId) {
      resolvedAccountId = existing.accountId;
    }
  }

  if (!resolvedAccountId) {
    throw new Error(`Unable to resolve account for Stripe customer ${customerId}.`);
  }

  const currentPeriodEnd = getSubscriptionCurrentPeriodEnd(subscription);

  const subscriptionUpdateData = {
    stripeSubscriptionId: subscriptionId,
    tier,
    historyUnlocked,
    status: nextStatus,
    currentPeriodEnd,
    ...(tier === SubscriptionTier.pro
      ? { entitledChain: null }
      : entitledChain
        ? { entitledChain }
        : {}),
  };

  await db.subscription.upsert({
    where: { stripeCustomerId: customerId },
    update: subscriptionUpdateData,
    create: {
      accountId: resolvedAccountId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      tier,
      historyUnlocked,
      entitledChain: tier === SubscriptionTier.pro ? null : entitledChain,
      status: nextStatus,
      currentPeriodEnd,
    },
  });

  await db.apiKey.updateMany({
    where: { accountId: resolvedAccountId },
    data: {
      status: toApiKeyStatusForSubscriptionStatus(nextStatus),
    },
  });
}

export async function POST(request: Request) {
  const preAuthRateLimit = await enforcePreAuthRateLimit(request, "stripe-webhook");

  if (!preAuthRateLimit.ok) {
    return preAuthRateLimit.response;
  }

  const stripe = getStripeClient();

  if (!stripe) {
    return jsonError(
      503,
      "webhook_not_configured",
      "Stripe webhook is not configured.",
      "Missing STRIPE_SECRET_KEY."
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return jsonError(
      503,
      "webhook_not_configured",
      "Stripe webhook is not configured.",
      "Missing STRIPE_WEBHOOK_SECRET."
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return jsonError(
      400,
      "invalid_signature",
      "Missing Stripe signature header.",
      "Missing stripe-signature."
    );
  }

  let event: Stripe.Event;

  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown Stripe signature validation error.";

    return jsonError(
      400,
      "invalid_signature",
      "Stripe webhook signature verification failed.",
      message
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        await upsertAccountAndSubscriptionFromCheckoutSession(session);

        console.log("[stripe webhook] checkout.session.completed", {
          id: session.id,
          mode: session.mode,
          customer: session.customer,
          client_reference_id: session.client_reference_id,
          metadata: session.metadata,
        });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await syncSubscriptionFromStripe(subscription, event.type);

        console.log(`[stripe webhook] ${event.type}`, {
          id: subscription.id,
          customer: subscription.customer,
          status: subscription.status,
          metadata: subscription.metadata,
        });
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        console.log(`[stripe webhook] ${event.type}`, {
          id: invoice.id,
          customer: invoice.customer,
          status: invoice.status,
        });
        break;
      }

      default: {
        console.log("[stripe webhook] unhandled event", {
          type: event.type,
          id: event.id,
        });
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown webhook processing error.";

    return jsonError(
      500,
      "server_error",
      "Stripe webhook processing failed.",
      message
    );
  }
}
