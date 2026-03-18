// src/app/chains/page.tsx
"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import InlineDisclaimer from "@/components/legal/InlineDisclaimer";

type ChainSlug = "bitcoin" | "ethereum" | "arbitrum" | "base";

type Chain = {
  slug: ChainSlug;
  name: string;
  tagline: string;
  bullets: string[];
};

const CHAINS: Chain[] = [
  {
    slug: "bitcoin",
    name: "Bitcoin",
    tagline: "Settlement cadence and throughput (no price proxies).",
    bullets: ["Core activity & block output", "Fees (native units)", "Reliability diagnostics"],
  },
  {
    slug: "ethereum",
    name: "Ethereum",
    tagline: "Execution conditions and demand vs capacity (descriptive only).",
    bullets: ["Gas utilization (when available)", "Fees (native units)", "Reliability & activity breadth"],
  },
  {
    slug: "arbitrum",
    name: "Arbitrum",
    tagline: "L2 throughput and execution diagnostics with delayed feed labeling.",
    bullets: ["Throughput & activity", "Fees (native units)", "Optional reliability metrics (coverage-gated)"],
  },
  {
    slug: "base",
    name: "Base",
    tagline: "L2 throughput and execution diagnostics with delayed feed labeling.",
    bullets: ["Throughput & activity", "Fees (native units)", "Optional reliability metrics (coverage-gated)"],
  },
];

type ManifestExport = {
  dataset_id: string | null;
  revision_id: string | null;
  chain: ChainSlug;
  genre: "gold" | "meta" | "derived";
  manifest: {
    asof?: string;
    available_days?: string[];
    [k: string]: any;
  };
};

type ExportDailyResponse = {
  dataset_id: string | null;
  revision_id: number | null;
  chain: ChainSlug;
  genre: "gold" | "meta" | "derived";
  date: string;
  data: unknown;
};

type Verdict = "LIKELY_NOISE" | "STRUCTURAL_SHIFT" | "INSUFFICIENT_DATA";

type GateStatus = "OK" | "DEGRADED" | "BLOCKED" | "UNKNOWN";

type VerdictSurface = {
  verdict: Verdict;
  canonicalRegimeLabel: string | null;
  confidenceScore: number | null;
  thresholdUsed: number | null;
  gateStatus: GateStatus;
  gateReason: string;
};

type Trust = {
  loading: boolean;
  error: string | null;

  // Gold (for audit + lag labeling)
  asofGold: string | null;
  lagDaysGold: number | null;
  lagTextGold: string;

  // Meta (for verdict)
  asofMeta: string | null;
  lagDaysMeta: number | null;
  lagTextMeta: string;

  dataset_id: string | null;
  revision_id: string | null;

  verdict: VerdictSurface | null;
};

function Card(props: { children: React.ReactNode }) {
  return <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur">{props.children}</div>;
}

function Pill(props: { children: React.ReactNode; tone?: "neutral" | "warn" }) {
  const tone = props.tone ?? "neutral";
  const cls =
    tone === "warn"
      ? "border-white/20 bg-red-500/10 text-red-100"
      : "border-white/10 bg-black/20 text-white/80";
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>{props.children}</span>
  );
}

function buildUrl(path: string, params: Record<string, string>) {
  const sp = new URLSearchParams(params);
  return `${path}?${sp.toString()}`;
}

function isValidISODate(s: string | null | undefined) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function resolveAsof(man: ManifestExport): string | null {
  const asof = man?.manifest?.asof;
  if (isValidISODate(asof)) return asof as string;

  const days = man?.manifest?.available_days;
  const last = Array.isArray(days) && days.length ? days[days.length - 1] : null;
  if (isValidISODate(last)) return last as string;

  return null;
}

function utcTodayISO() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function diffDaysUTC(aISO: string, bISO: string): number {
  const [ay, am, ad] = aISO.split("-").map((x) => parseInt(x, 10));
  const [by, bm, bd] = bISO.split("-").map((x) => parseInt(x, 10));
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
}

