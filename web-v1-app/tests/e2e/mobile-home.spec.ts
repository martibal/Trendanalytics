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

    await expect(page.getByRole("group", { name: "Chain selector" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Artifact selector" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Confidence example selector" })).toBeVisible();

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
    const freeBox = await planCards.nth(0).boundingBox();
    const basicBox = await planCards.nth(1).boundingBox();
    expect(freeBox).not.toBeNull();
    expect(basicBox).not.toBeNull();
    expect(basicBox!.y).toBeLessThan(freeBox!.y);

    const demandHelp = page.getByRole("button", { name: "Explain Demand" });
    await demandHelp.focus();
    await page.keyboard.press("Enter");
    await expect(demandHelp).toHaveAttribute("aria-expanded", "true");
    await expect(demandHelp).toHaveAttribute("aria-controls", "ua3-info-demand");

    const demandDialog = page.getByRole("dialog", { name: "Demand" });
    const closeDemand = demandDialog.getByRole("button", { name: "Close explanation" });
    await expect(demandDialog).toBeVisible();
    await expect(closeDemand).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(demandDialog).toHaveCount(0);
    await expect(demandHelp).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(closeDemand).toBeFocused();
    await closeDemand.click();
    await expect(demandDialog).toHaveCount(0);
    await expect(demandHelp).toBeFocused();

    const openJson = page.getByRole("button", { name: /view complete json/i });
    await expect(openJson).toBeVisible();
    await expect(openJson).toBeEnabled();
    await expect(openJson).toHaveAttribute("aria-haspopup", "dialog");
    await openJson.click();

    const dialog = page.getByRole("dialog", { name: "Meta latest.json" });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog).toHaveAttribute("aria-labelledby", "json-modal-title");

    const copyButton = dialog.getByRole("button", { name: /copy to clipboard/i });
    const closeButton = dialog.getByRole("button", { name: /^close$/i });
    const jsonScroller = dialog.locator("pre.ua3-json-complete");
    await expect(copyButton).toBeVisible();
    await expect(closeButton).toBeVisible();
    await expect(jsonScroller).toBeVisible();
    await expect(closeButton).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(jsonScroller).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(copyButton).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(jsonScroller).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(closeButton).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(openJson).toBeFocused();
  });

  test("shows visible keyboard focus on hero links", async ({ page }) => {
    await page.goto("http://localhost:3000/mobile");

    await expect(page.getByRole("group", { name: "Dataset summary" })).toBeVisible();
    await expect(page.getByRole("group", { name: "How to evaluate Urd Atlas" })).toBeVisible();

    const heroLinks = [
      page.getByRole("link", { name: "Inspect free sample" }),
      page.getByRole("link", { name: /see today's published state/i }),
    ];

    for (const link of heroLinks) {
      await expect(link).toHaveClass(/ua-home-focus/);
      await link.focus();
      await expect(link).toBeFocused();
      const outlineWidth = await link.evaluate((element) => window.getComputedStyle(element).outlineWidth);
      expect(outlineWidth).toBe("2px");
    }
  });

  test("disables hero CTA motion when reduced motion is requested", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("http://localhost:3000/mobile");

    const heroCta = page.locator(".ua3-hero-panel-primary");
    await expect(heroCta).toBeVisible();

    const transitionDurations = await heroCta.evaluate((element) =>
      window.getComputedStyle(element).transitionDuration.split(",").map((value) => Number.parseFloat(value))
    );
    expect(transitionDurations.every((duration) => duration === 0)).toBeTruthy();

    await heroCta.hover();
    const transform = await heroCta.evaluate((element) => window.getComputedStyle(element).transform);
    expect(transform).toBe("none");
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