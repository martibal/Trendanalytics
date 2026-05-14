export type RegimeLabel =
  | "STABLE"
  | "HEATING"
  | "CONGESTED"
  | "CHEAP"
  | "UNKNOWN/DEGRADED";

export type BriefStatus = "published" | "degraded" | "unavailable";

export type SiteBriefSeriesDay = {
  date: string;
  label: RegimeLabel;
  color?: string;
  confidence_score: number | null;
  primary_driver: string | null;
};

export type SiteBriefChain = {
  chain: string;
  label: RegimeLabel | null;
  pattern: string;
  headline: string | null;
  updated_through: string | null;
  brief_status: BriefStatus;
  confidence?: {
    latest?: number | null;
    average_7d?: number | null;
    direction?: string | null;
  };
};

export type SiteBriefSeries = {
  chain: string;
  updated_through: string | null;
  days: SiteBriefSeriesDay[];
};

export type SiteBriefBundle = {
  schema: "urd_atlas.site_briefs_bundle.v1";
  brief_status: BriefStatus;
  published_at: string | null;
  is_intraday: false;
  summary?: {
    headline?: string | null;
    text?: string | null;
  };
  freshness?: Record<string, unknown> & {
    same_updated_through_all_chains?: boolean;
  };
  chains: SiteBriefChain[];
  series_30d: SiteBriefSeries[];
  guardrails?: {
    not_intraday?: boolean;
    not_prediction?: boolean;
    not_investment_advice?: boolean;
  };
};
