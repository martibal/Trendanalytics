// src/app/methodology/versions.ts

export type MethodologyChangeItem = {
  /**
   * Area is a stable category label for filtering / scanning.
   * Examples: "Schema", "Frontend", "Pipeline", "Governance", "Derived", "Meta"
   */
  area: string;

  /**
   * Descriptive-only change description.
   * No advisory language, no price, no predictions.
   */
  description: string;
};

export type MethodologyVersion = {
  /**
   * Semantic-ish version string. Keep stable and human readable.
   * Examples: "v1.0.0", "v1.1.0"
   */
  version: string;

  /**
   * ISO date "YYYY-MM-DD" when the methodology version was published.
   * Used for ordering and traceability.
   */
  published_at: string;

  /**
   * Short descriptive summary of what changed in this version.
   */
  summary: string;

  /**
   * List of concrete change items. This is the canonical "Previously" contract.
   */
  changes: MethodologyChangeItem[];
};

/**
 * Canonical methodology version archive.
 *
 * Governance contract:
 * - Add new entries by appending (do not rewrite older entries).
 * - If definitions change, record "from -> to" explicitly in changes[].
 * - No silent replacement; "Previously" must remain accessible.
 * - Descriptive only: no advice, no price, no forecasts.
 *
 * NOTE: The UI sorts this array (descending by published_at, then version).
 * Keep published_at as ISO YYYY-MM-DD for deterministic ordering.
 */
export const METHODOLOGY_VERSIONS: MethodologyVersion[] = [
  {
    version: "v1.0.0",
    published_at: "2026-03-03",
    summary:
      "Initial public contract for Urd Atlas web consumption: read-only rendering of published meta/gold/derived artifacts with explicit traceability.",
    changes: [
      {
        area: "Governance",
        description:
          "Established non-negotiables: descriptive-only outputs; no price data; no forecasts; no advisory language; frontend reads published JSON only.",
      },
      {
        area: "Data contract",
        description:
          "Defined published hierarchy for web: meta/<chain>/latest.json (confidence, scorecard, regime, drivers), gold/<chain>/YYYY-MM-DD.json (raw daily values), derived/<chain>/YYYY-MM-DD.json (published transforms such as MA7/MA30).",
      },
      {
        area: "Frontend",
        description:
          "Deterministic windowing and rendering rules: no recomputation of regimes, confidence, z-scores, scorecard, or moving averages; only display published values and published MA fields.",
      },
      {
        area: "Traceability",
        description:
          "UI components must expose source paths and field paths where practical so users can map every displayed value to a published JSON location.",
      },
      {
        area: "Versioning",
        description:
          "Introduced methodology version archive ('Previously') as the canonical location for documenting changes and retaining older definitions.",
      },
    ],
  },
  {
    version: "v1.1.0",
    published_at: "2026-03-08",
    summary:
      "Expanded the public web contract with explicit documentation routes, public API endpoints, threshold defaults exposure, loading states, and shared site footer/compliance links.",
    changes: [
      {
        area: "Documentation",
        description:
          "Added public documentation routes for About, API Docs, Thresholds, Track Record, Terms, and Privacy so the descriptive product surface is navigable and explicit.",
      },
      {
        area: "API",
        description:
          "Added public machine-readable endpoints for landing, status, whats-happening-now per chain, summary per chain, and threshold defaults.",
      },
      {
        area: "Thresholds",
        description:
          "Documented public default threshold values via /api/v1/thresholds/defaults and rendered those defaults on the Thresholds page without altering canonical published outputs.",
      },
      {
        area: "Frontend",
        description:
          "Added deterministic loading skeletons for chain routes and introduced a shared WindowSelector contract for chart window navigation.",
      },
      {
        area: "Navigation",
        description:
          "Expanded homepage/public route discoverability so newly published public pages are reachable from the public site surface.",
      },
      {
        area: "Compliance",
        description:
          "Introduced a shared site footer with links to System Status, API Docs, Track Record, Terms, Privacy, and About, plus AWS Public Blockchain Data attribution.",
      },
      {
        area: "Privacy",
        description:
          "Public privacy route now explicitly discloses Vercel Analytics and Sentry as part of the web application operations layer.",
      },
      {
        area: "Traceability",
        description:
          "About, API Docs, Track Record, Status, and landing views now surface dataset metadata and/or methodology version more consistently.",
      },
    ],
  },
];