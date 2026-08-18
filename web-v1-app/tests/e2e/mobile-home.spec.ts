import { expect, test } from "@playwright/test";

test.describe("editorial reference data instrument homepage", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("shows a real observation and the add-network-context demonstration", async ({ page }) => {
    await page.goto("http://localhost:3000/mobile");
    await expect(page.getByRole("heading", { name: "Know whether Tuesday was you — or the network." })).toBeVisible();
    await expect(page.locator(".ua5-observation").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Inspect the sample pack" })).toHaveAttribute("href", "/api/v1/sample-pack");

    await expect(page.getByRole("heading", { name: "Your metric changed. What else changed that day?" })).toBeVisible();
    const add = page.getByRole("button", { name: "Add network context" });
    await add.click();
    await expect(page.getByText("Network state", { exact: true })).toBeVisible();
    await expect(page.getByText(/model_error is a synthetic metric/i)).toBeVisible();
  });

  test("renders the historical regime explorer with keyboard selection", async ({ page }) => {
    await page.goto("http://localhost:3000/mobile");
    const explorer = page.getByLabel(/Historical regime explorer/i);
    await expect(explorer).toBeVisible();
    await explorer.focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/chain=.*&date=/);
    await expect(page.locator(".ua5-lane.is-focused")).toHaveCount(1);
  });

  test("uses real high and degraded examples without a confidence slider", async ({ page }) => {
    await page.goto("http://localhost:3000/mobile");
    await expect(page.getByRole("heading", { name: "Confidence is evidence strength — not probability." })).toBeVisible();
    await expect(page.locator('input[type="range"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Degraded" }).click();
    await expect(page.getByText("UNKNOWN/DEGRADED", { exact: true })).toBeVisible();
  });

  test("keeps artifact exploration distinct from the sample download", async ({ page }) => {
    await page.goto("http://localhost:3000/mobile");
    const artifactNav = page.getByRole("navigation", { name: "Artifact representation" });
    await expect(artifactNav.getByRole("button")).toHaveCount(4);
    await artifactNav.getByRole("button", { name: /gold.json/i }).click();
    await expect(page.locator(".ua5-code pre")).toBeVisible();

    await expect(page.getByRole("heading", { name: "Inspect the files before you pay." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Download sample pack" })).toHaveAttribute("href", "/api/v1/sample-pack");
  });

  test("uses a decision ledger and lightweight subscribe actions instead of pricing cards", async ({ page }) => {
    await page.goto("http://localhost:3000/mobile");
    await expect(page.locator(".ua5-price-ledger")).toBeVisible();
    await expect(page.locator(".ua5-subscribe-list > div")).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Start Basic" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start Pro" })).toBeVisible();
    await expect(page.locator(".ua4-scale-illustration")).toHaveCount(0);
    await expect(page.locator(".ua4-confidence-venn")).toHaveCount(0);
  });

  test("honors reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("http://localhost:3000/mobile");
    const marker = page.locator(".ua5-ruler-track > i").first();
    const transition = await marker.evaluate((element) => window.getComputedStyle(element).transitionDuration);
    expect(transition.split(",").every((value) => Number.parseFloat(value) === 0)).toBeTruthy();
  });
});
