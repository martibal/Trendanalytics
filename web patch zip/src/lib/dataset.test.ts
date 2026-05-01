/**
 * @jest-environment node
 */

const readStorageObjectMock = jest.fn();

jest.mock("@/lib/storage", () => ({
  readStorageObject: (...args: unknown[]) => readStorageObjectMock(...args),
}));

describe("lib/dataset", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when dataset.json is missing", async () => {
    readStorageObjectMock.mockResolvedValue(null);

    const mod = await import("@/lib/dataset");
    const result = await mod.readDatasetManifest();

    expect(readStorageObjectMock).toHaveBeenCalledWith("data/published/v1/dataset.json");
    expect(result).toBeNull();
  });

  it("returns null when dataset.json is invalid JSON", async () => {
    const bytes = new TextEncoder().encode("{invalid-json");

    readStorageObjectMock.mockResolvedValue({
      body: bytes,
      contentType: "application/json; charset=utf-8",
      contentLength: bytes.byteLength,
      etag: null,
      lastModified: null,
      source: "local",
    });

    const mod = await import("@/lib/dataset");
    const result = await mod.readDatasetManifest();

    expect(result).toBeNull();
  });

  it("normalizes even when parsed JSON is an array-like object", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(["not", "an", "object"]));

    readStorageObjectMock.mockResolvedValue({
      body: bytes,
      contentType: "application/json; charset=utf-8",
      contentLength: bytes.byteLength,
      etag: null,
      lastModified: null,
      source: "local",
    });

    const mod = await import("@/lib/dataset");
    const result = await mod.readDatasetManifest();

    expect(result).toEqual({
      0: "not",
      1: "an",
      2: "object",
      version: undefined,
      published_at: undefined,
      chains: undefined,
    });
  });

  it("preserves canonical fields when already present", async () => {
    const payload = {
      version: "2026-03-19.204611",
      published_at: "2026-03-19T20:46:11Z",
      methodology_version: "v3.1",
      chains: ["bitcoin", "ethereum"],
      notes: "published dataset",
      dataset_id: "ignored-because-version-exists",
      computed_at_utc: "ignored-because-published_at-exists",
      supported_chains: ["base"],
    };

    const bytes = new TextEncoder().encode(JSON.stringify(payload));

    readStorageObjectMock.mockResolvedValue({
      body: bytes,
      contentType: "application/json; charset=utf-8",
      contentLength: bytes.byteLength,
      etag: null,
      lastModified: null,
      source: "local",
    });

    const mod = await import("@/lib/dataset");
    const result = await mod.readDatasetManifest();

    expect(result).toEqual({
      ...payload,
      version: "2026-03-19.204611",
      published_at: "2026-03-19T20:46:11Z",
      chains: ["bitcoin", "ethereum"],
    });
  });

  it("normalizes fallback fields from dataset_id, computed_at_utc, and supported_chains", async () => {
    const payload = {
      dataset_id: "2026-03-19.204611",
      computed_at_utc: "2026-03-19T20:46:11Z",
      supported_chains: ["bitcoin", "ethereum", "arbitrum", "base"],
      methodology_version: "v3.1",
      revision_id: 49,
    };

    const bytes = new TextEncoder().encode(JSON.stringify(payload));

    readStorageObjectMock.mockResolvedValue({
      body: bytes,
      contentType: "application/json; charset=utf-8",
      contentLength: bytes.byteLength,
      etag: null,
      lastModified: null,
      source: "local",
    });

    const mod = await import("@/lib/dataset");
    const result = await mod.readDatasetManifest();

    expect(result).toEqual({
      ...payload,
      version: "2026-03-19.204611",
      published_at: "2026-03-19T20:46:11Z",
      chains: ["bitcoin", "ethereum", "arbitrum", "base"],
    });
  });

  it("does not synthesize fallback values when source fields have wrong types", async () => {
    const payload = {
      version: 123,
      published_at: 456,
      chains: "bitcoin",
      dataset_id: 789,
      computed_at_utc: false,
      supported_chains: "ethereum",
      methodology_version: "v3.1",
    };

    const bytes = new TextEncoder().encode(JSON.stringify(payload));

    readStorageObjectMock.mockResolvedValue({
      body: bytes,
      contentType: "application/json; charset=utf-8",
      contentLength: bytes.byteLength,
      etag: null,
      lastModified: null,
      source: "local",
    });

    const mod = await import("@/lib/dataset");
    const result = await mod.readDatasetManifest();

    expect(result).toEqual({
      ...payload,
      version: undefined,
      published_at: undefined,
      chains: undefined,
    });
  });
});