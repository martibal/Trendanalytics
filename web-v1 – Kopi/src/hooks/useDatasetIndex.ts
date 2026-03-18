// src/hooks/useDatasetIndex.ts
"use client";

import useSWR from "swr";
import { fetchJsonLenient } from "@/lib/fetchJson";

/**
 * Coverage summary per chain/genre in dataset.json
 */
export type CoverageSummary = {
  days: number;
  from: string;
  to: string;
  asof: string;
};

export type CoverageMap = Record<string, Record<string, CoverageSummary>>;

/**
 * Derived definition contract (explicit; no inference from field naming)
 */
export type DerivedDefinitionV1 = {
  schema_version: string;
  windows_days: number[];
  method: "rolling_mean";
  min_periods: number;
  suffix_format: string;
  notes?: string[];
};

/**
 * Published dataset index (dataset.json)
 * Keep this permissive to avoid breaking older UI pieces;
 * we validate required parts at runtime.
 */
export type PublishedDataset = {
  dataset_id: string;
  revision_id: number;
  computed_at_utc: string;
  supported_chains: string[];
  supported_genres: string[];
  windows_supported: number[];
  methodology_version?: string;

  // Web3 additions:
  coverage?: CoverageMap;
  derived_definition?: DerivedDefinitionV1;

  // Allow forward-compatible fields:
  [k: string]: any;
};

/**
 * Published contract (contract.json)
 */
export type PublishedContractV1 = {
  contract_version: "v1";
  methodology_version: string;
  dataset_schema_version?: string;
  schema_versions: Record<string, string>;
  derived_definition: DerivedDefinitionV1;
  meta?: {
    confidence?: {
      gating_threshold_default?: number;
      [k: string]: any;
    };
    [k: string]: any;
  };
  gate?: {
    type?: string;
    policy?: string;
    notes?: string[];
    [k: string]: any;
  };
  [k: string]: any;
};

export type PublishedBundle = {
  dataset: PublishedDataset;
  contract: PublishedContractV1;
};

