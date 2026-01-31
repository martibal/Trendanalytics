// web-v1/src/catalog/warnings.ts
//
// Deterministic warning generation for the internal catalog.
// Compares observed scan results (what exists in data) against PRODUCT_DECISIONS
// (what is allowed to exist in the product).
//
// This is internal tooling only; messages are for builders, not end users.

import type { Chain } from "./decisions/productDecisions";
import { PRODUCT_DECISIONS, decisionStatusForChain, isAllowedInProduct } from "./decisions/productDecisions";

export type Severity = "error" | "warn" | "info";

export type CatalogWarning = {
  severity: Severity;
  code:
    | "UNDECLARED_METRIC_IN_DATA"
    | "DECLARED_METRIC_MISSING_IN_DATA"
    | "DECLARED_CORE_MISSING_FOR_CHAIN"
    | "DECLARED_SCOPE_MISMATCH"
    | "METRIC_ALL_MISSING"
    | "UNIT_ANOMALY_PCT"
    | "INVARIANT_VIOLATION_RATE_RANGE";
  message: string;
  metric_id?: string;
  chain?: Chain;
};

export type ObservedMetricSummary = {
  metric_id: string;
  chains_present: Chain[];
  // chain -> missing_rate
  missing_rate_by_chain: Partial<Record<Chain, number>>;
  // chain -> min/median/max to support invariants + internal display
  min_by_chain: Partial<Record<Chain, number | null>>;
  median_by_chain: Partial<Record<Chain, number | null>>;
  max_by_chain: Partial<Record<Chain, number | null>>;
  // chain -> pct unit guess (from scan)
  pct_unit_guess_by_chain?: Partial<Record<Chain, "0..1" | "0..100" | "mixed/unknown">>;
};

