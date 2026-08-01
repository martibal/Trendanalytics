import ShortFullContent from "@/components/site/ShortFullContent";
import type { ReactNode } from "react";
import Link from "next/link";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import PageHero from "@/components/site/PageHero";
import { UrdButtonLink, UrdContainer, UrdInlineCode, UrdPage } from "@/components/site/UrdDesignSystem";

const STARTER_FLOW = [
  {
    step: "1",
    title: "Inspect public context",
    body: "Start with status, landing, summary, Analyst Kit CSV and feature schema. No key required.",
    href: "/api/v1/status",
    cta: "Open status JSON",
  },
  {
    step: "2",
    title: "Prototype the join",
    body: "Use Analyst Kit when you want a CSV or notebook before wiring authenticated artifact delivery.",
    href: "/analyst-kit",
    cta: "Open Analyst Kit",
  },
  {
    step: "3",
    title: "Integrate subscriber files",
    body: "Use X-API-Key for entitled Gold, Derived, Meta and Briefs artifacts once the workflow is proven.",
    href: "/dashboard",
    cta: "Open dashboard",
  },
] as const;

const PUBLIC_ENDPOINTS = [
  ["GET", "/api/v1/status", "Per-chain freshness, lag, and publication context."],
  ["GET", "/api/v1/landing", "Landing snapshot across supported chains."],
  ["GET", "/api/v1/summary/[chain]", "Chain summary with regime, scorecard, confidence, freshness and drivers."],
  ["GET", "/api/v1/glossary", "Public glossary payload."],
  ["GET", "/api/v1/thresholds/defaults", "Canonical default threshold values."],
  ["GET", "/api/v1/methodology/versions", "Published methodology version history."],
];

const ANALYST_KIT_ENDPOINTS = [
  ["GET", "/api/v1/analyst-kit/[chain]/regime-calendar", "CSV calendar for one chain with one row per observation date."],
  ["GET", "/api/v1/analyst-kit/[chain]/weekly-summary", "Plain-text network-state summary for reports and review notes."],
  ["GET", "/api/v1/analyst-kit/feature-schema", "Machine-readable schema for the Analyst Kit feature table."],
  ["GET", "/api/v1/analyst-kit/starter-notebook", "Runnable notebook that loads Urd Atlas and builds an example join."],
];

const AUTH_ENDPOINTS = [
  ["GET", "/api/v1/files/[genre]/[chain]/[window]/latest.json", "Authenticated delivery for subscriber artifacts."],
  ["POST", "/api/v1/keys", "Create a new API key from the dashboard."],
  ["DELETE", "/api/v1/keys", "Revoke an API key."],
  ["POST", "/api/v1/checkout", "Checkout endpoint for starting a subscription purchase."],
  ["POST", "/api/v1/checkout/portal", "Customer portal endpoint for managing an existing subscription."],
];

const FILE_GENRES = [
  ["meta", "Regime, confidence, status, scorecard, drivers and methodology context."],
  ["gold", "Daily canonical metric rows for subscribed chains and windows."],
  ["derived", "Derived windows and moving summaries built from published data."],
  ["briefs", "Narrative brief artifacts generated from the published state layer."],
] as const;

function InlineCode({ children }: { children: ReactNode }) {
  return <UrdInlineCode>{children}</UrdInlineCode>;
}

