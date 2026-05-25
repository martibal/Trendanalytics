// src/lib/auth/apiKeys.ts
import crypto from "crypto";

import { ApiKeyStatus, SubscriptionStatus, SubscriptionTier } from "@prisma/client";

import {
  buildEntitlementSnapshot,
  createBasicEntitlement,
  createProEntitlement,
  createPublicEntitlement,
  type EntitlementInput,
  type SubscriptionStatus as EntitlementSubscriptionStatus,
  type SubscriptionTier as EntitlementSubscriptionTier,
} from "@/lib/auth/entitlements";
import type { ChainId } from "@/config/chains";
import { db } from "@/lib/db";

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
  tier?: EntitlementSubscriptionTier | string;
  status?: EntitlementSubscriptionStatus | string;
  entitledChain?: ChainId | null;
  historyUnlocked?: boolean;
};

type PersistedApiKeyCandidate = {
  id: string;
  accountId: string;
  keyHash: string;
  keyPrefix: string;
  keyLast4: string | null;
  label: string | null;
  status: ApiKeyStatus;
  createdAt: Date;
  lastUsedAt: Date | null;
  account: {
    authProviderUserId: string;
    subscriptions: Array<{
      tier: SubscriptionTier;
      status: SubscriptionStatus;
      entitledChain: string | null;
      historyUnlocked: boolean;
      updatedAt: Date;
    }>;
  };
};

function normalizeState(value: string | undefined): ApiKeyState {
  if (value === "SUSPENDED") return "SUSPENDED";
  if (value === "REVOKED") return "REVOKED";
  return "ACTIVE";
}

function normalizeTier(value: string | undefined): EntitlementSubscriptionTier {
  if (value === "basic") return "basic";
  if (value === "pro") return "pro";
  return "public";
}

function normalizeStatus(value: string | undefined): EntitlementSubscriptionStatus {
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

function mapPrismaTierToEntitlementTier(
  tier: SubscriptionTier
): Exclude<EntitlementSubscriptionTier, "public"> {
  if (tier === SubscriptionTier.basic) {
    return "basic";
  }

  return "pro";
}

function mapPrismaStatusToEntitlementStatus(
  status: SubscriptionStatus
): EntitlementSubscriptionStatus {
  if (status === SubscriptionStatus.inactive) {
    return "inactive";
  }

  return "active";
}

function mapPrismaApiKeyStatus(status: ApiKeyStatus): ApiKeyState {
  if (status === ApiKeyStatus.suspended) {
    return "SUSPENDED";
  }

  if (status === ApiKeyStatus.revoked) {
    return "REVOKED";
  }

  return "ACTIVE";
}

function normalizePersistedEntitledChain(value: string | null): ChainId | null {
  if (
    value === "bitcoin" ||
    value === "ethereum" ||
    value === "arbitrum" ||
    value === "base"
  ) {
    return value;
  }

  return null;
}

function buildPersistedEntitlement(candidate: PersistedApiKeyCandidate): EntitlementInput {
  const latestSubscription = [...candidate.account.subscriptions].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  )[0];

  if (!latestSubscription) {
    return createPublicEntitlement();
  }

  const tier = mapPrismaTierToEntitlementTier(latestSubscription.tier);
  const status = mapPrismaStatusToEntitlementStatus(latestSubscription.status);
  const historyUnlocked = latestSubscription.historyUnlocked;
  const entitledChain = normalizePersistedEntitledChain(latestSubscription.entitledChain);

  if (tier === "basic") {
    return createBasicEntitlement(entitledChain, {
      status,
      historyUnlocked,
    });
  }

  return createProEntitlement({
    status,
    historyUnlocked,
  });
}

