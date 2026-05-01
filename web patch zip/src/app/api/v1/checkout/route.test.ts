/**
 * @jest-environment node
 */

export {};

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

describe("/api/v1/checkout route", () => {
  it("returns 503 while checkout is temporarily disabled", async () => {
    const routeModule = await import("@/app/api/v1/checkout/route");
    const post = routeModule.POST as unknown as () => Promise<MockJsonResponse>;

    const response = await post();
    const payload = (await response.json()) as {
      code: string;
      message: string;
      detail: string | null;
    };

    expect(response.status).toBe(503);
    expect(payload.code).toBe("checkout_disabled");
    expect(payload.message).toBe("Checkout is temporarily unavailable.");
    expect(payload.detail).toBe(
      "Payments are disabled until business registration and live billing setup are complete."
    );
  });
});
