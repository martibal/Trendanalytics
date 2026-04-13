// // src/lib/auth/account.ts
// import "server-only";

// import { auth } from "@clerk/nextjs/server";
// import { ApiKeyStatus, SubscriptionStatus, SubscriptionTier } from "@prisma/client";

// import type { ChainId } from "@/config/chains";
// import {
//   buildEntitlementSnapshot,
//   getEntitledChainLabel,
//   getHistoryDepthLabel,
//   type EntitlementInput,
// } from "@/lib/auth/entitlements";
// import { db } from "@/lib/db";

// export type AccountApiKeyView = {
//   id: string;
//   keyPrefix: string;
//   status: "active" | "suspended" | "revoked";
//   createdAt: string;
//   lastUsedAt: string | null;
// };

// export type AccountRecordView = {
//   accountId: string;
//   authProviderUserId: string;
//   email: string | null;
//   stripeCustomerId: string | null;
//   stripeSubscriptionId: string | null;
//   tier: "public" | "basic" | "pro";
//   status: "active" | "inactive";
//   entitledChain: string | null;
//   historyUnlocked: boolean;
//   currentPeriodEnd: string | null;
//   createdAt: string;
// };

// export type AccountSnapshotView = {
//   tier: "public" | "basic" | "pro";
//   status: "active" | "inactive";
//   entitledChain: string | null;
//   historyUnlocked: boolean;
//   maxWindowDays: number;
//   allowedChains: string[];
// };

// export type CurrentAccountView = {
//   authConfigured: boolean;
//   isAuthenticated: boolean;
//   account: AccountRecordView | null;
//   snapshot: AccountSnapshotView;
//   apiKeys: AccountApiKeyView[];
//   tierLabel: string;
//   entitledChainLabel: string;
//   historyDepthLabel: string;
// };

// function isAuthConfigured(): boolean {
//   return Boolean(
//     process.env.CLERK_SECRET_KEY?.trim() &&
//       process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
//   );
// }

// function mapApiKeyStatus(status: ApiKeyStatus): AccountApiKeyView["status"] {
//   switch (status) {
//     case ApiKeyStatus.active:
//       return "active";
//     case ApiKeyStatus.suspended:
//       return "suspended";
//     case ApiKeyStatus.revoked:
//       return "revoked";
//     default:
//       return "revoked";
//   }
// }

// function mapSubscriptionTier(tier: SubscriptionTier): AccountRecordView["tier"] {
//   switch (tier) {
//     case SubscriptionTier.basic:
//       return "basic";
//     case SubscriptionTier.pro:
//       return "pro";
//     default:
//       return "public";
//   }
// }

// function mapSubscriptionStatus(status: SubscriptionStatus): AccountRecordView["status"] {
//   switch (status) {
//     case SubscriptionStatus.active:
//       return "active";
//     case SubscriptionStatus.inactive:
//       return "inactive";
//     default:
//       return "inactive";
//   }
// }

// function normalizeEntitledChain(value: string | null): ChainId | null {
//   if (
//     value === "bitcoin" ||
//     value === "ethereum" ||
//     value === "arbitrum" ||
//     value === "base"
//   ) {
//     return value;
//   }

//   return null;
// }

// function buildEntitlementInput(params: {
//   tier: AccountRecordView["tier"];
//   status: AccountRecordView["status"];
//   entitledChain: string | null;
//   historyUnlocked: boolean;
// }): EntitlementInput {
//   return {
//     tier: params.tier,
//     status: params.status,
//     entitledChain: normalizeEntitledChain(params.entitledChain),
//     historyUnlocked: params.historyUnlocked,
//   };
// }

// function tierLabelForTier(tier: AccountSnapshotView["tier"]): string {
//   switch (tier) {
//     case "basic":
//       return "Basic";
//     case "pro":
//       return "Pro";
//     default:
//       return "Public";
//   }
// }

// function buildPublicSnapshot(): AccountSnapshotView {
//   const snapshot = buildEntitlementSnapshot({
//     tier: "public",
//     status: "inactive",
//     entitledChain: null,
//     historyUnlocked: false,
//   });

//   return {
//     tier: snapshot.tier,
//     status: snapshot.status,
//     entitledChain: snapshot.entitledChain,
//     historyUnlocked: snapshot.historyUnlocked,
//     maxWindowDays: snapshot.maxWindowDays,
//     allowedChains: snapshot.allowedChains,
//   };
// }

