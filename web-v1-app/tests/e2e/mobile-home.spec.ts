import { expect, test } from "@playwright/test";

test.describe("mobile homepage regression", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps compact mobile grids and JSON modal usable", async ({ page }) => {
    await page.goto("/mobile");

    const chainGrid = page.locator(".ua3-chain-grid");
    const artifactGrid = page.locator(".ua3-artifact-grid");
    const planGrid = page.locator(".ua3-plan-grid");

    await expect(chainGrid).toBeVisible();
    await expect(artifactGrid).toBeVisible();
    await expect(planGrid).toBeVisible();

    for (const grid of [chainGrid, artifactGrid, planGrid]) {
      const columns = await grid.evaluate((element) =>
        window.getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean)
      );
      expect(columns).toHaveLength(2);
    }

    await page.getByRole("button", { name: /view complete json/i }).click();

    const dialog = page.getByRole("dialog", { name: /complete json preview/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: /copy to clipboard/i })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /^close$/i })).toBeVisible();

    await dialog.getByRole("button", { name: /^close$/i }).click();
    await expect(dialog).toHaveCount(0);
  });
});
