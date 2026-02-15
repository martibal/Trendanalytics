// src/app/terms/page.tsx
import Link from "next/link";

function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur">
      <div className="text-lg font-semibold text-white">{props.title}</div>
      <div className="mt-3 text-sm text-white/70">{props.children}</div>
    </div>
  );
}

function CodeInline(props: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-black/30 px-1 py-0.5 text-xs text-white/80">
      {props.children}
    </code>
  );
}

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10">
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold text-white">Terms of Service</h1>
        <p className="text-sm text-white/70">
          These terms describe how this site presents information and how data is sourced. The platform is
          designed for <span className="text-white/85">descriptive</span>,{" "}
          <span className="text-white/85">price-agnostic</span> analytics of blockchain activity.
        </p>

        <div className="flex flex-wrap gap-3 text-xs text-white/70">
          <Link className="underline underline-offset-4 hover:text-white" href="/">
            Home
          </Link>
          <Link className="underline underline-offset-4 hover:text-white" href="/about">
            About
          </Link>
          <Link className="underline underline-offset-4 hover:text-white" href="/methodology">
            Methodology
          </Link>
          <Link className="underline underline-offset-4 hover:text-white" href="/wiki">
            Wiki
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Descriptive-only scope">
          <ul className="list-disc space-y-2 pl-5">
            <li>No financial advice, recommendations, or investment guidance.</li>
            <li>No price series, price charts, price-derived proxies, or price predictions.</li>
            <li>All summaries describe observed network conditions within explicit windows.</li>
          </ul>
        </Card>

        <Card title="User responsibility">
          <ul className="list-disc space-y-2 pl-5">
            <li>Interpretation is the user’s responsibility.</li>
            <li>Data artifacts and narrative summaries are informational descriptions of historic measurements.</li>
            <li>Users should verify freshness, lag, and coverage indicators before relying on any output.</li>
          </ul>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-white">Data sourcing and integrity</h2>

        <Card title="Published artifacts are the source of truth">
          <p>
            Pages and API routes read from static JSON artifacts under{" "}
            <CodeInline>public/data/published/v1</CodeInline>. The manifest describes which dates are available.
            The UI and API present missingness explicitly rather than smoothing or interpolating absent days.
          </p>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/60">
              Dimensions shown explicitly
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/70">
              <li>
                <span className="text-white/85">Window:</span> start → end (end aligns to manifest as-of).
              </li>
              <li>
                <span className="text-white/85">Coverage:</span> present/expected days + non-null ratio.
              </li>
              <li>
                <span className="text-white/85">Freshness:</span> as-of date + computed lag (days).
              </li>
              <li>
                <span className="text-white/85">Audit:</span> dataset_id + revision_id included on responses.
              </li>
            </ul>
          </div>

          <p className="mt-3 text-xs text-white/60">
            The platform presents these signals to make data quality and recency obvious to readers.
          </p>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-white">Availability and changes</h2>

        <Card title="Service availability">
          <p>
            This site is a descriptive analytics interface over published artifacts. Availability depends on the
            presence of published JSON files and operational uptime of the hosting environment.
          </p>
          <p className="mt-3">
            Definitions, metrics, and methodology can change. When changes occur, the platform’s methodology
            and definitions are versioned and documented to preserve auditability.
          </p>
        </Card>

        <Card title="No warranties">
          <p>
            Outputs are provided as-is for informational purposes. Data can be incomplete, delayed, or absent for
            specific windows or chains, and such conditions are surfaced via lag and coverage indicators.
          </p>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-white">Contact</h2>

        <Card title="Operational questions">
          <p>
            For questions about data artifacts, definitions, or audit identifiers, reference the{" "}
            <Link className="underline underline-offset-4 hover:text-white" href="/methodology">
              Methodology
            </Link>{" "}
            and{" "}
            <Link className="underline underline-offset-4 hover:text-white" href="/wiki">
              Wiki
            </Link>{" "}
            pages, which define how metrics are computed and presented.
          </p>
        </Card>
      </section>

      <footer className="pb-10 text-xs text-white/50">
        Descriptive observation only. No advice, no price analysis, and no prediction.
      </footer>
    </main>
  );
}