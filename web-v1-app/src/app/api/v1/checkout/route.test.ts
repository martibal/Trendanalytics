/**
 * @jest-environment node
 */

export {};

jest.mock("server-only", () => ({}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: new Headers(init?.headers ?? {}),
      async json() {
        return body;
      },
    }),
    redirect: (url: string | URL, init?: { status?: number }) => ({
      status: init?.status ?? 307,
      headers: new Headers({
        Location: String(url),
      }),
      async json() {
        return null;
      },
    }),
  },
}));

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(async () => ({ userId: null, sessionClaims: {} })),
  currentUser: jest.fn(async () => null),
}));

jest.mock("@/lib/db", () => ({
  db: {
    account: {
      upsert: jest.fn(),
    },
  },
}));

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
  }));
});

type MockJsonResponse = {
  status: number;
  headers: Headers;
  json: () => Promise<unknown>;
};

function makeCheckoutRequest(): Request {
  return new Request("http://localhost:3000/api/v1/checkout?plan=basic", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      host: "localhost:3000",
      "x-forwarded-for": "127.0.0.1",
    },
  });
}

function restoreEnvValue(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

describe("/api/v1/checkout route", () => {
  const originalEnv = {
    VERCEL_ENV: process.env.VERCEL_ENV,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_PRICE_BASIC: process.env.STRIPE_PRICE_BASIC,
    STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    APP_URL: process.env.APP_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  };

  beforeEach(() => {
    jest.resetModules();

    delete process.env.VERCEL_ENV;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_PRICE_BASIC;
    delete process.env.STRIPE_PRICE_PRO;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  });

  afterAll(() => {
    restoreEnvValue("VERCEL_ENV", originalEnv.VERCEL_ENV);
    restoreEnvValue("STRIPE_SECRET_KEY", originalEnv.STRIPE_SECRET_KEY);
    restoreEnvValue("STRIPE_PRICE_BASIC", originalEnv.STRIPE_PRICE_BASIC);
    restoreEnvValue("STRIPE_PRICE_PRO", originalEnv.STRIPE_PRICE_PRO);
    restoreEnvValue("NEXT_PUBLIC_APP_URL", originalEnv.NEXT_PUBLIC_APP_URL);
    restoreEnvValue("APP_URL", originalEnv.APP_URL);
    restoreEnvValue(
      "VERCEL_PROJECT_PRODUCTION_URL",
      originalEnv.VERCEL_PROJECT_PRODUCTION_URL
    );
  });

  it("returns 503 while checkout is not configured", async () => {
    const routeModule = await import("@/app/api/v1/checkout/route");
    const post = routeModule.POST as unknown as (request: Request) => Promise<MockJsonResponse>;

    const response = await post(makeCheckoutRequest());
    const payload = (await response.json()) as {
      code: string;
      message: string;
      detail: string | null;
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("checkout_not_configured");
    expect(payload.message).toBe("Checkout is not configured.");
    expect(payload.detail).toBe("Missing STRIPE_SECRET_KEY.");
  });
});