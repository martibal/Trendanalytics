// src/app/api/v1/keys/route.ts
import crypto from "node:crypto";

import { auth } from "@clerk/nextjs/server";
import { ApiKeyStatus, SubscriptionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";

import { validateSameOriginRequest } from "@/lib/security/origin";
import { enforcePreAuthRateLimit } from "@/lib/security/preAuthRateLimit";
type CreateKeyRequestBody = {
  label?: string | null;
};

type RevokeKeyRequestBody = {
  keyId?: string;
};

function publicKeyErrorDetail(status: number, code: string, detail?: string): string | null {
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production") {
    return detail ?? null;
  }

  if (status === 401 || code === "unauthenticated") {
    return "unauthenticated";
  }

  if (status === 400 || code === "invalid_request") {
    return "invalid_request";
  }

  if (status === 403 || code === "inactive_subscription") {
    return "forbidden";
  }

  if (status === 404 || code === "account_not_found" || code === "not_found") {
    return "not_found";
  }

  if (status === 409 || code === "key_limit_reached") {
    return "key_limit_reached";
  }

  return "server_error";
}
function jsonError(
  status: number,
  code:
    | "unauthenticated"
    | "account_not_found"
    | "inactive_subscription"
    | "key_limit_reached"
    | "invalid_request"
    | "not_found"
    | "server_error",
  message: string,
  detail?: string
) {
  return NextResponse.json(
    {
      code,
      message,
      detail: publicKeyErrorDetail(status, code, detail),
    },
    { status }
  );
}

function normalizeLabel(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, 64);
}

function buildApiKeySecret() {
  return `ta_live_${crypto.randomBytes(24).toString("hex")}`;
}

function buildKeyPrefix(secret: string) {
  return secret.slice(0, Math.min(12, secret.length));
}

function buildKeyLast4(secret: string) {
  return secret.slice(Math.max(0, secret.length - 4));
}

function hashApiKey(secret: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(secret, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

async function getAuthenticatedAccount() {
  const { userId } = await auth();

  if (!userId) {
    return { userId: null, account: null };
  }

  const account = await db.account.findUnique({
    where: { authProviderUserId: userId },
    include: {
      subscriptions: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
      apiKeys: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return { userId, account };
}

export async function POST(request: Request) {
    const originGuard = validateSameOriginRequest(request);

  if (!originGuard.ok) {
    return originGuard.response;
  }

  const preAuthRateLimit = await enforcePreAuthRateLimit(request, "keys-api");

  if (!preAuthRateLimit.ok) {
    return preAuthRateLimit.response;
  }

  try {
    const { userId, account } = await getAuthenticatedAccount();

    if (!userId) {
      return jsonError(
        401,
        "unauthenticated",
        "You must be signed in to create an API key.",
        "Missing authenticated user session."
      );
    }

    if (!account) {
      return jsonError(
        404,
        "account_not_found",
        "No subscriber account record is linked to this user yet.",
        "Missing Account row for authenticated Clerk user."
      );
    }

    const latestSubscription = account.subscriptions[0] ?? null;

    if (!latestSubscription || latestSubscription.status !== SubscriptionStatus.active) {
      return jsonError(
        403,
        "inactive_subscription",
        "Active subscription required before creating API keys.",
        "Subscription status is not active."
      );
    }

    const nonRevokedKeys = account.apiKeys.filter((key) => key.status !== ApiKeyStatus.revoked);

    if (nonRevokedKeys.length >= 2) {
      return jsonError(
        409,
        "key_limit_reached",
        "Maximum non-revoked API keys reached for this account.",
        "Revoke an existing key before creating a new one."
      );
    }

    let body: CreateKeyRequestBody = {};

    try {
      body = (await request.json()) as CreateKeyRequestBody;
    } catch {
      body = {};
    }

    const label = normalizeLabel(body.label);
    const secret = buildApiKeySecret();
    const keyHash = hashApiKey(secret);
    const keyPrefix = buildKeyPrefix(secret);
    const keyLast4 = buildKeyLast4(secret);

    const created = await db.apiKey.create({
      data: {
        accountId: account.id,
        keyHash,
        keyPrefix,
        keyLast4,
        label,
        status:
          latestSubscription.status === SubscriptionStatus.active
            ? ApiKeyStatus.active
            : ApiKeyStatus.suspended,
      },
      select: {
        id: true,
        label: true,
        keyPrefix: true,
        keyLast4: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        secret,
        key: {
          id: created.id,
          label: created.label,
          prefix: created.keyPrefix,
          last4: created.keyLast4,
          status: created.status,
          createdAt: created.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown API key creation error.";

    return jsonError(
      500,
      "server_error",
      "API key creation failed.",
      message
    );
  }
}

export async function DELETE(request: Request) {
    const originGuard = validateSameOriginRequest(request);

  if (!originGuard.ok) {
    return originGuard.response;
  }

  const preAuthRateLimit = await enforcePreAuthRateLimit(request, "keys-api");

  if (!preAuthRateLimit.ok) {
    return preAuthRateLimit.response;
  }

  try {
    const { userId, account } = await getAuthenticatedAccount();

    if (!userId) {
      return jsonError(
        401,
        "unauthenticated",
        "You must be signed in to revoke an API key.",
        "Missing authenticated user session."
      );
    }

    if (!account) {
      return jsonError(
        404,
        "account_not_found",
        "No subscriber account record is linked to this user yet.",
        "Missing Account row for authenticated Clerk user."
      );
    }

    let body: RevokeKeyRequestBody;

    try {
      body = (await request.json()) as RevokeKeyRequestBody;
    } catch {
      return jsonError(
        400,
        "invalid_request",
        "Request body must be valid JSON.",
        "Expected JSON body with keyId."
      );
    }

    const keyId = typeof body.keyId === "string" ? body.keyId.trim() : "";

    if (!keyId) {
      return jsonError(
        400,
        "invalid_request",
        "Missing keyId.",
        "Provide keyId in request body."
      );
    }

    const existing = await db.apiKey.findFirst({
      where: {
        id: keyId,
        accountId: account.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existing) {
      return jsonError(
        404,
        "not_found",
        "API key not found for this account.",
        "No matching ApiKey row."
      );
    }

    if (existing.status !== ApiKeyStatus.revoked) {
      await db.apiKey.update({
        where: { id: existing.id },
        data: { status: ApiKeyStatus.revoked },
      });
    }

    return NextResponse.json(
      {
        revoked: true,
        keyId: existing.id,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown API key revoke error.";

    return jsonError(
      500,
      "server_error",
      "API key revoke failed.",
      message
    );
  }
}
