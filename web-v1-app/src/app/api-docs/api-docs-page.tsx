import type { ReactNode } from "react";
import Link from "next/link";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";

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
  ["POST", "/api/v1/checkout", "Checkout endpoint for starting a subscription purchase."],
  ["POST", "/api/v1/checkout/portal", "Customer portal endpoint for managing an existing subscription."],
];

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded border border-[var(--urd-border-soft)] bg-[var(--urd-raised-soft)] px-1 py-0.5 font-mono text-xs text-[var(--urd-text-strong)]">{children}</code>;
}

function CodeBlock({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-2xl border bg-[var(--urd-code-bg)] p-5 text-xs leading-6 text-[var(--urd-code-text)]"><code>{children}</code></pre>;
}

export default async function ApiDocsPage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-10 rounded-3xl border p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-4xl">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-blue-700">API documentation</div>
            <h1 className="mt-3 text-4xl font-semibold text-[var(--urd-text-strong)] sm:text-5xl">API Docs</h1>
            <p className="mt-4 text-lg leading-8 text-[var(--urd-text-body)]">Authenticate once, fetch published on-chain reference data directly as JSON, and use the methodology and sample pack to validate exactly what the product delivers.</p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              <Link href="/api-docs/getting-started" className="rounded-full border border-[var(--urd-border-soft)] bg-[var(--urd-raised)] px-4 py-2 text-[var(--urd-text-body)] hover:bg-[var(--urd-raised)]">Getting started</Link>
              <Link href="/api-docs/schema" className="rounded-full border border-[var(--urd-border-soft)] bg-[var(--urd-raised)] px-4 py-2 text-[var(--urd-text-body)] hover:bg-[var(--urd-raised)]">Schema reference</Link>
              <Link href="/api-docs/samples" className="rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-2 text-blue-700 hover:bg-cyan-500/10">Public sample pack</Link>
              <Link href="/api-docs/workflows" className="rounded-full border border-[var(--urd-border-soft)] bg-[var(--urd-raised)] px-4 py-2 text-[var(--urd-text-body)] hover:bg-[var(--urd-raised)]">Common workflows</Link>
            </div>
          </div>
          <div className="min-w-[220px] rounded-2xl border border-[var(--urd-border-soft)] bg-[var(--urd-raised)] px-4 py-4 text-xs text-[var(--urd-text-body)]">
            <div className="font-medium uppercase tracking-[0.12em] text-[var(--urd-text-muted)]">Published reference data</div>
            <div className="mt-2">Dataset <InlineCode>{dataset?.version ?? "—"}</InlineCode></div>
            <div className="mt-1">Methodology <InlineCode>{dataset?.methodology_version ?? "—"}</InlineCode></div>
            <div className="mt-1">Published reference data contract</div>
            <div className="mt-2 text-[var(--urd-text-muted)]">Runtime backend is a deployment detail, not the primary public provenance truth.</div>
          </div>
        </div>
      </header>

      <div className="grid gap-6">
        <section className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--urd-text-strong)]">Before you buy</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3 text-sm leading-7 text-[var(--urd-text-body)]">
            <div className="rounded-xl border bg-[var(--urd-raised)] p-4"><div className="font-semibold text-[var(--urd-text-strong)]">1. Download sample artifacts</div><p className="mt-2">Use the <Link href="/api-docs/samples" className="underline">public sample pack</Link> to inspect real Gold, Derived, Meta, and Briefs reference files.</p></div>
            <div className="rounded-xl border bg-[var(--urd-raised)] p-4"><div className="font-semibold text-[var(--urd-text-strong)]">2. Validate methodology and provenance</div><p className="mt-2">Use the <Link href="/methodology/reference" className="underline">reference</Link>, <Link href="/methodology/verification" className="underline">verification pack</Link>, and <Link href="/methodology/provenance" className="underline">provenance page</Link>.</p></div>
            <div className="rounded-xl border bg-[var(--urd-raised)] p-4"><div className="font-semibold text-[var(--urd-text-strong)]">3. See operational expectations</div><p className="mt-2">Read the <Link href="/service" className="underline">service expectations and revision policy</Link> before subscribing.</p></div>
          </div>
        </section>

        <section className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--urd-text-strong)]">Authentication model</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--urd-text-body)]">Public endpoints require no key. Authenticated file delivery uses <InlineCode>X-API-Key</InlineCode>. Keys are created from the dashboard after purchase. Checkout starts a subscription purchase, and the customer portal manages an existing subscription.</p>
          <CodeBlock>{`curl -H "X-API-Key: ta_live_xxxxxxxxx" https://www.urdatlas.com/api/v1/files/meta/bitcoin/90d/latest.json`}</CodeBlock>
        </section>

        <section className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--urd-text-strong)]">Public endpoints</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-[var(--urd-raised)]/40 text-[var(--urd-text-body)]"><tr><th className="px-4 py-3">Method</th><th className="px-4 py-3">Path</th><th className="px-4 py-3">Purpose</th></tr></thead>
              <tbody>{PUBLIC_ENDPOINTS.map(([m,p,d]) => <tr key={p} className="border-b last:border-b-0 align-top"><td className="px-4 py-3 text-[var(--urd-text-body)]">{m}</td><td className="px-4 py-3"><InlineCode>{p}</InlineCode></td><td className="px-4 py-3 text-[var(--urd-text-body)]">{d}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--urd-text-strong)]">Authenticated endpoints</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-[var(--urd-raised)]/40 text-[var(--urd-text-body)]"><tr><th className="px-4 py-3">Method</th><th className="px-4 py-3">Path</th><th className="px-4 py-3">Purpose</th></tr></thead>
              <tbody>{AUTH_ENDPOINTS.map(([m,p,d]) => <tr key={p} className="border-b last:border-b-0 align-top"><td className="px-4 py-3 text-[var(--urd-text-body)]">{m}</td><td className="px-4 py-3"><InlineCode>{p}</InlineCode></td><td className="px-4 py-3 text-[var(--urd-text-body)]">{d}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
