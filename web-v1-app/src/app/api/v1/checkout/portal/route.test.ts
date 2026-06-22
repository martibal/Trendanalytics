/**
 * @jest-environment node
 */

const mockCreatePortalSession = jest.fn();
const mockGetCurrentAccountView = jest.fn();
const mockValidateSameOriginRequest = jest.fn();
const mockEnforcePreAuthRateLimit = jest.fn();

jest.mock("stripe", () =>
  jest.fn().mockImplementation(() => ({
    billingPortal: {
      sessions: {
        create: mockCreatePortalSession,
      },
    },
  }))
);

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: {
        get(name: string) {
          return init?.headers?.[name] ?? null;
        },
        set: jest.fn(),
      },
      async json() {
        return body;
      },
    }),
    redirect: (url: string, init?: { status?: number }) => {
      const headers = new Map<string, string>();

      return {
        status: init?.status ?? 307,
        url,
        headers: {
          set(name: string, value: string) {
            headers.set(name, value);
          },
          get(name: string) {
            return headers.get(name) ?? null;
          },
        },
      };
    },
  },
}));

jest.mock("@/lib/auth/account", () => ({
  getCurrentAccountView: () => mockGetCurrentAccountView(),
}));

jest.mock("@/lib/security/origin", () => ({
  validateSameOriginRequest: (request: Request) => mockValidateSameOriginRequest(request),
}));

jest.mock("@/lib/security/preAuthRateLimit", () => ({
  enforcePreAuthRateLimit: (request: Request, scope: string) =>
    mockEnforcePreAuthRateLimit(request, scope),
}));

type MockJsonResponse = {
  status: number;
  json: () => Promise<unknown>;
};

type MockRedirectResponse = {
  status: number;
  url: string;
  headers: {
    get: (name: string) => string | null;
  };
};

function makeRequest() {
  return {
    method: "POST",
    nextUrl: new URL("https://www.urdatlas.com/api/v1/checkout/portal"),
  } as unknown as Request;
}

describe("/api/v1/checkout/portal route", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    process.env.STRIPE_SECRET_KEY = "stripe-secret-for-test";

    mockValidateSameOriginRequest.mockReturnValue({ ok: true });
    mockEnforcePreAuthRateLimit.mockResolvedValue({ ok: true });
    mockGetCurrentAccountView.mockResolvedValue({
      isAuthenticated: true,
      account: {
        stripeCustomerId: "cus_portal_test",
      },
    });
    mockCreatePortalSession.mockResolvedValue({
      url: "https://billing.stripe.test/session",
    });
  });

  it("returns 503 when the Stripe portal client is not configured", async () => {
    delete process.env.STRIPE_SECRET_KEY;

    const routeModule = await import("@/app/api/v1/checkout/portal/route");
    const response = (await routeModule.POST(makeRequest() as never)) as unknown as MockJsonResponse;
    const payload = (await response.json()) as {
      code: string;
      message: string;
      detail: string | null;
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("portal_not_configured");
    expect(payload.message).toBe("Stripe customer portal is not configured.");
    expect(payload.detail).toBe("Missing STRIPE_SECRET_KEY.");
  });

  it("returns 401 when the user is not signed in", async () => {
    mockGetCurrentAccountView.mockResolvedValueOnce({
      isAuthenticated: false,
      account: null,
    });

    const routeModule = await import("@/app/api/v1/checkout/portal/route");
    const response = (await routeModule.POST(makeRequest() as never)) as unknown as MockJsonResponse;
    const payload = (await response.json()) as {
      code: string;
      message: string;
    };

    expect(response.status).toBe(401);
    expect(payload.code).toBe("unauthenticated");
    expect(payload.message).toBe("Sign in before opening billing management.");
  });

  it("returns 409 when billing is not linked to the account", async () => {
    mockGetCurrentAccountView.mockResolvedValueOnce({
      isAuthenticated: true,
      account: {
        stripeCustomerId: null,
      },
    });

    const routeModule = await import("@/app/api/v1/checkout/portal/route");
    const response = (await routeModule.POST(makeRequest() as never)) as unknown as MockJsonResponse;
    const payload = (await response.json()) as {
      code: string;
      message: string;
    };

    expect(response.status).toBe(409);
    expect(payload.code).toBe("subscription_not_connected");
    expect(payload.message).toBe("Billing is not connected for this account yet.");
  });

  it("creates a Stripe Customer Portal session and redirects the customer", async () => {
    const routeModule = await import("@/app/api/v1/checkout/portal/route");
    const response = (await routeModule.POST(makeRequest() as never)) as unknown as MockRedirectResponse;

    expect(mockCreatePortalSession).toHaveBeenCalledWith({
      customer: "cus_portal_test",
      return_url: "https://www.urdatlas.com/dashboard?billing=portal-return",
    });
    expect(response.status).toBe(303);
    expect(response.url).toBe("https://billing.stripe.test/session");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
