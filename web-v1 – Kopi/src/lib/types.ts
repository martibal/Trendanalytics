// src/lib/types.ts
export type ChainId = "bitcoin" | "ethereum" | "arbitrum" | "base";

/**
 * ===== Web3: Dataset contract types =====
 */

export type DerivedDefinition = {
  schema_version: string; // e.g. "derived_definition.v1"
  method: string; // e.g. "moving_average"
  windows_days: number[]; // e.g. [7,30,90,180,365]
  min_periods: number; // e.g. 1
  suffix_format: string; // e.g. "ma{window}"
  notes?: string[];
};

export type DatasetCoverage = {
  // Coverage is a published summary; schema may evolve.
  // We keep it typed, but flexible.
  by_chain?: Record<
    ChainId,
    {
      // Example: { earliest: "YYYY-MM-DD", latest: "YYYY-MM-DD", days: 400, ... }
      earliest?: string;
      latest?: string;
      days?: number;
      notes?: string[];
      // Any extra fields are allowed but must stay non-any.
      [k: string]: string | number | boolean | string[] | null | undefined;
    }
  >;
  notes?: string[];
  [k: string]: unknown;
};

export type DatasetIndex = {
  dataset_id: string;
  revision_id: number;
  computed_at_utc: string;
  methodology_version: string;
  notes?: string[];

  supported_chains: ChainId[];
  supported_genres: Array<"gold" | "meta" | "derived">;

  asof_by_genre_chain: Record<string, Record<string, string>>;
  schema_versions?: Record<string, string>;

  // Web3 additions (published in dataset.json)
  coverage?: DatasetCoverage;
  derived_definition?: DerivedDefinition;

  // Additional published fields seen in dataset.json
  copied_file_counts?: Record<string, number>;
  windows_supported?: number[];
};

/**
 * ===== Web3: Contract file types =====
 * Contract is first-class and must be type-safe (no any).
 * Some sections are intentionally "unknown" because their internal schema can evolve
 * while remaining contract-driven. Unknown is allowed; any is not.
 */

export type ContractGate = {
  type: string; // e.g. "gate.v1"
  policy: string; // e.g. "deterministic_in_ui"
  notes?: string[];
};

export type ContractIdentity = {
  schema_version: string; // e.g. "identity.v1"
  what: string;
  canonical: {
    field: string; // e.g. "meta.regime.determinism_hash"
    what: string;
    how: string;
    notes?: string[];
  };
  custom: {
    field: string; // e.g. "custom_regime.identity_hash"
    what: string;
    how: string;
    notes?: string[];
  };
};

export type ThresholdConfigDefault = {
  gate: {
    confidence_threshold: number;
  };
  trend: {
    eps: number;
  };
  profile?: string;
  [k: string]: unknown;
};

export type ContractFile = {
  contract_version: string;
  methodology_version: string;
  schema_versions: Record<string, string>;

  gate: ContractGate;
  identity: ContractIdentity;

  derived_definition: DerivedDefinition;

  // Regime/meta/custom schema sections are contract-driven; keep them typed as unknown (not any).
  regime: unknown;
  meta: unknown;
  custom_regime: unknown;

  metric_dictionary: Record<string, unknown>;

  threshold_config_default: ThresholdConfigDefault;
  threshold_config_schema: unknown;
};

/**
 * ===== Web3: UI-level gate state =====
 * Gate state is derived deterministically in UI from META fields + contract gate policy.
 */

export type GateState = {
  is_gated: boolean;
  reason: string; // short deterministic label, e.g. "low_confidence"
  threshold: number;
};

/**
 * ===== Published META =====
 *
 * NOTE: META schema evolves; this type aims to be strict where we rely on fields,
 * and flexible/optional where producers may vary by chain / revision.
 */

export type RegimeGateStatus = "OK" | "BLOCKED" | "DEGRADED" | "UNKNOWN";

export type RegimeGate = {
  status?: RegimeGateStatus | string;
  confidence_score?: number;
  threshold_used?: number;
  explanation?: string;
};

export type RegimeAxisSummary = {
  band_high: string;
  band_low: string;
  trend: string;
};

export type RegimeSignal = {
  axis?: string;
  current?: number | null;
  pct_90d?: number | null; // can be 0..1 or 0..100 depending on publisher
  z_robust?: number | null;
  momentum_7d_vs_30d?: number | null;

  // Allow additional producer fields without using `any`
  [k: string]: string | number | boolean | null | undefined;
};

