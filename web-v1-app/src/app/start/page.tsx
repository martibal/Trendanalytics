import Link from "next/link";

const paths = [
  {
    label: "I want to test the value first",
    title: "Use the free Analyst Kit",
    body:
      "Download the public CSV, open the weekly summary or run the starter notebook. This is the fastest way to check whether Urd Atlas explains anything useful in your own data.",
    href: "/analyst-kit",
    cta: "Open Analyst Kit",
  },
  {
    label: "I need to trust the data first",
    title: "Inspect validation diagnostics",
    body:
      "Check observation count, regime balance, transition structure and confidence coverage before you rely on the labels in a workflow.",
    href: "/validation",
    cta: "Open Validation",
  },
  {
    label: "I need examples for my workflow",
    title: "Map it to a use case",
    body:
      "See how the daily regime column fits report annotation, app-metric segmentation, model evaluation and operational monitoring.",
    href: "/workflows",
    cta: "See Workflows",
  },
  {
    label: "I know I need delivery",
    title: "Compare free and paid access",
    body:
      "Free is for inspection and prototyping. Paid access is for authenticated subscriber files and production integration.",
    href: "/plans",
    cta: "Open Plans",
  },
];

export default function StartPage() {
  return (
    <main className="bg-background text-foreground">
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
        <div className="max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Start here</p>
          <h1 className="mt-6 text-5xl font-medium tracking-[-0.05em] sm:text-6xl">
            Pick the first step that matches your question.
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Urd Atlas is a daily chain-condition table you join to your own data. Start with the question you need answered, not with the full product surface.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {paths.map((path) => (
            <article key={path.title} className="rounded-3xl border border-border bg-card/55 p-6 shadow-sm">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">{path.label}</p>
              <h2 className="mt-4 text-2xl font-medium tracking-tight">{path.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{path.body}</p>
              <Link href={path.href} className="mt-6 inline-flex text-sm font-medium text-primary">
                {path.cta} →
              </Link>
            </article>
          ))}
        </div>

        <section className="mt-12 rounded-[2rem] border border-border bg-card p-6 lg:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Rule of thumb</p>
          <p className="mt-4 max-w-4xl text-2xl font-medium tracking-tight">
            Start free. Join the CSV to one metric you already understand. Upgrade only when the join proves useful enough to automate delivery.
          </p>
        </section>
      </section>
    </main>
  );
}