// function buildApiKeyViews(
//   apiKeys: Array<{
//     id: string;
//     keyPrefix: string;
//     status: ApiKeyStatus;
//     createdAt: Date;
//     lastUsedAt: Date | null;
//   }>
// ): AccountApiKeyView[] {
//   return [...apiKeys]
//     .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
//     .map((key) => ({
//       id: key.id,
//       keyPrefix: key.keyPrefix,
//       status: mapApiKeyStatus(key.status),
//       createdAt: key.createdAt.toISOString(),
//       lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
//     }));
// }

// function snapshotLabels(snapshot: AccountSnapshotView) {
//   const entitlementSnapshot = buildEntitlementSnapshot({
//     tier: snapshot.tier,
//     status: snapshot.status,
//     entitledChain: normalizeEntitledChain(snapshot.entitledChain),
//     historyUnlocked: snapshot.historyUnlocked,
//   });

//   return {
//     tierLabel: tierLabelForTier(snapshot.tier),
//     entitledChainLabel: getEntitledChainLabel(entitlementSnapshot),
//     historyDepthLabel: getHistoryDepthLabel(entitlementSnapshot),
//   };
// }

// function buildAccountRecordView(params: {
//   id: string;
//   authProviderUserId: string;
//   email: string | null;
//   createdAt: Date;
//   stripeCustomerId: string | null;
//   stripeSubscriptionId: string | null;
//   tier: AccountRecordView["tier"];
//   status: AccountRecordView["status"];
//   entitledChain: string | null;
//   historyUnlocked: boolean;
//   currentPeriodEnd: Date | null;
// }): AccountRecordView {
//   return {
//     accountId: params.id,
//     authProviderUserId: params.authProviderUserId,
//     email: params.email,
//     stripeCustomerId: params.stripeCustomerId,
//     stripeSubscriptionId: params.stripeSubscriptionId,
//     tier: params.tier,
//     status: params.status,
//     entitledChain: params.entitledChain,
//     historyUnlocked: params.historyUnlocked,
//     currentPeriodEnd: params.currentPeriodEnd?.toISOString() ?? null,
//     createdAt: params.createdAt.toISOString(),
//   };
// }

// export async function getCurrentAccountView(): Promise<CurrentAccountView> {
//   const authConfigured = isAuthConfigured();

//   if (!authConfigured) {
//     const snapshot = buildPublicSnapshot();
//     const labels = snapshotLabels(snapshot);

//     return {
//       authConfigured: false,
//       isAuthenticated: false,
//       account: null,
//       snapshot,
//       apiKeys: [],
//       tierLabel: labels.tierLabel,
//       entitledChainLabel: labels.entitledChainLabel,
//       historyDepthLabel: labels.historyDepthLabel,
//     };
//   }

//   const authState = await auth();
//   const authProviderUserId = authState.userId ?? null;

//   if (!authProviderUserId) {
//     const snapshot = buildPublicSnapshot();
//     const labels = snapshotLabels(snapshot);

//     return {
//       authConfigured: true,
//       isAuthenticated: false,
//       account: null,
//       snapshot,
//       apiKeys: [],
//       tierLabel: labels.tierLabel,
//       entitledChainLabel: labels.entitledChainLabel,
//       historyDepthLabel: labels.historyDepthLabel,
//     };
//   }

//   let account = await db.account.findUnique({
//     where: {
//       authProviderUserId,
//     },
//     include: {
//       subscriptions: {
//         orderBy: {
//           updatedAt: "desc",
//         },
//         take: 1,
//       },
//       apiKeys: {
//         orderBy: {
//           createdAt: "desc",
//         },
//       },
//     },
//   });

//   if (!account) {
//     const sessionClaims = authState.sessionClaims as
//       | { email?: unknown; email_address?: unknown }
//       | undefined;

//     const email =
//       typeof sessionClaims?.email === "string"
//         ? sessionClaims.email
//         : typeof sessionClaims?.email_address === "string"
//         ? sessionClaims.email_address
//         : null;

//     account = await db.account.create({
//       data: {
//         authProviderUserId,
//         email,
//       },
//       include: {
//         subscriptions: {
//           orderBy: {
//             updatedAt: "desc",
//           },
//           take: 1,
//         },
//         apiKeys: {
//           orderBy: {
//             createdAt: "desc",
//           },
//         },
//       },
//     });
//   }

//   const subscription = account.subscriptions[0] ?? null;
//   const tier = subscription ? mapSubscriptionTier(subscription.tier) : "public";
//   const status = subscription ? mapSubscriptionStatus(subscription.status) : "inactive";
//   const entitledChain = subscription?.entitledChain ?? null;
//   const historyUnlocked = subscription?.historyUnlocked ?? false;

