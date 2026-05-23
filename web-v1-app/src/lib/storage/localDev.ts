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

function getDefaultPublishedDataRoot(): string {
  return path.join(process.cwd(), "public", "data", "published", "v1");
}

function getLocalDataRoot(): string {
  const configured = process.env.LOCAL_DATA_PATH?.trim();

  if (configured) {
    return configured;
  }

  return getDefaultPublishedDataRoot();
}

function buildLocalAbsolutePath(storagePath: string): string {
  const root = getLocalDataRoot();
  const cleaned = storagePath.replace(/^\/+/, "");
  return path.join(root, cleaned);
}

export async function readLocalStorageObject(
  storagePath: string
): Promise<StorageReadResult | null> {
  const absolutePath = buildLocalAbsolutePath(storagePath);

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
