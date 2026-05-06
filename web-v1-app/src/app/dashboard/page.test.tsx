// src/components/dashboard/page.test.tsx
/**
 * @jest-environment node
 */

import React from "react";
import { render, screen } from "@testing-library/react";

const getCurrentAccountViewMock = jest.fn();
const getPersistedApiKeyDisplayRowsMock = jest.fn();
const redirectMock = jest.fn();

jest.mock("@/lib/auth/account", () => ({
  getCurrentAccountView: (...args: unknown[]) => getCurrentAccountViewMock(...args),
}));

jest.mock("@/lib/auth/apiKeys", () => ({
  getPersistedApiKeyDisplayRows: (...args: unknown[]) =>
    getPersistedApiKeyDisplayRowsMock(...args),
}));

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

jest.mock("@/components/dashboard/ApiKeyManagerClient", () => {
  return function ApiKeyManagerClientMock(props: unknown) {
    return <div data-testid="api-key-manager-client">{JSON.stringify(props)}</div>;
  };
});

describe("app/dashboard/page", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getCurrentAccountViewMock.mockResolvedValue({
      authConfigured: true,
      isAuthenticated: true,
      account: {
        accountId: "acct_1",
        authProviderUserId: "user_1",
        email: "user@example.com",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        tier: "pro",
        status: "active",
        entitledChain: null,
        historyUnlocked: true,
        currentPeriodEnd: "2026-04-01T00:00:00.000Z",
        createdAt: "2026-03-01T00:00:00.000Z",
      },
      snapshot: {
        tier: "pro",
        status: "active",
        entitledChain: null,
        historyUnlocked: true,
        maxWindowDays: 365,
        allowedChains: ["bitcoin", "ethereum", "arbitrum", "base"],
      },
      apiKeys: [],
      tierLabel: "Research",
      entitledChainLabel: "All chains",
      historyDepthLabel: "Full available history",
    });

    getPersistedApiKeyDisplayRowsMock.mockImplementation(async (accountId: string | null) => {
      if (!accountId) {
        return [];
      }

      return [
        {
          id: "key_1",
          label: "Primary",
          prefix: "ta_live_abcd",
          last4: "abcd",
          status: "active",
          createdAt: "2026-03-20T00:00:00.000Z",
          lastUsedAt: "2026-03-21T00:00:00.000Z",
          tier: "pro",
          entitledChain: null,
          maxWindowDays: 365,
        },
      ];
    });
  });

  it("renders dashboard shell and passes DB-backed keys into ApiKeyManagerClient", async () => {
    const mod = await import("@/app/dashboard/page");
    const Page = mod.default;

    const element = await Page();
    render(element);

    expect(getCurrentAccountViewMock).toHaveBeenCalledTimes(1);
    expect(getPersistedApiKeyDisplayRowsMock).toHaveBeenCalledWith("acct_1");

    expect(
      screen.getByRole("heading", { level: 1, name: /dashboard/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { level: 2, name: /subscription snapshot/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { level: 2, name: /billing management/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/payments are temporarily disabled while business registration and production billing setup are being completed/i)
    ).toBeInTheDocument();

    const client = screen.getByTestId("api-key-manager-client");
    expect(client).toBeInTheDocument();
    expect(client.textContent).toMatch(/ta_live_abcd/);
    expect(client.textContent).toMatch(/"subscriptionActive":true/);
    expect(client.textContent).toMatch(/"hasLinkedAccount":true/);
  });

  it("passes an empty key list when there is no linked account", async () => {
    getCurrentAccountViewMock.mockResolvedValueOnce({
      authConfigured: true,
      isAuthenticated: true,
      account: null,
      snapshot: {
        tier: "public",
        status: "inactive",
        entitledChain: null,
        historyUnlocked: false,
        maxWindowDays: 0,
        allowedChains: [],
      },
      apiKeys: [],
      tierLabel: "Public",
      entitledChainLabel: "No API entitlement",
      historyDepthLabel: "No subscriber history access",
    });

    const mod = await import("@/app/dashboard/page");
    const Page = mod.default;

    const element = await Page();
    render(element);

    expect(getPersistedApiKeyDisplayRowsMock).toHaveBeenCalledWith(null);

    const client = screen.getByTestId("api-key-manager-client");
    expect(client.textContent).toMatch(/"initialKeys":\[\]/);
    expect(client.textContent).toMatch(/"hasLinkedAccount":false/);
    expect(client.textContent).toMatch(/"subscriptionActive":false/);
  });

  it("shows inactive billing state when Stripe linkage is incomplete", async () => {
    getCurrentAccountViewMock.mockResolvedValueOnce({
      authConfigured: true,
      isAuthenticated: true,
      account: {
        accountId: "acct_2",
        authProviderUserId: "user_2",
        email: "user2@example.com",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        tier: "basic",
        status: "active",
        entitledChain: "ethereum",
        historyUnlocked: false,
        currentPeriodEnd: "2026-04-01T00:00:00.000Z",
        createdAt: "2026-03-01T00:00:00.000Z",
      },
      snapshot: {
        tier: "basic",
        status: "active",
        entitledChain: "ethereum",
        historyUnlocked: false,
        maxWindowDays: 90,
        allowedChains: ["ethereum"],
      },
      apiKeys: [],
      tierLabel: "Single Chain",
      entitledChainLabel: "ethereum",
      historyDepthLabel: "90 days",
    });

    const mod = await import("@/app/dashboard/page");
    const Page = mod.default;

    const element = await Page();
    render(element);

    expect(
      screen.getByText(
        /payments will be re-enabled once business registration, bank account setup, and live stripe configuration are complete/i
      )
    ).toBeInTheDocument();
  });
});