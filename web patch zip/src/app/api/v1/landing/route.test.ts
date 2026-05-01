/**
 * @jest-environment node
 */

const landingMocks = {
  readDatasetManifest: jest.fn(),
  currentDataSource: jest.fn(),
  readStorageObject: jest.fn(),
};

jest.mock("@/lib/dataset", () => ({
  readDatasetManifest: (...args: unknown[]) => landingMocks.readDatasetManifest(...args),
}));

jest.mock("@/lib/storage", () => ({
  currentDataSource: (...args: unknown[]) => landingMocks.currentDataSource(...args),
  readStorageObject: (...args: unknown[]) => landingMocks.readStorageObject(...args),
}));

describe("GET /api/v1/landing", () => {
  let GET: () => Promise<Response>;

  beforeAll(async () => {
    const mod = await import("./route");
    GET = mod.GET;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    landingMocks.currentDataSource.mockReturnValue("local");
    landingMocks.readDatasetManifest.mockResolvedValue({
      version: "2026-03-19.214802",
      published_at: "2026-03-19T20:48:02Z",
      methodology_version: "v3.1",
    });
  });

  function jsonBytes(value: unknown) {
    return new TextEncoder().encode(JSON.stringify(value));
  }

  it("returns landing response built from published meta latest per chain", async () => {
    landingMocks.readStorageObject.mockImplementation(async (storagePath: string) => {
      if (storagePath === "data/published/v1/meta/bitcoin/latest.json") {
        return {
          body: jsonBytes({
            updated_through: "2026-03-20",
            status: {
              label: "STABLE",
              one_liner: "Conditions look stable.",
            },
            confidence: {
              confidence_score: 0.91,
              lag_days_vs_utc_today: 0,
            },
            profile: {
              label: "Bitcoin",
            },
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
            status: {
              label: "HEATING",
              one_liner: "Activity is rising.",
            },
            confidence: {
              confidence_score: 0.55,
              lag_days_vs_utc_today: 2,
            },
            profile: {
              label: "Ethereum",
            },
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
            status: {
              label: "UNKNOWN/DEGRADED",
              one_liner: "Freshness lag is elevated.",
            },
            confidence: {
              confidence_score: 0.43,
              lag_days_vs_utc_today: 9,
            },
            profile: {
              label: "Arbitrum",
            },
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
            status: {
              label: "CONGESTED",
              one_liner: "Conditions remain stressed.",
            },
            confidence: {
              confidence_score: 0.21,
              lag_days_vs_utc_today: 15,
            },
            profile: {
              label: "Base",
            },
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

    expect(landingMocks.readStorageObject).toHaveBeenCalledWith(
      "data/published/v1/meta/bitcoin/latest.json"
    );
    expect(landingMocks.readStorageObject).toHaveBeenCalledWith(
      "data/published/v1/meta/ethereum/latest.json"
    );
    expect(landingMocks.readStorageObject).toHaveBeenCalledWith(
      "data/published/v1/meta/arbitrum/latest.json"
    );
    expect(landingMocks.readStorageObject).toHaveBeenCalledWith(
      "data/published/v1/meta/base/latest.json"
    );

    expect(body.ok).toBe(true);
    expect(body.data_source).toBe("local");
    expect(body.dataset).toEqual({
      version: "2026-03-19.214802",
      published_at: "2026-03-19T20:48:02Z",
      methodology_version: "v3.1",
    });

    expect(body.product_boundary).toEqual({
      descriptive_only: true,
      includes_price_data: false,
      includes_forecasts: false,
      includes_recommendations: false,
    });

    expect(body.traceability).toEqual({
      canonical_contract: {
        dataset_manifest: true,
        published_meta_latest_per_chain: true,
        alternate_fallback: false,
        runtime_repair: false,
      },
    });

    expect(body.chains).toHaveLength(4);

    expect(body.chains[0]).toMatchObject({
      chain: "bitcoin",
      profile_label: "Bitcoin",
      status_label: "STABLE",
      one_liner: "Conditions look stable.",
      confidence_score: 0.91,
      confidence_band: "Good",
      lag_days: 0,
      as_of: "2026-03-20",
      expected_delay_days: 1,
      traceability: {
        source_path: "data/published/v1/meta/bitcoin/latest.json + data/published/v1/landing/bitcoin/hero.json",
        source_field: "landing date uses hero.display_asof when available; regime/confidence remain from published meta latest",
      },
    });

    expect(body.chains[1]).toMatchObject({
      chain: "ethereum",
      status_label: "HEATING",
      confidence_band: "Caution",
      lag_days: 2,
      expected_delay_days: 1,
    });

    expect(body.chains[2]).toMatchObject({
      chain: "arbitrum",
      status_label: "UNKNOWN/DEGRADED",
      confidence_band: "Caution",
      lag_days: 9,
      expected_delay_days: 7,
    });

    expect(body.chains[3]).toMatchObject({
      chain: "base",
      status_label: "CONGESTED",
      confidence_band: "Degraded",
      lag_days: 15,
      expected_delay_days: 7,
    });
  });

  it("returns null-ish chain fields when meta is missing", async () => {
    landingMocks.readStorageObject.mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data_source).toBe("local");
    expect(body.chains).toHaveLength(4);

    for (const row of body.chains) {
      expect(row.status_label).toBeNull();
      expect(row.one_liner).toBeNull();
      expect(row.confidence_score).toBeNull();
      expect(row.confidence_band).toBe("—");
      expect(row.lag_days).toBeNull();
      expect(row.as_of).toBeNull();
    }
  });

  it("returns dataset null when manifest is unavailable", async () => {
    landingMocks.readDatasetManifest.mockResolvedValue(null);
    landingMocks.readStorageObject.mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.dataset).toBeNull();
    expect(body.chains).toHaveLength(4);
  });

  it("returns null-ish chain fields when published meta JSON is invalid", async () => {
    const bytes = new TextEncoder().encode("{invalid-json");

    landingMocks.readStorageObject.mockResolvedValue({
      body: bytes,
      contentType: "application/json; charset=utf-8",
      contentLength: bytes.byteLength,
      etag: null,
      lastModified: null,
      source: "local",
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.chains).toHaveLength(4);

    for (const row of body.chains) {
      expect(row.status_label).toBeNull();
      expect(row.confidence_score).toBeNull();
      expect(row.as_of).toBeNull();
    }
  });
});