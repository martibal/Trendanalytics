// src/lib/auth/account.test.ts
/**
 * @jest-environment node
 */

export {};

const authMock = jest.fn();
const cookiesMock = jest.fn();
const dbFindUniqueMock = jest.fn();
const dbCreateMock = jest.fn();

jest.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
}));

jest.mock("next/headers", () => ({
  cookies: () => cookiesMock(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    account: {
      findUnique: (...args: unknown[]) => dbFindUniqueMock(...args),
      create: (...args: unknown[]) => dbCreateMock(...args),
    },
  },
}));

describe("lib/auth/account", () => {
  const originalEnv = process.env;
  const TERMS_VERSION = "2026-04-13";
  const TERMS_ACCEPTED_AT = "2026-04-13T19:45:00.000Z";

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.CLERK_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    cookiesMock.mockResolvedValue({
      get: jest.fn().mockReturnValue(undefined),
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns public snapshot when auth is not configured", async () => {
    const mod = await import("@/lib/auth/account");
    const result = await mod.getCurrentAccountView();

    expect(result).toEqual({
      authConfigured: false,
      isAuthenticated: false,
      account: null,
      snapshot: {
        tier: "public",
        status: "inactive",
        entitledChain: null,
        historyUnlocked: false,
        maxWindowDays: 0,
        allowedChains: [],
      },
      apiKeys: [],
      tierLabel: "Public",
      entitledChainLabel: "No API entitlement",
      historyDepthLabel: "No subscriber history access",
    });

    expect(authMock).not.toHaveBeenCalled();
    expect(dbFindUniqueMock).not.toHaveBeenCalled();
    expect(dbCreateMock).not.toHaveBeenCalled();
  });

  it("returns public snapshot when auth is configured but user is not signed in", async () => {
    process.env.CLERK_SECRET_KEY = "sk_test";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test";
    authMock.mockResolvedValue({ userId: null });

    const mod = await import("@/lib/auth/account");
    const result = await mod.getCurrentAccountView();

    expect(result).toEqual({
      authConfigured: true,
      isAuthenticated: false,
      account: null,
      snapshot: {
        tier: "public",
        status: "inactive",
        entitledChain: null,
        historyUnlocked: false,
        maxWindowDays: 0,
        allowedChains: [],
      },
      apiKeys: [],
      tierLabel: "Public",
      entitledChainLabel: "No API entitlement",
      historyDepthLabel: "No subscriber history access",
    });

    expect(dbFindUniqueMock).not.toHaveBeenCalled();
    expect(dbCreateMock).not.toHaveBeenCalled();
  });

  it("creates and returns an authenticated public account when user exists but no account row exists", async () => {
    process.env.CLERK_SECRET_KEY = "sk_test";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test";
    authMock.mockResolvedValue({
      userId: "user_123",
      sessionClaims: {
        email: "user@example.com",
      },
    });

    dbFindUniqueMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "acct_new",
        authProviderUserId: "user_123",
        email: "user@example.com",
        createdAt: new Date("2026-03-21T10:00:00.000Z"),
        termsAcceptedAt: new Date(TERMS_ACCEPTED_AT),
        termsVersion: TERMS_VERSION,
        subscriptions: [],
        apiKeys: [],
      });

    cookiesMock.mockResolvedValue({
      get: jest.fn((name: string) => {
        if (name === "ua_terms_acceptance_pending") {
          return {
            value: `${TERMS_VERSION}|${TERMS_ACCEPTED_AT}`,
          };
        }
        return undefined;
      }),
    });

    dbCreateMock.mockResolvedValue({
      id: "acct_new",
      authProviderUserId: "user_123",
      email: "user@example.com",
      createdAt: new Date("2026-03-21T10:00:00.000Z"),
      termsAcceptedAt: new Date(TERMS_ACCEPTED_AT),
      termsVersion: TERMS_VERSION,
    });

    const mod = await import("@/lib/auth/account");
    const result = await mod.getCurrentAccountView();

    expect(dbFindUniqueMock).toHaveBeenNthCalledWith(1, {
      where: { authProviderUserId: "user_123" },
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

    expect(dbCreateMock).toHaveBeenCalledWith({
      data: {
        authProviderUserId: "user_123",
        email: "user@example.com",
        termsAcceptedAt: new Date(TERMS_ACCEPTED_AT),
        termsVersion: TERMS_VERSION,
      },
    });

    expect(dbFindUniqueMock).toHaveBeenNthCalledWith(2, {
      where: { authProviderUserId: "user_123" },
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

    expect(result).toEqual({
      authConfigured: true,
      isAuthenticated: true,
      account: {
        accountId: "acct_new",
        authProviderUserId: "user_123",
        email: "user@example.com",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        tier: "public",
        status: "inactive",
        entitledChain: null,
        historyUnlocked: false,
        currentPeriodEnd: null,
        createdAt: "2026-03-21T10:00:00.000Z",
      },
      snapshot: {
        tier: "public",
        status: "inactive",
        entitledChain: null,
        historyUnlocked: false,
        maxWindowDays: 0,
        allowedChains: [],
      },
      apiKeys: [],
      tierLabel: "Public",
      entitledChainLabel: "No API entitlement",
      historyDepthLabel: "No subscriber history access",
    });
  });

  it("throws when a new authenticated account is created without current terms acceptance", async () => {
    process.env.CLERK_SECRET_KEY = "sk_test";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test";
    authMock.mockResolvedValue({
      userId: "user_999",
      sessionClaims: {
        email: "missing-terms@example.com",
      },
    });
    dbFindUniqueMock.mockResolvedValue(null);

    cookiesMock.mockResolvedValue({
      get: jest.fn().mockReturnValue(undefined),
    });

    const mod = await import("@/lib/auth/account");

    await expect(mod.getCurrentAccountView()).rejects.toThrow(
      "missing_current_terms_acceptance"
    );

    expect(dbCreateMock).not.toHaveBeenCalled();
  });

  it("maps a basic subscription and api keys correctly", async () => {
    process.env.CLERK_SECRET_KEY = "sk_test";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test";
    authMock.mockResolvedValue({ userId: "user_123" });

    dbFindUniqueMock.mockResolvedValue({
      id: "acct_1",
      authProviderUserId: "user_123",
      email: "user@example.com",
      createdAt: new Date("2026-03-01T10:00:00.000Z"),
      termsAcceptedAt: new Date(TERMS_ACCEPTED_AT),
      termsVersion: TERMS_VERSION,
      subscriptions: [
        {
          id: "sub_1",
          tier: "basic",
          status: "active",
          entitledChain: null,
          historyUnlocked: false,
          currentPeriodEnd: new Date("2026-04-01T00:00:00.000Z"),
          stripeCustomerId: "cus_123",
          stripeSubscriptionId: "sub_stripe_123",
          updatedAt: new Date("2026-03-20T00:00:00.000Z"),
        },
      ],
      apiKeys: [
        {
          id: "key_older",
          keyPrefix: "ta_old",
          status: "suspended",
          createdAt: new Date("2026-03-05T00:00:00.000Z"),
          lastUsedAt: null,
        },
        {
          id: "key_newer",
          keyPrefix: "ta_live",
          status: "active",
          createdAt: new Date("2026-03-10T00:00:00.000Z"),
          lastUsedAt: new Date("2026-03-19T00:00:00.000Z"),
        },
      ],
    });

    const mod = await import("@/lib/auth/account");
    const result = await mod.getCurrentAccountView();

    expect(result).toEqual({
      authConfigured: true,
      isAuthenticated: true,
      account: {
        accountId: "acct_1",
        authProviderUserId: "user_123",
        email: "user@example.com",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_stripe_123",
        tier: "basic",
        status: "active",
        entitledChain: null,
        historyUnlocked: false,
        currentPeriodEnd: "2026-04-01T00:00:00.000Z",
        createdAt: "2026-03-01T10:00:00.000Z",
      },
      snapshot: {
        tier: "basic",
        status: "active",
        entitledChain: null,
        historyUnlocked: false,
        maxWindowDays: 90,
        allowedChains: [],
      },
      apiKeys: [
        {
          id: "key_newer",
          keyPrefix: "ta_live",
          status: "active",
          createdAt: "2026-03-10T00:00:00.000Z",
          lastUsedAt: "2026-03-19T00:00:00.000Z",
        },
        {
          id: "key_older",
          keyPrefix: "ta_old",
          status: "suspended",
          createdAt: "2026-03-05T00:00:00.000Z",
          lastUsedAt: null,
        },
      ],
      tierLabel: "Basic",
      entitledChainLabel: "Selection required",
      historyDepthLabel: "90 days",
    });
  });

  it("maps a pro subscription with entitled chain correctly", async () => {
    process.env.CLERK_SECRET_KEY = "sk_test";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test";
    authMock.mockResolvedValue({ userId: "user_456" });

    dbFindUniqueMock.mockResolvedValue({
      id: "acct_2",
      authProviderUserId: "user_456",
      email: "pro@example.com",
      createdAt: new Date("2026-03-01T10:00:00.000Z"),
      termsAcceptedAt: new Date(TERMS_ACCEPTED_AT),
      termsVersion: TERMS_VERSION,
      subscriptions: [
        {
          id: "sub_2",
          tier: "pro",
          status: "inactive",
          entitledChain: "ethereum",
          historyUnlocked: true,
          currentPeriodEnd: null,
          stripeCustomerId: "cus_456",
          stripeSubscriptionId: null,
          updatedAt: new Date("2026-03-20T00:00:00.000Z"),
        },
      ],
      apiKeys: [],
    });

    const mod = await import("@/lib/auth/account");
    const result = await mod.getCurrentAccountView();

    expect(result).toEqual({
      authConfigured: true,
      isAuthenticated: true,
      account: {
        accountId: "acct_2",
        authProviderUserId: "user_456",
        email: "pro@example.com",
        stripeCustomerId: "cus_456",
        stripeSubscriptionId: null,
        tier: "pro",
        status: "inactive",
        entitledChain: "ethereum",
        historyUnlocked: true,
        currentPeriodEnd: null,
        createdAt: "2026-03-01T10:00:00.000Z",
      },
      snapshot: {
        tier: "pro",
        status: "inactive",
        entitledChain: null,
        historyUnlocked: true,
        maxWindowDays: 365,
        allowedChains: ["bitcoin", "ethereum", "arbitrum", "base"],
      },
      apiKeys: [],
      tierLabel: "Pro",
      entitledChainLabel: "All chains",
      historyDepthLabel: "Full available history",
    });
  });
});