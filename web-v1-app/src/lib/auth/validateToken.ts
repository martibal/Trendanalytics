// src/lib/auth/validateToken.ts
import {
  buildEntitlementSnapshot,
  type EntitlementInput,
  type EntitlementSnapshot,
} from "@/lib/auth/entitlements";
import {
  findApiKeyRecord,
  findPersistedApiKeyRecord,
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

const PERSISTED_API_KEY_PATTERN = /^ta_live_[a-f0-9]{48}$/;
const MAX_NON_PRODUCTION_API_KEY_LENGTH = 512;


function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

function isPersistedApiKeyShape(token: string): boolean {
  return PERSISTED_API_KEY_PATTERN.test(token);
}

function isAllowedApiKeyShape(token: string): boolean {
  if (isProductionRuntime()) {
    return isPersistedApiKeyShape(token);
  }

  return token.length <= MAX_NON_PRODUCTION_API_KEY_LENGTH;
}

function invalidApiKeyShapeResult(): ValidatedToken {
  return {
    ok: false,
    code: "unauthenticated",
    message: "Invalid API key.",
    detail: "invalid_key_shape",
  };
}
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

function canUseDevelopmentApiKeys(): boolean {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    return false;
  }

  return Boolean(process.env.DEV_API_KEYS_JSON?.trim());
}

async function resolveApiKeyRecord(token: string): Promise<ApiKeyRecord | null> {
  const persistedRecord = await findPersistedApiKeyRecord(token);

  if (persistedRecord) {
    return persistedRecord;
  }

  if (!canUseDevelopmentApiKeys()) {
    return null;
  }

  const devRecords = loadDevelopmentApiKeys();
  return findApiKeyRecord(token, devRecords);
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

  if (!isAllowedApiKeyShape(normalized)) {
    return invalidApiKeyShapeResult();
  }

  const record = await resolveApiKeyRecord(normalized);

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

function publicAuthErrorDetail(result: Extract<ValidatedToken, { ok: false }>): string {
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production") {
    return result.detail;
  }

  return result.code === "unauthenticated" ? "authentication_failed" : "request_forbidden";
}
export function buildAuthErrorResponseBody(result: Extract<ValidatedToken, { ok: false }>) {
  return {
    code: result.code,
    message: result.message,
    detail: publicAuthErrorDetail(result),
  };
}

export function getAccountApiKeyDisplayRows(accountId: string | null) {
  return getApiKeyDisplayRows(accountId);
}



