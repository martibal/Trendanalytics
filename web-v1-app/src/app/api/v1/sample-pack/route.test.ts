/**
 * @jest-environment node
 */

const mockReadStorageObject = jest.fn();

jest.mock("@/lib/storage", () => ({
  readStorageObject: (...args: unknown[]) => mockReadStorageObject(...args),
}));

type ZipFile = {
  name: string;
  text: string;
};

function storageJson(value: unknown) {
  const body = new TextEncoder().encode(JSON.stringify(value));
  return {
    body,
    contentType: "application/json; charset=utf-8",
    contentLength: body.byteLength,
    etag: null,
    lastModified: null,
    source: "local",
  };
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

function parseStoredZip(bytes: Uint8Array): ZipFile[] {
  const decoder = new TextDecoder("utf-8");
  const files: ZipFile[] = [];
  let offset = 0;

  while (offset + 4 <= bytes.length && readUint32(bytes, offset) === 0x04034b50) {
    const compressionMethod = readUint16(bytes, offset + 8);
    const compressedSize = readUint32(bytes, offset + 18);
    const fileNameLength = readUint16(bytes, offset + 26);
    const extraLength = readUint16(bytes, offset + 28);

    expect(compressionMethod).toBe(0);

    const nameStart = offset + 30;
    const nameEnd = nameStart + fileNameLength;
    const dataStart = nameEnd + extraLength;
    const dataEnd = dataStart + compressedSize;

    files.push({
      name: decoder.decode(bytes.slice(nameStart, nameEnd)),
      text: decoder.decode(bytes.slice(dataStart, dataEnd)),
    });

    offset = dataEnd;
  }

  return files;
}

describe("GET /api/v1/sample-pack", () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    mockReadStorageObject.mockImplementation(async (storagePath: string) => {
      const match = storagePath.match(
        /^data\/published\/v1\/(meta|gold|derived)\/ethereum\/(2026-07-01|2026-05-22)\.json$/,
      );
      const briefsMatch = storagePath.match(
        /^data\/published\/v1\/briefs\/chains\/ethereum\/(2026-07-01|2026-05-22)\.json$/,
      );

      if (match) {
        const [, artifact, date] = match;
        return storageJson({
          chain: "ethereum",
          date,
          artifact,
          confidence: date === "2026-07-01" ? 0.837 : 0.647,
          note: `${artifact}-${date}`,
        });
      }

      if (briefsMatch) {
        const [, date] = briefsMatch;
        return storageJson({
          chain: "ethereum",
          date,
          artifact: "briefs",
          confidence: date === "2026-07-01" ? 0.837 : 0.647,
          note: `briefs-${date}`,
        });
      }

      return null;
    });

    const mod = (await import("./route")) as typeof import("./route");
    GET = mod.GET;
  });

  it("returns one downloadable ZIP containing exactly eight CSV sample files", async () => {
    const response = await GET();
    const bytes = new Uint8Array(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="urd-atlas-free-sample-pack.zip"',
    );
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(Number(response.headers.get("Content-Length"))).toBe(bytes.byteLength);

    expect(readUint32(bytes, 0)).toBe(0x04034b50);

    const files = parseStoredZip(bytes);
    expect(files.map((file) => file.name)).toEqual([
      "ethereum_high_confidence_2026-07-01_meta.csv",
      "ethereum_high_confidence_2026-07-01_gold.csv",
      "ethereum_high_confidence_2026-07-01_derived.csv",
      "ethereum_high_confidence_2026-07-01_briefs.csv",
      "ethereum_low_confidence_2026-05-22_meta.csv",
      "ethereum_low_confidence_2026-05-22_gold.csv",
      "ethereum_low_confidence_2026-05-22_derived.csv",
      "ethereum_low_confidence_2026-05-22_briefs.csv",
    ]);

    expect(files).toHaveLength(8);
    for (const file of files) {
      const [header, row] = file.text.split("\n");
      expect(header).toContain("chain");
      expect(header).toContain("date");
      expect(header).toContain("artifact");
      expect(header).toContain("confidence");
      expect(row).toContain("ethereum");
    }

    expect(mockReadStorageObject).toHaveBeenCalledTimes(8);
  });

  it("returns 503 instead of a corrupt or partial ZIP if any source artifact is missing", async () => {
    mockReadStorageObject.mockResolvedValueOnce(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toEqual({
      code: "sample_pack_unavailable",
      message: "The free sample pack is temporarily unavailable.",
    });
  });
});
