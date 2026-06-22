/**
 * @jest-environment node
 */

export {};

const authMock = jest.fn();
const findUniqueMock = jest.fn();
const createMock = jest.fn();
const updateMock = jest.fn();
const findFirstMock = jest.fn();

jest.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    account: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
    apiKey: {
      create: (...args: unknown[]) => createMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
      findFirst: (...args: unknown[]) => findFirstMock(...args),
    },
  },
}));

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

type MockJsonRequest = {
  headers: Headers;
  method: string;
  url: string;
  json: () => Promise<unknown>;
};

type MockJsonResponse = {
  status: number;
  headers?: Headers;
  json: () => Promise<unknown>;
};

function mockJsonRequest(body: unknown, method = "POST"): MockJsonRequest {
  return {
    headers: new Headers({
      origin: "https://www.urdatlas.com",
    }),
    method,
    url: "https://www.urdatlas.com/api/v1/keys",
    json: async () => body,
  };
}

let keysPost: (request: MockJsonRequest) => Promise<MockJsonResponse>;
let keysDelete: (request: MockJsonRequest) => Promise<MockJsonResponse>;

beforeAll(async () => {
  const routeModule = await import("@/app/api/v1/keys/route");

  keysPost = routeModule.POST as unknown as (
    request: MockJsonRequest
  ) => Promise<MockJsonResponse>;

  keysDelete = routeModule.DELETE as unknown as (
    request: MockJsonRequest
  ) => Promise<MockJsonResponse>;
});

