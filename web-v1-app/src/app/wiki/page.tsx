import Link from "next/link";

const wikiSections = [
  {
    title: "Start here",
    body: "Understand what Urd Atlas publishes, how the daily network-state row is structured, and when to use Meta, Gold, Derived or Briefs.",
    href: "/getting-started",
    cta: "Open getting started",
  },
  {
    title: "API and files",
    body: "Find authentication, endpoint structure, JSON examples and the daily delivery format used by external pipelines.",
    href: "/api-docs",
    cta: "Open API docs",
  },
  {
    title: "Methodology",
    body: "Read how regime labels, confidence, score dimensions, lag policy and deterministic publishing are defined.",
    href: "/methodology",
    cta: "Open methodology",
  },
  {
    title: "Glossary",
    body: "Look up the terms used across the product, including regime, confidence, demand, friction, capacity and label confidence.",
    href: "/glossary",
    cta: "Open glossary",
  },
  {
    title: "Status and cadence",
    body: "Check current publishing status, expected cadence and operational boundaries for the daily data release.",
    href: "/status",
    cta: "Open status",
  },
  {
    title: "Track record",
    body: "Inspect the published history, versioning and reproducibility context behind the dataset.",
    href: "/track-record",
    cta: "Open track record",
  },
] as const;

export const metadata = {
  title: "Wiki | Urd Atlas",
  description: "A compact navigation hub for Urd Atlas documentation, methodology, API usage and dataset reference pages.",
};

export default function WikiPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <section className="mx-auto w-[min(1180px,calc(100%-40px))] pb-24 pt-28">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-action)]">
          Urd Atlas Wiki
        </p>
        <div className="mt-6 max-w-3xl">
          <h1 className="text-5xl font-semibold tracking-[-0.045em] text-[var(--text-primary)] md:text-6xl">
            Product reference, methodology and implementation notes in one place.
          </h1>
          <p className="mt-6 text-lg leading-8 text-[var(--text-secondary)]">
            Use this page as the internal wiki index for Urd Atlas. It points to the documentation pages that explain what is published, how to join it to your own data, and how to interpret the daily network-state labels.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {wikiSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-elevated-1)] p-6 transition hover:-translate-y-1 hover:border-[var(--border-emphasis)] hover:bg-[var(--bg-elevated-2)]"
            >
              <h2 className="text-xl font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                {section.body}
              </p>
              <p className="mt-6 font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-action)]">
                {section.cta} →
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
