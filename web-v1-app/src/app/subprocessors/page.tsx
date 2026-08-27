export const revalidate = 0;

const rows = [
  ["Clerk", "Authentication and session management", "Account identifier, email/profile data used for sign-in, authentication/session metadata", "Authentication provider"],
  ["Stripe", "Checkout, subscription billing and customer portal", "Billing contact details, Stripe customer/subscription identifiers, payment information handled by Stripe", "Payment processor"],
  ["Vercel", "Web application hosting and deployment", "HTTP request/operational metadata and application delivery data required to serve the service", "Hosting/deployment"],
  ["Supabase", "Production PostgreSQL database", "Account, entitlement, subscription reference, API-key metadata and operational application records", "Database"],
  ["Upstash", "Production rate limiting", "Rate-limit keys derived from request/client context and bounded request-control metadata", "Rate limiting"],
  ["GitHub", "Source control and automated build/pipeline workflows", "Repository code, generated publication artifacts and workflow operational metadata; not payment-card data", "Source control/automation"],
  ["AWS Public Blockchain Data", "Upstream public blockchain source data", "Public blockchain data; no Urd Atlas customer account data is required to obtain chain observations", "Upstream data"],
] as const;

export default function SubprocessorsPage() {
  return (
    <main className="ua-page">
      <header className="hero border-b border-[var(--line)]"><div className="page-shell"><div className="eyebrow mb-4">Privacy</div><h1 className="ua-h1">Production subprocessors and service providers</h1><p className="lead mt-4 max-w-3xl">The providers below support the current Urd Atlas production service. The table states the operational purpose and the principal data category involved.</p></div></header>
      <div className="page-shell py-12"><div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead><tr className="border-b border-[var(--line)]"><th className="py-3 pr-5">Provider</th><th className="py-3 pr-5">Purpose</th><th className="py-3 pr-5">Data category</th><th className="py-3">Role</th></tr></thead><tbody>{rows.map(([provider,purpose,data,role])=><tr key={provider} className="border-b border-[var(--line)] align-top"><td className="py-4 pr-5 font-medium">{provider}</td><td className="py-4 pr-5 text-[var(--ink2)]">{purpose}</td><td className="py-4 pr-5 text-[var(--ink2)]">{data}</td><td className="py-4 text-[var(--ink2)]">{role}</td></tr>)}</tbody></table></div><p className="mt-8 max-w-3xl text-sm leading-7 text-[var(--ink2)]">This list is intended to reflect actual production providers, not hypothetical future vendors. Material changes to processors that affect customer personal-data handling should be reflected here and in the Privacy Policy.</p></div>
    </main>
  );
}
