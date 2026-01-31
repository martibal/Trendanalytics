// web-v1/src/catalog/scan/scanDataset.ts
//
// Orchestrates the internal catalog scan for GOLD:
// - loads dataset.json
// - loads gold manifests per chain
// - loads gold last365d per chain
// - scans metric profiles per chain (scanGoldWindowRows)
// - aggregates into observed metric summaries
// - generates warnings vs PRODUCT_DECISIONS
// - computes declared-but-not-observed list (CORE missing)
//
// This remains observational: it never changes product decisions.

import type { Chain } from "../decisions/productDecisions";
import { CHAINS } from "../decisions/productDecisions";
import { loadDataset } from "./loadDataset";
import { loadManifest } from "./loadManifest";
import { loadWindow } from "./loadWindow";
import { scanGoldWindowRows } from "./scanGoldMetrics";
import type { ChainScanResult, MetricProfile } from "./scanGoldMetrics";
import { buildWarnings, findDeclaredButNotObserved } from "../warnings";
import type { CatalogWarning, ObservedMetricSummary, DeclaredButNotObserved } from "../warnings";

export type DatasetBootstrap = {
  dataset_id?: string;
  revision_id?: number;
  computed_at_utc?: string;
  windows_supported?: number[];
  supported_chains?: string[];
  supported_genres?: string[];
  asof_by_genre_chain?: Record<string, Record<string, string>>;
};

export type Manifest = {
  dataset_id?: string;
  revision_id?: number;
  computed_at_utc?: string;
  genre?: string;
  chain?: string;
  asof?: string;
  available_days?: string[];
  available_days_count?: number;
  windows_supported?: number[];
};

export type ScanOptions = {
  baseUrl: string; // "/data/published/v1"
  windowDays?: number; // default 365
  cacheBuster?: string; // e.g. dataset_id or `${dataset_id}.${revision_id}`
  sanitizeInvalidJsonTokens?: boolean; // default false
};

export type ScanResult = {
  dataset: DatasetBootstrap;
  manifests: Partial<Record<Chain, Manifest>>;
  chainScans: Partial<Record<Chain, ChainScanResult>>;
  observed: Record<string, ObservedMetricSummary>;
  warnings: CatalogWarning[];
  declaredButNotObserved: DeclaredButNotObserved[];
};

export async function scanGoldDataset(opts: ScanOptions): Promise<ScanResult> {
  const windowDays = opts.windowDays ?? 365;

  // 1) dataset.json
  const dataset = await loadDataset<DatasetBootstrap>({
    baseUrl: opts.baseUrl,
    cache: "no-store",
    cacheBuster: opts.cacheBuster,
  });

  const inferredCacheBuster =
    opts.cacheBuster ||
    (dataset.dataset_id && typeof dataset.revision_id === "number"
      ? `${dataset.dataset_id}.${dataset.revision_id}`
      : dataset.dataset_id || undefined);

  // 2) Manifests + windows per chain
  const manifests: Partial<Record<Chain, Manifest>> = {};
  const chainScans: Partial<Record<Chain, ChainScanResult>> = {};

  for (const chain of CHAINS) {
    const manifest = await loadManifest<Manifest>({
      baseUrl: opts.baseUrl,
      genre: "gold",
      chain,
      cache: "no-store",
      cacheBuster: inferredCacheBuster,
    });
    manifests[chain] = manifest;

    const rows = await loadWindow<unknown>({
      baseUrl: opts.baseUrl,
      genre: "gold",
      chain,
      windowDays,
      cache: "no-store",
      cacheBuster: inferredCacheBuster,
      sanitizeInvalidJsonTokens: opts.sanitizeInvalidJsonTokens ?? false,
    });

    chainScans[chain] = scanGoldWindowRows(chain, rows);
  }

  // 3) Aggregate observed metrics across chains
  const observed = aggregateObservedGold(chainScans);

  // 4) Warnings vs PRODUCT_DECISIONS
  const warnings = buildWarnings({
    observed,
    chains: CHAINS,
  });

  // 5) Declared CORE but not observed (pipeline regression detector)
  const declaredButNotObserved = findDeclaredButNotObserved({
    observed,
    chains: CHAINS,
  });

  return {
    dataset,
    manifests,
    chainScans,
    observed,
    warnings,
    declaredButNotObserved,
  };
}

function aggregateObservedGold(chainScans: Partial<Record<Chain, ChainScanResult>>): Record<string, ObservedMetricSummary> {
  const observed: Record<string, ObservedMetricSummary> = {};

  for (const [chainKey, scan] of Object.entries(chainScans)) {
    const chain = chainKey as Chain;
    if (!scan) continue;

    for (const [metric_id, profile] of Object.entries(scan.metrics)) {
      upsertObserved(observed, chain, metric_id, profile);
    }
  }

  return observed;
}

function upsertObserved(
  observed: Record<string, ObservedMetricSummary>,
  chain: Chain,
  metric_id: string,
  profile: MetricProfile
): void {
  if (!observed[metric_id]) {
    observed[metric_id] = {
      metric_id,
      chains_present: [],
      missing_rate_by_chain: {},
      min_by_chain: {},
      median_by_chain: {},
      max_by_chain: {},
      pct_unit_guess_by_chain: {},
    };
  }

  const o = observed[metric_id];
  if (!o.chains_present.includes(chain)) o.chains_present.push(chain);

  o.missing_rate_by_chain[chain] = profile.stats.missing_rate;
  o.min_by_chain[chain] = profile.stats.min;
  o.median_by_chain[chain] = profile.stats.median;
  o.max_by_chain[chain] = profile.stats.max;

  const guess = profile.unit_diagnostics?.pct_unit_guess;
  if (guess) {
    if (!o.pct_unit_guess_by_chain) o.pct_unit_guess_by_chain = {};
    o.pct_unit_guess_by_chain[chain] = guess;
  }
}
