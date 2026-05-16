// src/lib/types/json.ts

export type ChainId = "bitcoin" | "ethereum" | "arbitrum" | "base";
export type DataGenre = "gold" | "meta" | "derived" | "briefs";
export type WindowToken = "latest" | "7d" | "30d" | "90d" | "180d" | "365d";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

export type DatasetManifestEntry = {
  key: string;
  path: string;
  chain: ChainId;
  genre: DataGenre;
  window: WindowToken | string;
  asOf: string;
  methodologyVersion?: string | null;
  checksumSha256?: string | null;
  sizeBytes?: number | null;
};

export type DatasetManifest = {
  version: string;
  generatedAt: string;
  entries: DatasetManifestEntry[];
};

export type PublishConfidence = {
  confidenceScore: number | null;
  confidenceLabel: string | null;
  reasons?: string[] | null;
};

export type ScorecardDimension = {
  key: string;
  label: string;
  value: number | null;
  status?: string | null;
  detail?: string | null;
};

export type RegimeDriver = {
  key: string;
  label: string;
  value?: number | null;
  detail?: string | null;
};

export type MetaJson = {
  chain: ChainId | string;
  asOf: string;
  status?: {
    label?: string | null;
    detail?: string | null;
  } | null;
  confidence?: {
    confidenceScore?: number | null;
    confidenceLabel?: string | null;
  } | null;
  publishConfidence?: PublishConfidence | null;
  regime?: {
    label?: string | null;
    detail?: string | null;
    drivers?: RegimeDriver[] | null;
  } | null;
  scorecard?: {
    dimensions?: ScorecardDimension[] | null;
  } | null;
  methodologyVersion?: string | null;
};

export type GoldMetricPoint = {
  date: string;
  value: number | null;
};

export type GoldJsonMetric = {
  key: string;
  label?: string | null;
  unit?: string | null;
  latest?: number | null;
  series?: GoldMetricPoint[] | null;
};

export type GoldJson = {
  chain: ChainId | string;
  asOf: string;
  metrics: GoldJsonMetric[];
  methodologyVersion?: string | null;
};

export type DerivedJsonSeriesPoint = {
  date: string;
  value: number | null;
};

export type DerivedJsonMetric = {
  key: string;
  label?: string | null;
  value?: number | null;
  ma7?: number | null;
  ma30?: number | null;
  series?: DerivedJsonSeriesPoint[] | null;
};

export type DerivedJson = {
  chain: ChainId | string;
  asOf: string;
  metrics: DerivedJsonMetric[];
  methodologyVersion?: string | null;
};

export type BriefJson = {
  schema?: string;
  chain?: ChainId | string;
  date?: string;
  updated_through?: string | null;
  brief_status?: string | null;
  label?: string | null;
  headline?: string | null;
  summary?: string | null;
  confidence?: JsonObject | null;
  guardrails?: JsonObject | null;
  methodology_version?: string | null;
  brief_version?: string | null;
};

export type LandingIndexRow = {
  chain: ChainId | string;
  label?: string | null;
  latestAsOf?: string | null;
  status?: string | null;
  confidenceLabel?: string | null;
  regimeLabel?: string | null;
  href?: string | null;
};

export type LandingIndexJson = {
  generatedAt: string;
  rows: LandingIndexRow[];
};

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isWindowToken(value: unknown): value is WindowToken {
  return (
    value === "latest" ||
    value === "7d" ||
    value === "30d" ||
    value === "90d" ||
    value === "180d" ||
    value === "365d"
  );
}

export function isChainId(value: unknown): value is ChainId {
  return (
    value === "bitcoin" ||
    value === "ethereum" ||
    value === "arbitrum" ||
    value === "base"
  );
}

export function isDataGenre(value: unknown): value is DataGenre {
  return value === "gold" || value === "meta" || value === "derived" || value === "briefs";
}