export type MetaFile = {
  chain: ChainId;
  updated_through: string;

  // Policy hint: typical publication lag (days)
  publish_lag_days_policy?: number;

  tier_used?: string;
  status?: string;

  // If true, the publisher indicates this META is missing/unavailable.
  missing: boolean;

  // Optional: freshness surface (some producers emit this at top-level)
  freshness?: {
    asof?: string;
    lag_days?: number;
    [k: string]: unknown;
  };

  // Optional: coverage surface (some producers emit this at top-level)
  coverage?: {
    expected_days?: number;
    present_days?: number;
    nonNull_ratio?: number;
    non_null_ratio?: number;
    [k: string]: unknown;
  };

  confidence: {
    chain: ChainId;
    asof_date: string;
    window_days: number;
    confidence_score: number;

    // Optional: some producers include lag/coverage inside confidence
    lag_days?: number;
    expected_days?: number;
    present_days?: number;
    nonNull_ratio?: number;

    notes?: string[];
    [k: string]: unknown;
  };

  scorecard: {
    chain: ChainId;
    asof_date: string;
    window_days: number;
    confidence_score: number;
    dimensions: Record<
      string,
      {
        score_raw: number | null;
        score: number;
        level: string;
        effective_confidence: number;
        coverage_factor: number;
        components: Record<string, { current: number | null; z: number | null; score_raw: number | null }>;
      }
    >;
    notes?: string[];
    [k: string]: unknown;
  };

  regime: {
    chain: ChainId;
    label: string;
    asof_date: string;
    window_days: number;
    ruleset_id: string;

    // Web3 / WebEkstra: canonical determinism hash may exist or be null/absent when gated
    determinism_hash?: string | null;

    // Optional: gate surface (future-compatible)
    gate?: RegimeGate;

    drivers: Array<{
      metric: string;
      axis: string;
      current: number;
      z_robust: number;
      pct_90d: number;
      trend: string;
      momentum_7d_vs_30d: number;
      [k: string]: unknown;
    }>;

    axes: Record<string, RegimeAxisSummary>;

    // WebEkstra: signals surface exists for custom regime evaluation + advanced “why”
    signals?: Record<string, RegimeSignal>;

    // Optional: alias mapping from canonical metric keys to dictionary/wiki keys
    signal_aliases?: Record<string, string>;

    [k: string]: unknown;
  };

  [k: string]: unknown;
};

/**
 * ===== Published DERIVED =====
 */

export type DerivedFile = {
  chain: ChainId;
  date: string;
  derived: {
    metrics: Record<string, number>;
    meta_confidence?: unknown;
    context_blocks?: unknown[];
  };
};

/**
 * ===== Published GOLD =====
 */

export type GoldFile = {
  chain: ChainId;
  date: string;
  [metric: string]: string | number | null;
};

/**
 * ===== Landing contract (published by pipeline/tools/export_landing_hero.py) =====
 */

export type LandingHeroPoint = {
  date: string;
  daily: number | null;
  ma7: number | null;
  ma30: number | null;
  confidence: number | null;
  regime: string | null;
};

export type LandingMicroMetric = {
  metric: string;
  date: string;
  daily: number | null;
  ma7: number | null;
  ma30: number | null;
  ma7_vs_ma30_pct: number | null;
};

export type LandingMicro = {
  date: string;
  confidence: number | null;
  regime: string | null;
  activity: LandingMicroMetric;
  friction: LandingMicroMetric;
  capacity: LandingMicroMetric;
};

export type LandingWindowFile = {
  chain: ChainId;
  window_days: number;
  hero_metric: string;
  series: LandingHeroPoint[];
  micro: LandingMicro | Record<string, never>;
};

export type LandingGenreFiles = {
  latest: string; // e.g. "meta/bitcoin/latest.json"
  manifest: string; // e.g. "meta/bitcoin/manifest.json"
  windows: Record<string, string>; // e.g. { "7": ".../last7d.json", ... }
};

export type LandingFilesIndex = {
  gold: LandingGenreFiles;
  meta: LandingGenreFiles;
  derived: LandingGenreFiles;
};

export type LandingChartSpec = {
  id: string;
  title: string;
  genre: "gold" | "meta" | "derived";
  window_days: number;
  source_file: string; // relative to /data/published/v1
  x: string; // usually "date"
  y: string; // metric key
  format: "int" | "float" | "pct" | "string";
  hint_basic?: string;
  hint_advanced?: string;
};

export type LandingHeroContent = {
  headline: string;
  charts: LandingChartSpec[];
  notes?: string[];
};

export type LandingHeroFile = {
  chain: ChainId;
  dataset_id: string;
  revision_id: number;
  computed_at_utc: string;

  asof: {
    gold: string;
    meta: string;
    derived: string;
  };

  windows_supported: number[];

  // Published file index for "JSON is first-class"
  files: LandingFilesIndex;

  // Published hero content structure (no any)
  hero: LandingHeroContent;

  // optional backward compat
  windows_available?: number[];
  default_window_days?: number;
  default?: {
    series?: LandingHeroPoint[];
  };
};