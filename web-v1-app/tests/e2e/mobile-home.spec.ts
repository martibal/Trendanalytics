import { expect, test, type Page } from "@playwright/test";

async function openMobileHome(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Urd Atlas" })).toBeVisible();
}

test.describe("mobile homepage", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("renders the canonical responsive opening without horizontal page overflow", async ({
    page,
  }) => {
    await openMobileHome(page);

    await expect(page.locator(".ua6-status-stack")).toBeVisible();
    await expect(page.locator("#ua6-data")).toBeAttached();
    await expect(page.locator("#ua6-method")).toBeAttached();

    const measurements = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
    }));
    expect(measurements.pageWidth).toBeLessThanOrEqual(
      measurements.viewport + 1
    );
  });

  test("exposes all four chain states and contextual detail", async ({ page }) => {
    await openMobileHome(page);

    for (const ticker of ["BTC", "ETH", "ARB", "BASE"]) {
      await expect(
        page.locator(".ua6-status-button").filter({ hasText: ticker }).first()
      ).toBeVisible();
    }

    const btcStatus = page.locator(".ua6-status-button").filter({ hasText: "BTC" }).first();
    await btcStatus.click();

    await expect(page.locator(".ua6-status-detail")).toBeVisible();
    await expect(page.locator(".ua6-status-detail")).toContainText(/Bitcoin is currently/i);
    await expect(page.locator(".ua6-status-detail")).toContainText(/Evidence score/i);
  });

  test("keeps the four published JSON layers directly after the hero", async ({ page }) => {
    await openMobileHome(page);

    const data = page.locator("#ua6-data");
    await expect(data.getByRole("heading", { name: "Four JSON files. One daily observation." })).toBeVisible();
    await expect(data.getByRole("button", { name: /Open complete Gold JSON for Bitcoin/i })).toBeVisible();
    await expect(data.getByRole("button", { name: /Open complete Derived JSON for Bitcoin/i })).toBeVisible();
    await expect(data.getByRole("button", { name: /Open complete Meta JSON for Bitcoin/i })).toBeVisible();
    await expect(data.getByRole("button", { name: /Open complete Briefs JSON for Bitcoin/i })).toBeVisible();
  });

  test("opens a real published JSON artifact", async ({ page }) => {
    await openMobileHome(page);

    const openJson = page.getByRole("button", {
      name: /Open complete Meta JSON for Bitcoin/i,
    });
    await openJson.click();

    const json = page.locator("pre").last();
    await expect(json).toBeVisible();
    await expect(json).not.toHaveText("null");
  });
});
