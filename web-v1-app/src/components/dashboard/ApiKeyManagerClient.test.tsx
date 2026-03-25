// src/components/dashboard/ApiKeyManagerClient.test.tsx
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import ApiKeyManagerClient from "@/components/dashboard/ApiKeyManagerClient";

const fetchMock = jest.fn();
const refreshMock = jest.fn();
const pushMock = jest.fn();
const replaceMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
    push: pushMock,
    replace: replaceMock,
  }),
}));

describe("components/dashboard/ApiKeyManagerClient", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  function renderClient(
    overrides?: Partial<React.ComponentProps<typeof ApiKeyManagerClient>>
  ) {
    return render(
      <ApiKeyManagerClient
        authConfigured={true}
        isAuthenticated={true}
        hasLinkedAccount={true}
        subscriptionActive={true}
        initialKeys={[
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
        ]}
        {...overrides}
      />
    );
  }

  it("renders the api key section with initial key rows", () => {
    renderClient();

    expect(
      screen.getByRole("heading", { name: /api keys/i })
    ).toBeInTheDocument();

    expect(screen.getByText(/label:\s*primary/i)).toBeInTheDocument();
    expect(screen.getByText(/ta_live_abcd/i)).toBeInTheDocument();
    expect(screen.getByText(/tier:\s*pro/i)).toBeInTheDocument();
  });

  it("shows disabled lifecycle message when auth is not configured", () => {
    renderClient({
      authConfigured: false,
      isAuthenticated: false,
      hasLinkedAccount: false,
      subscriptionActive: false,
      initialKeys: [],
    });

    expect(
      screen.getByText(/clerk is not configured yet, so key mutations are unavailable in this environment/i)
    ).toBeInTheDocument();
  });

  it("shows signed-out message when user is not authenticated", () => {
    renderClient({
      isAuthenticated: false,
      hasLinkedAccount: false,
      subscriptionActive: false,
      initialKeys: [],
    });

    expect(
      screen.getByText(/sign in to create or revoke api keys/i)
    ).toBeInTheDocument();
  });

  it("shows linked-account requirement when account is missing", () => {
    renderClient({
      hasLinkedAccount: false,
      subscriptionActive: false,
      initialKeys: [],
    });

    expect(
      screen.getByText(/your authenticated user is not yet linked to an account row, so key lifecycle actions are blocked/i)
    ).toBeInTheDocument();
  });

  it("shows inactive subscription message when entitlement is inactive", () => {
    renderClient({
      subscriptionActive: false,
    });

    expect(
      screen.getByText(/an active subscription is required before api keys can be created/i)
    ).toBeInTheDocument();
  });

  it("creates a new api key and appends it to the list", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        key: {
          id: "key_2",
          label: "New Key",
          prefix: "ta_live_wxyz",
          last4: "wxyz",
          status: "active",
          createdAt: "2026-03-22T00:00:00.000Z",
          lastUsedAt: null,
          tier: "pro",
          entitledChain: null,
          maxWindowDays: 365,
        },
        token: "ta_live_secret_value",
      }),
    });

    renderClient();

    const input = screen.getByLabelText(/key label/i);
    fireEvent.change(input, { target: { value: "New Key" } });

    fireEvent.click(screen.getByRole("button", { name: /create api key/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/keys", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          label: "New Key",
        }),
      });
    });

    expect(await screen.findByText(/label:\s*new key/i)).toBeInTheDocument();
    expect(screen.getByText(/ta_live_wxyz/i)).toBeInTheDocument();

    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows server error details when key creation fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        code: "forbidden",
        detail: "inactive_subscription",
      }),
    });

    renderClient();

    const input = screen.getByLabelText(/key label/i);
    fireEvent.change(input, { target: { value: "Blocked Key" } });

    fireEvent.click(screen.getByRole("button", { name: /create api key/i }));

    expect(await screen.findByText(/inactive_subscription/i)).toBeInTheDocument();
  });

  it("revokes an existing key and updates the row state", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        key: {
          id: "key_1",
          status: "revoked",
        },
      }),
    });

    renderClient();

    fireEvent.click(screen.getByRole("button", { name: /revoke/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/v1/keys", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          keyId: "key_1",
        }),
      });
    });

    const keyRow = screen.getByText(/label:\s*primary/i).closest(".rounded-xl.border");
    expect(keyRow).not.toBeNull();
    expect(within(keyRow as HTMLElement).getByText(/^revoked$/i)).toBeInTheDocument();
  });
});