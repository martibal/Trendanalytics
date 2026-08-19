import { expect, test, type Page } from "@playwright/test";

async function openMobileHome(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", {
      name: "Know the network conditions behind your data.",
    })
  ).toBeVisible();
}

test.describe("mobile homepage", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("renders the mobile-first opening without horizontal page overflow", async ({
    page,
  }) => {
    await openMobileHome(page);

    await expect(
      page.getByText(/swipe for all chains.*tap a chain for details/i)
    ).toBeVisible();
    await expect(page.locator("#mobile-product")).toBeAttached();
    await expect(page.locator("#mobile-why")).toBeAttached();

    const measurements = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
    }));
    expect(measurements.pageWidth).toBeLessThanOrEqual(
      measurements.viewport + 1
    );
  });

  test("exposes compact graph ranges and chain-specific status detail", async ({
    page,
  }) => {
    await openMobileHome(page);

    await expect(
      page.getByRole("button", { name: "7D", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "14D", exact: true })
    ).toBeVisible();

    const btcStatus = page.locator("button").filter({ hasText: /^BTC/ }).first();
    await expect(btcStatus).toBeVisible();
    await btcStatus.click();

    await expect(
      page.getByText("What is driving this state", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText(/confidence describes how strongly/i)
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Close", exact: true })
      .click();
  });

  test("adds Urd Atlas context on demand", async ({ page }) => {
    await openMobileHome(page);

    const contextButton = page.getByRole("button", {
      name: "Add Urd Atlas context",
      exact: true,
    });
    const section = contextButton.locator("xpath=ancestor::section[1]");
    await contextButton.click();

    await expect(section.getByText("CHEAP", { exact: true })).toBeVisible();
    await expect(section.getByText("92%", { exact: true })).toBeVisible();
  });

  test("opens a published JSON artifact", async ({ page }) => {
    await openMobileHome(page);

    const product = page.locator("#mobile-product");
    const openJson = product
      .locator("button")
      .filter({ hasText: "Open JSON" })
      .first();
    await expect(openJson).toBeVisible();
    await openJson.click();

    const json = page.locator("pre").last();
    await expect(json).toBeVisible();
    await expect(json).not.toHaveText("null");
  });
});
