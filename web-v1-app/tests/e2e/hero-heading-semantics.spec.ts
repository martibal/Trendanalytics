import { expect, test } from "@playwright/test";

test.describe("homepage hero heading semantics", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps dataset statistics out of the page heading hierarchy", async ({ page }) => {
    await page.goto("http://localhost:3000/mobile");

    const summary = page.getByRole("group", { name: "Dataset summary" });
    await expect(summary).toBeVisible();
    await expect(summary.getByRole("heading")).toHaveCount(0);

    await expect(summary.getByText(/consecutive daily rows|daily rows published since dec 2024/i)).toBeVisible();
    await expect(summary.getByText("4 chains covered")).toBeVisible();
    await expect(summary.getByText("Deterministic, versioned")).toBeVisible();
  });
});
