import ShortFullContent from "@/components/site/ShortFullContent";
import type { ReactNode } from "react";
import Link from "next/link";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import PageHero from "@/components/site/PageHero";
import { UrdButtonLink, UrdContainer, UrdInlineCode, UrdPage } from "@/components/site/UrdDesignSystem";

const PUBLIC_ENDPOINTS = [
  ["GET", "/api/v1/status", "Per-chain freshness, lag, and publication context."],
  ["GET", "/api/v1/landing", "Landing snapshot across chains."],
  ["GET", "/api/v1/summary/[chain]", "Chain summary with regime, scorecard, and drivers."],
  ["GET", "/api/v1/glossary", "Public glossary payload."],
  ["GET", "/api/v1/thresholds/defaults", "Canonical default threshold values."],
  ["GET", "/api/v1/methodology/versions", "Published methodology version history."],
];

const AUTH_ENDPOINTS = [
  ["GET", "/api/v1/files/[genre]/[chain]/[window]/latest.json", "Authenticated file delivery for subscriber artifacts."],
  ["POST", "/api/v1/keys", "Create a new API key from the dashboard."],
  ["DELETE", "/api/v1/keys", "Revoke an API key."],
  ["POST", "/api/v1/checkout", "Checkout endpoint — currently documented, but billing is not active until business registration is complete."],
  ["POST", "/api/v1/checkout/portal", "Customer portal endpoint — currently documented, but billing is not active until business registration is complete."],
];

function InlineCode({ children }: { children: ReactNode }) {
  return <UrdInlineCode>{children}</UrdInlineCode>;
}

function CodeBlock({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-2xl border border-[var(--urd-border)] bg-[var(--urd-raised)] p-5 text-xs leading-6 text-[var(--urd-text-strong)]"><code>{children}</code></pre>;
}

export default async function ApiDocsPage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();
  return (
    <UrdPage>
      <PageHero
        eyebrow="API documentation"
        title="API Docs"
        summary="Authenticate once, fetch published on-chain reference data directly as JSON, and use the methodology and sample pack to validate exactly what the product delivers."
      >
        <div className="flex flex-wrap gap-2 text-sm">
          <UrdButtonLink href="/api-docs/getting-started">Getting started</UrdButtonLink>
          <UrdButtonLink href="/api-docs/schema">Schema reference</UrdButtonLink>
          <UrdButtonLink href="/api-docs/samples">Public sample pack</UrdButtonLink>
          <UrdButtonLink href="/api-docs/workflows">Common workflows</UrdButtonLink>
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
        summary={<>Use this page to see what the API delivers, what you should inspect before buying, and where to go first.</>}
        bullets={[
          <>Start with <strong>Getting started</strong> if you want the fastest route from zero to your first pull.</>,
          <>Open <strong>Public sample pack</strong> to inspect real reference data JSON before subscribing.</>,
          <>Use <strong>Schema reference</strong> when you need exact parsing and field structure.</>,
          <>Use <strong>Common workflows</strong> when you want to see how analysts and dashboards actually use the data.</>,
        ]}
        whyItMatters={<>A technical buyer should immediately know where to start, what the API returns, and how to validate the product before purchase.</>}
        fullContent={
          <div className="grid gap-6">
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
          <p className="mt-4 text-sm leading-7 text-[var(--urd-text-body)]">Public endpoints require no key. Authenticated file delivery uses <InlineCode>X-API-Key</InlineCode>. Keys are created from the dashboard after purchase. Billing endpoints remain documented but inactive until business registration is completed.</p>
          <CodeBlock>{`curl -H "X-API-Key: ta_live_xxxxxxxxx" https://www.urdatlas.com/api/v1/files/meta/bitcoin/90d/latest.json`}</CodeBlock>
        </section>

        <section className="rounded-3xl border border-[var(--urd-border-soft)] bg-[var(--urd-panel)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
          <h2 className="text-xl font-semibold text-[var(--urd-text-strong)]">Public endpoints</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-[var(--urd-panel-strong)] text-[var(--urd-text-body)]"><tr><th className="px-4 py-3">Method</th><th className="px-4 py-3">Path</th><th className="px-4 py-3">Purpose</th></tr></thead>
              <tbody>{PUBLIC_ENDPOINTS.map(([m,p,d]) => <tr key={p} className="border-b last:border-b-0 align-top"><td className="px-4 py-3 text-[var(--urd-text-body)]">{m}</td><td className="px-4 py-3"><InlineCode>{p}</InlineCode></td><td className="px-4 py-3 text-[var(--urd-text-body)]">{d}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--urd-border-soft)] bg-[var(--urd-panel)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
          <h2 className="text-xl font-semibold text-[var(--urd-text-strong)]">Authenticated endpoints</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-[var(--urd-panel-strong)] text-[var(--urd-text-body)]"><tr><th className="px-4 py-3">Method</th><th className="px-4 py-3">Path</th><th className="px-4 py-3">Purpose</th></tr></thead>
              <tbody>{AUTH_ENDPOINTS.map(([m,p,d]) => <tr key={p} className="border-b last:border-b-0 align-top"><td className="px-4 py-3 text-[var(--urd-text-body)]">{m}</td><td className="px-4 py-3"><InlineCode>{p}</InlineCode></td><td className="px-4 py-3 text-[var(--urd-text-body)]">{d}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
          </div>
        }
      />
      </UrdContainer>
    </UrdPage>
  );
}
