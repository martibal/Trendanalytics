import { expect, test } from "@playwright/test";

test.describe("mobile homepage regression", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps compact mobile grids and JSON modal usable", async ({ page }) => {
    await page.goto("http://localhost:3000/mobile");

    const chainGrid = page.locator(".ua3-chain-grid");
    const artifactGrid = page.locator(".ua3-artifact-grid");
    const planGrid = page.locator(".ua3-plan-grid");

    await expect(chainGrid).toBeVisible();
    await expect(artifactGrid).toBeVisible();
    await expect(planGrid).toBeVisible();

    for (const grid of [chainGrid, artifactGrid]) {
      const columns = await grid.evaluate((element) =>
        window.getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean)
      );
      expect(columns).toHaveLength(2);
    }

    const planColumns = await planGrid.evaluate((element) =>
      window.getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean)
    );
    expect(planColumns).toHaveLength(1);

    const chainCards = chainGrid.locator(".ua3-chain-card");
    await expect(chainCards).toHaveCount(4);
    for (const chainId of ["bitcoin", "ethereum", "arbitrum", "base"]) {
      await expect(chainGrid.locator(`.ua3-chain-card[data-chain="${chainId}"]`)).toHaveCount(1);
    }

    const planCards = planGrid.locator(".ua3-plan-card");
    await expect(planCards).toHaveCount(3);
    await expect(planCards.first()).toContainText("Basic");

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

  test("keeps artifact grid compact below 340px while pricing stays single-column", async ({ page }) => {
    await page.setViewportSize({ width: 340, height: 844 });
    await page.goto("http://localhost:3000/mobile");

    const artifactGrid = page.locator(".ua3-artifact-grid");
    const planGrid = page.locator(".ua3-plan-grid");

    await expect(artifactGrid).toBeVisible();
    await expect(planGrid).toBeVisible();

    const artifactColumnsAt340 = await artifactGrid.evaluate((element) =>
      window.getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean)
    );
    expect(artifactColumnsAt340).toHaveLength(2);

    const planColumnsAt340 = await planGrid.evaluate((element) =>
      window.getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean)
    );
    expect(planColumnsAt340).toHaveLength(1);

    await page.setViewportSize({ width: 339, height: 844 });

    const artifactColumnsAt339 = await artifactGrid.evaluate((element) =>
      window.getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean)
    );
    expect(artifactColumnsAt339).toHaveLength(1);

    const planColumnsAt339 = await planGrid.evaluate((element) =>
      window.getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean)
    );
    expect(planColumnsAt339).toHaveLength(1);
  });
});
