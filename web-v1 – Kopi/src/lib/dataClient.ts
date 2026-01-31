import { z } from "zod";
import {
  Chain,
  ChainSchema,
  Dataset,
  DatasetSchema,
  Genre,
  GenreSchema,
  LatestPayload,
  LatestPayloadSchema,
  Manifest,
  ManifestSchema,
  WindowPayload,
  WindowPayloadSchema,
} from "./schemas";
import { headers } from "next/headers";

export class DataClientError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "DataClientError";
  }
}

export class HttpError extends DataClientError {
  constructor(
    public readonly url: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class SchemaError extends DataClientError {
  constructor(public readonly url: string, public readonly zodError: z.ZodError) {
    super(`Schema validation failed for ${url}`);
    this.name = "SchemaError";
  }
}

async function getOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}


function configuredBasePath(): string {
  const v = process.env.NEXT_PUBLIC_DATA_BASE_URL ?? "/data/published/v1";
  // Ensure it starts with "/" and has no trailing "/"
  const withSlash = v.startsWith("/") ? v : `/${v}`;
  return withSlash.endsWith("/") ? withSlash.slice(0, -1) : withSlash;
}

function joinPath(...parts: string[]): string {
  const clean = parts
    .filter(Boolean)
    .map((p) => p.replace(/(^\/+|\/+$)/g, ""));
  return "/" + clean.join("/");
}

async function makeAbsoluteUrl(pathOrUrl: string): Promise<string> {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return new URL(pathOrUrl, await getOrigin()).toString();
}


async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const abs = await makeAbsoluteUrl(url);
  const res = await fetch(abs, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new HttpError(abs, res.status, `HTTP ${res.status} when fetching ${abs}`);
  }
  return res.json();
}

function parseOrThrow<T>(schema: z.ZodType<T>, url: string, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new SchemaError(url, parsed.error);
  return parsed.data;
}

export type DataClientOptions = {
  cacheMode?: RequestCache; // "no-store" in dev proof
};

export class DataClient {
  constructor(private readonly opts: DataClientOptions = {}) {}

  datasetUrl(): string {
    return joinPath(configuredBasePath(), "dataset.json");
  }

  manifestUrl(genre: Genre, chain: Chain): string {
    GenreSchema.parse(genre);
    ChainSchema.parse(chain);
    return joinPath(configuredBasePath(), genre, chain, "manifest.json");
  }

  async getDataset(): Promise<Dataset> {
    const url = this.datasetUrl();
    const data = await fetchJson(url, { cache: this.opts.cacheMode ?? "no-store" });
    return parseOrThrow(DatasetSchema, url, data);
  }

  async getManifest(genre: Genre, chain: Chain): Promise<Manifest> {
    const url = this.manifestUrl(genre, chain);
    const data = await fetchJson(url, { cache: this.opts.cacheMode ?? "no-store" });
    return parseOrThrow(ManifestSchema, url, data);
  }

  async getLatest(genre: Genre, chain: Chain): Promise<LatestPayload> {
    const manifest = await this.getManifest(genre, chain);
    const url = joinPath(configuredBasePath(), genre, chain, manifest.files.latest);
    const data = await fetchJson(url, { cache: this.opts.cacheMode ?? "no-store" });
    return parseOrThrow(LatestPayloadSchema, url, data);
  }

  async getWindow(genre: Genre, chain: Chain, days: number): Promise<WindowPayload> {
    const manifest = await this.getManifest(genre, chain);
    const key = String(days);

    const windows = manifest.files.windows as Record<string, unknown>;
    const candidate = windows[key];

    if (typeof candidate !== "string" || candidate.length === 0) {
      throw new DataClientError(
        `Window ${days} not supported for ${genre}/${chain}. Available: ${Object.keys(
          manifest.files.windows as Record<string, string>,
        ).join(", ")}`,
      );
    }

    const url = joinPath(configuredBasePath(), genre, chain, candidate);
    const data = await fetchJson(url, { cache: this.opts.cacheMode ?? "no-store" });
    return parseOrThrow(WindowPayloadSchema, url, data);
  }

}