function mapPersistedCandidateToApiKeyRecord(
  candidate: PersistedApiKeyCandidate
): ApiKeyRecord {
  return {
    keyId: candidate.id,
    accountId: candidate.accountId,
    userId: candidate.account.authProviderUserId,
    label: candidate.label,
    state: mapPrismaApiKeyStatus(candidate.status),
    createdAt: candidate.createdAt.toISOString(),
    lastUsedAt: candidate.lastUsedAt?.toISOString() ?? null,
    prefix: candidate.keyPrefix,
    last4: candidate.keyLast4 ?? "",
    tokenHash: candidate.keyHash,
    entitlement: buildPersistedEntitlement(candidate),
  };
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

export function buildPersistedApiKeyPrefix(token: string): string {
  return token.slice(0, Math.min(12, token.length));
}

export function buildApiKeyLast4(token: string): string {
  return token.slice(Math.max(0, token.length - 4));
}


const LAST_USED_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

function shouldUpdateLastUsedAt(lastUsedAt: string | null): boolean {
  if (!lastUsedAt) {
    return true;
  }

  const parsed = new Date(lastUsedAt);

  if (Number.isNaN(parsed.getTime())) {
    return true;
  }

  return Date.now() - parsed.getTime() >= LAST_USED_UPDATE_INTERVAL_MS;
}

export async function touchPersistedApiKeyLastUsedAt(
  keyId: string,
  lastUsedAt: string | null
): Promise<void> {
  if (!keyId || !shouldUpdateLastUsedAt(lastUsedAt)) {
    return;
  }

  try {
    await db.apiKey.updateMany({
      where: {
        id: keyId,
        status: {
          not: ApiKeyStatus.revoked,
        },
      },
      data: {
        lastUsedAt: new Date(),
      },
    });
  } catch (error) {
    console.warn("[apiKeys] failed to update lastUsedAt", {
      keyId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
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

export function verifyPersistedApiKeyHash(token: string, storedHash: string): boolean {
  const trimmedToken = token.trim();

  if (!trimmedToken || !storedHash.startsWith("scrypt:")) {
    return false;
  }

  const parts = storedHash.split(":");
  if (parts.length !== 3) {
    return false;
  }

  const [, salt, expectedDerived] = parts;

  if (!salt || !expectedDerived) {
    return false;
  }

  let actualDerived: string;
  try {
    actualDerived = crypto.scryptSync(trimmedToken, salt, 64).toString("hex");
  } catch {
    return false;
  }

  return constantTimeHexEqual(actualDerived, expectedDerived);
}

export async function findPersistedApiKeyRecord(
  token: string
): Promise<ApiKeyRecord | null> {
  const normalized = token.trim();

  if (!normalized) {
    return null;
  }

  const keyPrefix = buildPersistedApiKeyPrefix(normalized);

  const candidates = await db.apiKey.findMany({
    where: {
      keyPrefix,
    },
    include: {
      account: {
        select: {
          authProviderUserId: true,
          subscriptions: {
            orderBy: {
              updatedAt: "desc",
            },
            take: 1,
            select: {
              tier: true,
              status: true,
              entitledChain: true,
              historyUnlocked: true,
              updatedAt: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  for (const candidate of candidates) {
    if (!verifyPersistedApiKeyHash(normalized, candidate.keyHash)) {
      continue;
    }

    return mapPersistedCandidateToApiKeyRecord(candidate);
  }

  return null;
}

export async function getPersistedApiKeyDisplayRows(accountId: string | null) {
  if (!accountId) {
    return [];
  }

  const records = await db.apiKey.findMany({
    where: {
      accountId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      label: true,
      keyPrefix: true,
      keyLast4: true,
      status: true,
      createdAt: true,
      lastUsedAt: true,
      account: {
        select: {
          subscriptions: {
            orderBy: {
              updatedAt: "desc",
            },
            take: 1,
            select: {
              tier: true,
              status: true,
              entitledChain: true,
              historyUnlocked: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });

  return records.map((record) => {
    const latestSubscription = record.account.subscriptions[0];
    const entitlement = latestSubscription
      ? buildPersistedEntitlement({
          id: record.id,
          accountId,
          keyHash: "",
          keyPrefix: record.keyPrefix,
          keyLast4: record.keyLast4,
          label: record.label,
          status: record.status,
          createdAt: record.createdAt,
          lastUsedAt: record.lastUsedAt,
          account: {
            authProviderUserId: "",
            subscriptions: [latestSubscription],
          },
        })
      : createPublicEntitlement();

    const snapshot = buildEntitlementSnapshot(entitlement);

    return {
      id: record.id,
      label: record.label,
      prefix: record.keyPrefix,
      last4: record.keyLast4 ?? "",
      status:
        record.status === ApiKeyStatus.active
          ? "active"
          : record.status === ApiKeyStatus.suspended
            ? "suspended"
            : "revoked",
      createdAt: record.createdAt.toISOString(),
      lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
      tier: snapshot.tier,
      entitledChain: snapshot.entitledChain,
      maxWindowDays: snapshot.maxWindowDays,
    };
  });
}

export function getApiKeysForAccount(
  accountId: string | null,
  records?: ApiKeyRecord[]
): ApiKeyRecord[] {
  if (!accountId) {
    return [];
  }

  const source = records ?? loadDevelopmentApiKeys();

  return source.filter((record) => record.accountId === accountId);
}

export function getApiKeysForUser(
  userId: string | null,
  records?: ApiKeyRecord[]
): ApiKeyRecord[] {
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
