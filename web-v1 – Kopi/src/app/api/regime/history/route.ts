// src/app/api/regime/history/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

type Chain = "bitcoin" | "ethereum" | "arbitrum" | "base";

type Verdict = "LIKELY_NOISE" | "STRUCTURAL_SHIFT" | "INSUFFICIENT_DATA";

type RegimeHistoryPoint = {
  date: string;
  label: string;
  verdict: Verdict;
  confidence_score: number | null;
  gate_status: string | null;
  drivers: Array<{ metric: string; axis?: string; band?: string; trend?: string }>;
  axes?: Record<string, { band_high: string; band_low: string; trend: string }>;
};

function isChain(x: string | null): x is Chain {
  return x === "bitcoin" || x === "ethereum" || x === "arbitrum" || x === "base";
}

function isISODate(x: string): boolean {
  // Strict YYYY-MM-DD
  return /^\d{4}-\d{2}-\d{2}$/.test(x);
}

function safeNum(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function normalizeLabel(label: unknown): string {
  return String(label ?? "").toUpperCase().trim();
}

async function readJSON(p: string): Promise<any> {
  const raw = await fs.readFile(p, "utf-8");
  return JSON.parse(raw);
}

async function readDefaultGateThreshold(): Promise<number> {
  // Contract-driven default (web6)
  const contractPath = path.join(process.cwd(), "public", "data", "published", "v1", "contract.json");
  try {
    const contract = await readJSON(contractPath);
    const thr = contract?.threshold_config_default?.gate?.confidence_threshold;
    const v = safeNum(thr);
    return v == null ? 0.4 : v;
  } catch {
    return 0.4;
  }
}

function computeVerdict(meta: any, threshold: number): { verdict: Verdict; gateStatus: string | null; confidence: number | null } {
  if (!meta || meta?.missing) {
    return { verdict: "INSUFFICIENT_DATA", gateStatus: "BLOCKED", confidence: null };
  }

  const label = normalizeLabel(meta?.regime?.label);
  const gate = meta?.regime?.gate;

  const gateStatusRaw = gate?.status;
  const gateStatus = gateStatusRaw != null ? normalizeLabel(gateStatusRaw) : null;

  const confidence =
    safeNum(gate?.confidence_score) ??
    safeNum(meta?.confidence?.confidence_score) ??
    null;

  const thresholdUsed = safeNum(gate?.threshold_used) ?? threshold;

  // Gate logic: if explicit status says blocked/degraded/unknown, or confidence is missing/low => insufficient
  if (gateStatus === "BLOCKED" || gateStatus === "DEGRADED" || gateStatus === "UNKNOWN") {
    return { verdict: "INSUFFICIENT_DATA", gateStatus, confidence };
  }

  if (confidence == null || confidence < thresholdUsed) {
    return { verdict: "INSUFFICIENT_DATA", gateStatus: gateStatus ?? "DEGRADED", confidence };
  }

  // Canonical mapping (descriptive only)
  if (label === "STABLE") return { verdict: "LIKELY_NOISE", gateStatus: gateStatus ?? "OK", confidence };
  if (label === "HEATING" || label === "CONGESTED" || label === "CHEAP") {
    return { verdict: "STRUCTURAL_SHIFT", gateStatus: gateStatus ?? "OK", confidence };
  }

  return { verdict: "INSUFFICIENT_DATA", gateStatus: gateStatus ?? "UNKNOWN", confidence };
}

function pickDrivers(meta: any): RegimeHistoryPoint["drivers"] {
  const ds = Array.isArray(meta?.regime?.drivers) ? meta.regime.drivers : [];
  return ds.slice(0, 3).map((d: any) => ({
    metric: String(d?.metric ?? "—"),
    axis: d?.axis != null ? String(d.axis) : undefined,
    band: d?.band != null ? String(d.band) : undefined,
    trend: d?.trend != null ? String(d.trend) : undefined,
  }));
}

function pickAxes(meta: any): RegimeHistoryPoint["axes"] | undefined {
  const axes = meta?.regime?.axes;
  if (!axes || typeof axes !== "object") return undefined;

  // Keep only shallow band/trend fields to keep payload light
  const out: Record<string, { band_high: string; band_low: string; trend: string }> = {};
  for (const [k, v] of Object.entries(axes)) {
    const o: any = v;
    out[String(k)] = {
      band_high: String(o?.band_high ?? "—"),
      band_low: String(o?.band_low ?? "—"),
      trend: String(o?.trend ?? "—"),
    };
  }
  return out;
}

async function listAvailableDates(metaDir: string): Promise<string[]> {
  const names = await fs.readdir(metaDir);
  const dates = names
    .filter((n) => n.endsWith(".json"))
    .map((n) => n.slice(0, -5))
    .filter(isISODate)
    .sort(); // lexicographic works for YYYY-MM-DD
  return dates;
}

function sliceByDays(datesAsc: string[], days: number): string[] {
  const n = Math.max(1, Math.min(2000, Math.floor(days))); // safety cap
  if (datesAsc.length <= n) return datesAsc;
  return datesAsc.slice(datesAsc.length - n);
}

function sliceByRange(datesAsc: string[], start: string, end: string): string[] {
  return datesAsc.filter((d) => d >= start && d <= end);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const chain = searchParams.get("chain");
  const daysRaw = searchParams.get("days");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!isChain(chain)) {
    return NextResponse.json(
      { ok: false, error: "Invalid 'chain'. Expected one of: bitcoin, ethereum, arbitrum, base." },
      { status: 400 }
    );
  }

  const days = daysRaw ? Number(daysRaw) : 450;
  const daysInt = Number.isFinite(days) ? Math.floor(days) : 450;

  if (start != null && !isISODate(start)) {
    return NextResponse.json({ ok: false, error: "Invalid 'start'. Expected YYYY-MM-DD." }, { status: 400 });
  }
  if (end != null && !isISODate(end)) {
    return NextResponse.json({ ok: false, error: "Invalid 'end'. Expected YYYY-MM-DD." }, { status: 400 });
  }
  if (start != null && end != null && start > end) {
    return NextResponse.json({ ok: false, error: "'start' must be <= 'end'." }, { status: 400 });
  }

  const metaDir = path.join(process.cwd(), "public", "data", "published", "v1", "meta", chain);

  let datesAsc: string[];
  try {
    datesAsc = await listAvailableDates(metaDir);
  } catch {
    return NextResponse.json(
      { ok: false, error: `META directory not found for chain '${chain}'.` },
      { status: 404 }
    );
  }

  if (!datesAsc.length) {
    return NextResponse.json({ ok: true, chain, points: [], count: 0 }, { status: 200 });
  }

  const gateThreshold = await readDefaultGateThreshold();

  let selected: string[];
  if (start != null || end != null) {
    const s = start ?? datesAsc[0];
    const e = end ?? datesAsc[datesAsc.length - 1];
    selected = sliceByRange(datesAsc, s, e);
  } else {
    selected = sliceByDays(datesAsc, daysInt);
  }

  // Read + compress
  const points: RegimeHistoryPoint[] = [];
  for (const date of selected) {
    const filePath = path.join(metaDir, `${date}.json`);
    try {
      const meta = await readJSON(filePath);

      const label = String(meta?.regime?.label ?? "—");
      const verdict = computeVerdict(meta, gateThreshold);

      points.push({
        date,
        label,
        verdict: verdict.verdict,
        confidence_score: verdict.confidence,
        gate_status: verdict.gateStatus,
        drivers: pickDrivers(meta),
        axes: pickAxes(meta),
      });
    } catch {
      // If a single day is unreadable, include a deterministic placeholder instead of failing the whole timeline.
      points.push({
        date,
        label: "—",
        verdict: "INSUFFICIENT_DATA",
        confidence_score: null,
        gate_status: "UNKNOWN",
        drivers: [],
      });
    }
  }

  const resp = {
    ok: true,
    chain,
    contract_gate_threshold_default: gateThreshold,
    range: {
      start: points.length ? points[0].date : null,
      end: points.length ? points[points.length - 1].date : null,
    },
    count: points.length,
    points,
  };

  return NextResponse.json(resp, { status: 200 });
}