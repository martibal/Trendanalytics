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