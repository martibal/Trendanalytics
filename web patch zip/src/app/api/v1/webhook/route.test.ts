/**
 * @jest-environment node
 */

export {};

const constructEventMock = jest.fn();
const upsertSubscriptionMock = jest.fn();
const findUniqueSubscriptionMock = jest.fn();
const updateManyApiKeysMock = jest.fn();
const findUniqueAccountMock = jest.fn();
const upsertAccountMock = jest.fn();
const stripeCtorMock = jest.fn();

jest.mock("stripe", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation((...args: unknown[]) => {
      stripeCtorMock(...args);
      return {
        webhooks: {
          constructEvent: (...constructArgs: unknown[]) =>
            constructEventMock(...constructArgs),
        },
      };
    }),
  };
});

jest.mock("@/lib/db", () => ({
  db: {
    account: {
      findUnique: (...args: unknown[]) => findUniqueAccountMock(...args),
      upsert: (...args: unknown[]) => upsertAccountMock(...args),
    },
    subscription: {
      findUnique: (...args: unknown[]) => findUniqueSubscriptionMock(...args),
      upsert: (...args: unknown[]) => upsertSubscriptionMock(...args),
    },
    apiKey: {
      updateMany: (...args: unknown[]) => updateManyApiKeysMock(...args),
    },
  },
}));

type MockJsonResponse = {
  status: number;
  json: () => Promise<unknown>;
};

let webhookPost: (request: Request) => Promise<MockJsonResponse>;
const originalEnv = process.env;

