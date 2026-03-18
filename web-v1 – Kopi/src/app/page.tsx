// src/app/page.tsx
import Link from "next/link";
import LandingHero from "@/components/landing/LandingHero";

function SectionCard(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="ui-card ui-lift p-5">
      <div className="font-mono text-[11px] font-semibold tracking-wide text-ui-text">{props.title}</div>
      <div className="mt-3 text-sm leading-relaxed text-ui-muted">{props.children}</div>
    </div>
  );
}

function PillLink(props: { href: string; label: string }) {
  return (
    <Link
      href={props.href}
      className="ui-lift rounded-md border border-ui-border bg-ui-bg/30 px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wide text-ui-muted hover:border-ui-border-soft hover:bg-ui-bg/40 hover:text-ui-text"
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
      {/* HERO (primary product pitch & interactive overview) */}
      <LandingHero />

      {/* Secondary content kept minimal until the landing GUI is fully migrated (HTML parity). */}
      <FullBleedSection>
        <section className="ui-card p-6 md:p-7">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <div className="font-mono text-[11px] font-semibold tracking-wide text-ui-text">Quick navigation</div>
              <div className="text-sm leading-relaxed text-ui-muted">
                Dashboards, methodology, and the educational wiki. Descriptive only — no prices, no forecasts, no advice.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <PillLink href="/chains/bitcoin" label="Bitcoin" />
              <PillLink href="/chains/ethereum" label="Ethereum" />
              <PillLink href="/chains/arbitrum" label="Arbitrum" />
              <PillLink href="/chains/base" label="Base" />
              <PillLink href="/methodology" label="Methodology" />
              <PillLink href="/wiki" label="Wiki" />
              <PillLink href="/notables" label="Notables" />
              <PillLink href="/about" label="About / contract" />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <SectionCard title="READING GUIDE (CHARTS)">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <span className="text-ui-text">Daily</span> is the raw value for the date (noisy).
                </li>
                <li>
                  <span className="text-ui-text">MA7</span> and <span className="text-ui-text">MA30</span> smooth noise to
                  show sustained movement (short-term shift vs baseline).
                </li>
                <li>
                  <span className="text-ui-text">Percentile</span> places today within a historical distribution (context only).
                </li>
                <li>
                  <span className="text-ui-text">Z-score</span> describes unusualness vs a reference window (context only).
                </li>
                <li>
                  Missing values render as <span className="text-ui-text">gaps</span> (null) — never interpolated, never
                  zero-filled.
                </li>
              </ul>
            </SectionCard>

            <SectionCard title="READING GUIDE (LABELS)">
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
                  Labels are <span className="text-ui-text">descriptive summaries</span> only.
                </li>
              </ul>
            </SectionCard>
          </div>

          <div className="mt-5 text-[11px] text-ui-faint">
            Guardrails: no prices · no advice · no forecasts · nulls render as gaps, never zeros.
          </div>
        </section>
      </FullBleedSection>
    </main>
  );
}