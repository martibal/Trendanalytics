// src/app/chains/[chain]/history/page.test.tsx
/**
 * @jest-environment node
 */

import React from "react";
import { render, screen } from "@testing-library/react";

const notFoundMock = jest.fn();
const readStorageObjectMock = jest.fn();
const currentDataSourceMock = jest.fn();

jest.mock("next/navigation", () => ({
  notFound: (...args: unknown[]) => notFoundMock(...args),
}));

jest.mock("@/lib/storage", () => ({
  readStorageObject: (...args: unknown[]) => readStorageObjectMock(...args),
  currentDataSource: (...args: unknown[]) => currentDataSourceMock(...args),
}));

jest.mock("@/components/ChainIcon", () => {
  return function ChainIconMock(props: { chain: string; label?: string }) {
    return <div data-testid="chain-icon">{props.chain}</div>;
  };
});

describe("app/chains/[chain]/history/page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => undefined);
    currentDataSourceMock.mockReturnValue("local");
    readStorageObjectMock.mockResolvedValue(null);
  });

  it("calls notFound for an invalid chain", async () => {
    notFoundMock.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    const mod = await import("@/app/chains/[chain]/history/page");
    const Page = mod.default;

    await expect(
      Page({
        params: Promise.resolve({ chain: "not-a-chain" }),
      } as never)
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("renders unavailable state when canonical history bundle is missing", async () => {
    const mod = await import("@/app/chains/[chain]/history/page");
    const Page = mod.default;

    const element = await Page({
      params: Promise.resolve({ chain: "bitcoin" }),
    } as never);

    render(element);

    expect(readStorageObjectMock).toHaveBeenCalledWith(
      "data/published/v1/meta/bitcoin/last90d.json"
    );

    expect(screen.getByText(/published history bundle unavailable/i)).toBeInTheDocument();
    expect(
      screen.getByText(/this page intentionally does not fall back to alternate files/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/expected delay:\s*0d/i)).toBeInTheDocument();
  });

  it("renders the canonical traceability shell for a valid chain path", async () => {
    const mod = await import("@/app/chains/[chain]/history/page");
    const Page = mod.default;

    const element = await Page({
      params: Promise.resolve({ chain: "ethereum" }),
    } as never);

    render(element);

    expect(
      screen.getByRole("heading", { level: 1, name: /ethereum history/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/source:\s*local/i)).toBeInTheDocument();
    expect(
      screen.getByText("data/published/v1/meta/ethereum/last90d.json")
    ).toBeInTheDocument();
    expect(screen.getByText(/expected delay:\s*0d/i)).toBeInTheDocument();

    expect(
      screen.getByText(/this page reads one canonical published history bundle/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/it does not search for alternate files/i)
    ).toBeInTheDocument();

    expect(screen.getByText(/published history bundle unavailable/i)).toBeInTheDocument();
  });

  it("shows chain-specific expected delay for arbitrum\/base", async () => {
    const mod = await import("@/app/chains/[chain]/history/page");
    const Page = mod.default;

    const element = await Page({
      params: Promise.resolve({ chain: "arbitrum" }),
    } as never);

    render(element);

    expect(screen.getByText(/expected delay:\s*7d/i)).toBeInTheDocument();
  });
});