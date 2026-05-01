// src/lib/storage/index.ts
import { readLocalStorageObject, type StorageReadResult as LocalStorageReadResult } from "@/lib/storage/localDev";
import { readS3StorageObject, type StorageReadResult as S3StorageReadResult } from "@/lib/storage/s3";

export type DataSource = "local" | "s3";
export type StorageReadResult = LocalStorageReadResult | S3StorageReadResult;

function getDataSource(): DataSource {
  const raw = process.env.DATA_SOURCE?.trim().toLowerCase();

  if (raw === "s3") {
    return "s3";
  }

  return "local";
}

function normalizeStoragePath(storagePath: string): string {
  const cleaned = storagePath.replace(/^\/+/, "");

  if (cleaned.startsWith("data/published/v1/")) {
    return cleaned.slice("data/published/v1/".length);
  }

  if (cleaned === "data/published/v1") {
    return "";
  }

  return cleaned;
}

export function currentDataSource(): DataSource {
  return getDataSource();
}

export async function readStorageObject(
  storagePath: string
): Promise<StorageReadResult | null> {
  const source = getDataSource();
  const normalizedPath = normalizeStoragePath(storagePath);

  if (source === "s3") {
    return readS3StorageObject(normalizedPath);
  }

  return readLocalStorageObject(normalizedPath);
}