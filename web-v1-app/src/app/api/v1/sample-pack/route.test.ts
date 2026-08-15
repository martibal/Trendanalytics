/**
 * @jest-environment node
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { GET } from "./route";

type ZipFile = {
  name: string;
  data: Uint8Array;
};

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
      data: bytes.slice(dataStart, dataEnd),
    });

    offset = dataEnd;
  }

  return files;
}

describe("GET /api/v1/sample-pack", () => {
  jest.setTimeout(60_000);

  it("builds the real two-chain 14-day pack and runs quickstart.py against the emitted CSV files", async () => {
    const response = await GET();
    const bytes = new Uint8Array(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="urd-atlas-free-sample-pack.zip"',
    );
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(Number(response.headers.get("Content-Length"))).toBe(bytes.byteLength);

    const files = parseStoredZip(bytes);
    const names = files.map((file) => file.name);
    const expectedPeriodFiles = ["ethereum", "arbitrum"].flatMap((chain) =>
      ["meta", "gold", "derived", "briefs"].map(
        (artifact) => `${chain}_2026-07-04_to_2026-07-17_${artifact}.csv`,
      ),
    );
    const expectedPointFiles = ["high_confidence_2026-07-01", "low_confidence_2026-05-22"].flatMap(
      (sample) => ["meta", "gold", "derived", "briefs"].map((artifact) => `ethereum_${sample}_${artifact}.csv`),
    );

    expect(names).toEqual([
      ...expectedPeriodFiles,
      ...expectedPointFiles,
      "quickstart.py",
      "FIELD_GUIDE.md",
    ]);
    expect(files).toHaveLength(18);

    const workdir = mkdtempSync(path.join(tmpdir(), "urd-atlas-sample-pack-"));
    try {
      for (const file of files) {
        writeFileSync(path.join(workdir, file.name), file.data);
      }

      const verifier = [
        "import pandas as pd",
        "from pathlib import Path",
        "p = Path('.')",
        "eth = pd.read_csv(p / 'ethereum_2026-07-04_to_2026-07-17_meta.csv')",
        "arb = pd.read_csv(p / 'arbitrum_2026-07-04_to_2026-07-17_meta.csv')",
        "assert len(eth) == 14, len(eth)",
        "assert len(arb) == 14, len(arb)",
        "assert eth['status.label'].nunique() >= 2, eth['status.label'].tolist()",
        "assert set(eth['chain']) == {'ethereum'}",
        "assert set(arb['chain']) == {'arbitrum'}",
        "print('period verified')",
      ].join("\n");

      const verificationOutput = execFileSync("python", ["-c", verifier], {
        cwd: workdir,
        encoding: "utf8",
      });
      expect(verificationOutput).toContain("period verified");

      const quickstartOutput = execFileSync("python", ["quickstart.py"], {
        cwd: workdir,
        encoding: "utf8",
      });
      expect(quickstartOutput).toContain("Share of days by network-state bucket");
      expect(quickstartOutput).toContain("HEATING/CONGESTED");
    } finally {
      rmSync(workdir, { recursive: true, force: true });
    }
  });
});