function CodeBlock({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-2xl border border-[var(--urd-border)] bg-[var(--urd-raised)] p-5 text-xs leading-6 text-[var(--urd-text-strong)]"><code>{children}</code></pre>;
}

function EndpointTable({ rows }: { rows: string[][] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b bg-[var(--urd-panel-strong)] text-[var(--urd-text-body)]">
          <tr><th className="px-4 py-3">Method</th><th className="px-4 py-3">Path</th><th className="px-4 py-3">Purpose</th></tr>
        </thead>
        <tbody>{rows.map(([m, p, d]) => <tr key={p} className="border-b last:border-b-0 align-top"><td className="px-4 py-3 text-[var(--urd-text-body)]">{m}</td><td className="px-4 py-3"><InlineCode>{p}</InlineCode></td><td className="px-4 py-3 text-[var(--urd-text-body)]">{d}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export default async function ApiDocsPage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();
  return (
    <UrdPage>
      <PageHero
        eyebrow="API documentation"
        title="API Docs"
        summary="Start with public reference endpoints, prototype with Analyst Kit, then integrate authenticated artifact delivery when the workflow is proven."
      >
        <div className="flex flex-wrap gap-2 text-sm">
          <UrdButtonLink href="/api-docs/getting-started">Getting started</UrdButtonLink>
          <UrdButtonLink href="/api-docs/schema">Schema reference</UrdButtonLink>
          <UrdButtonLink href="/api-docs/samples">Public sample pack</UrdButtonLink>
          <UrdButtonLink href="/api-docs/workflows">Common workflows</UrdButtonLink>
          <UrdButtonLink href="/analyst-kit">Analyst Kit</UrdButtonLink>
        </div>

        <div className="mt-6 max-w-xl rounded-2xl border border-[var(--urd-border-soft)] bg-[var(--urd-raised)] px-4 py-4 text-xs text-[var(--urd-text-body)]">
          <div className="font-medium uppercase tracking-[0.12em] text-blue-700">Published reference data</div>
          <div className="mt-2">Published revision <InlineCode>{dataset?.version ?? "—"}</InlineCode></div>
          <div className="mt-1">Methodology <InlineCode>{dataset?.methodology_version ?? "—"}</InlineCode></div>
          <div className="mt-2 text-[var(--urd-text-body)]">Public provenance is anchored in date, updated_through, methodology_version, published revision, and regime.determinism_hash.</div>
          <div className="mt-2 text-[var(--urd-text-body)]">Product boundary: no price data, no forecasts, and no investment advice. API outputs are descriptive on-chain reference data only.</div>
        </div>
      </PageHero>

      <UrdContainer>
      <ShortFullContent
        pageKey="api-docs"
        summary={<>Use this page to pick the right entry point: public context, no-pipeline Analyst Kit, or authenticated subscriber artifacts.</>}
        bullets={[
          <>Start with <strong>Status</strong> and <strong>Summary</strong> if you want to inspect live publication context.</>,
          <>Use <strong>Analyst Kit</strong> if you want CSV and notebook artifacts without building an integration first.</>,
          <>Use <strong>Subscriber files</strong> when you need entitled JSON artifacts for production ingestion.</>,
          <>Use <strong>Schema reference</strong> and <strong>Samples</strong> before wiring parsing logic.</>,
        ]}
        whyItMatters={<>A technical buyer should know which endpoint to try first, which endpoints require a key, and how to move from evaluation to production ingestion without guessing.</>}
        fullContent={
          <div className="grid gap-6">
        <section className="rounded-3xl border border-[var(--urd-border-soft)] bg-[var(--urd-panel)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--urd-text-strong)]">Start here</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--urd-text-body)]">The API surface has three entry points. Public endpoints help you inspect the published state. Analyst Kit gives a no-pipeline route to CSV and notebooks. Authenticated files are the subscriber delivery path for production ingestion.</p>
            </div>
            <Link href="/validation" className="rounded-full border border-[var(--urd-border)] px-4 py-2 text-xs font-semibold text-[var(--urd-text-strong)]">Check validation</Link>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {STARTER_FLOW.map((item) => (
              <article key={item.step} className="rounded-2xl border border-[var(--urd-border-soft)] bg-[var(--urd-raised)] p-4">
                <div className="font-mono text-xs uppercase tracking-[0.14em] text-blue-700">Step {item.step}</div>
                <h3 className="mt-2 text-lg font-semibold text-[var(--urd-text-strong)]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--urd-text-body)]">{item.body}</p>
                <Link href={item.href} className="mt-4 inline-flex rounded-full bg-[var(--urd-primary)] px-4 py-2 text-xs font-semibold text-white">{item.cta}</Link>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--urd-border-soft)] bg-[var(--urd-panel)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
          <h2 className="text-xl font-semibold text-[var(--urd-text-strong)]">Fastest public checks</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--urd-text-body)]">These calls require no key and are safe for evaluation, demos and first-pass parsing. They should be the first thing a new technical user tries.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <CodeBlock>{`curl https://www.urdatlas.com/api/v1/status`}</CodeBlock>
            <CodeBlock>{`python - <<'PY'\nimport pandas as pd\nurl = "https://www.urdatlas.com/api/v1/analyst-kit/ethereum/regime-calendar"\ndf = pd.read_csv(url)\nprint(df.tail())\nPY`}</CodeBlock>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--urd-border-soft)] bg-[var(--urd-panel)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
          <h2 className="text-xl font-semibold text-[var(--urd-text-strong)]">Before you buy</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3 text-sm leading-7 text-[var(--urd-text-body)]">
            <div className="rounded-xl border bg-[var(--urd-raised)] p-4"><div className="font-semibold text-[var(--urd-text-strong)]">1. Download sample artifacts</div><p className="mt-2">Use the <Link href="/api-docs/samples" className="underline">public sample pack</Link> to inspect real Gold, Derived, Meta, and Briefs reference files.</p></div>
            <div className="rounded-xl border bg-[var(--urd-raised)] p-4"><div className="font-semibold text-[var(--urd-text-strong)]">2. Validate methodology and provenance</div><p className="mt-2">Use the <Link href="/methodology/reference" className="underline">reference</Link>, <Link href="/methodology/verification" className="underline">verification pack</Link>, and <Link href="/methodology/provenance" className="underline">provenance page</Link>.</p></div>
            <div className="rounded-xl border bg-[var(--urd-raised)] p-4"><div className="font-semibold text-[var(--urd-text-strong)]">3. See operational expectations</div><p className="mt-2">Read the <Link href="/service" className="underline">service expectations and revision policy</Link> before subscribing.</p></div>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--urd-border-soft)] bg-[var(--urd-panel)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
          <h2 className="text-xl font-semibold text-[var(--urd-text-strong)]">Authentication model</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--urd-text-body)]">Public endpoints require no key. Authenticated file delivery uses <InlineCode>X-API-Key</InlineCode>. Keys are created from the dashboard after purchase. Checkout starts a subscription purchase, and the customer portal manages an existing subscription.</p>
          <CodeBlock>{`curl -H "X-API-Key: ta_live_xxxxxxxxx" https://www.urdatlas.com/api/v1/files/meta/bitcoin/90d/latest.json`}</CodeBlock>
        </section>

        <section className="rounded-3xl border border-[var(--urd-border-soft)] bg-[var(--urd-panel)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
          <h2 className="text-xl font-semibold text-[var(--urd-text-strong)]">Subscriber file path</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--urd-text-body)]">The authenticated file route is intentionally regular: choose genre, chain and window, then request latest.json. This keeps warehouse loaders and scheduled jobs simple.</p>
          <div className="mt-4 rounded-2xl border bg-[var(--urd-raised)] p-4 text-sm leading-7 text-[var(--urd-text-body)]">
            <div>Template: <InlineCode>/api/v1/files/[genre]/[chain]/[window]/latest.json</InlineCode></div>
            <div className="mt-2">Example: <InlineCode>/api/v1/files/meta/ethereum/90d/latest.json</InlineCode></div>
            <div className="mt-2">Chains: <InlineCode>bitcoin</InlineCode>, <InlineCode>ethereum</InlineCode>, <InlineCode>arbitrum</InlineCode>, <InlineCode>base</InlineCode></div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {FILE_GENRES.map(([genre, description]) => (
              <div key={genre} className="rounded-xl border bg-[var(--urd-raised)] p-4 text-sm"><InlineCode>{genre}</InlineCode><p className="mt-2 leading-6 text-[var(--urd-text-body)]">{description}</p></div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--urd-border-soft)] bg-[var(--urd-panel)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
          <h2 className="text-xl font-semibold text-[var(--urd-text-strong)]">Public product endpoints</h2>
          <EndpointTable rows={PUBLIC_ENDPOINTS} />
        </section>

        <section className="rounded-3xl border border-[var(--urd-border-soft)] bg-[var(--urd-panel)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
          <h2 className="text-xl font-semibold text-[var(--urd-text-strong)]">Analyst Kit endpoints</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--urd-text-body)]">Analyst Kit is public and optimized for evaluation: CSV, text summary, schema and notebook artifacts that work before the customer has an internal pipeline.</p>
          <EndpointTable rows={ANALYST_KIT_ENDPOINTS} />
        </section>

        <section className="rounded-3xl border border-[var(--urd-border-soft)] bg-[var(--urd-panel)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
          <h2 className="text-xl font-semibold text-[var(--urd-text-strong)]">Authenticated endpoints</h2>
          <EndpointTable rows={AUTH_ENDPOINTS} />
        </section>
          </div>
        }
      />
      </UrdContainer>
    </UrdPage>
  );
}
