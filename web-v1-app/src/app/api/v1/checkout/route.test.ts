/**
 * @jest-environment node
 */

export {};

const authMock = jest.fn();
const getCurrentAccountViewMock = jest.fn();
const createPortalSessionMock = jest.fn();
const stripeCtorMock = jest.fn();

jest.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
}));

jest.mock("@/lib/auth/account", () => ({
  getCurrentAccountView: (...args: unknown[]) => getCurrentAccountViewMock(...args),
}));

jest.mock("stripe", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation((...args: unknown[]) => {
      stripeCtorMock(...args);
      return {
        billingPortal: {
          sessions: {
            create: (...createArgs: unknown[]) =>
              createPortalSessionMock(...createArgs),
          },
        },
      };
    }),
  };
});

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      async json() {
        return body;
      },
    }),
  },
}));

type MockJsonResponse = {
  status: number;
  json: () => Promise<unknown>;
};

let portalPost: (request: Request) => Promise<MockJsonResponse>;
const originalEnv = process.env;

function setConfiguredEnv() {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_clerk",
    CLERK_SECRET_KEY: "sk_test_clerk",
    STRIPE_SECRET_KEY: "sk_test_stripe",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  };
}

describe("/api/v1/checkout/portal route", () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    setConfiguredEnv();

    const routeModule = await import("@/app/api/v1/checkout/portal/route");

    portalPost = routeModule.POST as unknown as (
      request: Request
    ) => Promise<MockJsonResponse>;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns 503 when Stripe is not configured", async () => {
    process.env.STRIPE_SECRET_KEY = "";

    const routeModule = await import("@/app/api/v1/checkout/portal/route");
    portalPost = routeModule.POST as unknown as (
      request: Request
    ) => Promise<MockJsonResponse>;

    const request = new Request("http://localhost:3000/api/v1/checkout/portal", {
      method: "POST",
    });

    const response = await portalPost(request);
    const payload = (await response.json()) as {
      code: string;
      detail: string | null;
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("portal_not_configured");
    expect(payload.detail).toBe("Missing STRIPE_SECRET_KEY.");
    expect(createPortalSessionMock).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue({ userId: null });

    const request = new Request("http://localhost:3000/api/v1/checkout/portal", {
      method: "POST",
    });

    const response = await portalPost(request);
    const payload = (await response.json()) as { code: string };

    expect(response.status).toBe(401);
    expect(payload.code).toBe("unauthenticated");
    expect(getCurrentAccountViewMock).not.toHaveBeenCalled();
    expect(createPortalSessionMock).not.toHaveBeenCalled();
  });

  it("returns 403 when the signed-in user has no linked account mapping", async () => {
    authMock.mockResolvedValue({ userId: "user_123" });
    getCurrentAccountViewMock.mockResolvedValue({
      authConfigured: true,
      isAuthenticated: true,
      account: null,
      snapshot: {
        tier: "public",
        status: "inactive",
        entitledChain: null,
        historyUnlocked: false,
        maxWindowDays: -1,
        allowedChains: [],
      },
      apiKeys: [],
      tierLabel: "Public",
      entitledChainLabel: "All chains",
      historyDepthLabel: "No access",
    });

    const request = new Request("http://localhost:3000/api/v1/checkout/portal", {
      method: "POST",
    });

    const response = await portalPost(request);
    const payload = (await response.json()) as { code: string; detail: string | null };

    expect(response.status).toBe(403);
    expect(payload.code).toBe("forbidden");
    expect(payload.detail).toBe("missing_account_mapping");
    expect(createPortalSessionMock).not.toHaveBeenCalled();
  });

  it("returns 403 when the account has no Stripe customer id", async () => {
    authMock.mockResolvedValue({ userId: "user_123" });
    getCurrentAccountViewMock.mockResolvedValue({
      authConfigured: true,
      isAuthenticated: true,
      account: {
        accountId: "acct_1",
        authProviderUserId: "user_123",
        email: "user@example.com",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        tier: "public",
        status: "inactive",
        entitledChain: null,
        historyUnlocked: false,
        currentPeriodEnd: null,
        createdAt: "2026-03-01T00:00:00.000Z",
      },
      snapshot: {
        tier: "public",
        status: "inactive",
        entitledChain: null,
        historyUnlocked: false,
        maxWindowDays: -1,
        allowedChains: [],
      },
      apiKeys: [],
      tierLabel: "Public",
      entitledChainLabel: "All chains",
      historyDepthLabel: "No access",
    });

    const request = new Request("http://localhost:3000/api/v1/checkout/portal", {
      method: "POST",
    });

    const response = await portalPost(request);
    const payload = (await response.json()) as { code: string; detail: string | null };

    expect(response.status).toBe(403);
    expect(payload.code).toBe("forbidden");
    expect(payload.detail).toBe("missing_stripe_customer_id");
    expect(createPortalSessionMock).not.toHaveBeenCalled();
  });

  it("creates a Stripe customer portal session and returns the portal url", async () => {
    authMock.mockResolvedValue({ userId: "user_123" });
    getCurrentAccountViewMock.mockResolvedValue({
      authConfigured: true,
      isAuthenticated: true,
      account: {
        accountId: "acct_1",
        authProviderUserId: "user_123",
        email: "user@example.com",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        tier: "pro",
        status: "active",
        entitledChain: "ethereum",
        historyUnlocked: true,
        currentPeriodEnd: "2026-04-01T00:00:00.000Z",
        createdAt: "2026-03-01T00:00:00.000Z",
      },
      snapshot: {
        tier: "pro",
        status: "active",
        entitledChain: "ethereum",
        historyUnlocked: true,
        maxWindowDays: 365,
        allowedChains: ["ethereum"],
      },
      apiKeys: [],
      tierLabel: "Pro",
      entitledChainLabel: "ethereum",
      historyDepthLabel: "365d",
    });
    createPortalSessionMock.mockResolvedValue({
      url: "https://billing.stripe.com/p/session/test_123",
    });

    const request = new Request("http://localhost:3000/api/v1/checkout/portal", {
      method: "POST",
    });

    const response = await portalPost(request);
    const payload = (await response.json()) as {
      code: string;
      portalUrl: string;
    };

    expect(stripeCtorMock).toHaveBeenCalledWith("sk_test_stripe");
    expect(createPortalSessionMock).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "http://localhost:3000/dashboard?portal=return",
    });

    expect(response.status).toBe(200);
    expect(payload.code).toBe("ok");
    expect(payload.portalUrl).toBe("https://billing.stripe.com/p/session/test_123");
  });

  it("returns 500 when Stripe portal session creation fails", async () => {
    authMock.mockResolvedValue({ userId: "user_123" });
    getCurrentAccountViewMock.mockResolvedValue({
      authConfigured: true,
      isAuthenticated: true,
      account: {
        accountId: "acct_1",
        authProviderUserId: "user_123",
        email: "user@example.com",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        tier: "pro",
        status: "active",
        entitledChain: "ethereum",
        historyUnlocked: true,
        currentPeriodEnd: "2026-04-01T00:00:00.000Z",
        createdAt: "2026-03-01T00:00:00.000Z",
      },
      snapshot: {
        tier: "pro",
        status: "active",
        entitledChain: "ethereum",
        historyUnlocked: true,
        maxWindowDays: 365,
        allowedChains: ["ethereum"],
      },
      apiKeys: [],
      tierLabel: "Pro",
      entitledChainLabel: "ethereum",
      historyDepthLabel: "365d",
    });
    createPortalSessionMock.mockRejectedValue(new Error("Stripe portal unavailable"));

    const request = new Request("http://localhost:3000/api/v1/checkout/portal", {
      method: "POST",
    });

    const response = await portalPost(request);
    const payload = (await response.json()) as { code: string; detail: string | null };

    expect(response.status).toBe(500);
    expect(payload.code).toBe("server_error");
    expect(payload.detail).toBe("Stripe portal unavailable");
  });
});