describe("/api/v1/keys route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST", () => {
    it("returns 401 when unauthenticated", async () => {
      authMock.mockResolvedValue({ userId: null });

      const request = mockJsonRequest({ label: "local dev" });

      const response = await keysPost(request);
      const payload = (await response.json()) as { code: string };

      expect(response.status).toBe(401);
      expect(payload.code).toBe("unauthenticated");
      expect(createMock).not.toHaveBeenCalled();
    });

    it("returns 404 when the authenticated user has no linked account", async () => {
      authMock.mockResolvedValue({ userId: "user_123" });
      findUniqueMock.mockResolvedValue(null);

      const request = mockJsonRequest({ label: "local dev" });

      const response = await keysPost(request);
      const payload = (await response.json()) as { code: string };

      expect(findUniqueMock).toHaveBeenCalled();
      expect(response.status).toBe(404);
      expect(payload.code).toBe("account_not_found");
      expect(createMock).not.toHaveBeenCalled();
    });

    it("returns 403 when the subscription is inactive", async () => {
      authMock.mockResolvedValue({ userId: "user_123" });
      findUniqueMock.mockResolvedValue({
        id: "acct_1",
        subscriptions: [{ status: "inactive" }],
        apiKeys: [],
      });

      const request = mockJsonRequest({ label: "local dev" });

      const response = await keysPost(request);
      const payload = (await response.json()) as { code: string };

      expect(response.status).toBe(403);
      expect(payload.code).toBe("inactive_subscription");
      expect(createMock).not.toHaveBeenCalled();
    });

    it("returns 409 when two non-revoked keys already exist", async () => {
      authMock.mockResolvedValue({ userId: "user_123" });
      findUniqueMock.mockResolvedValue({
        id: "acct_1",
        subscriptions: [{ status: "active" }],
        apiKeys: [
          { id: "k1", status: "active" },
          { id: "k2", status: "suspended" },
        ],
      });

      const request = mockJsonRequest({ label: "local dev" });

      const response = await keysPost(request);
      const payload = (await response.json()) as { code: string };

      expect(response.status).toBe(409);
      expect(payload.code).toBe("key_limit_reached");
      expect(createMock).not.toHaveBeenCalled();
    });

    it("creates an api key and returns the one-time secret", async () => {
      authMock.mockResolvedValue({ userId: "user_123" });
      findUniqueMock.mockResolvedValue({
        id: "acct_1",
        subscriptions: [{ status: "active" }],
        apiKeys: [],
      });

      createMock.mockResolvedValue({
        id: "key_1",
        label: "local dev",
        keyPrefix: "ta_live_abcd",
        keyLast4: "1234",
        status: "active",
        createdAt: new Date("2026-03-18T12:00:00.000Z"),
      });

      const request = mockJsonRequest({ label: "local dev" });

      const response = await keysPost(request);
      const payload = (await response.json()) as {
        secret: string;
        key: {
          id: string;
          label: string | null;
          status: string;
        };
      };

      expect(response.status).toBe(201);
      expect(payload.secret).toMatch(/^ta_live_/);
      expect(payload.key.id).toBe("key_1");
      expect(payload.key.label).toBe("local dev");
      expect(payload.key.status).toBe("active");

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accountId: "acct_1",
            label: "local dev",
            status: "active",
            keyHash: expect.stringContaining("scrypt:"),
          }),
        })
      );
    });
  });

  describe("DELETE", () => {
    it("returns 401 when unauthenticated", async () => {
      authMock.mockResolvedValue({ userId: null });

      const request = mockJsonRequest({ keyId: "key_1" }, "DELETE");

      const response = await keysDelete(request);
      const payload = (await response.json()) as { code: string };

      expect(response.status).toBe(401);
      expect(payload.code).toBe("unauthenticated");
      expect(updateMock).not.toHaveBeenCalled();
    });

    it("returns 400 when keyId is missing", async () => {
      authMock.mockResolvedValue({ userId: "user_123" });
      findUniqueMock.mockResolvedValue({
        id: "acct_1",
        subscriptions: [{ status: "active" }],
        apiKeys: [],
      });

      const request = mockJsonRequest({}, "DELETE");

      const response = await keysDelete(request);
      const payload = (await response.json()) as { code: string };

      expect(response.status).toBe(400);
      expect(payload.code).toBe("invalid_request");
      expect(updateMock).not.toHaveBeenCalled();
    });

    it("returns 404 when the key does not belong to the account", async () => {
      authMock.mockResolvedValue({ userId: "user_123" });
      findUniqueMock.mockResolvedValue({
        id: "acct_1",
        subscriptions: [{ status: "active" }],
        apiKeys: [],
      });
      findFirstMock.mockResolvedValue(null);

      const request = mockJsonRequest({ keyId: "key_missing" }, "DELETE");

      const response = await keysDelete(request);
      const payload = (await response.json()) as { code: string };

      expect(response.status).toBe(404);
      expect(payload.code).toBe("not_found");
      expect(updateMock).not.toHaveBeenCalled();
    });

    it("revokes an existing active key", async () => {
      authMock.mockResolvedValue({ userId: "user_123" });
      findUniqueMock.mockResolvedValue({
        id: "acct_1",
        subscriptions: [{ status: "active" }],
        apiKeys: [],
      });
      findFirstMock.mockResolvedValue({
        id: "key_1",
        status: "active",
      });

      const request = mockJsonRequest({ keyId: "key_1" }, "DELETE");

      const response = await keysDelete(request);
      const payload = (await response.json()) as {
        revoked: boolean;
        keyId: string;
      };

      expect(response.status).toBe(200);
      expect(payload.revoked).toBe(true);
      expect(payload.keyId).toBe("key_1");

      expect(updateMock).toHaveBeenCalledWith({
        where: { id: "key_1" },
        data: { status: "revoked" },
      });
    });

    it("does not update an already revoked key but still returns success", async () => {
      authMock.mockResolvedValue({ userId: "user_123" });
      findUniqueMock.mockResolvedValue({
        id: "acct_1",
        subscriptions: [{ status: "active" }],
        apiKeys: [],
      });
      findFirstMock.mockResolvedValue({
        id: "key_1",
        status: "revoked",
      });

      const request = mockJsonRequest({ keyId: "key_1" }, "DELETE");

      const response = await keysDelete(request);
      const payload = (await response.json()) as {
        revoked: boolean;
      };

      expect(response.status).toBe(200);
      expect(payload.revoked).toBe(true);
      expect(updateMock).not.toHaveBeenCalled();
    });
  });
});