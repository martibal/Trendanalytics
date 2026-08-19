import { expect, test } from "@playwright/test";

test.describe("mobile homepage", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps the opening product explanation readable", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    await expect(page.getByRole("heading", { name: "Know the network conditions behind your data." })).toBeVisible();
    await expect(page.getByText(/one classified observation per chain and date/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Inspect the product" })).toHaveAttribute("href", "#mobile-product");
  });

  test("makes the horizontal chain strip discoverable without widening the page", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    await expect(page.getByText(/swipe for all chains.*tap a chain for details/i)).toBeVisible();
    const measurements = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, pageWidth: document.documentElement.scrollWidth }));
    expect(measurements.pageWidth).toBeLessThanOrEqual(measurements.viewport + 1);
    const btc = page.getByRole("button", { name: /BTC/i }).first();
    await expect(btc).toBeVisible();
    const stripWidths = await btc.evaluate((element) => {
      const strip = element.parentElement;
      return strip ? { client: strip.clientWidth, scroll: strip.scrollWidth } : { client: 0, scroll: 0 };
    });
    expect(stripWidths.scroll).toBeGreaterThan(stripWidths.client);
  });

  test("uses compact seven and fourteen day graph ranges", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    await expect(page.getByRole("button", { name: "7D" })).toBeVisible();
    await expect(page.getByRole("button", { name: "14D" })).toBeVisible();
    await expect(page.getByText(/each band is a network state/i)).toBeVisible();
  });

  test("opens chain-specific status detail", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    await page.getByRole("button", { name: /BTC/i }).first().click();
    await expect(page.getByText("What is driving this state")).toBeVisible();
    await expect(page.getByText(/confidence describes how strongly/i)).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
  });

  test("expands Urd Atlas context without horizontal overflow", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    await page.getByRole("button", { name: "Add Urd Atlas context" }).click();
    await expect(page.getByText("CHEAP", { exact: true })).toBeVisible();
    await expect(page.getByText("92%", { exact: true })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("opens published JSON and switches artifact", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    await page.getByRole("button", { name: "Open JSON" }).first().click();
    await expect(page.locator("pre").last()).toBeVisible();
    await page.getByRole("button", { name: "Gold" }).last().click();
    await expect(page.locator("pre").last()).toBeVisible();
    await page.getByRole("button", { name: "Close" }).last().click();
  });
});
