// src/components/trust/types.ts

export type RegimeHistoryPoint = {
  date: string;
  label: string;
  verdict: "LIKELY_NOISE" | "STRUCTURAL_SHIFT" | "INSUFFICIENT_DATA";
  confidence_score: number | null;
  gate_status: string | null;
  drivers: Array<{ metric: string; axis?: string; band?: string; trend?: string }>;
  axes?: Record<string, { band_high: string; band_low: string; trend: string }>;
};

export type HistoryApiResponse = {
  chain: string;
  start: string | null;
  end: string | null;
  points: RegimeHistoryPoint[];
};