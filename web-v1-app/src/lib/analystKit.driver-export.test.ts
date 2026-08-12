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

describe("Analyst Kit current driver export", () => {
  beforeEach(() => {
    jest.resetModules();
    readStorageObjectMock.mockReset();
  });

  it("exports current Meta driver evidence instead of metric names only", async () => {
    readStorageObjectMock.mockResolvedValue(storageObject([
      {
        date: "2026-08-11",
        status: { label: "CHEAP" },
        confidence: { confidence_score: 0.89 },
        regime: {
          drivers: [
            {
              axis: "friction",
              metric: "failed_tx_rate",
              current: 0.010675,
              informative: true,
              momentum_7d_vs_30d: -0.78339,
              pct_90d: 18.3333,
              trend: "COOLING",
              z_robust: -0.766776,
            },
          ],
        },
      },
    ]));

    const mod = await import("@/lib/analystKit");
    const rows = await mod.buildRegimeCalendarRows("ethereum");

    expect(rows[0].drivers).toBe(
      "failed_tx_rate axis=friction trend=COOLING current=0.010675 z_robust=-0.766776 pct_90d=18.3333 momentum_7d_vs_30d=-0.78339 informative=true",
    );
  });

  it("keeps the legacy driver representation as a fallback", async () => {
    readStorageObjectMock.mockResolvedValue(storageObject([
      {
        date: "2026-07-03",
        status: { label: "HEATING" },
        confidence: { confidence_score: 0.84 },
        regime: {
          drivers: [
            { metric: "tx_count_daily", direction: "up", value: 123, contribution: 0.4 },
          ],
        },
      },
    ]));

    const mod = await import("@/lib/analystKit");
    const rows = await mod.buildRegimeCalendarRows("ethereum");

    expect(rows[0].drivers).toBe("tx_count_daily up=123 contribution=0.4");
  });
});
