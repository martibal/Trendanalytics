export type ValidationLabel = "STABLE" | "HEATING" | "CONGESTED" | "CHEAP" | "UNKNOWN/DEGRADED";

export type ValidationInputRow = {
  date?: string;
  updated_through?: string;
  status?: { label?: string };
  regime?: { label?: string; asof_date?: string };
  confidence?: { confidence_score?: number };
};

export type ConfidenceBuckets = {
  good: number;
  caution: number;
  degraded: number;
  missing: number;
};

export type ValidationDiagnostics = {
  observations: number;
  firstDate: string;
  lastDate: string;
  latest: ValidationLabel;
  counts: Record<ValidationLabel, number>;
  dominantLabel: ValidationLabel;
  dominantShare: number;
  transitions: number;
  transitionsPer100Observations: number;
  entropy: number;
  normalizedEntropy: number;
  medianRunLength: number;
  averageConfidence?: number;
  confidenceBuckets: ConfidenceBuckets;
  usableConfidenceShare: number;
};

export const VALIDATION_LABELS: ValidationLabel[] = [
  "STABLE",
  "HEATING",
  "CONGESTED",
  "CHEAP",
  "UNKNOWN/DEGRADED",
];

export function normalizeValidationLabel(raw: string | undefined): ValidationLabel {
  const label = (raw ?? "").toUpperCase();
  if (label === "STABLE") return "STABLE";
  if (label === "HEATING") return "HEATING";
  if (label === "CONGESTED") return "CONGESTED";
  if (label === "CHEAP") return "CHEAP";
  return "UNKNOWN/DEGRADED";
}

export function validationDateFromRow(row: ValidationInputRow): string {
  return row.date ?? row.updated_through ?? row.regime?.asof_date ?? "";
}

function emptyCounts(): Record<ValidationLabel, number> {
  return VALIDATION_LABELS.reduce<Record<ValidationLabel, number>>((acc, label) => {
    acc[label] = 0;
    return acc;
  }, {} as Record<ValidationLabel, number>);
}

function entropy(counts: Record<ValidationLabel, number>, total: number): number {
  if (total === 0) return 0;

  return VALIDATION_LABELS.reduce((sum, label) => {
    const p = counts[label] / total;
    return p > 0 ? sum - p * Math.log2(p) : sum;
  }, 0);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function runLengths(labels: ValidationLabel[]): number[] {
  if (labels.length === 0) return [];

  const lengths: number[] = [];
  let current = labels[0];
  let length = 1;

  for (const label of labels.slice(1)) {
    if (label === current) {
      length += 1;
      continue;
    }

    lengths.push(length);
    current = label;
    length = 1;
  }

  lengths.push(length);
  return lengths;
}

function buildConfidenceBuckets(rows: ValidationInputRow[]): ConfidenceBuckets {
  return rows.reduce<ConfidenceBuckets>(
    (acc, row) => {
      const value = row.confidence?.confidence_score;

      if (typeof value !== "number" || Number.isNaN(value)) {
        acc.missing += 1;
      } else if (value >= 0.7) {
        acc.good += 1;
      } else if (value >= 0.4) {
        acc.caution += 1;
      } else {
        acc.degraded += 1;
      }

      return acc;
    },
    { good: 0, caution: 0, degraded: 0, missing: 0 },
  );
}

export function buildValidationDiagnostics(inputRows: ValidationInputRow[]): ValidationDiagnostics {
  const rows = [...inputRows].sort((a, b) => validationDateFromRow(a).localeCompare(validationDateFromRow(b)));
  const labels = rows.map((row) => normalizeValidationLabel(row.status?.label ?? row.regime?.label));
  const counts = emptyCounts();

  for (const label of labels) counts[label] += 1;

  const observations = rows.length;
  const transitions = labels.reduce((sum, label, index) => (index > 0 && labels[index - 1] !== label ? sum + 1 : sum), 0);
  const confidenceValues = rows
    .map((row) => row.confidence?.confidence_score)
    .filter((value): value is number => typeof value === "number" && !Number.isNaN(value));
  const averageConfidence = confidenceValues.length
    ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
    : undefined;
  const confidenceBuckets = buildConfidenceBuckets(rows);
  const rawEntropy = entropy(counts, observations);
  const maxEntropy = Math.log2(VALIDATION_LABELS.length);
  const dominantLabel = VALIDATION_LABELS.reduce<ValidationLabel>(
    (best, label) => (counts[label] > counts[best] ? label : best),
    "UNKNOWN/DEGRADED",
  );

  return {
    observations,
    firstDate: validationDateFromRow(rows[0] ?? {}),
    lastDate: validationDateFromRow(rows[rows.length - 1] ?? {}),
    latest: labels[labels.length - 1] ?? "UNKNOWN/DEGRADED",
    counts,
    dominantLabel,
    dominantShare: observations ? counts[dominantLabel] / observations : 0,
    transitions,
    transitionsPer100Observations: observations ? (transitions / observations) * 100 : 0,
    entropy: rawEntropy,
    normalizedEntropy: maxEntropy ? rawEntropy / maxEntropy : 0,
    medianRunLength: median(runLengths(labels)),
    averageConfidence,
    confidenceBuckets,
    usableConfidenceShare: observations ? confidenceBuckets.good / observations : 0,
  };
}
