// src/lib/metrics.ts
// Page-friendly wrapper around metricRegistry.ts
// - Centralizes chain interpretation + chain-aware metric ordering
// - Filters out metrics marked as hidden for a given chain

import {
  type Chain,
  type MetricKey,
  metricExplainForChain,
  metricTitleForChain,
  metricUnitForChain,
  metricFormatForChain,
  orderedMetricKeysForChain,
  getChainProfile,
} from "@/lib/metricRegistry";

export type ExplainMode = "Basic" | "Advanced";

export type MetricCard = {
  key: MetricKey;
  title: string;
  unit: ReturnType<typeof metricUnitForChain>;
  format: ReturnType<typeof metricFormatForChain> | undefined;
  basic: string;
  advanced: string;
};

export function chainInterpretation(chain: Chain, mode: ExplainMode): string {
  const p = getChainProfile(chain);
  return mode === "Advanced" ? p.interpretation.advanced : p.interpretation.basic;
}

/**
 * Build an ordered, chain-aware metric list for rendering.
 * `keysInData` should be the keys present in the dataset rows (excluding chain/date).
 */
export function metricCardsForChain(chain: Chain, keysInData: MetricKey[]): MetricCard[] {
  const ordered = orderedMetricKeysForChain(chain, keysInData);
  return ordered.map((key) => {
    const explain = metricExplainForChain(chain, key);
    return {
      key,
      title: metricTitleForChain(chain, key),
      unit: metricUnitForChain(chain, key),
      format: metricFormatForChain(chain, key),
      basic: explain?.basic ?? "Metric present in the dataset. (Explanation pending mapping.)",
      advanced: explain?.advanced ?? "Add chain-specific interpretation and methodology notes in the registry.",
    };
  });
}
