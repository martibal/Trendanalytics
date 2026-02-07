// src/app/about/page.tsx
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

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10">
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold text-white">About</h1>
        <p className="text-sm text-white/70">
          This product provides <span className="text-white/85">descriptive</span>,{" "}
          <span className="text-white/85">price-agnostic</span> analytics on blockchain activity.
          It focuses on robust trend context and auditable outputs.
        </p>

        <div className="flex flex-wrap gap-3 text-xs text-white/70">
          <Link className="underline underline-offset-4 hover:text-white" href="/chains">
            Chains
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
        <Card title="No prices / no advice">
          <ul className="list-disc space-y-2 pl-5">
            <li>No price charts, no price series, and no price-derived proxies.</li>
            <li>No forecasts, no recommendations, and no advisory language.</li>
            <li>Interpretations are deterministic summaries of historical context only.</li>
          </ul>
        </Card>

        <Card title="What you get instead">
          <ul className="list-disc space-y-2 pl-5">
            <li>Trend context: daily + MA7 + MA30, with regime-like labels.</li>
            <li>Notables: descriptive flags for missingness, lag, and low coverage.</li>
            <li>Auditability: dataset and revision identifiers on every response.</li>
          </ul>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-white">Data freshness policy</h2>

        <Card title="Freshness is always explicit">
          <p>
            Every chart and API response includes an <CodeInline>asof</CodeInline> date and a computed lag in days.
            We do not hide delays or “smooth over” missing days. If data is delayed, the UI states it clearly.
          </p>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Operational expectation</div>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-white/70">
              <li>
                <span className="text-white/85">Bitcoin & Ethereum:</span> typically updated through the prior day (near daily freshness).
              </li>
              <li>
                <span className="text-white/85">Arbitrum & Base:</span> typically delayed by about a week (delayed feed).
              </li>
            </ul>
            <p className="mt-3 text-xs text-white/60">
              These are descriptive expectations of the current pipeline behavior, not guarantees. Always verify the live
              <CodeInline>asof</CodeInline> in the UI or via the manifest export.
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/70">
            <Link className="underline underline-offset-4 hover:text-white" href="/chains">
              See as-of per chain →
            </Link>
            <a
              className="underline underline-offset-4 hover:text-white"
              href="/api/export/manifest?chain=bitcoin&genre=gold"
              target="_blank"
              rel="noreferrer"
            >
              Example: bitcoin gold manifest (raw)
            </a>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-white">Data contract</h2>

        <Card title="Published artifacts (source of truth)">
          <p>
            All web pages and API routes read only from static JSON under{" "}
            <CodeInline>public/data/published/v1</CodeInline>. The manifest is the
            source of truth for which dates exist (no interpolation).
          </p>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-white/60">
              Required structure (high level)
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/70">
              <li>
                <CodeInline>dataset.json</CodeInline> (dataset_id, revision_id)
              </li>
              <li>
                <CodeInline>gold/&lt;chain&gt;/manifest.json</CodeInline>{" "}
                (asof, available_days)
              </li>
              <li>
                <CodeInline>gold/&lt;chain&gt;/YYYY-MM-DD.json</CodeInline> (daily metrics)
              </li>
              <li>
                <CodeInline>derived/&lt;chain&gt;/YYYY-MM-DD.json</CodeInline>{" "}
                (MA7/MA30, confidence)
              </li>
              <li>
                <CodeInline>meta/&lt;chain&gt;/YYYY-MM-DD.json</CodeInline>{" "}
                (optional z/percentile context if provided)
              </li>
              <li>
                Window files: <CodeInline>last7d.json</CodeInline>,{" "}
                <CodeInline>last30d.json</CodeInline>,{" "}
                <CodeInline>last90d.json</CodeInline>,{" "}
                <CodeInline>last180d.json</CodeInline>,{" "}
                <CodeInline>last365d.json</CodeInline>
              </li>
            </ul>
          </div>
        </Card>

        <Card title="Dimensions shown explicitly">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="text-white/85">Window:</span> start → end (end defaults to manifest as-of).
            </li>
            <li>
              <span className="text-white/85">Coverage:</span> present/expected days + non-null ratio.
            </li>
            <li>
              <span className="text-white/85">Freshness:</span> as-of date + lag in days.
            </li>
            <li>
              <span className="text-white/85">Confidence:</span> a 0..1 quality score shown in tooltips.
            </li>
            <li>
              <span className="text-white/85">Audit:</span> dataset_id + revision_id on responses and UI.
            </li>
          </ul>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-white">API endpoints</h2>

        <Card title="Descriptive endpoints">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <CodeInline>/api/series</CodeInline> — returns daily/MA7/MA30 + coverage + freshness.
            </li>
            <li>
              <CodeInline>/api/summary</CodeInline> — returns deterministic labels and Basic/Advanced interpretation.
            </li>
          </ul>
        </Card>

        <Card title="Raw export endpoints">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <CodeInline>/api/export/daily</CodeInline> — raw daily file for gold/meta/derived.
            </li>
            <li>
              <CodeInline>/api/export/window</CodeInline> — raw last{`{7,30,90,180,365}`}d file.
            </li>
            <li>
              <CodeInline>/api/export/manifest</CodeInline> — raw manifest (as-of + available days).
            </li>
          </ul>
          <p className="mt-3 text-xs text-white/60">
            These endpoints return published file content and add dataset identifiers. They do not compute or infer missing data.
          </p>
        </Card>
      </section>

      <footer className="pb-10 text-xs text-white/50">
        This site is descriptive only and does not provide investment advice, predictions, or price-based analysis.
      </footer>
    </main>
  );
}