// tests/e2e/auth.spec.ts
import { expect, test } from "@playwright/test";

test.describe("auth surface", () => {
  test("sign-in page renders public explanatory shell", async ({ page }) => {
    await page.goto("/sign-in");

    await expect(page).toHaveURL(/\/sign-in(?:\/)?$/);

    await expect(
      page.getByRole("heading", { level: 1, name: /^sign in$/i })
    ).toBeVisible();

    await expect(page.getByText(/subscriber access/i)).toBeVisible();
    await expect(
      page.getByText(
        /sign in to access the subscriber dashboard, entitlement-aware json delivery, api key management, and account-linked billing state/i
      )
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /what sign-in is for/i,
      })
    ).toBeVisible();

    await expect(page.getByText(/subscriber dashboard access/i)).toBeVisible();
    await expect(
      page.getByText(/account-linked entitlement inspection/i)
    ).toBeVisible();
    await expect(
      page.getByText(/authenticated api key lifecycle/i)
    ).toBeVisible();
    await expect(
      page.getByText(/json file delivery within subscription scope/i)
    ).toBeVisible();
  });

  test("sign-in page links back to public and related pages", async ({ page }) => {
    await page.goto("/sign-in");

    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /what sign-in is not required for/i,
      })
    ).toBeVisible();

    await expect(page.getByRole("link", { name: /^home$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^chains$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^status$/i })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^track record$/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^methodology$/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^glossary$/i })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { level: 2, name: /related pages/i })
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: /^create account$/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^dashboard$/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^api docs$/i })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /^terms$/i })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^privacy$/i })
    ).toBeVisible();
  });

  test("sign-in page shows deterministic clerk fallback when clerk is not configured", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /account sign-in/i,
      })
    ).toBeVisible();

    await expect(
      page.getByText(/clerk is not configured in this environment/i)
    ).toBeVisible();

    await expect(
      page.getByText(
        /the sign-in route is live, but the identity provider is not fully wired in this runtime yet/i
      )
    ).toBeVisible();

    await expect(
      page.getByText(/required keys:/i)
    ).toBeVisible();

    await expect(
      page.getByText(/next_public_clerk_publishable_key/i)
    ).toBeVisible();

    await expect(
      page.getByText(/clerk_secret_key/i)
    ).toBeVisible();
  });

  test("sign-up page renders public explanatory shell", async ({ page }) => {
    await page.goto("/sign-up");

    await expect(page).toHaveURL(/\/sign-up(?:\/)?$/);

    await expect(
      page.getByRole("heading", { level: 1, name: /create account/i })
    ).toBeVisible();

    await expect(page.getByText(/subscriber access/i)).toBeVisible();

    await expect(
      page.getByText(
        /create an account to use the subscriber dashboard, authenticated json delivery, api key lifecycle, and account-linked billing and entitlement flows/i
      )
    ).toBeVisible();

    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /what account creation unlocks/i,
      })
    ).toBeVisible();

    await expect(page.getByText(/subscriber dashboard access/i)).toBeVisible();
    await expect(page.getByText(/plan-linked entitlement state/i)).toBeVisible();
    await expect(
      page.getByText(/authenticated json file delivery/i)
    ).toBeVisible();
    await expect(
      page.getByText(/api key lifecycle and account-linked access control/i)
    ).toBeVisible();
  });

  test("sign-up page shows deterministic clerk fallback when clerk is not configured", async ({
    page,
  }) => {
    await page.goto("/sign-up");

    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /account creation/i,
      })
    ).toBeVisible();

    await expect(
      page.getByText(/clerk is not configured in this environment/i)
    ).toBeVisible();

    await expect(
      page.getByText(
        /the sign-up route is live, but the identity provider is not fully wired in this runtime yet/i
      )
    ).toBeVisible();

    await expect(
      page.getByText(/required keys:/i)
    ).toBeVisible();

    await expect(
      page.getByText(/next_public_clerk_publishable_key/i)
    ).toBeVisible();

    await expect(
      page.getByText(/clerk_secret_key/i)
    ).toBeVisible();
  });

  test("dashboard shell exposes auth-dependent api key guidance", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/dashboard$/);

    await expect(
      page.getByRole("heading", { level: 1, name: /^dashboard$/i })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { level: 2, name: /api keys/i })
    ).toBeVisible();

    await expect(
      page.getByText(/sign in to create or revoke api keys/i)
    ).toBeVisible();
  });
});