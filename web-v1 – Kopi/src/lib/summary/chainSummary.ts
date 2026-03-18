import type { ChainId, MetaFile } from "@/lib/types";
import type { TriSeriesPoint } from "@/lib/series/triSeries";
import { KEY_METRICS_BY_CHAIN } from "@/lib/landing/chainDefaults";

export type ExplainMode = "basic" | "advanced";

function trendFromLevels(args: { daily: number | null; ma7: number | null; ma30: number | null }) {
  const { daily, ma7, ma30 } = args;

  if (ma7 != null && ma30 != null) {
    const ratio = ma30 === 0 ? null : (ma7 - ma30) / Math.abs(ma30);
    if (ratio != null && Math.abs(ratio) < 0.02) return "stable";
    if (ratio != null && ratio > 0) return "rising";
    if (ratio != null && ratio < 0) return "cooling";
  }

  if (daily != null && ma7 != null) {
    const ratio = ma7 === 0 ? null : (daily - ma7) / Math.abs(ma7);
    if (ratio != null && Math.abs(ratio) < 0.03) return "near its short-term average";
    if (ratio != null && ratio > 0) return "above its short-term average";
    if (ratio != null && ratio < 0) return "below its short-term average";
  }

  return "mixed";
}

function pickLast(points: TriSeriesPoint[] | null | undefined) {
  if (!points || points.length === 0) return null;
  return points[points.length - 1] ?? null;
}

function confidenceState(meta: MetaFile | null) {
  const c = meta?.confidence?.confidence_score;
  if (typeof c !== "number") return "unknown";
  if (c >= 0.85) return "high";
  if (c >= 0.65) return "moderate";
  return "limited";
}

function axisDrivers(meta: MetaFile | null) {
  const axes = meta?.regime?.axes ?? {};
  const demand = (axes as any)?.demand?.trend ?? null;
  const friction = (axes as any)?.friction?.trend ?? null;
  const capacity = (axes as any)?.capacity?.trend ?? null;
  return { demand, friction, capacity };
}

function bestDriver(meta: MetaFile | null) {
  const drivers = Array.isArray(meta?.regime?.drivers) ? meta!.regime.drivers : [];
  if (drivers.length === 0) return null;
  return drivers
    .filter((d) => typeof (d as any)?.z_robust === "number")
    .sort((a, b) => Math.abs((b as any).z_robust) - Math.abs((a as any).z_robust))[0] ?? null;
}

export function buildChainIntelligenceSummary(args: {
  chain: ChainId;
  mode: ExplainMode;
  meta: MetaFile | null;
  seriesByBaseKey: Record<string, TriSeriesPoint[]>;
}): { title: string; body: string } {
  const { chain, mode, meta, seriesByBaseKey } = args;

  // anchors (deterministic)
  const activitySeries = seriesByBaseKey["tx_count_daily"] ?? null;
  const feeSeries = seriesByBaseKey["median_tx_fee_native"] ?? null;

  const aLast = pickLast(activitySeries);
  const fLast = pickLast(feeSeries);

  const activityState = aLast ? trendFromLevels(aLast) : "unknown";
  const costState = fLast ? trendFromLevels(fLast) : "unknown";

  const label = meta?.regime?.label ?? "—";
  const { demand, friction, capacity } = axisDrivers(meta);

  const current =
    `Current regime is ${label}. ` +
    `${chain.charAt(0).toUpperCase() + chain.slice(1)} shows ${activityState} activity and ${costState} cost conditions.`;

  const momentum =
    "Daily vs MA7 vs MA30 highlights whether recent movement is transient or persistent within the current regime.";

  const implicationByChain: Record<ChainId, string> = {
    bitcoin: "a settlement-layer state where blockspace demand and fees jointly describe capacity pressure.",
    ethereum: "an execution-layer state where demand and friction jointly describe how loaded the network is.",
    arbitrum: "an L2 usage state where high activity is expected and fee dynamics signal competitiveness.",
    base: "a consumer-oriented L2 state where sustained low fees and stable throughput support onboarding use-cases.",
  };

  const implications = `Taken together, this indicates ${implicationByChain[chain]}`;

  if (mode === "basic") {
    return { title: "Chain intelligence summary", body: `${current} ${momentum} ${implications}` };
  }

  const driver = bestDriver(meta);
  const driverAxis = (driver as any)?.axis ?? null;
  const driverTrend = (driver as any)?.trend ?? null;

  const diagParts: string[] = [];
  if (demand || friction || capacity) {
    diagParts.push(`Axes: demand=${demand ?? "—"}, friction=${friction ?? "—"}, capacity=${capacity ?? "—"}.`);
  }
  if (driverAxis || driverTrend) {
    diagParts.push(`Largest recent deviation is on axis ${driverAxis ?? "—"} (trend=${driverTrend ?? "—"}).`);
  }
  diagParts.push(`Coverage-weighted confidence is ${confidenceState(meta)}.`);

  return {
    title: "Chain intelligence summary",
    body: `${current} ${momentum} ${implications} Diagnostic context: ${diagParts.join(" ")}`,
  };
}
