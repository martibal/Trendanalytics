/**
 * @jest-environment node
 */

export {};

const readStorageObjectMock = jest.fn();

jest.mock("@/lib/storage", () => ({
  readStorageObject: (...args: unknown[]) => readStorageObjectMock(...args),
}));

function storageObject(payload: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));

  return {
    body: bytes,
    contentType: "application/json; charset=utf-8",
    contentLength: bytes.byteLength,
    etag: null,
    lastModified: null,
    source: "local",
  };
}

describe("lib/analystKit", () => {
  beforeEach(() => {
    jest.resetModules();
    readStorageObjectMock.mockReset();
  });

  it("accepts only supported Analyst Kit chain ids", async () => {
    const mod = await import("@/lib/analystKit");

    expect(mod.isAnalystKitChain("bitcoin")).toBe(true);
    expect(mod.isAnalystKitChain("ethereum")).toBe(true);
    expect(mod.isAnalystKitChain("arbitrum")).toBe(true);
    expect(mod.isAnalystKitChain("base")).toBe(true);
    expect(mod.isAnalystKitChain("solana")).toBe(false);
  });

  it("builds sorted regime calendar rows from the current published Meta shape", async () => {
    readStorageObjectMock.mockImplementation(async (path: string) => {
      if (path.endsWith("last365d.json")) return null;
      if (path.endsWith("last180d.json")) {
        return storageObject([
          {
            date: "2026-07-03",
            status: { label: "heating", one_liner: "Demand expanded." },
            confidence: {
              confidence_score: 0.84,
              data_quality_score: 0.91,
              label_confidence_score: 0.77,
              lag_days_vs_utc_today: 1,
            },
            regime: {
              determinism_hash: "abc123",
              drivers: [
                { metric: "tx_count_daily", direction: "up", value: 123, contribution: 0.4 },
              ],
            },
            scorecard: {
              dimensions: {
                demand: { score: 73 },
                friction: { score: 41 },
                capacity: { score: 58 },
              },
            },
            methodology_version: "1.1",
          },
          {
            date: "2026-07-02",
            status: { label: "stable", one_liner: "Normal network conditions." },
            confidence: {
              confidence_score: 0.72,
              data_quality_score: 0.88,
              label_confidence_score: 0.7,
              lag_days_vs_utc_today: 1,
            },
            regime: {
              determinism_hash: "def456",
              demand_score: 51,
              friction_score: 34,
              capacity_score: 49,
            },
            methodology_version: "1.1",
          },
        ]);
      }

      return null;
    });

    const mod = await import("@/lib/analystKit");
    const rows = await mod.buildRegimeCalendarRows("ethereum");

    expect(readStorageObjectMock).toHaveBeenCalledWith(
      "data/published/v1/meta/ethereum/last365d.json",
    );
    expect(readStorageObjectMock).toHaveBeenCalledWith(
      "data/published/v1/meta/ethereum/last180d.json",
    );
    expect(rows).toEqual([
      expect.objectContaining({
        observation_date: "2026-07-02",
        chain: "ethereum",
        chain_label: "ETH",
        regime: "STABLE",
        confidence_score: 0.72,
        demand_score: 51,
        friction_score: 34,
        capacity_score: 49,
        determinism_hash: "def456",
      }),
      expect.objectContaining({
        observation_date: "2026-07-03",
        chain: "ethereum",
        chain_label: "ETH",
        regime: "HEATING",
        confidence_score: 0.84,
        demand_score: 73,
        friction_score: 41,
        capacity_score: 58,
        methodology_version: "1.1",
        determinism_hash: "abc123",
        drivers: "tx_count_daily up=123 contribution=0.4",
      }),
    ]);
  });

  it("keeps legacy scorecard and determinism fields as fallbacks", async () => {
    readStorageObjectMock.mockResolvedValue(storageObject([
      {
        date: "2026-07-03",
        status: { label: "HEATING" },
        confidence: { confidence_score: 0.84 },
        scorecard: {
          demand: { score: 73 },
          friction: 41,
          capacity: { score: 58 },
        },
        determinism_hash: "legacy123",
      },
    ]));

    const mod = await import("@/lib/analystKit");
    const rows = await mod.buildRegimeCalendarRows("ethereum");

    expect(rows[0]).toEqual(expect.objectContaining({
      demand_score: 73,
      friction_score: 41,
      capacity_score: 58,
      determinism_hash: "legacy123",
    }));
  });

  it("falls back to latest.json when no window files are available", async () => {
    readStorageObjectMock.mockImplementation(async (path: string) => {
      if (path.endsWith("latest.json")) {
        return storageObject({
          updated_through: "2026-07-04",
          regime: { label: "cheap", asof_date: "2026-07-04" },
          confidence: { confidence_score: 0.62 },
        });
      }

      return null;
    });

    const mod = await import("@/lib/analystKit");
    const rows = await mod.buildRegimeCalendarRows("bitcoin");

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(expect.objectContaining({
      observation_date: "2026-07-04",
      chain: "bitcoin",
      chain_label: "BTC",
      regime: "CHEAP",
      confidence_score: 0.62,
    }));
  });

  it("serializes calendar rows as RFC-friendly CSV", async () => {
    const mod = await import("@/lib/analystKit");
    const csv = mod.regimeCalendarToCsv([
      {
        observation_date: "2026-07-03",
        chain: "ethereum",
        chain_label: "ETH",
        regime: "HEATING",
        confidence_score: 0.84,
        data_quality_score: 0.91,
        label_confidence_score: 0.77,
        freshness_lag_days: 1,
        demand_score: 73,
        friction_score: 41,
        capacity_score: 58,
        methodology_version: "1.1",
        determinism_hash: "abc123",
        one_liner: "Demand rose, fees stayed controlled.",
        drivers: "tx_count_daily up=123; active_addresses up=456",
      },
    ]);

    expect(csv.split("\n")[0]).toContain("observation_date,chain,chain_label,regime");
    expect(csv).toContain("2026-07-03,ethereum,ETH,HEATING,0.84");
    expect(csv).toContain('"Demand rose, fees stayed controlled."');
  });

  it("builds a weekly summary with transition and safety language", async () => {
    readStorageObjectMock.mockResolvedValue(storageObject([
      {
        date: "2026-07-01",
        status: { label: "STABLE" },
        confidence: { confidence_score: 0.76 },
      },
      {
        date: "2026-07-02",
        status: { label: "HEATING", one_liner: "Demand pressure increased." },
        confidence: { confidence_score: 0.83 },
        regime: {
          drivers: [{ name: "active addresses", direction: "up" }],
        },
      },
    ]));

    const mod = await import("@/lib/analystKit");
    const summary = await mod.buildWeeklySummaryText("ethereum");

    expect(summary).toContain("Ethereum was classified as HEATING for 2026-07-02");
    expect(summary).toContain("The latest row changed from STABLE to HEATING.");
    expect(summary).toContain("not an automated instruction or future-state guarantee");
    expect(summary).toContain("Published drivers: active addresses up.");
  });

  it("returns a machine-readable schema and notebook aligned with the CSV contract", async () => {
    const mod = await import("@/lib/analystKit");
    const schema = mod.buildFeatureSchema();
    const notebook = mod.buildStarterNotebook();

    expect(schema).toEqual(expect.objectContaining({
      name: "urd_atlas_network_state_daily",
      primary_key: ["chain", "observation_date"],
    }));
    expect(Array.isArray(schema.fields)).toBe(true);
    expect(schema.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "chain_label" }),
      expect.objectContaining({ name: "demand_score" }),
      expect.objectContaining({ name: "determinism_hash" }),
    ]));
    expect(schema.safe_uses).toContain("reporting context");
    expect(schema.unsafe_uses).toContain("automated decision without human review");

    expect(notebook).toEqual(expect.objectContaining({ nbformat: 4, nbformat_minor: 5 }));
    expect(Array.isArray(notebook.cells)).toBe(true);
    expect(JSON.stringify(notebook)).toContain("0.40 is the publication gate");
  });
});
