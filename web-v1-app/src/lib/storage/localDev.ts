// src/lib/storage/localDev.ts
import path from "path";
import { promises as fs } from "fs";

export type StorageReadResult = {
  body: ArrayBuffer;
  contentType: string;
  contentLength: number;
  etag: string | null;
  lastModified: string | null;
  source: "local";
};

function inferContentType(storagePath: string): string {
  if (storagePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (storagePath.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (storagePath.endsWith(".csv")) return "text/csv; charset=utf-8";
  if (storagePath.endsWith(".parquet")) return "application/octet-stream";
  return "application/octet-stream";
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const bytes = new Uint8Array(buffer.length);
  bytes.set(buffer);
  return bytes.buffer;
}

function getConfiguredLocalDataRoot(): string | null {
  const configured = process.env.LOCAL_DATA_PATH?.trim();
  return configured ? configured : null;
}

function getCandidateDataRoots(): string[] {
  const configured = getConfiguredLocalDataRoot();

  if (configured) {
    return [configured];
  }

  const appRoot = process.cwd();

  return [
    path.join(appRoot, "..", "data", "published", "v1"),
    path.join(appRoot, "data", "published", "v1"),
    path.join(appRoot, ".private-data", "published", "v1"),
    path.join(appRoot, "public", "data", "published", "v1"),
  ];
}

function buildLocalAbsolutePath(root: string, storagePath: string): string {
  const cleaned = storagePath.replace(/^\/+/, "");
  return path.join(root, cleaned);
}

async function readLocalFile(
  absolutePath: string,
  storagePath: string
): Promise<StorageReadResult | null> {
  try {
    const stat = await fs.stat(absolutePath);

    if (!stat.isFile()) {
      return null;
    }

    const file = await fs.readFile(absolutePath);

    return {
      body: toArrayBuffer(file),
      contentType: inferContentType(storagePath),
      contentLength: stat.size,
      etag: null,
      lastModified: stat.mtime.toISOString(),
      source: "local",
    };
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";

    if (code === "ENOENT") {
      return null;
    }

    throw new Error(
      `Failed to read local storage object at '${absolutePath}' for storage path '${storagePath}'.`
    );
  }
}

export async function readLocalStorageObject(
  storagePath: string
): Promise<StorageReadResult | null> {
  for (const root of getCandidateDataRoots()) {
    const absolutePath = buildLocalAbsolutePath(root, storagePath);
    const result = await readLocalFile(absolutePath, storagePath);

    if (result) {
      return result;
    }
  }

  return null;
}