//   const entitlementInput = buildEntitlementInput({
//     tier,
//     status,
//     entitledChain,
//     historyUnlocked,
//   });

//   const entitlementSnapshot = buildEntitlementSnapshot(entitlementInput);

//   const snapshot: AccountSnapshotView = {
//     tier: entitlementSnapshot.tier,
//     status: entitlementSnapshot.status,
//     entitledChain: entitlementSnapshot.entitledChain,
//     historyUnlocked: entitlementSnapshot.historyUnlocked,
//     maxWindowDays: entitlementSnapshot.maxWindowDays,
//     allowedChains: entitlementSnapshot.allowedChains,
//   };

//   const accountView = buildAccountRecordView({
//     id: account.id,
//     authProviderUserId: account.authProviderUserId,
//     email: account.email,
//     stripeCustomerId: subscription?.stripeCustomerId ?? null,
//     stripeSubscriptionId: subscription?.stripeSubscriptionId ?? null,
//     tier,
//     status,
//     entitledChain,
//     historyUnlocked,
//     currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
//     createdAt: account.createdAt,
//   });

//   return {
//     authConfigured: true,
//     isAuthenticated: true,
//     account: accountView,
//     snapshot,
//     apiKeys: buildApiKeyViews(account.apiKeys),
//     tierLabel: tierLabelForTier(snapshot.tier),
//     entitledChainLabel: getEntitledChainLabel(entitlementSnapshot),
//     historyDepthLabel: getHistoryDepthLabel(entitlementSnapshot),
//   };
// }


// src/lib/auth/account.ts
import "server-only";

import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { ApiKeyStatus, SubscriptionStatus, SubscriptionTier } from "@prisma/client";

import type { ChainId } from "@/config/chains";
import {
  buildEntitlementSnapshot,
  getEntitledChainLabel,
  getHistoryDepthLabel,
  type EntitlementInput,
} from "@/lib/auth/entitlements";
import { db } from "@/lib/db";

const TERMS_VERSION = "2026-04-13";
const TERMS_ACCEPTANCE_COOKIE = "ua_terms_acceptance_pending";

type PendingTermsAcceptance = {
  termsVersion: string;
  termsAcceptedAt: Date;
};

export type AccountApiKeyView = {
  id: string;
  keyPrefix: string;
  status: "active" | "suspended" | "revoked";
  createdAt: string;
  lastUsedAt: string | null;
};

export type AccountRecordView = {
  accountId: string;
  authProviderUserId: string;
  email: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  tier: "public" | "basic" | "pro";
  status: "active" | "inactive";
  entitledChain: string | null;
  historyUnlocked: boolean;
  currentPeriodEnd: string | null;
  createdAt: string;
};

export type AccountSnapshotView = {
  tier: "public" | "basic" | "pro";
  status: "active" | "inactive";
  entitledChain: string | null;
  historyUnlocked: boolean;
  maxWindowDays: number;
  allowedChains: string[];
};

export type CurrentAccountView = {
  authConfigured: boolean;
  isAuthenticated: boolean;
  account: AccountRecordView | null;
  snapshot: AccountSnapshotView;
  apiKeys: AccountApiKeyView[];
  tierLabel: string;
  entitledChainLabel: string;
  historyDepthLabel: string;
};

function isAuthConfigured(): boolean {
  return Boolean(
    process.env.CLERK_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
  );
}

function mapApiKeyStatus(status: ApiKeyStatus): AccountApiKeyView["status"] {
  switch (status) {
    case ApiKeyStatus.active:
      return "active";
    case ApiKeyStatus.suspended:
      return "suspended";
    case ApiKeyStatus.revoked:
      return "revoked";
    default:
      return "revoked";
  }
}

function mapSubscriptionTier(tier: SubscriptionTier): AccountRecordView["tier"] {
  switch (tier) {
    case SubscriptionTier.basic:
      return "basic";
    case SubscriptionTier.pro:
      return "pro";
    default:
      return "public";
  }
}

function mapSubscriptionStatus(status: SubscriptionStatus): AccountRecordView["status"] {
  switch (status) {
    case SubscriptionStatus.active:
      return "active";
    case SubscriptionStatus.inactive:
      return "inactive";
    default:
      return "inactive";
  }
}

