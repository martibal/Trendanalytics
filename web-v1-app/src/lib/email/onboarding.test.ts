/**
 * @jest-environment node
 */

describe("sendOnboardingEmail", () => {
  const originalEnv = process.env;
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    fetchMock.mockReset();
    global.fetch = fetchMock;
    process.env = {
      ...originalEnv,
      URD_EMAIL_ONBOARDING_ENABLED: undefined,
      URD_EMAIL_FROM: undefined,
      RESEND_API_KEY: undefined,
      NEXT_PUBLIC_APP_URL: undefined,
      URD_APP_URL: undefined,
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("is disabled by default", async () => {
    const { sendOnboardingEmail } = await import("./onboarding");

    await expect(
      sendOnboardingEmail({
        to: "user@example.com",
        plan: "basic",
        kind: "welcome",
        entitledChain: "bitcoin",
      })
    ).resolves.toEqual({
      status: "disabled",
      reason: "not_enabled",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips when enabled but provider config is incomplete", async () => {
    process.env.URD_EMAIL_ONBOARDING_ENABLED = "true";
    process.env.URD_EMAIL_FROM = "hello@urdatlas.com";

    const { sendOnboardingEmail } = await import("./onboarding");

    await expect(
      sendOnboardingEmail({
        to: "user@example.com",
        plan: "pro",
        kind: "api_access_guidance",
      })
    ).resolves.toEqual({
      status: "skipped",
      reason: "missing_provider_config",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends bounded onboarding copy without access values", async () => {
    process.env.URD_EMAIL_ONBOARDING_ENABLED = "true";
    process.env.URD_EMAIL_FROM = "hello@urdatlas.com";
    process.env.RESEND_API_KEY = "resend_test_value";
    process.env.NEXT_PUBLIC_APP_URL = "https://www.urdatlas.com/";

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "email_123" }),
    });

    const { sendOnboardingEmail } = await import("./onboarding");

    await expect(
      sendOnboardingEmail({
        to: "user@example.com",
        plan: "basic",
        kind: "welcome",
        entitledChain: "bitcoin",
      })
    ).resolves.toEqual({
      status: "sent",
      provider: "resend",
      providerId: "email_123",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(request.body));
    const combined = [body.subject, body.text, body.html].join("\n");

    expect(body.from).toBe("hello@urdatlas.com");
    expect(body.to).toBe("user@example.com");
    expect(combined).toContain("Welcome to Urd Atlas");
    expect(combined).toContain("dashboard");
    expect(combined).toContain("getting started guide");
    expect(combined).toContain("bitcoin");
    expect(combined).not.toMatch(/ta_live_[a-f0-9]{48}/u);
    expect(combined).not.toContain("resend_test_value");
  });
});