export function buildWarnings(args: {
  observed: Record<string, ObservedMetricSummary>;
  chains: Chain[];
}): CatalogWarning[] {
  const { observed, chains } = args;
  const warnings: CatalogWarning[] = [];

  const observedIds = new Set(Object.keys(observed));
  const declaredIds = new Set(Object.keys(PRODUCT_DECISIONS));

  // 1) Present in data but NOT declared -> error
  for (const metric_id of Array.from(observedIds).sort()) {
    if (!declaredIds.has(metric_id)) {
      warnings.push({
        severity: "error",
        code: "UNDECLARED_METRIC_IN_DATA",
        metric_id,
        message: `Metric '${metric_id}' exists in gold data but is NOT declared in PRODUCT_DECISIONS (product contract violation).`,
      });
    }
  }

  // 2) Declared but missing in data for all chains -> error
  for (const metric_id of Array.from(declaredIds).sort()) {
    const obs = observed[metric_id];
    if (!obs || !obs.chains_present || obs.chains_present.length === 0) {
      warnings.push({
        severity: "error",
        code: "DECLARED_METRIC_MISSING_IN_DATA",
        metric_id,
        message: `Metric '${metric_id}' is declared in PRODUCT_DECISIONS but was not found in gold data for any chain.`,
      });
    }
  }

  // 3) For declared metrics, check chain-scoped expectations:
  for (const metric_id of Array.from(declaredIds).sort()) {
    const obs = observed[metric_id];
    if (!obs) continue;

    for (const chain of chains) {
      const status = decisionStatusForChain(metric_id, chain);
      const allowed = isAllowedInProduct(metric_id, chain);
      const present = obs.chains_present.includes(chain);

      // Declared CORE but missing -> error
      if (status === "core" && !present) {
        warnings.push({
          severity: "error",
          code: "DECLARED_CORE_MISSING_FOR_CHAIN",
          metric_id,
          chain,
          message: `Metric '${metric_id}' is declared CORE for '${chain}' but is missing from gold data for that chain.`,
        });
      }

      // Allowed-in-product but missing -> warn (secondary/experimental missing)
      if (allowed && !present && status !== "core") {
        warnings.push({
          severity: "warn",
          code: "DECLARED_SCOPE_MISMATCH",
          metric_id,
          chain,
          message: `Metric '${metric_id}' is allowed for '${chain}' (status: ${String(status)}) but is missing from gold data for that chain.`,
        });
      }

      // Present in data but status hidden -> info (ok: export/internal use only)
      if (present && status === "hidden") {
        warnings.push({
          severity: "info",
          code: "DECLARED_SCOPE_MISMATCH",
          metric_id,
          chain,
          message: `Metric '${metric_id}' exists in data for '${chain}' but is declared HIDDEN for product UI (export/internal use only).`,
        });
      }
    }

    // 4) Simple invariant checks for rate/pct-like metrics
    if (looksRateLike(metric_id)) {
      for (const chain of obs.chains_present) {
        const min = obs.min_by_chain[chain];
        const max = obs.max_by_chain[chain];

        // Important: because these are Partial<Record<...>>, TS allows undefined.
        // Treat anything non-finite as missing for invariant purposes.
        const minOk = typeof min === "number" && Number.isFinite(min);
        const maxOk = typeof max === "number" && Number.isFinite(max);

        if (!minOk || !maxOk) {
          warnings.push({
            severity: "warn",
            code: "METRIC_ALL_MISSING",
            metric_id,
            chain,
            message: `Metric '${metric_id}' appears in '${chain}' but has no numeric values in the scanned window (all missing).`,
          });
          continue;
        }

        // If it's a _rate, invariant is strictly [0,1]
        if (metric_id.endsWith("_rate")) {
          if (min < 0 || max > 1) {
            warnings.push({
              severity: "error",
              code: "INVARIANT_VIOLATION_RATE_RANGE",
              metric_id,
              chain,
              message: `Rate metric '${metric_id}' in '${chain}' violates [0,1] range (min=${min}, max=${max}).`,
            });
          }
        }

        // pct unit anomaly detection (heuristic)
        const guess = obs.pct_unit_guess_by_chain?.[chain];
        if (metric_id.endsWith("_pct") && guess && guess === "mixed/unknown") {
          warnings.push({
            severity: "warn",
            code: "UNIT_ANOMALY_PCT",
            metric_id,
            chain,
            message: `Pct-like metric '${metric_id}' in '${chain}' has mixed/unknown unit scale (0..1 vs 0..100). Requires explicit normalization or documentation.`,
          });
        }
      }
    }
  }

  return warnings;
}

function looksRateLike(metricId: string): boolean {
  return metricId.endsWith("_rate") || metricId.endsWith("_pct") || metricId.includes("rate") || metricId.includes("pct");
}

/* ---------------- Declared-but-not-observed panel ---------------- */

export type DeclaredButNotObserved = {
  metric_id: string;
  missing_chains: Chain[];
  declared_status_by_chain: Partial<Record<Chain, string>>;
};

export function findDeclaredButNotObserved(args: {
  observed: Record<string, ObservedMetricSummary>;
  chains: Chain[];
}): DeclaredButNotObserved[] {
  const { observed, chains } = args;

  const out: DeclaredButNotObserved[] = [];

  for (const metric_id of Object.keys(PRODUCT_DECISIONS).sort()) {
    const decision = PRODUCT_DECISIONS[metric_id];
    if (!decision) continue;

    const obs = observed[metric_id];

    const missing_chains: Chain[] = [];
    const declared_status_by_chain: Partial<Record<Chain, string>> = {};

    for (const chain of chains) {
      const status = decisionStatusForChain(metric_id, chain);
      declared_status_by_chain[chain] = status ?? "undeclared";

      // Strictly enforce CORE availability
      if (status === "core") {
        const present = !!obs?.chains_present.includes(chain);
        if (!present) missing_chains.push(chain);
      }
    }

    if (missing_chains.length > 0) {
      out.push({
        metric_id,
        missing_chains,
        declared_status_by_chain,
      });
    }
  }

  return out;
}
