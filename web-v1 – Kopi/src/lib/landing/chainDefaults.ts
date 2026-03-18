import type { ChainId } from "@/lib/types";
import { requireMetric } from "@/lib/metrics/catalog";

export type ChainKeyMetric = {
  key: string; // base key (daily)
  label: string;
  why: string;
};

/**
 * Single source of truth:
 * - The metric keys listed here are a chain-level UX decision (ordering/priority).
 * - The label/why text MUST come from the metric catalog.
 */
export const DEFAULT_BASE_METRIC_BY_CHAIN: Record<ChainId, string> = {
  bitcoin: "tx_count_daily",
  ethereum: "tx_count_daily",
  arbitrum: "tx_count_daily",
  base: "tx_count_daily",
};

const KM = (key: string): ChainKeyMetric => {
  const m = requireMetric(key);
  return { key: m.key, label: m.shortLabel, why: m.doc.why.basic };
};

export const KEY_METRICS_BY_CHAIN: Record<ChainId, ChainKeyMetric[]> = {
  bitcoin: [KM("tx_count_daily"), KM("median_tx_fee_native"), KM("avg_block_time_sec"), KM("value_transferred_native")],
  ethereum: [KM("tx_count_daily"), KM("median_tx_fee_native"), KM("value_transferred_native"), KM("avg_block_time_sec")],
  arbitrum: [KM("tx_count_daily"), KM("median_tx_fee_native"), KM("value_transferred_native"), KM("avg_block_time_sec")],
  base: [KM("tx_count_daily"), KM("median_tx_fee_native"), KM("value_transferred_native"), KM("avg_block_time_sec")],
};