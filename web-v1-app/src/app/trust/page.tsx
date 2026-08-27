import Link from "next/link";

export const revalidate = 0;

const links = [
  ["/security", "Security", "Encryption, API-key handling, access controls, incident handling and operational safeguards."],
  ["/subprocessors", "Subprocessors", "Named production providers and the data categories they process."],
  ["/security/reporting", "Responsible disclosure", "How to report a suspected security vulnerability safely."],
  ["/privacy", "Privacy", "GDPR-oriented privacy notice, purposes, legal bases, retention and user rights."],
  ["/terms", "Terms", "Subscription, licensing, cancellation, attribution, automation and governing-law terms."],
  ["/methodology/evidence-score", "Evidence score", "Exact public scoring formula, components and interpretation boundary."],
  ["/methodology/sources", "Data sources", "Canonical upstream source map, validation sources and source-day handling."],
  ["/api-docs/versioning", "Versioning", "Breaking-change definition, compatibility policy and notice periods."],
  ["/api-docs/rate-limits", "Rate limits", "Current request limits, headers, 429 behavior and retry semantics."],
  ["/operator", "Operator", "Who operates Urd Atlas and where accountability sits."],
] as const;

export default function TrustPage() {
  return (
    <main className="ua-page">
      <header className="hero border-b border-[var(--line)]">
        <div className="page-shell">
          <div className="eyebrow mb-4">Trust center</div>
          <h1 className="ua-h1">The public operating contract.</h1>
          <p className="lead mt-4 max-w-3xl">Security, privacy, methodology, versioning, service expectations and the legal boundaries of Urd Atlas are documented here so a buyer can verify them before relying on the product.</p>
        </div>
      </header>
      <div className="page-shell py-12">
        <div className="grid gap-0 md:grid-cols-2">
          {links.map(([href, title, body]) => (
            <Link key={href} href={href} className="border-t border-[var(--line)] py-6 pr-8">
              <h2 className="ua-h3">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--ink2)]">{body}</p>
              <div className="mt-3 text-link">Open →</div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
