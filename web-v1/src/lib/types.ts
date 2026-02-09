export type ChainId = "bitcoin" | "ethereum" | "arbitrum" | "base";

export type DatasetIndex = {
  dataset_id: string;
  revision_id: string;
  computed_at_utc: string;
  methodology_version: string;
  notes?: string[];
  supported_chains: ChainId[];
  supported_genres: Array<"gold" | "meta" | "derived">;
  asof_by_genre_chain: Record<string, Record<string, string>>;
  schema_versions?: Record<string, string>;
};

export type MetaFile = {
  chain: ChainId;
  updated_through: string;
  publish_lag_days_policy?: number;
  tier_used?: string;
  status?: string;
  missing: boolean;
  confidence: {
    chain: ChainId;
    asof_date: string;
    window_days: number;
    confidence_score: number;
    notes?: string[];
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
        components: Record<
          string,
          { current: number | null; z: number | null; score_raw: number | null }
        >;
      }
    >;
    notes?: string[];
  };
  regime: {
    chain: ChainId;
    label: string;
    asof_date: string;
    window_days: number;
    ruleset_id: string;
    drivers: Array<{
      metric: string;
      axis: string;
      current: number;
      z_robust: number;
      pct_90d: number;
      trend: string;
      momentum_7d_vs_30d: number;
    }>;
    axes: Record<string, { band_high: string; band_low: string; trend: string }>;
  };
};

export type DerivedFile = {
  chain: ChainId;
  date: string;
  derived: {
    metrics: Record<string, number>;
    meta_confidence?: unknown;
    context_blocks?: unknown[];
  };
};

export type GoldFile = {
  chain: ChainId;
  date: string;
  [metric: string]: string | number;
};

/**
 * Landing contract (published by pipeline/tools/export_landing_hero.py)
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

export type LandingHeroFile = {
  chain: ChainId;
  dataset_id: string;
  revision_id: number;
  computed_at_utc: string;

  // as-of dates per genre (as in your JSON)
  asof: {
    gold: string;
    meta: string;
    derived: string;
  };

  // NEW: matches hero.json
  windows_supported: number[];

  // optional backward compat if you had this earlier
  windows_available?: number[];

  // keep whatever you already have here:
  files: any;
  hero: any;

  // optional if you use this in UI
  default_window_days?: number;
  default?: {
    series?: LandingHeroPoint[];
  };
};
