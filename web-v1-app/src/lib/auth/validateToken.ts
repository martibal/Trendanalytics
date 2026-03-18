// src/lib/auth/validateToken.ts
import {
  buildEntitlementSnapshot,
  type EntitlementInput,
  type EntitlementSnapshot,
} from "@/lib/auth/entitlements";
import {
  findApiKeyRecord,
  getApiKeyDisplayRows,
  loadDevelopmentApiKeys,
  type ApiKeyRecord,
  type ApiKeyState,
} from "@/lib/auth/apiKeys";

export type AuthErrorCode = "unauthenticated" | "forbidden";

export type ValidatedToken =
  | {
      ok: true;
      accountId: string;
      userId: string | null;
      keyId: string;
      keyLabel: string | null;
      keyState: ApiKeyState;
      keyPrefix: string;
      keyLast4: string;
      entitlement: EntitlementInput;
      snapshot: EntitlementSnapshot;
      record: ApiKeyRecord;
    }
  | {
      ok: false;
      code: AuthErrorCode;
      message: string;
      detail: string;
    };

const API_KEY_HEADER = "x-api-key";

export function getApiKeyFromHeaders(headers: Headers): string | null {
  const direct = headers.get(API_KEY_HEADER)?.trim();

  if (direct) {
    return direct;
  }

  return null;
}

export function getApiKeyFromRequest(request: Request): string | null {
  return getApiKeyFromHeaders(request.headers);
}

export async function validateApiKeyToken(token: string | null): Promise<ValidatedToken> {
  if (!token) {
    return {
      ok: false,
      code: "unauthenticated",
      message: "Missing API key.",
      detail: "Provide X-API-Key header.",
    };
  }

  const normalized = token.trim();

  if (!normalized) {
    return {
      ok: false,
      code: "unauthenticated",
      message: "Missing API key.",
      detail: "Provide X-API-Key header.",
    };
  }

  const records = loadDevelopmentApiKeys();
  const record = findApiKeyRecord(normalized, records);

  if (!record) {
    return {
      ok: false,
      code: "unauthenticated",
      message: "Invalid API key.",
      detail: "Token hash did not match any configured key.",
    };
  }

  if (record.state === "REVOKED") {
    return {
      ok: false,
      code: "unauthenticated",
      message: "API key is revoked.",
      detail: "revoked_key",
    };
  }

  if (record.state === "SUSPENDED") {
    return {
      ok: false,
      code: "forbidden",
      message: "API key is suspended.",
      detail: "suspended_key",
    };
  }

  const snapshot = buildEntitlementSnapshot(record.entitlement);

  if (record.entitlement.status !== "active") {
    return {
      ok: false,
      code: "forbidden",
      message: "Subscription is inactive.",
      detail: "inactive_subscription",
    };
  }

  return {
    ok: true,
    accountId: record.accountId,
    userId: record.userId,
    keyId: record.keyId,
    keyLabel: record.label,
    keyState: record.state,
    keyPrefix: record.prefix,
    keyLast4: record.last4,
    entitlement: record.entitlement,
    snapshot,
    record,
  };
}

export async function validateRequestApiKey(request: Request): Promise<ValidatedToken> {
  const token = getApiKeyFromRequest(request);
  return validateApiKeyToken(token);
}

export function buildAuthErrorResponseBody(result: Extract<ValidatedToken, { ok: false }>) {
  return {
    code: result.code,
    message: result.message,
    detail: result.detail,
  };
}

export function getAccountApiKeyDisplayRows(accountId: string | null) {
  return getApiKeyDisplayRows(accountId);
}