function isObject(x: any): x is Record<string, any> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function assert(cond: any, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function validateDerivedDefinition(dd: any, ctx: string) {
  assert(isObject(dd), `${ctx} must be an object`);
  assert(typeof dd.schema_version === "string" && dd.schema_version.length > 0, `${ctx}.schema_version must be string`);
  assert(Array.isArray(dd.windows_days) && dd.windows_days.every((n: any) => Number.isInteger(n) && n > 0), `${ctx}.windows_days must be positive int[]`);
  assert(dd.method === "rolling_mean", `${ctx}.method must be 'rolling_mean' (v1)`);
  assert(Number.isInteger(dd.min_periods) && dd.min_periods >= 1, `${ctx}.min_periods must be int >= 1`);
  assert(typeof dd.suffix_format === "string" && dd.suffix_format.includes("{window}"), `${ctx}.suffix_format must include '{window}'`);
}

function validateCoverage(cov: any, supportedChains: string[], supportedGenres: string[]) {
  assert(isObject(cov), `dataset.coverage must be an object`);
  for (const chain of supportedChains) {
    assert(chain in cov, `dataset.coverage missing chain '${chain}'`);
    const cObj = cov[chain];
    assert(isObject(cObj), `dataset.coverage.${chain} must be an object`);
    for (const genre of supportedGenres) {
      assert(genre in cObj, `dataset.coverage.${chain} missing genre '${genre}'`);
      const gObj = cObj[genre];
      assert(isObject(gObj), `dataset.coverage.${chain}.${genre} must be an object`);
      assert(typeof gObj.days === "number" && Number.isInteger(gObj.days) && gObj.days >= 0, `dataset.coverage.${chain}.${genre}.days must be int >= 0`);
      for (const k of ["from", "to", "asof"] as const) {
        assert(typeof gObj[k] === "string", `dataset.coverage.${chain}.${genre}.${k} must be string`);
      }
    }
  }
}

function validateDataset(ds: any): asserts ds is PublishedDataset {
  assert(isObject(ds), "dataset.json must be an object");
  assert(typeof ds.dataset_id === "string" && ds.dataset_id.length > 0, "dataset.dataset_id must be string");
  assert(typeof ds.revision_id === "number", "dataset.revision_id must be number");
  assert(typeof ds.computed_at_utc === "string", "dataset.computed_at_utc must be string");
  assert(Array.isArray(ds.supported_chains) && ds.supported_chains.every((x: any) => typeof x === "string"), "dataset.supported_chains must be string[]");
  assert(Array.isArray(ds.supported_genres) && ds.supported_genres.every((x: any) => typeof x === "string"), "dataset.supported_genres must be string[]");
  assert(Array.isArray(ds.windows_supported) && ds.windows_supported.every((n: any) => Number.isInteger(n) && n > 0), "dataset.windows_supported must be positive int[]");

  // Web3-required fields:
  assert("coverage" in ds, "dataset.coverage is required (web3)");
  validateCoverage(ds.coverage, ds.supported_chains, ds.supported_genres);

  assert("derived_definition" in ds, "dataset.derived_definition is required (web3)");
  validateDerivedDefinition(ds.derived_definition, "dataset.derived_definition");
}

function validateContract(ct: any, dataset: PublishedDataset): asserts ct is PublishedContractV1 {
  assert(isObject(ct), "contract.json must be an object");
  assert(ct.contract_version === "v1", "contract.contract_version must be 'v1'");
  assert(typeof ct.methodology_version === "string" && ct.methodology_version.length > 0, "contract.methodology_version must be string");
  assert(isObject(ct.schema_versions), "contract.schema_versions must be an object");

  assert("derived_definition" in ct, "contract.derived_definition is required");
  validateDerivedDefinition(ct.derived_definition, "contract.derived_definition");

  // Basic alignment checks
  if (dataset.methodology_version) {
    assert(
      ct.methodology_version === dataset.methodology_version,
      `methodology_version mismatch: dataset=${dataset.methodology_version} contract=${ct.methodology_version}`
    );
  }

  // Confidence threshold for gating
  const thr = ct?.meta?.confidence?.gating_threshold_default;
  assert(typeof thr === "number" && thr >= 0 && thr <= 1, "contract.meta.confidence.gating_threshold_default must be number in [0,1]");

  // Gate section should exist (policy: deterministic in UI; no backfill)
  assert(isObject(ct.gate), "contract.gate must exist (web3)");
  assert(typeof ct.gate?.type === "string" && ct.gate.type.length > 0, "contract.gate.type must be a non-empty string");
}

async function fetchDatasetAndContract([datasetUrl, contractUrl]: [string, string]): Promise<PublishedBundle> {
  const [dataset, contract] = await Promise.all([
    fetchJsonLenient<PublishedDataset>(datasetUrl),
    fetchJsonLenient<PublishedContractV1>(contractUrl),
  ]);

  validateDataset(dataset);
  validateContract(contract, dataset);

  return { dataset, contract };
}

export function useDatasetIndex() {
  // Published contract root is static:
  //   /public/data/published/v1/...
  const publishedBase = "/data/published/v1";

  const datasetUrl = `${publishedBase}/dataset.json`;
  const contractUrl = `${publishedBase}/contract.json`;

  const { data, error, isLoading, mutate } = useSWR<PublishedBundle>(
    [datasetUrl, contractUrl],
    fetchDatasetAndContract,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    }
  );

  const dataset = data?.dataset ?? null;
  const contract = data?.contract ?? null;

  const coverage = dataset?.coverage ?? null;
  const derivedDefinition = contract?.derived_definition ?? dataset?.derived_definition ?? null;
  const gatingThreshold = contract?.meta?.confidence?.gating_threshold_default ?? null;

  return {
    publishedBase,

    // Raw
    dataset,
    contract,

    // Convenience (web3)
    coverage,
    derivedDefinition,
    gatingThreshold,

    error: error ?? null,
    isLoading,
    refresh: mutate,
  };
}