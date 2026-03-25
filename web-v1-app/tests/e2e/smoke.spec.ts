// tests/e2e/smoke.spec.ts
import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("home page renders core public shell", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/TrendAnalytics/i);
    await expect(
      page.getByRole("link", { name: /^TrendAnalytics$/i }).first()
    ).toBeVisible();

    const primaryNav = page.getByRole("navigation", { name: /primary/i }).first();

    await expect(primaryNav.getByRole("link", { name: /^Chains$/i })).toBeVisible();
    await expect(
      primaryNav.getByRole("link", { name: /^Methodology$/i })
    ).toBeVisible();
    await expect(primaryNav.getByRole("link", { name: /^Glossary$/i })).toBeVisible();
  });

  test("chains index page renders", async ({ page }) => {
    await page.goto("/chains");

    await expect(page).toHaveURL(/\/chains$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /chains/i })
    ).toBeVisible();

    await expect(page.getByRole("link", { name: /bitcoin/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /ethereum/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /arbitrum/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /base/i }).first()).toBeVisible();
  });

  test("bitcoin chain page renders and hides gas_utilization_pct", async ({ page }) => {
    await page.goto("/chains/bitcoin");

    await expect(page).toHaveURL(/\/chains\/bitcoin$/);
    await expect(page.getByText(/bitcoin/i).first()).toBeVisible();
    await expect(page.getByText(/as of:/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /view history/i })).toBeVisible();

    await expect(page.getByText(/gas_utilization_pct/i)).toHaveCount(0);
  });

  test("ethereum chain page renders", async ({ page }) => {
    await page.goto("/chains/ethereum");

    await expect(page).toHaveURL(/\/chains\/ethereum$/);
    await expect(page.getByText(/ethereum/i).first()).toBeVisible();
    await expect(page.getByText(/as of:/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /view history/i })).toBeVisible();
  });

  test("ethereum chain page exposes confidence card shell", async ({ page }) => {
    await page.goto("/chains/ethereum");

    await expect(page).toHaveURL(/\/chains\/ethereum$/);
    await expect(page.getByText(/^confidence$/i)).toBeVisible();
    await expect(page.getByText(/source:\s*confidence\.confidence_score/i)).toBeVisible();
  });

  test("ethereum chain page exposes caution banner when confidence is in caution tier", async ({
    page,
  }) => {
    await page.goto("/chains/ethereum");

    await expect(page).toHaveURL(/\/chains\/ethereum$/);

    await expect(page.getByText(/reduced confidence/i)).toBeVisible();
    await expect(
      page.getByText(
        /confidence is reduced due to limited history or missing components/i
      )
    ).toBeVisible();

    await expect(
      page.getByText(/source:\s*confidence\.confidence_score/i).first()
    ).toBeVisible();
  });

  test("bitcoin chain page does not show caution or degraded banner when confidence is good", async ({
    page,
  }) => {
    await page.goto("/chains/bitcoin");

    await expect(page).toHaveURL(/\/chains\/bitcoin$/);
    await expect(page.getByText(/reduced confidence/i)).toHaveCount(0);
    await expect(page.getByText(/degraded confidence/i)).toHaveCount(0);
  });

  test("arbitrum chain page shows expected-delay staleness banner", async ({ page }) => {
    await page.goto("/chains/arbitrum");

    await expect(page).toHaveURL(/\/chains\/arbitrum$/);

    await expect(page.getByText(/on schedule/i)).toBeVisible();
    await expect(
      page.getByText(/arb policy:\s*expected 7d · soft 10d · hard 15d/i)
    ).toBeVisible();
    await expect(
      page.getByText(
        /this chain is published with an expected delay of approximately 7 days/i
      )
    ).toBeVisible();
    await expect(
      page.getByText(
        /source:\s*meta\.confidence\.lag_days_vs_utc_today/i
      )
    ).toBeVisible();
  });

  test("base chain page shows expected-delay staleness banner", async ({ page }) => {
    await page.goto("/chains/base");

    await expect(page).toHaveURL(/\/chains\/base$/);

    await expect(page.getByText(/on schedule/i)).toBeVisible();
    await expect(
      page.getByText(/base policy:\s*expected 7d · soft 10d · hard 15d/i)
    ).toBeVisible();
    await expect(
      page.getByText(
        /this chain is published with an expected delay of approximately 7 days/i
      )
    ).toBeVisible();
  });

  test("ethereum history page renders canonical traceability shell", async ({ page }) => {
    await page.goto("/chains/ethereum/history");

    await expect(page).toHaveURL(/\/chains\/ethereum\/history$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /ethereum history/i })
    ).toBeVisible();
    await expect(page.getByText(/source:/i)).toBeVisible();
    await expect(page.getByText(/expected delay:\s*0d/i)).toBeVisible();
    await expect(
      page.getByText(/this page reads one canonical published history bundle/i)
    ).toBeVisible();
  });

  test("arbitrum history page shows expected delay of 7d", async ({ page }) => {
    await page.goto("/chains/arbitrum/history");

    await expect(page).toHaveURL(/\/chains\/arbitrum\/history$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /arbitrum history/i })
    ).toBeVisible();
    await expect(page.getByText(/expected delay:\s*7d/i)).toBeVisible();
  });

  test("status page renders", async ({ page }) => {
    await page.goto("/status");

    await expect(page).toHaveURL(/\/status$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /status/i })
    ).toBeVisible();
  });

  test("thresholds page renders", async ({ page }) => {
    await page.goto("/thresholds");

    await expect(page).toHaveURL(/\/thresholds$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /thresholds/i })
    ).toBeVisible();
  });

  test("glossary page renders", async ({ page }) => {
    await page.goto("/glossary");

    await expect(page).toHaveURL(/\/glossary$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /glossary/i })
    ).toBeVisible();
  });

  test("dashboard route renders its shell", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /dashboard/i })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { level: 2, name: /API keys/i })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { level: 2, name: /Subscription snapshot/i })
    ).toBeVisible();
  });

  test("public status api responds with summary and per-chain rows", async ({ request }) => {
    const response = await request.get("/api/v1/status");

    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as {
      ok?: boolean;
      summary?: {
        chain_count?: number;
      };
      chains?: Array<{ chain?: string; status?: string }>;
    };

    expect(body.ok).toBe(true);
    expect(body.summary?.chain_count).toBe(4);
    expect(Array.isArray(body.chains)).toBe(true);
    expect(body.chains).toHaveLength(4);

    const chainIds = body.chains?.map((row) => row.chain);
    expect(chainIds).toEqual(
      expect.arrayContaining(["bitcoin", "ethereum", "arbitrum", "base"])
    );
  });

  test("health-style public api endpoints respond successfully", async ({ request }) => {
    const endpoints = [
      "/api/v1/status",
      "/api/v1/landing",
      "/api/v1/glossary",
      "/api/v1/units",
      "/api/v1/thresholds/defaults",
      "/api/v1/methodology/versions",
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      expect(response.ok(), `${endpoint} should return 2xx`).toBeTruthy();
    }
  });

  test("files api rejects unauthenticated access", async ({ request }) => {
    const response = await request.get("/api/v1/files/meta/bitcoin/latest.json");

    expect(response.status()).toBe(401);

    const body = (await response.json()) as {
      code?: string;
      detail?: string;
    };

    expect(body.code).toBe("unauthenticated");
    expect(typeof body.detail).toBe("string");
  });

  test("theme toggle is present in the public shell", async ({ page }) => {
    await page.goto("/");

    const themeToggle = page.getByRole("button", {
      name: /switch to light mode|switch to dark mode/i,
    });

    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    await expect(themeToggle).toBeVisible();
  });
});