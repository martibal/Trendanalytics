export type SurfaceRowDisplay = {
  chain: string;
  href: string;
  label: string;
  name: string;
  status: string;
  statusLabel: string;
  statusClass: string;
  publishedRegime: string | null;
  confidenceValue: string;
  confidenceBand: string;
  confidenceClass: string;
  asOf: string;
  lagValue: string;
  takeaway: string;
  regimeTooltip: string;
  confidenceTooltip: string;
  asOfTooltip: string;
  lagTooltip: string;
  statusTooltip: string;
};

export function confidenceBand(value?: number | null) {
  if (typeof value !== "number") return "Unknown";
  if (value >= 0.7) return "Good";
  if (value >= 0.4) return "Caution";
  return "Degraded";
}

export function fmtDate(value?: string | null) {
  return value && value.trim().length > 0 ? value : "—";
}

export function fmtConfidence(value?: number | null) {
  return typeof value === "number" ? value.toFixed(3) : "—";
}

export function statusChipClass(status?: string | null) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide";
  if (status === "ok") {
    return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-300`;
  }
  if (status === "warn") {
    return `${base} border-amber-500/25 bg-amber-500/10 text-amber-300`;
  }
  if (status === "fail") {
    return `${base} border-red-500/25 bg-red-500/10 text-red-300`;
  }
  return `${base} border-border bg-muted text-muted-foreground`;
}

export function confidenceChipClass(band: string) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium";
  if (band === "Good") {
    return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-300`;
  }
  if (band === "Caution") {
    return `${base} border-amber-500/25 bg-amber-500/10 text-amber-300`;
  }
  if (band === "Degraded") {
    return `${base} border-red-500/25 bg-red-500/10 text-red-300`;
  }
  return `${base} border-border bg-muted text-muted-foreground`;
}

export function rowTakeaway(params: {
  status: string;
  publishedRegime: string | null;
  confidenceScore: number | null;
}) {
  const { status, publishedRegime, confidenceScore } = params;
  if (typeof confidenceScore === "number" && confidenceScore < 0.4) {
    return "Visible for traceability, but confidence is degraded.";
  }
  if (status === "warn" || status === "fail") {
    return "Latest publication is visible with freshness context.";
  }
  if (publishedRegime) {
    return `Currently published as ${publishedRegime}.`;
  }
  return "No published regime label right now.";
}
