import type { ChainId } from "@/lib/types";

export type ChainKeyMetric = {
  key: string;   // base key (daily)
  label: string;
  why: string;
};

export const DEFAULT_BASE_METRIC_BY_CHAIN: Record<ChainId, string> = {
  bitcoin: "tx_count_daily",
  ethereum: "tx_count_daily",
  arbitrum: "tx_count_daily",
  base: "tx_count_daily",
};

export const KEY_METRICS_BY_CHAIN: Record<ChainId, ChainKeyMetric[]> = {
  bitcoin: [
    { key: "tx_count_daily", label: "Transactions", why: "Demand proxy for settlement usage." },
    { key: "median_tx_fee_native", label: "Median fee (native)", why: "Competition for blockspace." },
    { key: "avg_block_time_sec", label: "Average block time", why: "Operational stability indicator." },
    { key: "value_transferred_native", label: "Value transferred (native)", why: "Economic weight vs activity." },
  ],
  ethereum: [
    { key: "tx_count_daily", label: "Transactions", why: "Execution demand proxy." },
    { key: "median_tx_fee_native", label: "Median fee (native)", why: "Friction / congestion proxy." },
    { key: "value_transferred_native", label: "Value transferred (native)", why: "Economic throughput proxy." },
    { key: "avg_block_time_sec", label: "Average block time", why: "Protocol stability proxy." },
  ],
  arbitrum: [
    { key: "tx_count_daily", label: "Transactions", why: "Primary usage indicator for an L2." },
    { key: "median_tx_fee_native", label: "Median fee (native)", why: "User-facing cost / competitiveness." },
    { key: "value_transferred_native", label: "Value transferred (native)", why: "Economic flow vs spam/campaign." },
    { key: "avg_block_time_sec", label: "Average block time", why: "Sequencer regularity proxy." },
  ],
  base: [
    { key: "tx_count_daily", label: "Transactions", why: "Consumer-grade usage signal." },
    { key: "median_tx_fee_native", label: "Median fee (native)", why: "Cost pressure matters for onboarding." },
    { key: "value_transferred_native", label: "Value transferred (native)", why: "Shift from experimentation to higher value." },
    { key: "avg_block_time_sec", label: "Average block time", why: "UX stability / operational health." },
  ],
};
