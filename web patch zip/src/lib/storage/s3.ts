// src/lib/storage/s3.ts
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type StorageReadResult = {
  body: ArrayBuffer;
  contentType: string;
  contentLength: number;
  etag: string | null;
  lastModified: string | null;
  source: "s3";
};

type S3BodyLike = {
  transformToByteArray?: () => Promise<Uint8Array>;
  transformToString?: () => Promise<string>;
};

function getEnv(name: string): string | null {
  const raw = process.env[name]?.trim();
  return raw ? raw : null;
}

function getS3Region(): string | null {
  return getEnv("S3_REGION");
}

function getS3Bucket(): string | null {
  return getEnv("S3_BUCKET");
}

function getS3Prefix(): string {
  const raw = process.env.S3_PREFIX ?? "published/v1";
  return raw.replace(/^\/+|\/+$/g, "");
}

function getS3Endpoint(): string | null {
  return getEnv("S3_ENDPOINT");
}

function getS3AccessKeyId(): string | null {
  return getEnv("S3_ACCESS_KEY_ID");
}

function getS3SecretAccessKey(): string | null {
  return getEnv("S3_SECRET_ACCESS_KEY");
}

function getS3ForcePathStyle(): boolean {
  const raw = process.env.S3_FORCE_PATH_STYLE?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

function getS3Client(): S3Client | null {
  const region = getS3Region();
  if (!region) {
    return null;
  }

  const endpoint = getS3Endpoint();
  const accessKeyId = getS3AccessKeyId();
  const secretAccessKey = getS3SecretAccessKey();

  const config: ConstructorParameters<typeof S3Client>[0] = {
    region,
  };

  if (endpoint) {
    config.endpoint = endpoint;
  }

  if (accessKeyId && secretAccessKey) {
    config.credentials = {
      accessKeyId,
      secretAccessKey,
    };
  }

  if (endpoint) {
    config.forcePathStyle = getS3ForcePathStyle();
  }

  return new S3Client(config);
}

function joinS3Key(storagePath: string): string {
  const cleanedPath = storagePath.replace(/^\/+/, "");
  const prefix = getS3Prefix();
  return prefix ? `${prefix}/${cleanedPath}` : cleanedPath;
}

async function bodyToArrayBuffer(body: S3BodyLike): Promise<ArrayBuffer> {
  if (typeof body.transformToByteArray === "function") {
    const bytes = await body.transformToByteArray();
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    return copy.buffer;
  }

  if (typeof body.transformToString === "function") {
    const text = await body.transformToString();
    return new TextEncoder().encode(text).buffer;
  }

  throw new Error("Unsupported S3 body type.");
}

export async function readS3StorageObject(
  storagePath: string
): Promise<StorageReadResult | null> {
  const client = getS3Client();
  const bucket = getS3Bucket();

  if (!client || !bucket) {
    throw new Error(
      "S3-compatible storage is not configured. Missing S3_REGION or S3_BUCKET."
    );
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: joinS3Key(storagePath),
  });

  try {
    const response = await client.send(command);

    if (!response.Body) {
      return null;
    }

    const body = await bodyToArrayBuffer(response.Body as S3BodyLike);

    return {
      body,
      contentType: response.ContentType ?? "application/octet-stream",
      contentLength: response.ContentLength ?? body.byteLength,
      etag: response.ETag ?? null,
      lastModified: response.LastModified?.toISOString() ?? null,
      source: "s3",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (
      message.includes("NoSuchKey") ||
      message.includes("The specified key does not exist") ||
      message.includes("NotFound")
    ) {
      return null;
    }

    throw error;
  }
}
