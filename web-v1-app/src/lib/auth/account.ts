// src/lib/auth/account.ts
import { auth } from "@clerk/nextjs/server";
import { SubscriptionStatus as PrismaSubscriptionStatus, SubscriptionTier as PrismaSubscriptionTier } from "@prisma/client";

import type { ChainId } from "@/config/chains";
import { db } from "@/lib/db";
import {
  buildEntitlementSnapshot,
  createBasicEntitlement,
  createProEntitlement,
  createPublicEntitlement,
  getEntitledChainLabel,
  getHistoryDepthLabel,
  type EntitlementInput,
  type EntitlementSnapshot,
  type SubscriptionStatus,
  type SubscriptionTier,
} from "@/lib/auth/entitlements";

export type AccountRecord = {
  accountId: string;
  userId: string | null;
  email: string | null;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  entitledChain: ChainId | null;
  historyUnlocked: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

export type AccountViewModel = {
  isAuthenticated: boolean;
  authConfigured: boolean;
  account: AccountRecord | null;
  entitlement: EntitlementInput;
  snapshot: EntitlementSnapshot;
  tierLabel: string;
  entitledChainLabel: string;
  historyDepthLabel: string;
};

type DatabaseAccountWithRelations = Awaited<ReturnType<typeof getAccountFromDatabase>>;

const HAS_CLERK_KEYS =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  Boolean(process.env.CLERK_SECRET_KEY);

const HAS_DATABASE_URL =
  Boolean(process.env.DATABASE_URL) &&
  Boolean(process.env.DIRECT_URL);

function normalizeTier(value: SubscriptionTier | PrismaSubscriptionTier | string | undefined): SubscriptionTier {
  if (value === "basic") return "basic";
  if (value === "pro") return "pro";
  return "public";
}

function normalizeStatus(value: SubscriptionStatus | PrismaSubscriptionStatus | string | undefined): SubscriptionStatus {
  if (value === "inactive") return "inactive";
  return "active";
}

function normalizeEntitledChain(value: string | null | undefined): ChainId | null {
  if (value === "bitcoin" || value === "ethereum" || value === "arbitrum" || value === "base") {
    return value;
  }

  return null;
}

function buildEntitlementFromAccount(account: AccountRecord | null): EntitlementInput {
  if (!account) {
    return createPublicEntitlement();
  }

  if (account.tier === "basic") {
    return createBasicEntitlement(account.entitledChain, {
      status: account.status,
      historyUnlocked: account.historyUnlocked,
    });
  }

  if (account.tier === "pro") {
    return createProEntitlement({
      status: account.status,
      historyUnlocked: account.historyUnlocked,
    });
  }

  return createPublicEntitlement();
}

function tierLabel(tier: SubscriptionTier): string {
  if (tier === "basic") return "Basic";
  if (tier === "pro") return "Pro";
  return "Public";
}

export function buildAccountViewModel(account: AccountRecord | null, isAuthenticated: boolean): AccountViewModel {
  const entitlement = buildEntitlementFromAccount(account);
  const snapshot = buildEntitlementSnapshot(entitlement);

  return {
    isAuthenticated,
    authConfigured: HAS_CLERK_KEYS,
    account,
    entitlement,
    snapshot,
    tierLabel: tierLabel(snapshot.tier),
    entitledChainLabel: getEntitledChainLabel(snapshot),
    historyDepthLabel: getHistoryDepthLabel(snapshot),
  };
}

async function getAccountFromDatabase(userId: string) {
  if (!HAS_DATABASE_URL) {
    return null;
  }

  return db.account.findUnique({
    where: { authProviderUserId: userId },
    include: {
      subscriptions: {
        orderBy: { updatedAt: "desc" },
      },
      apiKeys: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

function buildAccountRecordFromDatabaseRow(account: NonNullable<DatabaseAccountWithRelations>): AccountRecord {
  const latestSubscription = account.subscriptions[0] ?? null;

  if (!latestSubscription) {
    return {
      accountId: account.id,
      userId: account.authProviderUserId,
      email: account.email ?? null,
      tier: "public",
      status: "inactive",
      entitledChain: null,
      historyUnlocked: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    };
  }

  return {
    accountId: account.id,
    userId: account.authProviderUserId,
    email: account.email ?? null,
    tier: normalizeTier(latestSubscription.tier),
    status: normalizeStatus(latestSubscription.status),
    entitledChain: normalizeEntitledChain(latestSubscription.entitledChain),
    historyUnlocked: Boolean(latestSubscription.historyUnlocked),
    stripeCustomerId: latestSubscription.stripeCustomerId ?? null,
    stripeSubscriptionId: latestSubscription.stripeSubscriptionId ?? null,
  };
}

export async function getCurrentAccountView(): Promise<AccountViewModel> {
  if (!HAS_CLERK_KEYS) {
    return buildAccountViewModel(null, false);
  }

  const { userId } = await auth();

  if (!userId) {
    return buildAccountViewModel(null, false);
  }

  try {
    const dbAccount = await getAccountFromDatabase(userId);

    if (!dbAccount) {
      return buildAccountViewModel(null, true);
    }

    const account = buildAccountRecordFromDatabaseRow(dbAccount);
    return buildAccountViewModel(account, true);
  } catch {
    return buildAccountViewModel(null, true);
  }
}