// src/config/units.ts

export type SupportedChainId = "bitcoin" | "ethereum" | "arbitrum" | "base";

export type UnitDefinition = {
  metric: string;
  label: string;
  shortLabel: string;
  description: string;
  caveat?: string;
};

const COMMON_UNITS: Record<string, UnitDefinition> = {
  tx_count_daily: {
    metric: "tx_count_daily",
    label: "transactions per day",
    shortLabel: "tx/day",
    description: "Count of transactions observed for the calendar day.",
  },
  block_count_daily: {
    metric: "block_count_daily",
    label: "blocks per day",
    shortLabel: "blocks/day",
    description: "Count of blocks observed for the calendar day.",
  },
  unique_active_addresses: {
    metric: "unique_active_addresses",
    label: "addresses",
    shortLabel: "addresses",
    description: "Count of unique active addresses observed for the day.",
  },
  avg_block_time_sec: {
    metric: "avg_block_time_sec",
    label: "seconds",
    shortLabel: "sec",
    description: "Average block interval in seconds.",
  },
  failed_tx_rate: {
    metric: "failed_tx_rate",
    label: "fraction",
    shortLabel: "ratio",
    description: "Share of transactions that failed.",
    caveat: "May be formatted as a percentage in the UI.",
  },
  gas_utilization_pct: {
    metric: "gas_utilization_pct",
    label: "fraction",
    shortLabel: "ratio",
    description: "Gas utilization expressed as a 0..1-style fraction in published data.",
    caveat: "May be formatted as a percentage in the UI.",
  },
};

const CHAIN_OVERRIDES: Record<SupportedChainId, Record<string, UnitDefinition>> = {
  bitcoin: {
    value_transferred_native: {
      metric: "value_transferred_native",
      label: "BTC",
      shortLabel: "BTC",
      description: "Native Bitcoin value transferred.",
    },
    median_tx_value_native: {
      metric: "median_tx_value_native",
      label: "BTC",
      shortLabel: "BTC",
      description: "Median native transaction value in BTC.",
    },
    median_tx_fee_native: {
      metric: "median_tx_fee_native",
      label: "BTC",
      shortLabel: "BTC",
      description: "Median native transaction fee in BTC-equivalent published units.",
      caveat: "Verify exact pipeline publication convention against source documentation.",
    },
  },

  ethereum: {
    value_transferred_native: {
      metric: "value_transferred_native",
      label: "ETH",
      shortLabel: "ETH",
      description: "Native Ethereum value transferred.",
    },
    median_tx_value_native: {
      metric: "median_tx_value_native",
      label: "ETH",
      shortLabel: "ETH",
      description: "Median native transaction value in ETH.",
    },
    median_tx_fee_native: {
      metric: "median_tx_fee_native",
      label: "wei",
      shortLabel: "wei",
      description: "Median transaction fee in wei as published from the source dataset.",
    },
    median_gas_price: {
      metric: "median_gas_price",
      label: "wei",
      shortLabel: "wei",
      description: "Median gas price in wei.",
    },
  },

  arbitrum: {
    value_transferred_native: {
      metric: "value_transferred_native",
      label: "ETH",
      shortLabel: "ETH",
      description: "Native Arbitrum-settlement value transferred, expressed in ETH terms.",
    },
    median_tx_value_native: {
      metric: "median_tx_value_native",
      label: "ETH",
      shortLabel: "ETH",
      description: "Median native transaction value in ETH terms.",
    },
    median_tx_fee_native: {
      metric: "median_tx_fee_native",
      label: "wei",
      shortLabel: "wei",
      description: "Median transaction fee in wei as published from the source dataset.",
    },
    median_fee_native: {
      metric: "median_fee_native",
      label: "wei",
      shortLabel: "wei",
      description: "Median fee in wei.",
    },
    median_gas_price: {
      metric: "median_gas_price",
      label: "wei",
      shortLabel: "wei",
      description: "Median gas price in wei.",
    },
  },

  base: {
    value_transferred_native: {
      metric: "value_transferred_native",
      label: "ETH",
      shortLabel: "ETH",
      description: "Native Base-settlement value transferred, expressed in ETH terms.",
    },
    median_tx_value_native: {
      metric: "median_tx_value_native",
      label: "ETH",
      shortLabel: "ETH",
      description: "Median native transaction value in ETH terms.",
    },
    median_tx_fee_native: {
      metric: "median_tx_fee_native",
      label: "wei",
      shortLabel: "wei",
      description: "Median transaction fee in wei as published from the source dataset.",
    },
    median_fee_native: {
      metric: "median_fee_native",
      label: "wei",
      shortLabel: "wei",
      description: "Median fee in wei.",
    },
    median_gas_price: {
      metric: "median_gas_price",
      label: "wei",
      shortLabel: "wei",
      description: "Median gas price in wei.",
    },
  },
};

export function getUnitDefinition(
  chain: SupportedChainId,
  metric: string
): UnitDefinition | null {
  const chainMap = CHAIN_OVERRIDES[chain] ?? {};
  return chainMap[metric] ?? COMMON_UNITS[metric] ?? null;
}

export function getUnitLabel(
  chain: SupportedChainId,
  metric: string
): string | null {
  return getUnitDefinition(chain, metric)?.label ?? null;
}

export function getUnitShortLabel(
  chain: SupportedChainId,
  metric: string
): string | null {
  return getUnitDefinition(chain, metric)?.shortLabel ?? null;
}

export function listKnownMetricsForChain(chain: SupportedChainId): string[] {
  const chainMetrics = Object.keys(CHAIN_OVERRIDES[chain] ?? {});
  const commonMetrics = Object.keys(COMMON_UNITS);
  return Array.from(new Set([...commonMetrics, ...chainMetrics])).sort();
}

export const UNIT_TABLE: Record<SupportedChainId, Record<string, UnitDefinition>> = {
  bitcoin: {
    ...COMMON_UNITS,
    ...CHAIN_OVERRIDES.bitcoin,
  },
  ethereum: {
    ...COMMON_UNITS,
    ...CHAIN_OVERRIDES.ethereum,
  },
  arbitrum: {
    ...COMMON_UNITS,
    ...CHAIN_OVERRIDES.arbitrum,
  },
  base: {
    ...COMMON_UNITS,
    ...CHAIN_OVERRIDES.base,
  },
};