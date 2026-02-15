// src/app/page.tsx
import Link from "next/link";
import LandingHero from "@/components/landing/LandingHero";

function SectionCard(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="ui-card ui-lift rounded-3xl p-6">
      <div className="text-base font-semibold text-ui-text">{props.title}</div>
      <div className="mt-3 text-sm text-ui-muted">{props.children}</div>
    </div>
  );
}

function PillLink(props: { href: string; label: string }) {
  return (
    <Link
      href={props.href}
      className="ui-lift rounded-full border border-ui-border bg-ui-bg/30 px-3 py-1 text-xs font-semibold text-ui-muted hover:bg-ui-bg/40 hover:text-ui-text"
    >
      {props.label}
    </Link>
  );
}

function FullBleedSection(props: { children: React.ReactNode }) {
  // Break out of max-width container while keeping content aligned.
  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
      <div className="mx-auto w-full max-w-6xl px-4">{props.children}</div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="space-y-10">
      {/* HERO */}
      <LandingHero />

      {/* “How it works” — visually separated section */}
      <FullBleedSection>
        <section className="rounded-3xl border border-ui-border bg-ui-surface/60 p-6 md:p-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm font-semibold text-ui-text">How to read this site</div>
              <div className="mt-1 text-xs text-ui-faint">
                Designed for both beginners and professionals. Descriptive only — never advice.
              </div>
            </div>
            <div className="text-xs text-ui-faint">
              Tip: switch to <span className="text-ui-text">Advanced</span> to see full methodology & diagnostics.
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <SectionCard title="How to read the charts">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <span className="text-ui-text">Daily</span> is the raw value for the date (noisy).
                </li>
                <li>
                  <span className="text-ui-text">MA7</span> and <span className="text-ui-text">MA30</span> smooth noise to
                  show sustained movement (short-term regime vs structural baseline).
                </li>
                <li>
                  <span className="text-ui-text">Percentile</span> places today within the window’s historical distribution
                  (context, not a forecast).
                </li>
                <li>
                  <span className="text-ui-text">Z-score</span> shows how unusual today is vs the window mean in standard
                  deviation units (context, not causality).
                </li>
                <li>
                  Missing values render as <span className="text-ui-text">gaps</span> (null) — never interpolated, never
                  zero-filled.
                </li>
              </ul>
            </SectionCard>

            <SectionCard title="What the labels mean">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <span className="text-ui-text">Level</span>: low / typical / elevated / extreme vs historical reference.
                </li>
                <li>
                  <span className="text-ui-text">Trend</span>: rising / falling / flat based on windowed momentum (descriptive).
                </li>
                <li>
                  <span className="text-ui-text">Stability</span>: how variable daily values are within the window.
                </li>
                <li>
                  Labels are <span className="text-ui-text">descriptive summaries</span> only — no prices, no forecasts,
                  no advice.
                </li>
              </ul>
            </SectionCard>
          </div>

          <div className="mt-5 text-[11px] text-ui-faint">
            Guardrails: no prices · no advice · no forecasts · nulls render as gaps, never zeros.
          </div>
        </section>
      </FullBleedSection>

      {/* “Start exploring” — CTA band */}
      <FullBleedSection>
        <section className="relative overflow-hidden rounded-3xl border border-ui-border bg-ui-bg/30 p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-24 top-10 h-64 w-64 rounded-full bg-ui-accent/10 blur-3xl" />
            <div className="absolute -left-28 bottom-0 h-72 w-72 rounded-full bg-ui-accent2/10 blur-3xl" />
          </div>

          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-base font-semibold text-ui-text">Start exploring</div>
              <div className="mt-1 text-sm text-ui-muted">
                Chain dashboards, methodology, and the educational wiki are all available from the navigation.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <PillLink href="/chains/bitcoin" label="Bitcoin dashboard" />
              <PillLink href="/chains/ethereum" label="Ethereum dashboard" />
              <PillLink href="/chains/arbitrum" label="Arbitrum dashboard" />
              <PillLink href="/chains/base" label="Base dashboard" />
              <PillLink href="/notables" label="Notables policy" />
              <PillLink href="/methodology" label="Methodology" />
              <PillLink href="/wiki" label="Wiki" />
              <PillLink href="/about" label="About / contract" />
            </div>
          </div>

          <div className="relative mt-4 text-[11px] text-ui-faint">
            Data is served from published artifacts under{" "}
            <span className="font-mono text-ui-muted">public/data/published/v1</span> and is auditable via dataset metadata
            and manifest files.
          </div>
        </section>
      </FullBleedSection>
    </main>
  );
}