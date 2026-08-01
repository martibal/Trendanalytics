import Link from "next/link";

const freeItems = [
  "Explorer, Validation, Workflows, Methodology and Status pages",
  "Public Analyst Kit CSV calendars",
  "Weekly summaries, feature schema and starter notebook",
  "No account required for public inspection and prototype joins",
];

const paidItems = [
  "Authenticated subscriber file delivery",
  "API-key access to entitled chains and delivery windows",
  "Gold, Derived, Meta and Briefs JSON artifacts",
  "Recurring production integration rather than one-off inspection",
];

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </span>
  );
}

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
    >
      {children}
    </Link>
  );
}

function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground transition hover:border-primary/70 hover:text-primary"
    >
      {children}
    </Link>
  );
}

function PlanCard({
  eyebrow,
  title,
  body,
  items,
  cta,
  href,
}: {
  eyebrow: string;
  title: string;
  body: string;
  items: string[];
  cta: string;
  href: string;
}) {
  return (
    <article className="rounded-[2rem] border border-border bg-card/60 p-7 shadow-sm">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-medium tracking-tight text-foreground">{title}</h2>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{body}</p>
      <ul className="mt-6 space-y-3 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="border-t border-border pt-3">
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-7">
        <SecondaryLink href={href}>{cta}</SecondaryLink>
      </div>
    </article>
  );
}

export default function PlansPage() {
  return (
    <main className="bg-background text-foreground">
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
        <div className="max-w-4xl">
          <div className="flex flex-wrap gap-2">
            <Pill>Free to inspect</Pill>
            <Pill>Paid for delivery</Pill>
            <Pill>Descriptive reference data</Pill>
          </div>
          <h1 className="mt-8 text-5xl font-medium tracking-[-0.05em] text-foreground sm:text-6xl lg:text-7xl">
            Test the join before you pay for delivery.
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-muted-foreground">
            Urd Atlas separates the public evaluation path from authenticated subscriber delivery.
            A skeptical user should be able to inspect diagnostics, download the public Analyst Kit,
            and test the date + chain join before paying for recurring artifact access.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryLink href="/analyst-kit">Open free Analyst Kit</PrimaryLink>
            <SecondaryLink href="/validation">Check validation</SecondaryLink>
            <SecondaryLink href="/dashboard">Open dashboard</SecondaryLink>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card/25">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-16 lg:grid-cols-2 lg:px-8">
          <PlanCard
            eyebrow="Free"
            title="Inspect and prototype"
            body="Use the public surface to decide whether regime context explains anything useful in your own metrics."
            items={freeItems}
            cta="Use the free kit"
            href="/analyst-kit"
          />
          <PlanCard
            eyebrow="Paid"
            title="Integrate and deliver"
            body="Upgrade when you need entitlement-aware file delivery, API keys and recurring access to subscriber artifacts."
            items={paidItems}
            cta="Open subscriber dashboard"
            href="/dashboard"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Chain access</p>
            <h2 className="mt-4 text-3xl font-medium tracking-tight sm:text-4xl">
              Access scope is not a claim that every chain has the same signal variation.
            </h2>
            <p className="mt-4 text-muted-foreground leading-7">
              Bitcoin, Ethereum, Base and Arbitrum do not have identical regime balance, transition frequency
              or confidence coverage. The plan boundary is a delivery and entitlement boundary. Validation
              exposes the per-chain differences before you decide whether a chain belongs in your workflow.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-3xl border border-border bg-card/55 p-6">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Single Chain</p>
              <h3 className="mt-3 text-2xl font-medium tracking-tight">One entitled chain</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Use this when one chain is enough for your reporting, model evaluation or app-metric workflow.
              </p>
            </article>
            <article className="rounded-3xl border border-border bg-card/55 p-6">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Research</p>
              <h3 className="mt-3 text-2xl font-medium tracking-tight">All supported chains</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Use this when you need the same delivery contract across Bitcoin, Ethereum, Base and Arbitrum.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
        <div className="rounded-[2rem] border border-border bg-card p-8 lg:p-10">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Buying path</p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">Start with evidence, then choose delivery.</h2>
              <p className="mt-4 max-w-3xl text-muted-foreground leading-7">
                The right order is: inspect Validation, run a small Analyst Kit join, then move to the dashboard
                when the workflow is worth recurring authenticated delivery.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <PrimaryLink href="/validation">See validation</PrimaryLink>
              <SecondaryLink href="/workflows">See workflows</SecondaryLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
