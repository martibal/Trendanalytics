/**
 * @jest-environment node
 */

export {};

type MockJsonResponse = {
  status: number;
  json: () => Promise<unknown>;
};

let webhookPost: (request: Request) => Promise<MockJsonResponse>;

beforeAll(async () => {
  const routeModule = await import("@/app/api/v1/webhook/route");

  webhookPost = routeModule.POST as unknown as (
    request: Request
  ) => Promise<MockJsonResponse>;
});

describe("/api/v1/webhook deprecated route", () => {
  it("returns 410 and points callers to the active Stripe route", async () => {
    const request = new Request("http://localhost:3000/api/v1/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: "deprecated_event_placeholder",
        type: "deprecated.event",
      }),
    });

    const response = await webhookPost(request);
    const payload = (await response.json()) as {
      code: string;
      message: string;

    };

    expect(response.status).toBe(410);
    expect(payload.code).toBe("deprecated_webhook_endpoint");
    expect(payload.message).toBe("Use /api/v1/stripe/webhook for Stripe webhook delivery.");
  });
});
