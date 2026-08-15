import Link from "next/link";

import {
  MobileCard,
  MobilePage,
  MobilePill,
  MobilePrimaryLink,
  MobileSection,
} from "@/components/mobile/MobileShell";

const INTEGRATION_STEPS = [
  {
    n: "01",
    title: "Choose a layer",
    body: "Use Gold for measurements, Derived for trend context, Meta for regime/confidence, and Briefs for readable summaries.",
    code: null,
  },
  {
    n: "02",
    title: "Bootstrap the history you need",
    body: "Basic can start with a 90-day bundle on the selected chain. Pro can enumerate the full published archive through manifest.json and then request the original dated files.",
    code: "GET /api/v1/files/meta/ethereum/90d/latest.json\n\n# Pro full-history archive\nGET /api/v1/files/meta/ethereum/manifest.json\nGET /api/v1/files/meta/ethereum/2024-12-01.json\nX-API-Key: YOUR_KEY",
  },
  {
    n: "03",
    title: "Read the core fields",
    body: "The fastest integration path is status.label, confidence.confidence_score, scorecard.dimensions and regime.drivers[].",
    code: '{\n  "status": { "label": "STABLE" },\n  "confidence": {\n    "methodology_version": "confidence_v2_profile_evidence",\n    "confidence_score": 0.471\n  }\n}',
  },
  {
    n: "04",
    title: "Join by chain and date",
    body: "Your downstream data can join Urd Atlas artifacts by chain + UTC date. observation_date identifies the day the network state describes; it does not prove the row was available on that date, so do not treat the current archive as point-in-time data for historical decision simulation.",
    code: null,
  },
] as const;

const JSON_LAYERS = [
  {
    name: "Gold",
    tagline: "What happened",
    desc: "Daily chain observations and robust daily summaries. Gold is descriptive measurement, not classification.",
    fields: ["tx_count_daily", "median_tx_fee_native", "avg_block_time_sec", "unique_active_addresses"],
  },
  {
    name: "Derived",
    tagline: "How it is trending",
    desc: "Deterministic transforms built from Gold, including rolling context such as MA7 and MA30.",
    fields: ["<metric>__ma7", "<metric>__ma30", "window metadata"],
  },
  {
    name: "Meta",
    tagline: "What it means right now",
    desc: "Regime label, confidence v2, scorecard dimensions, drivers, freshness, and determinism hash.",
    fields: ["status.label", "confidence.confidence_score", "scorecard.dimensions", "regime.drivers[]"],
  },
  {
    name: "Briefs",
    tagline: "Readable JSON summaries",
    desc: "Human-readable summaries generated from published Meta evidence. Briefs explain; they do not override Meta.",
    fields: ["brief.headline", "brief.plain", "regime_path", "window.updated_through"],
  },
] as const;

const ENDPOINTS = [
  ["Latest Meta", "GET", "/api/v1/files/meta/{chain}/latest.json"],
  ["90-day Meta bundle", "GET", "/api/v1/files/meta/{chain}/90d/latest.json"],
  ["Pro archive manifest", "GET", "/api/v1/files/meta/{chain}/manifest.json"],
  ["Pro dated Meta file", "GET", "/api/v1/files/meta/{chain}/YYYY-MM-DD.json"],
  ["Pro Briefs manifest", "GET", "/api/v1/files/briefs/chains/{chain}/manifest.json"],
  ["Pro dated Brief", "GET", "/api/v1/files/briefs/chains/{chain}/YYYY-MM-DD.json"],
] as const;

