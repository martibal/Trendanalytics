export const revalidate = 0;

export default function ApiSdkPage() {
  return (
    <main className="ua-page">
      <header className="hero border-b border-[var(--line)]"><div className="page-shell"><div className="eyebrow mb-4">API Docs</div><h1 className="ua-h1">OpenAPI and Python SDK</h1><p className="lead mt-4 max-w-3xl">The canonical integration surface is HTTP/JSON. An OpenAPI 3.1 document and an official lightweight Python client are maintained alongside that contract.</p></div></header>
      <div className="page-shell py-12 max-w-5xl space-y-10 text-sm leading-7 text-[var(--ink2)]">
        <section><h2 className="ua-h3 text-[var(--ink)]">OpenAPI 3.1</h2><p className="mt-3">Machine-readable specification: <a href="/openapi.json" className="text-link">/openapi.json</a>. It documents public status/summary endpoints and the core authenticated artifact paths, API-key authentication and common HTTP responses.</p></section>
        <section><h2 className="ua-h3 text-[var(--ink)]">Official Python client</h2><p className="mt-3">The repository contains the official lightweight client at <code>sdk/python</code>. It intentionally depends only on the Python standard library; the HTTP/OpenAPI contract remains authoritative.</p><pre className="mt-4 overflow-x-auto rounded-xl border border-[var(--line)] p-4 text-xs"><code>{`from urdatlas import UrdAtlas\n\nua = UrdAtlas()\nprint(ua.status())\n\npaid = UrdAtlas(api_key="ta_live_...")\nmeta = paid.bundle("meta", "ethereum", "90d")`}</code></pre></section>
        <section><h2 className="ua-h3 text-[var(--ink)]">Compatibility</h2><p className="mt-3">The client is a convenience wrapper, not a separate data contract. Breaking behavior is governed by <a href="/api-docs/versioning" className="text-link">Versioning</a>, and callers must respect <a href="/api-docs/rate-limits" className="text-link">Rate limits</a>.</p></section>
      </div>
    </main>
  );
}
