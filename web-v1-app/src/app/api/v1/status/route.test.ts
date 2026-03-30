
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
  let GET: () => Promise<Response>;

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

  it("returns normalized chain status payload and summary counts", async () => {
    mockReadStorageObject.mockImplementation(async (storagePath: string) => {
      if (storagePath === "data/published/v1/meta/bitcoin/latest.json") {
        return {
          body: jsonBytes({
            updated_through: "2026-03-20",
            confidence: { confidence_score: 0.91, lag_days_vs_utc_today: 0 },
            status: { label: "STABLE" },
          }),
          contentType: "application/json; charset=utf-8",
          contentLength: 1,
          etag: null,
          lastModified: null,
          source: "local",
        };
      }

      if (storagePath === "data/published/v1/meta/ethereum/latest.json") {
        return {
          body: jsonBytes({
            updated_through: "2026-03-18",
            confidence: { confidence_score: 0.55, lag_days_vs_utc_today: 2 },
            status: { label: "HEATING" },
          }),
          contentType: "application/json; charset=utf-8",
          contentLength: 1,
          etag: null,
          lastModified: null,
          source: "local",
        };
      }

      if (storagePath === "data/published/v1/meta/arbitrum/latest.json") {
        return {
          body: jsonBytes({
            updated_through: "2026-03-11",
            confidence: { confidence_score: 0.43, lag_days_vs_utc_today: 9 },
            status: { label: "UNKNOWN/DEGRADED" },
          }),
          contentType: "application/json; charset=utf-8",
          contentLength: 1,
          etag: null,
          lastModified: null,
          source: "local",
        };
      }

      if (storagePath === "data/published/v1/meta/base/latest.json") {
        return {
          body: jsonBytes({
            updated_through: "2026-03-05",
            confidence: { confidence_score: 0.21, lag_days_vs_utc_today: 15 },
            status: { label: "CONGESTED" },
          }),
          contentType: "application/json; charset=utf-8",
          contentLength: 1,
          etag: null,
          lastModified: null,
          source: "local",
        };
      }

      return null;
    });

    const response = await GET();
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
      expected_delay_days: 0,
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
      expected_delay_days: 0,
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

    const response = await GET();
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
        return {
          body: jsonBytes({
            updated_through: "2026-03-19",
            confidence: { confidence_score: 0.8 },
            status: { label: "STABLE" },
          }),
          contentType: "application/json; charset=utf-8",
          contentLength: 1,
          etag: null,
          lastModified: null,
          source: "local",
        };
      }

      return null;
    });

    const response = await GET();
    const body = await response.json();

    const bitcoin = body.chains.find((row: { chain: string }) => row.chain === "bitcoin");

    expect(bitcoin).toMatchObject({
      chain: "bitcoin",
      as_of: "2026-03-19",
      lag_days: 3,
      status: "fail",
    });
  });

  it("returns dataset null when manifest is unavailable", async () => {
    mockReadDatasetManifest.mockResolvedValue(null);
    mockReadStorageObject.mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.dataset).toBeNull();
  });
});