function normalizeEntitledChain(value: string | null): ChainId | null {
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

function buildEntitlementInput(params: {
  tier: AccountRecordView["tier"];
  status: AccountRecordView["status"];
  entitledChain: string | null;
  historyUnlocked: boolean;
}): EntitlementInput {
  return {
    tier: params.tier,
    status: params.status,
    entitledChain: normalizeEntitledChain(params.entitledChain),
    historyUnlocked: params.historyUnlocked,
  };
}

function tierLabelForTier(tier: AccountSnapshotView["tier"]): string {
  switch (tier) {
    case "basic":
      return "Basic";
    case "pro":
      return "Pro";
    default:
      return "Public";
  }
}

function buildPublicSnapshot(): AccountSnapshotView {
  const snapshot = buildEntitlementSnapshot({
    tier: "public",
    status: "inactive",
    entitledChain: null,
    historyUnlocked: false,
  });

  return {
    tier: snapshot.tier,
    status: snapshot.status,
    entitledChain: snapshot.entitledChain,
    historyUnlocked: snapshot.historyUnlocked,
    maxWindowDays: snapshot.maxWindowDays,
    allowedChains: snapshot.allowedChains,
  };
}

function buildApiKeyViews(
  apiKeys: Array<{
    id: string;
    keyPrefix: string;
    status: ApiKeyStatus;
    createdAt: Date;
    lastUsedAt: Date | null;
  }>
): AccountApiKeyView[] {
  return [...apiKeys]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((key) => ({
      id: key.id,
      keyPrefix: key.keyPrefix,
      status: mapApiKeyStatus(key.status),
      createdAt: key.createdAt.toISOString(),
      lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    }));
}

function snapshotLabels(snapshot: AccountSnapshotView) {
  const entitlementSnapshot = buildEntitlementSnapshot({
    tier: snapshot.tier,
    status: snapshot.status,
    entitledChain: normalizeEntitledChain(snapshot.entitledChain),
    historyUnlocked: snapshot.historyUnlocked,
  });

  return {
    tierLabel: tierLabelForTier(snapshot.tier),
    entitledChainLabel: getEntitledChainLabel(entitlementSnapshot),
    historyDepthLabel: getHistoryDepthLabel(entitlementSnapshot),
  };
}

function buildAccountRecordView(params: {
  id: string;
  authProviderUserId: string;
  email: string | null;
  createdAt: Date;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  tier: AccountRecordView["tier"];
  status: AccountRecordView["status"];
  entitledChain: string | null;
  historyUnlocked: boolean;
  currentPeriodEnd: Date | null;
}): AccountRecordView {
  return {
    accountId: params.id,
    authProviderUserId: params.authProviderUserId,
    email: params.email,
    stripeCustomerId: params.stripeCustomerId,
    stripeSubscriptionId: params.stripeSubscriptionId,
    tier: params.tier,
    status: params.status,
    entitledChain: params.entitledChain,
    historyUnlocked: params.historyUnlocked,
    currentPeriodEnd: params.currentPeriodEnd?.toISOString() ?? null,
    createdAt: params.createdAt.toISOString(),
  };
}

function parsePendingTermsAcceptance(raw: string | null): PendingTermsAcceptance | null {
  if (!raw || typeof raw !== "string") {
    return null;
  }

  const parts = raw.split("|");
  if (parts.length !== 2) {
    return null;
  }

  const [termsVersion, acceptedAtRaw] = parts;
  if (!termsVersion || !acceptedAtRaw) {
    return null;
  }

  if (termsVersion !== TERMS_VERSION) {
    return null;
  }

  const termsAcceptedAt = new Date(acceptedAtRaw);
  if (Number.isNaN(termsAcceptedAt.getTime())) {
    return null;
  }

  return {
    termsVersion,
    termsAcceptedAt,
  };
}

export async function getCurrentAccountView(): Promise<CurrentAccountView> {
  const authConfigured = isAuthConfigured();

  if (!authConfigured) {
    console.info("[account] auth not configured");

    const snapshot = buildPublicSnapshot();
    const labels = snapshotLabels(snapshot);

    return {
      authConfigured: false,
      isAuthenticated: false,
      account: null,
      snapshot,
      apiKeys: [],
      tierLabel: labels.tierLabel,
      entitledChainLabel: labels.entitledChainLabel,
      historyDepthLabel: labels.historyDepthLabel,
    };
  }

  const authState = await auth();
  const authProviderUserId = authState.userId ?? null;

  console.info("[account] auth state", {
    hasUserId: Boolean(authProviderUserId),
    userId: authProviderUserId,
  });

  if (!authProviderUserId) {
    const snapshot = buildPublicSnapshot();
    const labels = snapshotLabels(snapshot);

    return {
      authConfigured: true,
      isAuthenticated: false,
      account: null,
      snapshot,
      apiKeys: [],
      tierLabel: labels.tierLabel,
      entitledChainLabel: labels.entitledChainLabel,
      historyDepthLabel: labels.historyDepthLabel,
    };
  }

  try {
    let account = await db.account.findUnique({
      where: {
        authProviderUserId,
      },
      include: {
        subscriptions: {
          orderBy: {
            updatedAt: "desc",
          },
          take: 1,
        },
        apiKeys: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    console.info("[account] findUnique result", {
      userId: authProviderUserId,
      found: Boolean(account),
      accountId: account?.id ?? null,
    });

    if (!account) {
      const sessionClaims = authState.sessionClaims as
        | { email?: unknown; email_address?: unknown }
        | undefined;

      const email =
        typeof sessionClaims?.email === "string"
          ? sessionClaims.email
          : typeof sessionClaims?.email_address === "string"
          ? sessionClaims.email_address
          : null;

      const cookieStore = await cookies();
      const pendingTermsAcceptance = parsePendingTermsAcceptance(
        cookieStore.get(TERMS_ACCEPTANCE_COOKIE)?.value ?? null
      );

      if (!pendingTermsAcceptance) {
        console.error("[account] missing current terms acceptance for new account", {
          userId: authProviderUserId,
          email,
          expectedTermsVersion: TERMS_VERSION,
        });
        throw new Error("missing_current_terms_acceptance");
      }

      console.info("[account] creating account row", {
        userId: authProviderUserId,
        email,
        termsVersion: pendingTermsAcceptance.termsVersion,
        termsAcceptedAt: pendingTermsAcceptance.termsAcceptedAt.toISOString(),
      });

      account = await db.account.create({
        data: {
          authProviderUserId,
          email,
          termsAcceptedAt: pendingTermsAcceptance.termsAcceptedAt,
          termsVersion: pendingTermsAcceptance.termsVersion,
        },
        include: {
          subscriptions: {
            orderBy: {
              updatedAt: "desc",
            },
            take: 1,
          },
          apiKeys: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      console.info("[account] account row created", {
        userId: authProviderUserId,
        accountId: account.id,
        termsVersion: account.termsVersion ?? null,
        termsAcceptedAt: account.termsAcceptedAt?.toISOString() ?? null,
      });
    }

    const subscription = account.subscriptions[0] ?? null;
    const tier = subscription ? mapSubscriptionTier(subscription.tier) : "public";
    const status = subscription ? mapSubscriptionStatus(subscription.status) : "inactive";
    const entitledChain = subscription?.entitledChain ?? null;
    const historyUnlocked = subscription?.historyUnlocked ?? false;

    const entitlementInput = buildEntitlementInput({
      tier,
      status,
      entitledChain,
      historyUnlocked,
    });

    const entitlementSnapshot = buildEntitlementSnapshot(entitlementInput);

    const snapshot: AccountSnapshotView = {
      tier: entitlementSnapshot.tier,
      status: entitlementSnapshot.status,
      entitledChain: entitlementSnapshot.entitledChain,
      historyUnlocked: entitlementSnapshot.historyUnlocked,
      maxWindowDays: entitlementSnapshot.maxWindowDays,
      allowedChains: entitlementSnapshot.allowedChains,
    };

    const accountView = buildAccountRecordView({
      id: account.id,
      authProviderUserId: account.authProviderUserId,
      email: account.email,
      stripeCustomerId: subscription?.stripeCustomerId ?? null,
      stripeSubscriptionId: subscription?.stripeSubscriptionId ?? null,
      tier,
      status,
      entitledChain,
      historyUnlocked,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      createdAt: account.createdAt,
    });

    return {
      authConfigured: true,
      isAuthenticated: true,
      account: accountView,
      snapshot,
      apiKeys: buildApiKeyViews(account.apiKeys),
      tierLabel: tierLabelForTier(snapshot.tier),
      entitledChainLabel: getEntitledChainLabel(entitlementSnapshot),
      historyDepthLabel: getHistoryDepthLabel(entitlementSnapshot),
    };
  } catch (error) {
    console.error("[account] getCurrentAccountView failed", {
      userId: authProviderUserId,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : String(error),
    });
    throw error;
  }
}