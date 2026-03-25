/**
 * @jest-environment node
 */

export {};

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

function jsonBody(value: unknown) {
  return {
    body: Uint8Array.from(Buffer.from(JSON.stringify(value), "utf-8")),
  };
}

function buildMeta(chain: "bitcoin" | "ethereum") {
  return {
    chain,
    date: "2026-03-20",
    updated_through: "2026-03-20",
    status: {
      label: "STRUCTURAL_SHIFT",
      one_liner: "Structural shift signals remain visible.",
      color: "amber",
    },
    confidence: {
      confidence_score: 0.82,
      date: "2026-03-20",
      lag_days_vs_utc_today: 0,
      missing: false,
    },
    regime: {
      label: "STRUCTURAL_SHIFT",
      asof_date: "2026-03-20",
      determinism_hash: "abc123",
      window_days: chain === "bitcoin" ? 365 : 90,
      drivers: [
        {
          axis: "demand",
          metric: "tx_count_daily",
          trend: "up",
          z_robust: 2.4,
          pct_90d: 91.2,
          momentum_7d_vs_30d: 0.18,
          current: 12345,
        },
      ],
    },
    scorecard: {
      asof_date: "2026-03-20",
      window_days: chain === "bitcoin" ? 365 : 90,
      confidence_score: 0.82,
      notes: {
        interpretation: "Published interpretation note.",
      },
      dimensions: {
        demand: {
          score: 71,
          level: "ELEVATED",
          coverage_factor: 1,
          effective_confidence: 0.82,
        },
        friction: {
          score: 52,
          level: "NEUTRAL",
          coverage_factor: 1,
          effective_confidence: 0.82,
        },
        capacity: {
          score: 48,
          level: "NEUTRAL",
          coverage_factor: 1,
          effective_confidence: 0.82,
        },
      },
    },
    profile: {
      id: chain,
      label: chain === "bitcoin" ? "Bitcoin" : "Ethereum",
      note: "Published chain note.",
      hidden_metrics: chain === "bitcoin" ? ["gas_utilization_pct"] : [],
      type: chain === "bitcoin" ? "utxo" : "smart-contract",
    },
  };
}

function buildGoldRows(chain: "bitcoin" | "ethereum") {
  return [
    {
      chain,
      date: "2026-03-19",
      tx_count_daily: 12000,
    },
    {
      chain,
      date: "2026-03-20",
      tx_count_daily: 12345,
    },
  ];
}

function buildDerivedRows(chain: "bitcoin" | "ethereum") {
  return [
    {
      chain,
      date: "2026-03-19",
      derived: {
        metrics: {
          tx_count_daily__ma7: 11800,
          tx_count_daily__ma30: 11000,
        },
      },
    },
    {
      chain,
      date: "2026-03-20",
      derived: {
        metrics: {
          tx_count_daily__ma7: 11950,
          tx_count_daily__ma30: 11120,
        },
      },
    },
  ];
}

function makePathMap() {
  const map = new Map<string, unknown>();

  const entries: Array<[string, unknown]> = [
    ["meta/ethereum/latest.json", buildMeta("ethereum")],
    ["gold/ethereum/last90d.json", buildGoldRows("ethereum")],
    ["derived/ethereum/last90d.json", buildDerivedRows("ethereum")],

    ["meta/bitcoin/latest.json", buildMeta("bitcoin")],
    ["gold/bitcoin/last365d.json", buildGoldRows("bitcoin")],
    ["derived/bitcoin/last365d.json", buildDerivedRows("bitcoin")],

    ["data/published/v1/meta/ethereum/latest.json", buildMeta("ethereum")],
    ["data/published/v1/gold/ethereum/last90d.json", buildGoldRows("ethereum")],
    ["data/published/v1/derived/ethereum/last90d.json", buildDerivedRows("ethereum")],

    ["data/published/v1/meta/bitcoin/latest.json", buildMeta("bitcoin")],
    ["data/published/v1/gold/bitcoin/last365d.json", buildGoldRows("bitcoin")],
    ["data/published/v1/derived/bitcoin/last365d.json", buildDerivedRows("bitcoin")],
  ];

  for (const [k, v] of entries) {
    map.set(k, v);
  }

  return map;
}

describe("app/chains/[chain]/page boundary behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    notFoundMock.mockReset();
    readStorageObjectMock.mockReset();
    currentDataSourceMock.mockReset();

    currentDataSourceMock.mockReturnValue("local");
    notFoundMock.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    const pathMap = makePathMap();

    readStorageObjectMock.mockImplementation(async (path: string) => {
      if (pathMap.has(path)) {
        return jsonBody(pathMap.get(path));
      }
      return null;
    });
  });

  it("calls notFound for an invalid chain", async () => {
    const mod = await import("@/app/chains/[chain]/page");
    const Page = mod.default;

    await expect(
      Page({
        params: Promise.resolve({ chain: "not-a-chain" }),
      } as never)
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("calls notFound when meta latest is missing for a valid chain", async () => {
    readStorageObjectMock.mockImplementation(async () => null);

    const mod = await import("@/app/chains/[chain]/page");
    const Page = mod.default;

    await expect(
      Page({
        params: Promise.resolve({ chain: "ethereum" }),
        searchParams: Promise.resolve({ level: "basic", window: "90" }),
      } as never)
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("does not call notFound when canonical ethereum bundles exist", async () => {
    const mod = await import("@/app/chains/[chain]/page");
    const Page = mod.default;

    const result = await Page({
      params: Promise.resolve({ chain: "ethereum" }),
      searchParams: Promise.resolve({ level: "basic", window: "90" }),
    } as never);

    expect(notFoundMock).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it("does not call notFound when canonical bitcoin bundles exist", async () => {
    const mod = await import("@/app/chains/[chain]/page");
    const Page = mod.default;

    const result = await Page({
      params: Promise.resolve({ chain: "bitcoin" }),
      searchParams: Promise.resolve({ level: "basic", window: "365" }),
    } as never);

    expect(notFoundMock).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});