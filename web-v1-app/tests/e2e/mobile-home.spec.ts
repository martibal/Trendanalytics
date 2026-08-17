import { expect, test } from "@playwright/test";

test.describe("mobile homepage regression", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps specimen strips, instrument reading and full JSON usable", async ({ page }) => {
    await page.goto("http://localhost:3000/mobile");

    const chainStrip = page.locator(".ua-specimen-strip");
    const artifactStrip = page.locator(".ua-artifact-strip");
    const priceTable = page.locator(".ua-price-table");

    await expect(chainStrip).toBeVisible();
    await expect(artifactStrip).toBeVisible();
    await expect(priceTable).toBeVisible();
    await expect(page.getByRole("group", { name: "Chain selector" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Artifact selector" })).toBeVisible();

    const chainTags = chainStrip.locator(".ua-specimen-tag");
    await expect(chainTags).toHaveCount(4);
    for (const chainId of ["bitcoin", "ethereum", "arbitrum", "base"]) {
      await expect(chainStrip.locator(`.ua-specimen-tag[data-chain="${chainId}"]`)).toHaveCount(1);
    }

    await expect(artifactStrip.locator(".ua-artifact")).toHaveCount(4);
    await expect(priceTable.locator(".ua-price-row")).toHaveCount(3);

    for (const strip of [chainStrip, artifactStrip]) {
      const isHorizontallyScrollable = await strip.evaluate((element) => element.scrollWidth > element.clientWidth);
      expect(isHorizontallyScrollable).toBeTruthy();
    }

    const instrument = page.locator(".ua-instrument");
    await expect(instrument).toBeVisible();
    await expect(instrument.locator(".ua-needle")).toHaveCount(3);

    const demandHelp = page.getByRole("button", { name: "Explain Demand" });
    await demandHelp.focus();
    await page.keyboard.press("Enter");
    await expect(demandHelp).toHaveAttribute("aria-expanded", "true");
    await expect(demandHelp).toHaveAttribute("aria-controls", "ua3-info-demand");

    const demandDialog = page.getByRole("dialog", { name: "Demand" });
    await expect(demandDialog).toBeVisible();
    await expect(demandDialog.getByRole("button", { name: "Close explanation" })).toBeFocused();
    await demandDialog.getByRole("button", { name: "Close explanation" }).click();
    await expect(demandDialog).toHaveCount(0);
    await expect(demandHelp).toBeFocused();

    const openJson = page.getByRole("button", { name: /view complete json/i });
    await expect(openJson).toBeVisible();
    await expect(openJson).toHaveAttribute("aria-haspopup", "dialog");
    await openJson.click();

    const dialog = page.getByRole("dialog", { name: /meta .*\.json/i });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog).toHaveAttribute("aria-labelledby", "json-modal-title");
    await expect(dialog.getByRole("button", { name: /^copy$/i })).toBeVisible();
    const closeButton = dialog.getByRole("button", { name: /^close$/i });
    await expect(closeButton).toBeVisible();
    await expect(closeButton).toBeFocused();

    const tree = dialog.getByLabel("Full published JSON tree");
    await expect(tree).toBeVisible();
    const summaries = tree.locator("summary");
    expect(await summaries.count()).toBeGreaterThanOrEqual(8);
    const confidenceSummary = summaries.filter({ hasText: "confidence" }).first();
    await expect(confidenceSummary).toBeVisible();
    await confidenceSummary.click();
    await expect(confidenceSummary.locator("xpath=..").locator("pre.ua3-json-complete")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(openJson).toBeFocused();
  });

  test("keeps observation metadata and sample-pack CTA accessible", async ({ page }) => {
    await page.goto("http://localhost:3000/mobile");

    await expect(page.getByText(/DAILY OBSERVATION · NO/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dataset at a glance." })).toBeVisible();
    await expect(page.locator(".ua-dataset-fact")).toHaveCount(3);

    const sampleLink = page.getByRole("link", { name: "Inspect the sample pack" });
    await expect(sampleLink).toBeVisible();
    await expect(sampleLink).toHaveAttribute("href", "/api/v1/sample-pack");
    await sampleLink.focus();
    await expect(sampleLink).toBeFocused();

    const bronze = await sampleLink.evaluate((element) => window.getComputedStyle(element).borderRadius);
    expect(bronze).toBe("4px");
  });

  test("disables instrument CTA motion when reduced motion is requested", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("http://localhost:3000/mobile");

    const heroCta = page.locator(".ua-action-instrument");
    await expect(heroCta).toBeVisible();

    const transitionDurations = await heroCta.evaluate((element) =>
      window.getComputedStyle(element).transitionDuration.split(",").map((value) => Number.parseFloat(value))
    );
    expect(transitionDurations.every((duration) => duration === 0)).toBeTruthy();

    await heroCta.hover();
    const transform = await heroCta.evaluate((element) => window.getComputedStyle(element).transform);
    expect(transform).toBe("none");
  });

  test("keeps horizontal specimen navigation and editorial pricing at narrow widths", async ({ page }) => {
    await page.setViewportSize({ width: 339, height: 844 });
    await page.goto("http://localhost:3000/mobile");

    const chainStrip = page.locator(".ua-specimen-strip");
    const artifactStrip = page.locator(".ua-artifact-strip");
    const priceRows = page.locator(".ua-price-row");

    await expect(chainStrip).toBeVisible();
    await expect(artifactStrip).toBeVisible();
    await expect(priceRows).toHaveCount(3);

    for (const strip of [chainStrip, artifactStrip]) {
      const metrics = await strip.evaluate((element) => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
      expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
    }

    const firstPriceRow = priceRows.first();
    const columns = await firstPriceRow.evaluate((element) =>
      window.getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean)
    );
    expect(columns).toHaveLength(2);

    const basic = priceRows.filter({ hasText: "Basic" });
    await expect(basic).toHaveClass(/ua-price-recommended/);
    const borderLeftWidth = await basic.evaluate((element) => window.getComputedStyle(element).borderLeftWidth);
    expect(Number.parseFloat(borderLeftWidth)).toBeGreaterThanOrEqual(7);
  });
});
