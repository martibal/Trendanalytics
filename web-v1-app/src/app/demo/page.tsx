import Link from "next/link";

export const revalidate = 0;

const steps = [
  ["1", "Inspect the actual JSON", "/#ua6-data", "Open Gold, Derived, Meta and Briefs on the landing page. Each modal shows the complete published object rather than a synthetic mock."],
  ["2", "Download the diligence pack", "/api-docs/samples", "Download the public sample ZIP or inspect the individual sample artifacts before creating an account."],
  ["3", "Check live freshness", "/status", "Confirm last successful pipeline publication and the data-through date for each supported chain."],
  ["4", "Run a public API call", "/api/v1/status", "Open the public status JSON directly. No API key is required."],
  ["5", "Run a join", "/analyst-kit", "Use the public regime-calendar CSV or starter notebook and join Urd Atlas to a date + chain dataset you already trust."],
  ["6", "Move to subscriber delivery", "/api-docs/getting-started", "Only after the public workflow makes sense: create a subscriber API key and fetch entitled JSON artifacts."],
] as const;

export default function DemoPage() {
  return (
    <main className="ua-page">
      <header className="hero border-b border-[var(--line)]"><div className="page-shell"><div className="eyebrow mb-4">Public demo</div><h1 className="ua-h1">Verify the product without a sales call.</h1><p className="lead mt-4 max-w-3xl">This is the public product demo: real artifacts, live status, a no-key API call and a runnable join path. Nothing in this flow requires payment.</p></div></header>
      <div className="page-shell py-12 max-w-5xl"><div className="grid gap-0">{steps.map(([n,title,href,body])=><Link key={n} href={href} className="grid gap-3 border-t border-[var(--line)] py-6 md:grid-cols-[70px_1fr_1.3fr]"><div className="font-mono text-[var(--gold)]">{n}</div><h2 className="ua-h3">{title}</h2><div><p className="text-sm leading-7 text-[var(--ink2)]">{body}</p><div className="mt-2 text-link">Open →</div></div></Link>)}</div></div>
    </main>
  );
}
