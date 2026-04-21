import type { ReactNode } from "react";
import Link from "next/link";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { currentDataSource } from "@/lib/storage";

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
  return <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>;
}

function CodeBlock({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-2xl border bg-black/30 p-5 text-xs leading-6 text-slate-200"><code>{children}</code></pre>;
}

export default async function ApiDocsPage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-10 rounded-3xl border p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-4xl">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">API documentation</div>
            <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">API Docs</h1>
            <p className="mt-4 text-lg leading-8 text-slate-300">Authenticate once, fetch published JSON artifacts directly, and use the methodology and sample pack to validate exactly what the product delivers.</p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              <Link href="/api-docs/getting-started" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200 hover:bg-white/10">Getting started</Link>
              <Link href="/api-docs/schema" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200 hover:bg-white/10">Schema reference</Link>
              <Link href="/api-docs/samples" className="rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-2 text-cyan-200 hover:bg-cyan-500/10">Public sample pack</Link>
              <Link href="/api-docs/workflows" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200 hover:bg-white/10">Common workflows</Link>
            </div>
          </div>
          <div className="min-w-[220px] rounded-2xl border border-white/10 bg-black/10 px-4 py-4 text-xs text-slate-300">
            <div className="font-medium uppercase tracking-[0.12em] text-slate-400">Published context</div>
            <div className="mt-2">Dataset <InlineCode>{dataset?.version ?? "—"}</InlineCode></div>
            <div className="mt-1">Methodology <InlineCode>{dataset?.methodology_version ?? "—"}</InlineCode></div>
            <div className="mt-1">Runtime backend <InlineCode>{currentDataSource()}</InlineCode></div>
            <div className="mt-2 text-slate-400">Runtime backend is a deployment detail, not the primary public provenance truth.</div>
          </div>
        </div>
      </header>

      <div className="grid gap-6">
        <section className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-white">Before you buy</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3 text-sm leading-7 text-muted-foreground">
            <div className="rounded-xl border bg-white/[0.02] p-4"><div className="font-semibold text-white">1. Download sample artifacts</div><p className="mt-2">Use the <Link href="/api-docs/samples" className="underline">public sample pack</Link> to inspect real Gold, Derived, and Meta files.</p></div>
            <div className="rounded-xl border bg-white/[0.02] p-4"><div className="font-semibold text-white">2. Validate methodology and provenance</div><p className="mt-2">Use the <Link href="/methodology/reference" className="underline">reference</Link>, <Link href="/methodology/verification" className="underline">verification pack</Link>, and <Link href="/methodology/provenance" className="underline">provenance page</Link>.</p></div>
            <div className="rounded-xl border bg-white/[0.02] p-4"><div className="font-semibold text-white">3. See operational expectations</div><p className="mt-2">Read the <Link href="/service" className="underline">service expectations and revision policy</Link> before subscribing.</p></div>
          </div>
        </section>

        <section className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-white">Authentication model</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">Public endpoints require no key. Authenticated file delivery uses <InlineCode>X-API-Key</InlineCode>. Keys are created from the dashboard after purchase. Billing endpoints remain documented but inactive until business registration is completed.</p>
          <CodeBlock>{`curl -H "X-API-Key: ta_live_xxxxxxxxx" https://www.urdatlas.com/api/v1/files/meta/bitcoin/90d/latest.json`}</CodeBlock>
        </section>

        <section className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-white">Public endpoints</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-muted-foreground"><tr><th className="px-4 py-3">Method</th><th className="px-4 py-3">Path</th><th className="px-4 py-3">Purpose</th></tr></thead>
              <tbody>{PUBLIC_ENDPOINTS.map(([m,p,d]) => <tr key={p} className="border-b last:border-b-0 align-top"><td className="px-4 py-3 text-slate-200">{m}</td><td className="px-4 py-3"><InlineCode>{p}</InlineCode></td><td className="px-4 py-3 text-muted-foreground">{d}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-white">Authenticated endpoints</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-muted-foreground"><tr><th className="px-4 py-3">Method</th><th className="px-4 py-3">Path</th><th className="px-4 py-3">Purpose</th></tr></thead>
              <tbody>{AUTH_ENDPOINTS.map(([m,p,d]) => <tr key={p} className="border-b last:border-b-0 align-top"><td className="px-4 py-3 text-slate-200">{m}</td><td className="px-4 py-3"><InlineCode>{p}</InlineCode></td><td className="px-4 py-3 text-muted-foreground">{d}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
