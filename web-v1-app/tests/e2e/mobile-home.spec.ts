import { expect, test } from "@playwright/test";

test.describe("mobile homepage institutional landing", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps the opening product explanation readable", async ({ page }) => {
    await page.goto("http://localhost:3000/mobile");
    await expect(page.getByRole("heading", { name: "Know the network conditions behind your data." })).toBeVisible();
    await expect(page.getByText(/one classified observation per chain and date/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Inspect free sample" })).toHaveAttribute("href", "/api/v1/sample-pack");
  });

  test("contains horizontal scrolling inside the status strip", async ({ page }) => {
    await page.goto("http://localhost:3000/mobile");
    const strip = page.locator(".ua5-state-scroll");
    await expect(strip).toBeVisible();
    const measurements = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
    }));
    expect(measurements.pageWidth).toBeLessThanOrEqual(measurements.viewport + 1);
    const stripWidths = await strip.evaluate((element) => ({ client: element.clientWidth, scroll: element.scrollWidth }));
    expect(stripWidths.scroll).toBeGreaterThan(stripWidths.client);
  });

  test("uses a compact default graph range with longer ranges available", async ({ page }) => {
    await page.goto("http://localhost:3000/mobile");
    const rangeGroup = page.getByRole("group", { name: "Select history range" });
    await expect(rangeGroup.getByRole("button", { name: "14D" })).toHaveClass(/is-active/);
    await expect(rangeGroup.getByRole("button", { name: "30D" })).toBeVisible();
    await expect(rangeGroup.getByRole("button", { name: "90D" })).toBeVisible();
    await expect(page.getByLabel(/Bitcoin regime history/i)).toBeVisible();
  });

  test("expands Urd Atlas data without crushing the mobile rows", async ({ page }) => {
    await page.goto("http://localhost:3000/mobile");
    const scene = page.locator(".ua5-data-scene");
    await expect(scene.locator(".ua5-added").first()).toBeHidden();
    await scene.getByRole("button", { name: "Add Urd Atlas fields" }).click();
    await expect(scene).toHaveClass(/is-expanded/);
    await expect(scene.getByText("CHEAP", { exact: true })).toBeVisible();
    await expect(scene.getByText("92%", { exact: true })).toBeVisible();
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(pageWidth).toBeLessThanOrEqual(1);
  });

  test("opens the complete JSON modal and switches artifacts", async ({ page }) => {
    await page.goto("http://localhost:3000/mobile");
    await page.getByRole("button", { name: "View full JSON" }).click();
    const dialog = page.getByRole("dialog", { name: "Complete published JSON" });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("pre")).toBeVisible();
    await dialog.getByRole("button", { name: "Gold" }).click();
    await expect(dialog.getByRole("heading", { name: /Gold · Bitcoin/i })).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("does not add motion when reduced motion is requested", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("http://localhost:3000/mobile");
    const cta = page.getByRole("link", { name: "Inspect free sample" });
    const duration = await cta.evaluate((element) => window.getComputedStyle(element).transitionDuration);
    expect(duration.split(",").every((value) => Number.parseFloat(value) === 0)).toBeTruthy();
  });
});