function makeRequest(payload: unknown, signature?: string) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (signature !== undefined) {
    headers["stripe-signature"] = signature;
  }

  return new Request("http://localhost:3000/api/v1/webhook", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

describe("/api/v1/webhook route", () => {
  beforeAll(async () => {
    process.env = {
      ...originalEnv,
      STRIPE_SECRET_KEY: "sk_test_stripe",
      STRIPE_WEBHOOK_SECRET: "whsec_test_123",
    };

    const routeModule = await import("@/app/api/v1/webhook/route");
    webhookPost = routeModule.POST as unknown as (
      request: Request
    ) => Promise<MockJsonResponse>;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.STRIPE_SECRET_KEY = "sk_test_stripe";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123";

    upsertSubscriptionMock.mockResolvedValue({});
    findUniqueSubscriptionMock.mockResolvedValue({ accountId: "acct_1" });
    updateManyApiKeysMock.mockResolvedValue({ count: 1 });
    findUniqueAccountMock.mockResolvedValue({ id: "acct_1" });
    upsertAccountMock.mockResolvedValue({});
  });

  it("returns 503 when stripe webhook config is missing", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "";

    const request = makeRequest({ id: "evt_1" }, "sig_test");
    const response = await webhookPost(request);
    const payload = (await response.json()) as {
      code: string;
      detail: string | null;
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("webhook_not_configured");
    expect(payload.detail).toBe("Missing STRIPE_WEBHOOK_SECRET.");
    expect(constructEventMock).not.toHaveBeenCalled();
  });

  it("returns 400 when stripe signature is missing", async () => {
    const request = makeRequest({ id: "evt_1" });
    const response = await webhookPost(request);
    const payload = (await response.json()) as {
      code: string;
      detail: string | null;
    };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("invalid_signature");
    expect(payload.detail).toBe("Missing stripe-signature.");
    expect(constructEventMock).not.toHaveBeenCalled();
  });

  it("returns 400 when stripe signature verification fails", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature for payload.");
    });

    const request = makeRequest({ id: "evt_bad" }, "sig_test");
    const response = await webhookPost(request);
    const payload = (await response.json()) as {
      code: string;
      detail: string | null;
    };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("invalid_signature");
    expect(payload.detail).toBe(
      "No signatures found matching the expected signature for payload."
    );
  });

  it("handles customer.subscription.created by upserting subscription and activating keys", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_created",
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_stripe_123",
          customer: "cus_123",
          status: "active",
          current_period_end: 1775001600,
          metadata: {
            account_id: "acct_1",
            entitled_chain: "bitcoin",
            history_unlocked: "false",
            checkout_plan: "basic",
          },
          items: {
            data: [],
          },
        },
      },
    });

    const request = makeRequest({ any: "payload" }, "sig_test");
    const response = await webhookPost(request);
    const payload = (await response.json()) as { code?: string; received?: boolean };

    expect(response.status).toBe(200);
    expect(payload.code ?? "ok").toBe("ok");
    expect(upsertAccountMock).toHaveBeenCalledWith({
      where: { id: "acct_1" },
      update: {},
      create: {
        id: "acct_1",
        authProviderUserId: "stripe:cus_123",
        email: null,
      },
    });
    expect(upsertSubscriptionMock).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_123" },
      update: {
        stripeSubscriptionId: "sub_stripe_123",
        tier: "basic",
        historyUnlocked: false,
        entitledChain: "bitcoin",
        status: "active",
        currentPeriodEnd: new Date(1775001600 * 1000),
      },
      create: {
        accountId: "acct_1",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_stripe_123",
        tier: "basic",
        historyUnlocked: false,
        entitledChain: "bitcoin",
        status: "active",
        currentPeriodEnd: new Date(1775001600 * 1000),
      },
    });
    expect(updateManyApiKeysMock).toHaveBeenCalledWith({
      where: { accountId: "acct_1" },
      data: { status: "active" },
    });
  });

  it("handles customer.subscription.updated by updating entitlement snapshot and activating keys", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_updated",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_stripe_123",
          customer: "cus_123",
          status: "active",
          current_period_end: 1775001600,
          metadata: {
            account_id: "acct_1",
            entitled_chain: "ethereum",
            history_unlocked: "true",
            checkout_plan: "pro",
          },
          items: {
            data: [],
          },
        },
      },
    });

    const request = makeRequest({ any: "payload" }, "sig_test");
    const response = await webhookPost(request);
    const payload = (await response.json()) as { code?: string; received?: boolean };

    expect(response.status).toBe(200);
    expect(payload.code ?? "ok").toBe("ok");
    expect(upsertAccountMock).toHaveBeenCalledWith({
      where: { id: "acct_1" },
      update: {},
      create: {
        id: "acct_1",
        authProviderUserId: "stripe:cus_123",
        email: null,
      },
    });
    expect(upsertSubscriptionMock).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_123" },
      update: {
        stripeSubscriptionId: "sub_stripe_123",
        tier: "pro",
        historyUnlocked: true,
        entitledChain: "ethereum",
        status: "active",
        currentPeriodEnd: new Date(1775001600 * 1000),
      },
      create: {
        accountId: "acct_1",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_stripe_123",
        tier: "pro",
        historyUnlocked: true,
        entitledChain: "ethereum",
        status: "active",
        currentPeriodEnd: new Date(1775001600 * 1000),
      },
    });
    expect(updateManyApiKeysMock).toHaveBeenCalledWith({
      where: { accountId: "acct_1" },
      data: { status: "active" },
    });
  });

  it("handles customer.subscription.deleted by suspending api keys", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_deleted",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_stripe_123",
          customer: "cus_123",
          status: "canceled",
          current_period_end: null,
          metadata: {
            account_id: "acct_1",
            entitled_chain: "bitcoin",
            history_unlocked: "false",
            checkout_plan: "basic",
          },
          items: {
            data: [],
          },
        },
      },
    });

    const request = makeRequest({ any: "payload" }, "sig_test");
    const response = await webhookPost(request);
    const payload = (await response.json()) as { code?: string; received?: boolean };

    expect(response.status).toBe(200);
    expect(payload.code ?? "ok").toBe("ok");
    expect(upsertSubscriptionMock).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_123" },
      update: {
        stripeSubscriptionId: "sub_stripe_123",
        tier: "basic",
        historyUnlocked: false,
        entitledChain: "bitcoin",
        status: "inactive",
        currentPeriodEnd: null,
      },
      create: {
        accountId: "acct_1",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_stripe_123",
        tier: "basic",
        historyUnlocked: false,
        entitledChain: "bitcoin",
        status: "inactive",
        currentPeriodEnd: null,
      },
    });
    expect(updateManyApiKeysMock).toHaveBeenCalledWith({
      where: { accountId: "acct_1" },
      data: { status: "suspended" },
    });
  });

  it("handles checkout.session.completed without failing", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_checkout_done",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          mode: "subscription",
          customer: "cus_123",
          subscription: "sub_stripe_123",
          client_reference_id: "acct_1",
          customer_details: {
            email: "test@example.com",
          },
          metadata: {
            account_id: "acct_1",
            auth_provider_user_id: "user_123",
            entitled_chain: "ethereum",
            history_unlocked: "true",
            checkout_plan: "pro",
          },
        },
      },
    });

    const request = makeRequest({ any: "payload" }, "sig_test");
    const response = await webhookPost(request);
    const payload = (await response.json()) as { code?: string; received?: boolean };

    expect(response.status).toBe(200);
    expect(payload.code ?? "ok").toBe("ok");
    expect(upsertAccountMock).toHaveBeenCalledWith({
      where: { id: "acct_1" },
      update: {
        authProviderUserId: "user_123",
        email: "test@example.com",
      },
      create: {
        id: "acct_1",
        authProviderUserId: "user_123",
        email: "test@example.com",
      },
    });
    expect(upsertSubscriptionMock).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_123" },
      update: {
        stripeSubscriptionId: "sub_stripe_123",
        tier: "pro",
        historyUnlocked: true,
        entitledChain: "ethereum",
        status: "active",
        currentPeriodEnd: null,
      },
      create: {
        accountId: "acct_1",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_stripe_123",
        tier: "pro",
        historyUnlocked: true,
        entitledChain: "ethereum",
        status: "active",
        currentPeriodEnd: null,
      },
    });
    expect(updateManyApiKeysMock).toHaveBeenCalledWith({
      where: { accountId: "acct_1" },
      data: { status: "active" },
    });
  });

  it("ignores unrelated event types safely", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_other",
      type: "invoice.created",
      data: {
        object: {
          id: "in_123",
        },
      },
    });

    const request = makeRequest({ any: "payload" }, "sig_test");
    const response = await webhookPost(request);
    const payload = (await response.json()) as { received?: boolean; code?: string };

    expect(response.status).toBe(200);
    expect(payload.received ?? true).toBe(true);
    expect(upsertSubscriptionMock).not.toHaveBeenCalled();
    expect(updateManyApiKeysMock).not.toHaveBeenCalled();
    expect(upsertAccountMock).not.toHaveBeenCalled();
  });
});