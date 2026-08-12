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

    const openJson = page.getByRole("button", { name: /view complete json/i });
    await expect(openJson).toBeVisible();
    await expect(openJson).toBeEnabled();
    await openJson.click();

    const modalBackdrop = page.locator('.ua3-modal-backdrop[role="dialog"]');
    await expect(modalBackdrop).toBeVisible({ timeout: 10000 });
    await expect(modalBackdrop).toHaveAttribute("aria-label", "Complete JSON preview");

    await expect(
      modalBackdrop.getByRole("button", { name: /copy to clipboard/i })
    ).toBeVisible();
    const closeButton = modalBackdrop.getByRole("button", { name: /^close$/i });
    await expect(closeButton).toBeVisible();

    await closeButton.click();
    await expect(modalBackdrop).toHaveCount(0);
  });
});
