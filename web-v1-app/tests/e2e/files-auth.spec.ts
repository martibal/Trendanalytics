// tests/e2e/files-auth.spec.ts
import { expect, test } from "@playwright/test";

const VALID_API_KEY = process.env.E2E_VALID_API_KEY ?? "";
const VALID_FILE_PATH =
  process.env.E2E_VALID_FILE_PATH ?? "/api/v1/files/meta/bitcoin/latest.json";

test.describe("protected file delivery", () => {
  test("protected file endpoint rejects unauthenticated request", async ({
    request,
  }) => {
    const response = await request.get("/api/v1/files/meta/bitcoin/latest.json");

    expect(response.status()).toBe(401);

    const body = (await response.json()) as {
      code?: string;
      detail?: string;
    };

    expect(body.code).toBe("unauthenticated");
    expect(typeof body.detail).toBe("string");
  });

  test("protected file endpoint rejects clearly invalid api key", async ({
    request,
  }) => {
    const response = await request.get("/api/v1/files/meta/bitcoin/latest.json", {
      headers: {
        "X-API-Key": "ta_invalid_key_for_e2e_only",
      },
    });

    expect([401, 403]).toContain(response.status());

    const body = (await response.json()) as {
      code?: string;
      detail?: string;
    };

    expect(typeof body.code).toBe("string");
    expect(["unauthenticated", "forbidden"]).toContain(body.code ?? "");
  });

  test("protected file endpoint serves json when a valid api key is provided", async ({
    request,
  }) => {
    test.skip(
      !VALID_API_KEY,
      "Set E2E_VALID_API_KEY to run the valid-key delivery scenario."
    );

    const response = await request.get(VALID_FILE_PATH, {
      headers: {
        "X-API-Key": VALID_API_KEY,
      },
    });

    expect(response.status()).toBe(200);

    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType.toLowerCase()).toContain("application/json");

    const body = (await response.json()) as Record<string, unknown>;

    expect(body).toBeTruthy();
    expect(typeof body).toBe("object");

    const serialized = JSON.stringify(body);
    expect(serialized.length).toBeGreaterThan(20);

    const hasExpectedTopLevelSignal =
      "chain" in body ||
      "date" in body ||
      "status" in body ||
      "confidence" in body ||
      "derived" in body ||
      "dataset_id" in body;

    expect(hasExpectedTopLevelSignal).toBe(true);
  });

  test("valid-key response is stable enough to be usable by subscriber tooling", async ({
    request,
  }) => {
    test.skip(
      !VALID_API_KEY,
      "Set E2E_VALID_API_KEY to run the valid-key delivery scenario."
    );

    const response = await request.get(VALID_FILE_PATH, {
      headers: {
        "X-API-Key": VALID_API_KEY,
      },
    });

    expect(response.ok()).toBeTruthy();

    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType.toLowerCase()).toContain("application/json");

    const text = await response.text();

    expect(text.trim().startsWith("{") || text.trim().startsWith("[")).toBe(true);
    expect(text).toContain('"');
    expect(text.length).toBeGreaterThan(20);
  });
});