// tests/e2e/dashboard-keys.spec.ts
import { expect, test } from "@playwright/test";

test.describe("dashboard api key lifecycle shell", () => {
  test("dashboard renders api key management shell with unauthenticated guard", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/dashboard$/);

    await expect(
      page.getByRole("heading", { level: 1, name: /^dashboard$/i })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { level: 2, name: /^api keys$/i })
    ).toBeVisible();

    await expect(
      page.getByText(
        /create, rotate, and revoke delivery keys for authenticated json access/i
      )
    ).toBeVisible();

    await expect(
      page.getByText(/sign in to create or revoke api keys/i)
    ).toBeVisible();

    await expect(page.getByText(/0\/2 non-revoked keys/i)).toBeVisible();

    await expect(
      page.getByLabel(/^key label$/i)
    ).toBeDisabled();

    await expect(
      page.getByRole("button", { name: /^create api key$/i })
    ).toBeDisabled();

    await expect(
      page.getByText(/no api keys are connected to this account yet/i)
    ).toBeVisible();
  });

  test("dashboard shows api key state legend and one-time secret warning shell", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/dashboard$/);

    await expect(page.getByText(/^active$/i)).toBeVisible();
    await expect(page.getByText(/^suspended$/i)).toBeVisible();
    await expect(page.getByText(/^revoked$/i)).toBeVisible();

    await expect(
      page.getByText(
        /valid for authenticated file delivery within the account's entitlement scope/i
      )
    ).toBeVisible();

    await expect(
      page.getByText(
        /used for inactive subscription state\. key exists, but delivery is blocked/i
      )
    ).toBeVisible();

    await expect(
      page.getByText(
        /permanently disabled after user or admin revocation\. cannot be reactivated/i
      )
    ).toBeVisible();

    await expect(
      page.getByText(
        /only partial identifiers are displayed after creation\. the full secret is intentionally not retrievable later/i
      )
    ).toBeVisible();
  });

  test("dashboard subscription shell remains visible alongside api key manager", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/dashboard$/);

    await expect(
      page.getByRole("heading", { level: 2, name: /subscription snapshot/i })
    ).toBeVisible();

    await expect(
      page.getByText(/dashboard state should mirror the same server-side entitlement model used by file delivery/i)
    ).toBeVisible();

    await expect(
      page.getByText(/api keys linked to account:/i)
    ).toBeVisible();

    await expect(
      page.getByText(/allowed windows/i)
    ).toBeVisible();

    await expect(
      page.getByText(/entitled chain/i)
    ).toBeVisible();
  });

  test("dashboard does not expose created-secret panel before a key is created", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/dashboard$/);

    await expect(
      page.getByText(/new api key created/i)
    ).toHaveCount(0);

    await expect(
      page.getByRole("button", { name: /copy secret/i })
    ).toHaveCount(0);
  });
});