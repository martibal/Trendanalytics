import Link from "next/link";

export const revalidate = 0;

const limits = [
  ["Public read API", "120 requests/minute per client IP", "Status, landing, summary and other public-read routes."],
  ["Authenticated file API", "300 requests/minute per client IP before entitlement/key checks", "Subscriber file delivery. Additional abuse controls may also apply."],
  ["Checkout API", "30 requests/minute per client IP", "Subscription checkout creation."],
  ["Customer portal API", "30 requests/minute per client IP", "Billing portal session creation."],
  ["API-key management", "30 requests/minute per client IP", "Key creation and revocation."],
  ["Stripe webhook", "120 requests/minute", "Inbound billing webhook protection."],
] as const;

export default function RateLimitsPage() {
  return (
    <main className="ua-page">
      <header className="hero border-b border-[var(--line)]"><div className="page-shell"><div className="eyebrow mb-4">API Docs</div><h1 className="ua-h1">Rate limits</h1><p className="lead mt-4 max-w-3xl">Default request ceilings and the response contract when a client exceeds them.</p></div></header>
      <div className="page-shell py-12 max-w-5xl space-y-10">
        <section><h2 className="ua-h3">Current defaults</h2><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-[var(--line)]"><th className="py-3 pr-5">Scope</th><th className="py-3 pr-5">Default</th><th className="py-3">Applies to</th></tr></thead><tbody>{limits.map(([scope,limit,desc])=><tr key={scope} className="border-b border-[var(--line)] align-top"><td className="py-4 pr-5 font-medium">{scope}</td><td className="py-4 pr-5 font-mono text-xs">{limit}</td><td className="py-4 text-[var(--ink2)]">{desc}</td></tr>)}</tbody></table></div></section>
        <section><h2 className="ua-h3">429 response</h2><div className="mt-4 space-y-3 text-sm leading-7 text-[var(--ink2)]"><p>When the active limit is exceeded the API returns HTTP <code>429</code> with code <code>rate_limited</code>. The response includes <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code>, <code>X-RateLimit-Reset</code> and, when blocked, <code>Retry-After</code>.</p><p>Clients should stop retrying until <code>Retry-After</code> has elapsed or the reset timestamp has passed. Exponential backoff is recommended for automated ingestion.</p></div></section>
        <section><h2 className="ua-h3">Production fail-closed behavior</h2><p className="mt-4 text-sm leading-7 text-[var(--ink2)]">If the configured production rate-limit backend is unavailable or missing, protected pre-auth routes fail closed rather than silently running without request controls. The temporary failure response uses the same 429 contract and a 60-second retry interval.</p></section>
        <section><h2 className="ua-h3">Configuration and abuse</h2><p className="mt-4 text-sm leading-7 text-[var(--ink2)]">The defaults above may be overridden by production configuration without changing the HTTP response contract. If plan-specific or customer-specific limits are introduced, the applicable entitlement will be documented before it becomes customer-facing. Attempts to bypass rate limits or distribute traffic specifically to evade request controls violate the <Link href="/terms" className="text-link">Terms of Service</Link>.</p></section>
      </div>
    </main>
  );
}
