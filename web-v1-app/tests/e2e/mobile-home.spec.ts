import { expect, test } from "@playwright/test";

test.describe("mobile homepage from-scratch composition", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("puts the problem, solution, proof and live product into the opening mobile sequence", async ({ page }) => {
    await page.goto("http://localhost:3000/mobile");
    await expect(page.getByRole("heading", { name: "Know whether Tuesday was you — or the network." })).toBeVisible();
    await expect(page.getByText(/one versioned daily observation per chain/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dataset at a glance." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today's published network state." })).toBeVisible();

    const stateTop = await page.locator("#today-status").evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
    expect(stateTop).toBeLessThan(1.5 * 844 + 180);

    const sampleLink = page.getByRole("link", { name: "Inspect the sample pack" });
    await expect(sampleLink).toHaveAttribute("href", "/api/v1/sample-pack");
  });

  test("uses confidence-weighted unequal chain widths and one shared instrument scale", async ({ page }) => {
    await page.goto("http://localhost:3000/mobile");
    const strip = page.getByRole("group", { name: "Confidence-weighted chain timeline" });
    await expect(strip).toBeVisible();
    const slices = strip.locator(".ua4-chain-slice");
    await expect(slices).toHaveCount(4);

    const widths = await slices.evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().width)));
    expect(new Set(widths).size).toBeGreaterThan(1);

    const confidenceBySlice = await slices.evaluateAll((elements) => elements.map((element) => ({
      width: element.getBoundingClientRect().width,
      confidence: Number.parseFloat(element.querySelector("strong")?.textContent ?? "0"),
    })));
    const highest = [...confidenceBySlice].sort((a, b) => b.confidence - a.confidence)[0];
    const lowest = [...confidenceBySlice].sort((a, b) => a.confidence - b.confidence)[0];
    expect(highest.width).toBeGreaterThan(lowest.width);

    const axis = page.getByLabel("Demand, friction and capacity on a shared zero to one hundred scale");
    await expect(axis).toBeVisible();
    await expect(axis.locator(".ua4-axis-point")).toHaveCount(3);
  });

  test("uses the asymmetric file mosaic, overlapped JSON and a real pricing table", async ({ page }) => {
    await page.goto("http://localhost:3000/mobile");
    const stage = page.getByTestId("ua4-files-stage");
    await expect(stage).toBeVisible();
    await expect(stage.locator(".ua4-file")).toHaveCount(4);

    const meta = stage.locator(".ua4-file-meta");
    const gold = stage.locator(".ua4-file-gold");
    const metaBox = await meta.boundingBox();
    const goldBox = await gold.boundingBox();
    expect(metaBox?.height ?? 0).toBeGreaterThan(goldBox?.height ?? 0);

    const preview = stage.locator(".ua4-json-preview");
    const previewBox = await preview.boundingBox();
    expect(previewBox?.x ?? 0).toBeGreaterThan(metaBox?.x ?? 0);
    expect(previewBox?.x ?? 0).toBeLessThan((metaBox?.x ?? 0) + (metaBox?.width ?? 0));

    const table = page.getByTestId("ua4-pricing-table");
    await expect(table).toBeVisible();
    await expect(table.locator("thead th")).toHaveCount(4);
    await expect(table.locator("tbody tr")).toHaveCount(5);
    const basicTop = await table.locator("thead .ua4-basic-col").evaluate((element) => window.getComputedStyle(element).borderTopWidth);
    expect(Number.parseFloat(basicTop)).toBeGreaterThanOrEqual(4);
  });

  test("renders the semantic regime plane, confidence overlap and balance-scale metaphor", async ({ page }) => {
    await page.goto("http://localhost:3000/mobile");
    const plane = page.getByRole("img", { name: /Regime map with Friction/i });
    await expect(plane).toBeVisible();
    for (const label of ["CHEAP", "STABLE", "HEATING", "CONGESTED"]) {
      await expect(plane.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(page.locator(".ua4-confidence-venn .ua4-circle")).toHaveCount(2);
    await expect(page.getByRole("img", { name: /Balance scale comparing/i })).toBeVisible();
    await expect(page.locator(".ua4-ref")).toHaveCount(8);
    await expect(page.locator(".ua4-rift path")).toHaveCount(1);
  });

  test("opens complete JSON from the overlapped preview", async ({ page }) => {
    await page.goto("http://localhost:3000/mobile");
    const openJson = page.getByRole("button", { name: /View complete JSON/i });
    await openJson.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("pre")).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("honors reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("http://localhost:3000/mobile");
    const cta = page.getByRole("link", { name: "Inspect the sample pack" });
    const transition = await cta.evaluate((element) => window.getComputedStyle(element).transitionDuration);
    expect(transition.split(",").every((value) => Number.parseFloat(value) === 0)).toBeTruthy();
  });
});