export default function MobileApiDocsPage() {
  return (
    <MobilePage
      active="api"
      eyebrow="Mobile JSON / API"
      title={<>Four published JSON layers, one mobile reference.</>}
      subtitle={
        <>
          This page keeps mobile users inside the mobile surface while explaining the
          same file and history contract used by desktop docs and subscribers.
        </>
      }
      backHref="/mobile"
    >
      <MobileSection eyebrow="Contract" title="The product is the JSON.">
        <MobileCard tone="blue">
          <p className="text-[13px] leading-6 text-[#d7e8fb]">
            Subscribers receive daily access to Gold, Derived, Meta and Briefs JSON.
            The website reads the same published artifact set as the API.
          </p>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-black/[0.18] p-3">
            <code className="whitespace-nowrap font-mono text-[11px] text-[#f5d386]">
              /api/v1/files/&#123;layer&#125;/&#123;chain&#125;/latest.json
            </code>
          </div>
        </MobileCard>
      </MobileSection>

      <MobileSection eyebrow="History access" title="History is available immediately on subscribe.">
        <div className="space-y-3">
          <MobileCard tone="blue">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[15px] font-black text-white">Basic</div>
                <p className="mt-2 text-[12px] leading-6 text-[#d7e8fb]">
                  $49/month. One selected chain with 90 days of history available immediately, plus authenticated daily delivery going forward.
                </p>
              </div>
              <MobilePill tone="gold">90 days</MobilePill>
            </div>
          </MobileCard>

          <MobileCard tone="blue">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[15px] font-black text-white">Pro</div>
                <p className="mt-2 text-[12px] leading-6 text-[#d7e8fb]">
                  $149/month. Bitcoin, Ethereum, Arbitrum and Base with the full published history available immediately across all four chains. The archive starts on 1 December 2024 and grows with each published day.
                </p>
              </div>
              <MobilePill tone="gold">Full history</MobilePill>
            </div>
          </MobileCard>

          <MobileCard>
            <p className="text-[12px] leading-6 text-[#cfe0f4]">
              Pro also includes fixed convenience bundles through <code className="font-mono text-[#f5d386]">365d</code>. That is the largest single bundle route, not the Pro history limit. Full-history access uses each artifact&apos;s <code className="font-mono text-[#f5d386]">manifest.json</code> to enumerate published dates and then the corresponding dated files.
            </p>
          </MobileCard>
        </div>
      </MobileSection>

      <MobileSection eyebrow="Getting started" title="A mobile-first integration path.">
        <div className="space-y-3">
          {INTEGRATION_STEPS.map((step) => (
            <MobileCard key={step.n}>
              <div className="flex gap-3">
                <span className="mt-0.5 shrink-0 text-[10px] font-black text-[#f5d386]">{step.n}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-black text-white">{step.title}</div>
                  <p className="mt-1 text-[12px] leading-6 text-[#cfe0f4]">{step.body}</p>
                  {step.code ? (
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-black/[0.22] p-3 font-mono text-[10px] leading-5 text-[#d7e8fb]">
                      {step.code}
                    </pre>
                  ) : null}
                </div>
              </div>
            </MobileCard>
          ))}
        </div>
      </MobileSection>

      <MobileSection eyebrow="Layers" title="Gold, Derived, Meta and Briefs.">
        <div className="space-y-3">
          {JSON_LAYERS.map((layer) => (
            <MobileCard key={layer.name}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[15px] font-black text-white">{layer.name}</div>
                  <div className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#c49230]">
                    {layer.tagline}
                  </div>
                </div>
                <MobilePill tone="gold">JSON</MobilePill>
              </div>
              <p className="mt-3 text-[12px] leading-6 text-[#d7e8fb]">{layer.desc}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {layer.fields.map((field) => (
                  <code key={field} className="rounded-lg border border-white/10 bg-black/[0.18] px-2 py-1 font-mono text-[10px] text-[#cfe0f4]">
                    {field}
                  </code>
                ))}
              </div>
            </MobileCard>
          ))}
        </div>
      </MobileSection>

      <MobileSection eyebrow="Endpoints" title="Most-used paths.">
        <div className="space-y-2">
          {ENDPOINTS.map(([title, method, path]) => (
            <MobileCard key={path}>
              <div className="flex items-start justify-between gap-3">
                <strong className="text-[13px] text-white">{title}</strong>
                <MobilePill tone="blue">{method}</MobilePill>
              </div>
              <code className="mt-3 block break-all rounded-2xl border border-white/10 bg-black/[0.18] p-3 font-mono text-[10px] leading-5 text-[#d7e8fb]">
                {path}
              </code>
            </MobileCard>
          ))}
        </div>
      </MobileSection>

      <MobileSection eyebrow="Read next" title="Stay in the mobile docs.">
        <div className="grid gap-2">
          <MobilePrimaryLink href="/api-docs/history">Open full history documentation</MobilePrimaryLink>
          <MobilePrimaryLink href="/mobile/methodology">Open methodology</MobilePrimaryLink>
          <Link href="/mobile/wiki" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/14 bg-white/[0.075] px-4 text-[13px] font-black text-white">
            Open term wiki
          </Link>
        </div>
      </MobileSection>
    </MobilePage>
  );
}