function lagLabel(chain: ChainSlug, lagDays: number | null): string {
  // Project-level policy: Base/Arbitrum often lag ~1 week; BTC/ETH near daily.
  if (chain === "arbitrum" || chain === "base") return "Delayed feed (≈ 1 week)";
  if (lagDays !== null && lagDays <= 2) return "Near-real-time (daily)";
  if (lagDays !== null) return `Delayed feed (lag ${lagDays}d)`;
  return "Freshness unknown";
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url} HTTP ${r.status}`);
  return (await r.json()) as T;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function getNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function getString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length ? v : null;
}

function normalizeLabel(x: unknown): string {
  return String(x ?? "").toUpperCase().trim();
}

function verdictLabel(v: Verdict): string {
  if (v === "LIKELY_NOISE") return "Likely noise";
  if (v === "STRUCTURAL_SHIFT") return "Structural shift";
  return "Insufficient data";
}

function verdictTone(v: Verdict): "neutral" | "warn" {
  if (v === "LIKELY_NOISE") return "neutral";
  if (v === "STRUCTURAL_SHIFT") return "warn";
  return "warn";
}

function fmtNum(x: number | null, digits = 3): string {
  if (x === null) return "—";
  return x.toFixed(digits);
}

async function fetchContractGatingThreshold(signal?: AbortSignal): Promise<number | null> {
  // public/data/published/v1/contract.json
  try {
    const r = await fetch(`/data/published/v1/contract.json`, { cache: "no-store", signal });
    if (!r.ok) return null;
    const j = (await r.json()) as unknown;
    const rec = asRecord(j);
    if (!rec) return null;

    const gating = asRecord(rec["gating"]);
    const a = gating ? getNumber(gating["gating_threshold_default"]) : null;
    if (a !== null) return a;

    const b = getNumber(rec["gating_threshold_default"]);
    if (b !== null) return b;

    return null;
  } catch {
    return null;
  }
}

function computeVerdictFromMeta(metaData: unknown, contractThreshold: number): VerdictSurface {
  const rec = asRecord(metaData);

  if (!rec) {
    return {
      verdict: "INSUFFICIENT_DATA",
      canonicalRegimeLabel: null,
      confidenceScore: null,
      thresholdUsed: contractThreshold,
      gateStatus: "UNKNOWN",
      gateReason: "META data is unavailable or invalid.",
    };
  }

  const confidenceRec = asRecord(rec["confidence"]);
  const regimeRec = asRecord(rec["regime"]);

  const labelRaw = regimeRec ? getString(regimeRec["label"]) : null;
  const canonicalLabel = labelRaw ? normalizeLabel(labelRaw) : null;

  const gateRec = regimeRec ? asRecord(regimeRec["gate"]) : null;

  const gateStatusRaw = gateRec ? getString(gateRec["status"]) : null;
  const gateStatusNorm = gateStatusRaw ? normalizeLabel(gateStatusRaw) : null;

  const gateConfidence = gateRec ? getNumber(gateRec["confidence_score"]) : null;
  const conf = gateConfidence ?? (confidenceRec ? getNumber(confidenceRec["confidence_score"]) : null);

  const gateThr = gateRec ? getNumber(gateRec["threshold_used"]) : null;
  const thresholdUsed = gateThr ?? contractThreshold;

  // Gate evaluation (future-compatible with meta.regime.gate.status)
  if (gateStatusNorm === "BLOCKED" || gateStatusNorm === "DEGRADED" || gateStatusNorm === "UNKNOWN") {
    const expl = gateRec ? getString(gateRec["explanation"]) : null;
    return {
      verdict: "INSUFFICIENT_DATA",
      canonicalRegimeLabel: canonicalLabel,
      confidenceScore: conf,
      thresholdUsed,
      gateStatus: (gateStatusNorm as GateStatus) ?? "UNKNOWN",
      gateReason: expl ?? "Regime gate indicates insufficient data.",
    };
  }

  if (conf === null) {
    return {
      verdict: "INSUFFICIENT_DATA",
      canonicalRegimeLabel: canonicalLabel,
      confidenceScore: null,
      thresholdUsed,
      gateStatus: "UNKNOWN",
      gateReason: "Confidence score is unavailable.",
    };
  }

  if (conf < thresholdUsed) {
    return {
      verdict: "INSUFFICIENT_DATA",
      canonicalRegimeLabel: canonicalLabel,
      confidenceScore: conf,
      thresholdUsed,
      gateStatus: "DEGRADED",
      gateReason: "Confidence is below the gating threshold.",
    };
  }

  // Ungated mapping: STABLE => Likely noise; HEATING/CONGESTED/CHEAP => Structural shift
  if (canonicalLabel === "STABLE") {
    return {
      verdict: "LIKELY_NOISE",
      canonicalRegimeLabel: canonicalLabel,
      confidenceScore: conf,
      thresholdUsed,
      gateStatus: "OK",
      gateReason: "OK",
    };
  }

  if (canonicalLabel === "HEATING" || canonicalLabel === "CONGESTED" || canonicalLabel === "CHEAP") {
    return {
      verdict: "STRUCTURAL_SHIFT",
      canonicalRegimeLabel: canonicalLabel,
      confidenceScore: conf,
      thresholdUsed,
      gateStatus: "OK",
      gateReason: "OK",
    };
  }

  return {
    verdict: "INSUFFICIENT_DATA",
    canonicalRegimeLabel: canonicalLabel,
    confidenceScore: conf,
    thresholdUsed,
    gateStatus: "UNKNOWN",
    gateReason: "Regime label is missing or not recognized.",
  };
}

export default function ChainsIndexPage() {
  const [trust, setTrust] = useState<Record<ChainSlug, Trust>>(() => ({
    bitcoin: {
      loading: true,
      error: null,
      asofGold: null,
      lagDaysGold: null,
      lagTextGold: "Loading…",
      asofMeta: null,
      lagDaysMeta: null,
      lagTextMeta: "Loading…",
      dataset_id: null,
      revision_id: null,
      verdict: null,
    },
    ethereum: {
      loading: true,
      error: null,
      asofGold: null,
      lagDaysGold: null,
      lagTextGold: "Loading…",
      asofMeta: null,
      lagDaysMeta: null,
      lagTextMeta: "Loading…",
      dataset_id: null,
      revision_id: null,
      verdict: null,
    },
    arbitrum: {
      loading: true,
      error: null,
      asofGold: null,
      lagDaysGold: null,
      lagTextGold: "Loading…",
      asofMeta: null,
      lagDaysMeta: null,
      lagTextMeta: "Loading…",
      dataset_id: null,
      revision_id: null,
      verdict: null,
    },
    base: {
      loading: true,
      error: null,
      asofGold: null,
      lagDaysGold: null,
      lagTextGold: "Loading…",
      asofMeta: null,
      lagDaysMeta: null,
      lagTextMeta: "Loading…",
      dataset_id: null,
      revision_id: null,
      verdict: null,
    },
  }));

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    async function loadAll() {
      const contractThreshold = (await fetchContractGatingThreshold(ac.signal)) ?? 0.45;

      async function loadOne(chain: ChainSlug) {
        try {
          setTrust((prev) => ({
            ...prev,
            [chain]: {
              ...prev[chain],
              loading: true,
              error: null,
              lagTextGold: "Loading…",
              lagTextMeta: "Loading…",
              verdict: null,
            },
          }));

          // manifests (gold + meta) provide as-of and available_days; meta daily provides regime + gate fields
          const goldManUrl = buildUrl("/api/export/manifest", { chain, genre: "gold" });
          const metaManUrl = buildUrl("/api/export/manifest", { chain, genre: "meta" });

          const [goldMan, metaMan] = await Promise.all([
            fetchJson<ManifestExport>(goldManUrl),
            fetchJson<ManifestExport>(metaManUrl),
          ]);

          const asofGoldResolved = resolveAsof(goldMan);
          const asofMetaResolved = resolveAsof(metaMan);

          const today = utcTodayISO();
          const lagDaysGold =
            asofGoldResolved && isValidISODate(asofGoldResolved) ? diffDaysUTC(today, asofGoldResolved) : null;
          const lagDaysMeta =
            asofMetaResolved && isValidISODate(asofMetaResolved) ? diffDaysUTC(today, asofMetaResolved) : null;

          // Load meta daily (as-of) to compute verdict; if missing, verdict becomes insufficient data.
          let verdict: VerdictSurface | null = null;

          if (asofMetaResolved) {
            const metaDailyUrl = buildUrl("/api/export/daily", { chain, genre: "meta", date: asofMetaResolved });
            try {
              const metaDaily = await fetchJson<ExportDailyResponse>(metaDailyUrl);
              verdict = computeVerdictFromMeta(metaDaily.data, contractThreshold);
            } catch (e: any) {
              verdict = {
                verdict: "INSUFFICIENT_DATA",
                canonicalRegimeLabel: null,
                confidenceScore: null,
                thresholdUsed: contractThreshold,
                gateStatus: "UNKNOWN",
                gateReason: e?.message || "Failed to load meta daily for verdict.",
              };
            }
          } else {
            verdict = {
              verdict: "INSUFFICIENT_DATA",
              canonicalRegimeLabel: null,
              confidenceScore: null,
              thresholdUsed: contractThreshold,
              gateStatus: "UNKNOWN",
              gateReason: "META as-of date is unavailable.",
            };
          }

          if (!cancelled) {
            setTrust((prev) => ({
              ...prev,
              [chain]: {
                ...prev[chain],
                loading: false,
                error: null,

                asofGold: asofGoldResolved,
                lagDaysGold,
                lagTextGold: lagLabel(chain, lagDaysGold),

                asofMeta: asofMetaResolved,
                lagDaysMeta,
                lagTextMeta: lagLabel(chain, lagDaysMeta),

                dataset_id: goldMan.dataset_id ?? metaMan.dataset_id ?? null,
                revision_id: goldMan.revision_id ?? metaMan.revision_id ?? null,

                verdict,
              },
            }));
          }
        } catch (e: any) {
          if (!cancelled) {
            setTrust((prev) => ({
              ...prev,
              [chain]: {
                ...prev[chain],
                loading: false,
                error: e?.message || "Failed to load manifests/meta",
                lagTextGold: "Unavailable",
                lagTextMeta: "Unavailable",
                verdict: null,
              },
            }));
          }
        }
      }

      for (const c of CHAINS) loadOne(c.slug);
    }

    loadAll();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  const chainCards = useMemo(() => {
    return CHAINS.map((c) => {
      const t = trust[c.slug];

      const rawGoldDaily = t.asofGold ? buildUrl("/api/export/daily", { chain: c.slug, genre: "gold", date: t.asofGold }) : null;
      const rawMetaDaily = t.asofMeta ? buildUrl("/api/export/daily", { chain: c.slug, genre: "meta", date: t.asofMeta }) : null;

      const rawGoldWindow = buildUrl("/api/export/window", { chain: c.slug, genre: "gold", window: "365" });
      const rawGoldManifest = buildUrl("/api/export/manifest", { chain: c.slug, genre: "gold" });

      const rawMetaManifest = buildUrl("/api/export/manifest", { chain: c.slug, genre: "meta" });

      return { ...c, trust: t, rawGoldDaily, rawMetaDaily, rawGoldWindow, rawGoldManifest, rawMetaManifest };
    });
  }, [trust]);

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold text-white">Chains</h1>
        <p className="text-sm text-white/70">
          Directory view. Each chain shows a canonical &ldquo;noise vs structural&rdquo; verdict derived from canonical META regime + gating
          (descriptive only).
        </p>
      </header>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <InlineDisclaimer variant="legal" />
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {chainCards.map((c) => (
          <Card key={c.slug}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-white">{c.name}</div>
                <div className="mt-1 text-sm text-white/70">{c.tagline}</div>

                {/* Web5: Verdict (primary) + canonical label (secondary) + explicit confidence/gate/threshold */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {c.trust.loading ? (
                    <>
                      <Pill>Verdict: Loading…</Pill>
                      <Pill>Confidence: —</Pill>
                      <Pill>Gate: —</Pill>
                      <Pill>Threshold used: —</Pill>
                    </>
                  ) : c.trust.error ? (
                    <>
                      <Pill tone="warn">Verdict: Insufficient data</Pill>
                      <Pill tone="warn">Confidence: —</Pill>
                      <Pill tone="warn">Gate: UNKNOWN</Pill>
                      <Pill tone="warn">Threshold used: —</Pill>
                    </>
                  ) : c.trust.verdict ? (
                    <>
                      <Pill tone={verdictTone(c.trust.verdict.verdict)}>
                        Verdict: {verdictLabel(c.trust.verdict.verdict)}
                      </Pill>

                      <Pill>
                        Canonical regime:{" "}
                        <span className="font-mono text-white/85">{c.trust.verdict.canonicalRegimeLabel ?? "—"}</span>
                      </Pill>

                      <Pill tone={c.trust.verdict.gateStatus === "OK" ? "neutral" : "warn"}>
                        Confidence:{" "}
                        <span className="font-mono text-white/85">{fmtNum(c.trust.verdict.confidenceScore, 3)}</span>
                      </Pill>

                      <Pill tone={c.trust.verdict.gateStatus === "OK" ? "neutral" : "warn"}>
                        Gate: {c.trust.verdict.gateStatus}
                      </Pill>

                      <Pill tone={c.trust.verdict.gateStatus === "OK" ? "neutral" : "warn"}>
                        Threshold used: <span className="font-mono text-white/85">{fmtNum(c.trust.verdict.thresholdUsed, 2)}</span>
                      </Pill>
                    </>
                  ) : (
                    <>
                      <Pill tone="warn">Verdict: Insufficient data</Pill>
                      <Pill tone="warn">Confidence: —</Pill>
                      <Pill tone="warn">Gate: UNKNOWN</Pill>
                      <Pill tone="warn">Threshold used: —</Pill>
                    </>
                  )}
                </div>

                {c.trust.verdict && c.trust.verdict.gateStatus !== "OK" ? (
                  <div className="mt-2 text-xs text-white/60">
                    Gate reason: <span className="text-white/75">{c.trust.verdict.gateReason}</span>
                  </div>
                ) : null}
              </div>

              <Link
                href={`/chains/${c.slug}`}
                className="shrink-0 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/80 hover:border-white/20 hover:text-white"
              >
                Open →
              </Link>
            </div>

            {/* Audit + freshness */}
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/70">
              {c.trust.loading ? (
                <div>Loading manifests…</div>
              ) : c.trust.error ? (
                <div className="text-red-200">Error: {c.trust.error}</div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      meta as-of <span className="font-mono text-white/85">{c.trust.asofMeta ?? "—"}</span>{" "}
                      <span className="text-white/50">· {c.trust.lagTextMeta}</span>
                    </div>
                    <div className="font-mono text-[10px] text-white/45">
                      {c.trust.dataset_id ?? "—"} · rev {c.trust.revision_id ?? "—"}
                    </div>
                  </div>

                  <div className="text-white/55">
                    gold as-of <span className="font-mono text-white/75">{c.trust.asofGold ?? "—"}</span>{" "}
                    <span className="text-white/40">· {c.trust.lagTextGold}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/70">
              <span className="text-white/50">Raw exports:</span>

              {c.rawMetaDaily ? (
                <a className="underline underline-offset-4 hover:text-white" href={c.rawMetaDaily} target="_blank" rel="noreferrer">
                  meta daily (as-of)
                </a>
              ) : (
                <span className="text-white/40">meta daily (as-of)</span>
              )}

              {c.rawGoldDaily ? (
                <a className="underline underline-offset-4 hover:text-white" href={c.rawGoldDaily} target="_blank" rel="noreferrer">
                  gold daily (as-of)
                </a>
              ) : (
                <span className="text-white/40">gold daily (as-of)</span>
              )}

              <a className="underline underline-offset-4 hover:text-white" href={c.rawGoldWindow} target="_blank" rel="noreferrer">
                gold last365d
              </a>

              <a className="underline underline-offset-4 hover:text-white" href={c.rawGoldManifest} target="_blank" rel="noreferrer">
                gold manifest
              </a>

              <a className="underline underline-offset-4 hover:text-white" href={c.rawMetaManifest} target="_blank" rel="noreferrer">
                meta manifest
              </a>
            </div>

            <ul className="mt-4 space-y-2 text-sm text-white/70">
              {c.bullets.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-white/40">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/70">
              <Link className="underline underline-offset-4 hover:text-white" href={`/chains/${c.slug}`}>
                Dashboard
              </Link>
              <Link className="underline underline-offset-4 hover:text-white" href="/methodology">
                Methodology
              </Link>
              <Link className="underline underline-offset-4 hover:text-white" href="/wiki">
                Wiki
              </Link>
              <Link className="underline underline-offset-4 hover:text-white" href="/about">
                About / contract
              </Link>
            </div>
          </Card>
        ))}
      </section>

      <footer className="pb-6 text-xs text-white/50">Descriptive only · No prices · No forecasts · Auditable via dataset_id and revision_id</footer>
    </main>
  );
}