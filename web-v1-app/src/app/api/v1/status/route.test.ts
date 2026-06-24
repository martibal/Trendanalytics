/**
 * @jest-environment node
 */

const mockReadDatasetManifest = jest.fn();
const mockCurrentDataSource = jest.fn();
const mockReadStorageObject = jest.fn();

jest.mock("@/lib/dataset", () => ({
  readDatasetManifest: (...args: unknown[]) => mockReadDatasetManifest(...args),
}));

jest.mock("@/lib/storage", () => ({
  currentDataSource: (...args: unknown[]) => mockCurrentDataSource(...args),
  readStorageObject: (...args: unknown[]) => mockReadStorageObject(...args),
}));

describe("GET /api/v1/status", () => {
  let GET: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-22T00:00:00Z"));

    mockCurrentDataSource.mockReturnValue("local");
    mockReadDatasetManifest.mockResolvedValue({
      version: "2026-03-19.204611",
      published_at: "2026-03-19T20:46:11Z",
      methodology_version: "v3.1",
    });

    const mod = (await import("./route")) as typeof import("./route");
    GET = mod.GET;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function jsonBytes(value: unknown) {
    return new TextEncoder().encode(JSON.stringify(value));
  }

  function storageJson(value: unknown) {
    return {
      body: jsonBytes(value),
      contentType: "application/json; charset=utf-8",
      contentLength: 1,
      etag: null,
      lastModified: null,
      source: "local",
    };
  }

  function findChain(body: { chains: Array<{ chain: string }> }, chain: string) {
    const row = body.chains.find((candidate) => candidate.chain === chain);
    expect(row).toBeDefined();
    return row as Record<string, unknown>;
  }

  it("returns normalized chain status payload and summary counts", async () => {
    mockReadStorageObject.mockImplementation(async (storagePath: string) => {
      if (storagePath === "data/published/v1/meta/bitcoin/latest.json") {
        return storageJson({
          updated_through: "2026-03-20",
          confidence: { confidence_score: 0.91, lag_days_vs_utc_today: 0 },
          status: { label: "STABLE" },
        });
      }

      if (storagePath === "data/published/v1/meta/ethereum/latest.json") {
        return storageJson({
          updated_through: "2026-03-18",
          confidence: { confidence_score: 0.55, lag_days_vs_utc_today: 2 },
          status: { label: "HEATING" },
        });
      }

      if (storagePath === "data/published/v1/meta/arbitrum/latest.json") {
        return storageJson({
          updated_through: "2026-03-11",
          confidence: { confidence_score: 0.43, lag_days_vs_utc_today: 9 },
          status: { label: "UNKNOWN/DEGRADED" },
        });
      }

      if (storagePath === "data/published/v1/meta/base/latest.json") {
        return storageJson({
          updated_through: "2026-03-05",
          confidence: { confidence_score: 0.21, lag_days_vs_utc_today: 15 },
          status: { label: "CONGESTED" },
        });
      }

      return null;
    });

    const response = await GET(new Request("https://www.urdatlas.com/api/v1/status"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=300"
    );

    expect(body.ok).toBe(true);
    expect(body.data_source).toBe("local");
    expect(body.dataset).toEqual({
      version: "2026-03-19.204611",
      published_at: "2026-03-19T20:46:11Z",
      methodology_version: "v3.1",
    });

    expect(body.summary).toEqual({
      chain_count: 4,
      ok_count: 1,
      warn_count: 2,
      fail_count: 1,
      unknown_count: 0,
    });

    expect(body.chains).toHaveLength(4);

    expect(body.chains[0]).toMatchObject({
      chain: "bitcoin",
      status: "ok",
      as_of: "2026-03-20",
      lag_days: 0,
      published_regime: "STABLE",
      confidence_score: 0.91,
      expected_delay_days: 1,
      traceability: {
        source_path: "data/published/v1/meta/bitcoin/latest.json",
        source_field: "latest.json",
      },
    });

    expect(body.chains[1]).toMatchObject({
      chain: "ethereum",
      status: "warn",
      lag_days: 2,
      published_regime: "HEATING",
      expected_delay_days: 1,
    });

    expect(body.chains[2]).toMatchObject({
      chain: "arbitrum",
      status: "warn",
      lag_days: 9,
      published_regime: "UNKNOWN/DEGRADED",
      expected_delay_days: 7,
    });

    expect(body.chains[3]).toMatchObject({
      chain: "base",
      status: "fail",
      lag_days: 15,
      published_regime: "CONGESTED",
      expected_delay_days: 7,
    });
  });

  it("returns unknown when meta is missing", async () => {
    mockReadStorageObject.mockResolvedValue(null);

    const response = await GET(new Request("https://www.urdatlas.com/api/v1/status"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary).toEqual({
      chain_count: 4,
      ok_count: 0,
      warn_count: 0,
      fail_count: 0,
      unknown_count: 4,
    });

    for (const row of body.chains) {
      expect(row.status).toBe("unknown");
      expect(row.as_of).toBeNull();
      expect(row.lag_days).toBeNull();
      expect(row.confidence_score).toBeNull();
    }
  });

  it("falls back to lag derived from as_of date when explicit lag is absent", async () => {
    mockReadStorageObject.mockImplementation(async (storagePath: string) => {
      if (storagePath.endsWith("/bitcoin/latest.json")) {
        return storageJson({
          updated_through: "2026-03-19",
          confidence: { confidence_score: 0.8 },
          status: { label: "STABLE" },
        });
      }

      return null;
    });

    const response = await GET(new Request("https://www.urdatlas.com/api/v1/status"));
    const body = await response.json();

    const bitcoin = findChain(body, "bitcoin");

    expect(bitcoin).toMatchObject({
      chain: "bitcoin",
      as_of: "2026-03-19",
      lag_days: 3,
      status: "warn",
    });
  });

  it("uses landing display_asof as the displayed freshness anchor when hero data is available", async () => {
    mockReadStorageObject.mockImplementation(async (storagePath: string) => {
      if (storagePath === "data/published/v1/meta/ethereum/latest.json") {
        return storageJson({
          updated_through: "2026-03-10",
          confidence: { confidence_score: 0.72, lag_days_vs_utc_today: 12 },
          status: { label: "STABLE" },
          regime: { asof_date: "2026-03-10" },
        });
      }

      if (storagePath === "data/published/v1/landing/ethereum/hero.json") {
        return storageJson({
          display_asof: "2026-03-21",
          regime_asof: "2026-03-10",
        });
      }

      return null;
    });

    const response = await GET(new Request("https://www.urdatlas.com/api/v1/status"));
    const body = await response.json();

    const ethereum = findChain(body, "ethereum");

    expect(ethereum).toMatchObject({
      chain: "ethereum",
      as_of: "2026-03-21",
      display_asof: "2026-03-21",
      regime_asof: "2026-03-10",
      lag_days: 1,
      status: "ok",
      expected_delay_days: 1,
    });
  });

  it("keeps stale published data at warn when source freshness says source is not newer than published", async () => {
    mockReadStorageObject.mockImplementation(async (storagePath: string) => {
      if (storagePath === "data/published/v1/source-freshness.json") {
        return storageJson({
          source: "aws-public-blockchain",
          generated_at_utc: "2026-03-22T00:00:00Z",
          chains: {
            bitcoin: {
              chain: "bitcoin",
              last_run_at_utc: "2026-03-22T00:00:00Z",
              last_run_date: "2026-03-22",
              last_data_load_date: "2026-03-10",
              latest_available_source_date: "2026-03-10",
              published_asof: "2026-03-10",
              reason_code: "source_not_newer_than_published",
              reason: "The upstream source is not newer than the currently published data.",
              source_is_not_newer_than_published: true,
            },
          },
        });
      }

      if (storagePath === "data/published/v1/meta/bitcoin/latest.json") {
        return storageJson({
          updated_through: "2026-03-10",
          confidence: { confidence_score: 0.8, lag_days_vs_utc_today: 12 },
          status: { label: "STABLE" },
        });
      }

      return null;
    });

    const response = await GET(new Request("https://www.urdatlas.com/api/v1/status"));
    const body = await response.json();

    const bitcoin = findChain(body, "bitcoin");

    expect(bitcoin).toMatchObject({
      chain: "bitcoin",
      as_of: "2026-03-10",
      lag_days: 12,
      status: "warn",
      expected_delay_days: 1,
      freshness_explanation: "The upstream source is not newer than the currently published data.",
      source_freshness: {
        source: "aws-public-blockchain",
        generated_at_utc: "2026-03-22T00:00:00Z",
        reason_code: "source_not_newer_than_published",
        reason: "The upstream source is not newer than the currently published data.",
        source_is_not_newer_than_published: true,
        source_is_newer_than_published: false,
      },
    });
  });

  it("keeps stale published data at warn when source freshness check is unavailable", async () => {
    mockReadStorageObject.mockImplementation(async (storagePath: string) => {
      if (storagePath === "data/published/v1/source-freshness.json") {
        return storageJson({
          source: "aws-public-blockchain",
          generated_at_utc: "2026-03-22T00:00:00Z",
          chains: {
            base: {
              chain: "base",
              last_run_at_utc: "2026-03-22T00:00:00Z",
              last_run_date: "2026-03-22",
              published_asof: "2026-03-08",
              reason_code: "source_check_unavailable",
              reason: "The upstream freshness check could not be completed.",
            },
          },
        });
      }

      if (storagePath === "data/published/v1/meta/base/latest.json") {
        return storageJson({
          updated_through: "2026-03-08",
          confidence: { confidence_score: 0.42, lag_days_vs_utc_today: 14 },
          status: { label: "UNKNOWN/DEGRADED" },
        });
      }

      return null;
    });

    const response = await GET(new Request("https://www.urdatlas.com/api/v1/status"));
    const body = await response.json();

    const base = findChain(body, "base");

    expect(base).toMatchObject({
      chain: "base",
      as_of: "2026-03-08",
      lag_days: 14,
      status: "warn",
      expected_delay_days: 7,
      freshness_explanation: "The upstream freshness check could not be completed.",
      source_freshness: {
        reason_code: "source_check_unavailable",
        reason: "The upstream freshness check could not be completed.",
      },
    });
  });

  it("classifies stale ethereum data as fail when source freshness says upstream is newer", async () => {
    mockReadStorageObject.mockImplementation(async (storagePath: string) => {
      if (storagePath === "data/published/v1/source-freshness.json") {
        return storageJson({
          source: "aws-public-blockchain",
          generated_at_utc: "2026-03-22T00:00:00Z",
          chains: {
            ethereum: {
              chain: "ethereum",
              last_run_at_utc: "2026-03-22T00:00:00Z",
              last_run_date: "2026-03-22",
              last_data_load_date: "2026-03-22",
              latest_available_source_date: "2026-03-22",
              published_asof: "2026-03-18",
              reason_code: "source_newer_than_published",
              reason: "The upstream source appears newer than the currently published data.",
              source_is_newer_than_published: true,
              source_is_not_newer_than_published: false,
            },
          },
        });
      }

      if (storagePath === "data/published/v1/meta/ethereum/latest.json") {
        return storageJson({
          updated_through: "2026-03-18",
          confidence: { confidence_score: 0.64, lag_days_vs_utc_today: 4 },
          status: { label: "STABLE" },
        });
      }

      return null;
    });

    const response = await GET(new Request("https://www.urdatlas.com/api/v1/status"));
    const body = await response.json();

    const ethereum = findChain(body, "ethereum");

    expect(ethereum).toMatchObject({
      chain: "ethereum",
      as_of: "2026-03-18",
      lag_days: 4,
      status: "fail",
      expected_delay_days: 1,
      freshness_explanation:
        "The upstream source appears newer than the currently published data.",
      source_freshness: {
        reason_code: "source_newer_than_published",
        source_is_newer_than_published: true,
        source_is_not_newer_than_published: false,
      },
    });
  });

  it("returns dataset null when manifest is unavailable", async () => {
    mockReadDatasetManifest.mockResolvedValue(null);
    mockReadStorageObject.mockResolvedValue(null);

    const response = await GET(new Request("https://www.urdatlas.com/api/v1/status"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.dataset).toBeNull();
  });
});