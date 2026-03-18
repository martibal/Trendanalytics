// src/lib/auth/apiKeys.ts
import crypto from "crypto";
import {
  buildEntitlementSnapshot,
  createBasicEntitlement,
  createProEntitlement,
  createPublicEntitlement,
  type EntitlementInput,
  type SubscriptionStatus,
  type SubscriptionTier,
} from "@/lib/auth/entitlements";
import type { ChainId } from "@/config/chains";

export type ApiKeyState = "ACTIVE" | "SUSPENDED" | "REVOKED";

export type ApiKeyRecord = {
  keyId: string;
  accountId: string;
  userId: string | null;
  label: string | null;
  state: ApiKeyState;
  createdAt: string | null;
  lastUsedAt: string | null;
  prefix: string;
  last4: string;
  tokenHash: string;
  entitlement: EntitlementInput;
};

type DevApiKeyJsonRow = {
  token: string;
  keyId?: string;
  accountId?: string;
  userId?: string | null;
  label?: string | null;
  state?: ApiKeyState | string;
  createdAt?: string | null;
  lastUsedAt?: string | null;
  tier?: SubscriptionTier | string;
  status?: SubscriptionStatus | string;
  entitledChain?: ChainId | null;
  historyUnlocked?: boolean;
};

function normalizeState(value: string | undefined): ApiKeyState {
  if (value === "SUSPENDED") return "SUSPENDED";
  if (value === "REVOKED") return "REVOKED";
  return "ACTIVE";
}

function normalizeTier(value: string | undefined): SubscriptionTier {
  if (value === "basic") return "basic";
  if (value === "pro") return "pro";
  return "public";
}

function normalizeStatus(value: string | undefined): SubscriptionStatus {
  if (value === "inactive") return "inactive";
  return "active";
}

function normalizeEntitlement(row: DevApiKeyJsonRow): EntitlementInput {
  const tier = normalizeTier(row.tier);
  const status = normalizeStatus(row.status);
  const historyUnlocked = Boolean(row.historyUnlocked);

  if (tier === "basic") {
    return createBasicEntitlement(row.entitledChain ?? null, {
      status,
      historyUnlocked,
    });
  }

  if (tier === "pro") {
    return createProEntitlement({
      status,
      historyUnlocked,
    });
  }

  return createPublicEntitlement();
}

export function hashApiKey(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export function constantTimeHexEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");

  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function buildApiKeyPrefix(token: string): string {
  return token.slice(0, Math.min(8, token.length));
}

export function buildApiKeyLast4(token: string): string {
  return token.slice(Math.max(0, token.length - 4));
}

export function parseDevApiKeysJson(raw: string): ApiKeyRecord[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter((row): row is DevApiKeyJsonRow => Boolean(row && typeof row === "object"))
    .map((row, index) => {
      const token = typeof row.token === "string" ? row.token.trim() : "";

      if (!token) {
        return null;
      }

      const entitlement = normalizeEntitlement(row);

      return {
        keyId: row.keyId ?? `dev_key_${index + 1}`,
        accountId: row.accountId ?? `dev_account_${index + 1}`,
        userId: row.userId ?? null,
        label: row.label ?? null,
        state: normalizeState(typeof row.state === "string" ? row.state : undefined),
        createdAt: row.createdAt ?? null,
        lastUsedAt: row.lastUsedAt ?? null,
        prefix: buildApiKeyPrefix(token),
        last4: buildApiKeyLast4(token),
        tokenHash: hashApiKey(token),
        entitlement,
      } satisfies ApiKeyRecord;
    })
    .filter((row): row is ApiKeyRecord => row !== null);
}

export function loadDevelopmentApiKeys(): ApiKeyRecord[] {
  const raw = process.env.DEV_API_KEYS_JSON;

  if (!raw) {
    return [];
  }

  return parseDevApiKeysJson(raw);
}

export function findApiKeyRecord(token: string, records: ApiKeyRecord[]): ApiKeyRecord | null {
  const tokenHash = hashApiKey(token);

  for (const record of records) {
    if (constantTimeHexEqual(record.tokenHash, tokenHash)) {
      return record;
    }
  }

  return null;
}

export function getApiKeysForAccount(accountId: string | null, records?: ApiKeyRecord[]): ApiKeyRecord[] {
  if (!accountId) {
    return [];
  }

  const source = records ?? loadDevelopmentApiKeys();

  return source.filter((record) => record.accountId === accountId);
}

export function getApiKeysForUser(userId: string | null, records?: ApiKeyRecord[]): ApiKeyRecord[] {
  if (!userId) {
    return [];
  }

  const source = records ?? loadDevelopmentApiKeys();

  return source.filter((record) => record.userId === userId);
}

export function getApiKeyDisplayRows(accountId: string | null) {
  return getApiKeysForAccount(accountId).map((record) => {
    const snapshot = buildEntitlementSnapshot(record.entitlement);

    return {
      id: record.keyId,
      label: record.label,
      prefix: record.prefix,
      last4: record.last4,
      status:
        record.state === "ACTIVE"
          ? "active"
          : record.state === "SUSPENDED"
            ? "suspended"
            : "revoked",
      createdAt: record.createdAt,
      lastUsedAt: record.lastUsedAt,
      tier: snapshot.tier,
      entitledChain: snapshot.entitledChain,
      maxWindowDays: snapshot.maxWindowDays,
    };
  });
}