export type HomeAxisKey = "demand" | "friction" | "capacity";

export type HomeAxisEvidence = {
  bandHigh: string | null;
  bandLow: string | null;
  trend: string | null;
  informativeCount: number | null;
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().toUpperCase() : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function axesFromRegime(meta: JsonRecord): JsonRecord | null {
  const regime = asRecord(meta.regime);
  return regime ? asRecord(regime.axes) : null;
}

function axesFromConfidence(meta: JsonRecord): JsonRecord | null {
  const confidence = asRecord(meta.confidence);
  if (!confidence) return null;

  const candidate = asRecord(confidence.candidate_label);
  const candidateComponents = candidate ? asRecord(candidate.components) : null;
  const candidateAxes = candidateComponents ? asRecord(candidateComponents.regime_axes) : null;
  if (candidateAxes) return candidateAxes;

  const components = asRecord(confidence.components);
  const labelConfidence = components ? asRecord(components.label_confidence) : null;
  return labelConfidence ? asRecord(labelConfidence.regime_axes) : null;
}

export function readHomeAxisEvidence(metaPayload: unknown, axis: HomeAxisKey): HomeAxisEvidence | null {
  const meta = asRecord(metaPayload);
  if (!meta) return null;

  const axes = axesFromRegime(meta) ?? axesFromConfidence(meta);
  const raw = axes ? asRecord(axes[axis]) : null;
  if (!raw) return null;

  return {
    bandHigh: text(raw.band_high),
    bandLow: text(raw.band_low),
    trend: text(raw.trend),
    informativeCount: finiteNumber(raw.informative_count),
  };
}

function signalCountCopy(count: number | null): string {
  if (count == null) return "";
  return ` · ${count} informative ${count === 1 ? "signal" : "signals"}`;
}

export function homeAxisEvidenceSummary(metaPayload: unknown, axis: HomeAxisKey): string {
  const evidence = readHomeAxisEvidence(metaPayload, axis);
  if (!evidence) return "Classifier bands unavailable";

  return `High-side ${evidence.bandHigh ?? "—"} · Low-side ${evidence.bandLow ?? "—"} · Trend ${evidence.trend ?? "—"}${signalCountCopy(evidence.informativeCount)}`;
}

export function homeAxisNarrative(metaPayload: unknown, axis: HomeAxisKey, displayValue: number | null): string {
  const evidence = readHomeAxisEvidence(metaPayload, axis);
  const scoreCopy = displayValue == null
    ? "No smoothed display score is available for this axis."
    : `The ${displayValue.toFixed(1)} shown at left is a smoothed scorecard display value, not the band threshold used to set the regime.`;

  if (!evidence) {
    return `Classifier-band evidence is unavailable in this published row. ${scoreCopy}`;
  }

  return `Classifier bands: high-side ${evidence.bandHigh ?? "—"}; low-side ${evidence.bandLow ?? "—"}; trend ${evidence.trend ?? "—"}${signalCountCopy(evidence.informativeCount)}. ${scoreCopy}`;
}
