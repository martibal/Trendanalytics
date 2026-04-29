import Link from "next/link";
import type { ReactNode } from "react";

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded border border-[var(--urd-border-soft)] bg-[var(--urd-raised-soft)] px-1 py-0.5 font-mono text-xs text-[var(--urd-text-strong)]">{children}</code>;
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border bg-[var(--urd-code-bg)] p-5 text-xs leading-6 text-[var(--urd-code-text)]">
      <code>{children}</code>
    </pre>
  );
}

function Section({
  eyebrow,
  title,
  subtitle,
  children,
  id,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-3xl border p-6 shadow-sm">
      {eyebrow ? (
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-blue-700">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="mt-1 text-2xl font-semibold text-[var(--urd-text-strong)]">{title}</h2>
      {subtitle ? (
        <div className="mt-2 max-w-4xl text-sm leading-7 text-[var(--urd-text-body)]">{subtitle}</div>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function QA({ question, children }: { question: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-[var(--urd-raised)] p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-cyan-400 font-black text-sm">Q</span>
        <h3 className="text-sm font-bold text-[var(--urd-text-strong)]">{question}</h3>
      </div>
      <div className="mt-3 pl-6 text-sm leading-7 text-[var(--urd-text-body)]">{children}</div>
    </div>
  );
}

function StepCard({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-[var(--urd-raised)] p-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-500/25 bg-cyan-500/10 text-xs font-semibold text-blue-700">
          {number}
        </span>
        <h3 className="text-base font-semibold text-[var(--urd-text-strong)]">{title}</h3>
      </div>
      <div className="mt-4 text-sm leading-7 text-[var(--urd-text-body)]">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--urd-text-body)]">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

function PlanCard({
  title,
  price,
  accent,
  children,
}: {
  title: string;
  price: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-3xl border p-6 ${accent}`}>
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--urd-text-body)]">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-[var(--urd-text-strong)]">{price}</div>
      <div className="mt-5 text-sm leading-7 text-[var(--urd-text-body)]">{children}</div>
    </div>
  );
}

function Callout({ children, color = "cyan" }: { children: ReactNode; color?: "cyan" | "amber" | "emerald" }) {
  const styles = {
    cyan: "border-cyan-500/20 bg-cyan-500/5 text-[var(--urd-text-body)]",
    amber: "border-amber-500/20 bg-amber-500/5 text-[var(--urd-text-body)]",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-[var(--urd-text-body)]",
  };
  return (
    <div className={`rounded-2xl border p-5 text-sm leading-7 ${styles[color]}`}>
      {children}
    </div>
  );
}

export default function GettingStartedJsonApiPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">

      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-[var(--urd-text-muted)]">
        <Link href="/api-docs" className="hover:text-cyan-400 transition-colors">← API Docs</Link>
        <span>/</span>
        <span className="text-[var(--urd-text-muted)]">Getting started</span>
      </div>

      {/* Header */}
      <header className="mb-10">
        <div className="rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_40%)] p-8 shadow-sm">
          <div className="max-w-4xl">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-blue-700">
              Getting started
            </div>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-[var(--urd-text-strong)] sm:text-5xl">
              Getting started with the JSON API
            </h1>
            <p className="mt-4 text-lg leading-8 text-[var(--urd-text-body)]">
              This page is for subscribers who are completely new to JSON and API access.
              Read this before anything else. By the end you will have made your first
              successful request and understand exactly how the daily delivery works.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[var(--urd-border-soft)] bg-[var(--urd-raised)] p-4">
              <div className="text-xs uppercase tracking-[0.12em] text-[var(--urd-text-muted)]">What this covers</div>
              <div className="mt-2 text-sm leading-6 text-[var(--urd-text-body)]">
                What JSON is, what API access means, how daily delivery works, and how to
                get your first file working in under 10 minutes.
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--urd-border-soft)] bg-[var(--urd-raised)] p-4">
              <div className="text-xs uppercase tracking-[0.12em] text-[var(--urd-text-muted)]">Your first goal</div>
              <div className="mt-2 text-sm leading-6 text-[var(--urd-text-body)]">
                Get one authenticated request working for <InlineCode>latest.json</InlineCode>.
                Everything else — history, automation, multi-chain — comes after that.
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--urd-border-soft)] bg-[var(--urd-raised)] p-4">
              <div className="text-xs uppercase tracking-[0.12em] text-[var(--urd-text-muted)]">Related pages</div>
              <div className="mt-2 flex flex-col gap-2 text-sm">
                <Link href="/api-docs" className="text-blue-700 underline">API Docs — technical reference</Link>
                <Link href="/api-docs/schema" className="text-blue-700 underline">JSON Schema — every field explained</Link>
                <Link href="/api-docs/samples" className="text-blue-700 underline">Public sample pack — real example artifacts</Link>
                <Link href="/api-docs/workflows" className="text-blue-700 underline">Common workflows — first useful notebook path</Link>
                <Link href="/dashboard" className="text-blue-700 underline">Dashboard — create API keys</Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-8">

        {/* ── 1. What you are buying ── */}
        <Section
          id="what-you-get"
          eyebrow="First principles"
          title="What you are actually buying"
          subtitle="Urd Atlas is not only a website. The product is the published JSON output."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-[var(--urd-raised)] p-5">
              <h3 className="text-base font-semibold text-[var(--urd-text-strong)]">The website (free)</h3>
              <BulletList items={[
                "Lets you inspect the current regime, confidence, and freshness for each chain.",
                "Shows you what the data means in plain language.",
                "Available to anyone — no account required.",
              ]} />
            </div>
            <div className="rounded-2xl border bg-[var(--urd-raised)] p-5">
              <h3 className="text-base font-semibold text-[var(--urd-text-strong)]">The subscriber product (paid)</h3>
              <BulletList items={[
                "Lets your own tools fetch the same data as structured JSON directly.",
                "Makes the output reusable in spreadsheets, scripts, dashboards, and workflows.",
                "Removes the need to copy values manually from pages.",
              ]} />
            </div>
          </div>
          <Callout color="cyan">
            <span className="font-semibold text-[var(--urd-text-strong)]">Simple mental model:</span>{" "}
            the website explains the output. The JSON API delivers the same output in a form
            your own tools can read and use automatically.
          </Callout>
        </Section>

        {/* ── 2. Does it come automatically? ── */}
        <Section
          id="how-delivery-works"
          eyebrow="Most common question"
          title="Do I get the data automatically every day, or do I have to fetch it manually?"
          subtitle="This is the question almost every new subscriber asks first."
        >
          <Callout color="amber">
            <span className="font-semibold text-[var(--urd-text-strong)]">Short answer:</span>{" "}
            Urd Atlas publishes new JSON files every day automatically. But your tools do not
            receive them automatically — you or your script must fetch them. Think of it like
            a newspaper: the paper is printed and ready every morning, but you still have to
            go pick it up.
          </Callout>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-[var(--urd-raised)] p-5">
              <h3 className="text-base font-semibold text-[var(--urd-text-strong)]">What Urd Atlas does automatically</h3>
              <BulletList items={[
                "Runs the classification pipeline every day.",
                "Publishes new Gold, Meta, and Derived JSON files for each chain.",
                "Updates the public status endpoint so you can check freshness.",
                "Makes the new files available on the API immediately after publication.",
              ]} />
            </div>
            <div className="rounded-2xl border bg-[var(--urd-raised)] p-5">
              <h3 className="text-base font-semibold text-[var(--urd-text-strong)]">What you do</h3>
              <BulletList items={[
                "Send a request to the API with your API key.",
                "Receive the JSON file in the response.",
                "Save or use it however you want.",
                "Optionally: automate this with a script that runs on a schedule.",
              ]} />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--urd-border-soft)] bg-[var(--urd-raised)] p-5">
            <h3 className="text-sm font-bold text-[var(--urd-text-strong)] mb-3">The two ways subscribers work</h3>
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--urd-text-muted)] mb-2">Manual (beginner)</div>
                <div className="text-sm leading-6 text-[var(--urd-text-body)]">
                  You open a terminal, run one curl or Python command, and save the file.
                  You repeat this whenever you want the newest data. No setup required.
                  Good for: checking once a day, doing occasional analysis.
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--urd-text-muted)] mb-2">Automated (next step)</div>
                <div className="text-sm leading-6 text-[var(--urd-text-body)]">
                  You write a small script and schedule it to run daily. The script checks
                  whether a new file is available, and if so, downloads and saves it.
                  Good for: keeping a local archive, feeding a dashboard, or running analysis
                  on fresh data without thinking about it.
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── 3. What JSON and API mean ── */}
        <Section
          id="definitions"
          eyebrow="Plain language definitions"
          title="What JSON and API actually mean"
          subtitle="You do not need to be a developer to understand this."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-[var(--urd-raised)] p-5">
              <h3 className="text-base font-semibold text-[var(--urd-text-strong)]">JSON</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--urd-text-body)]">
                JSON is just structured text. It is a clean way of writing data — labels,
                numbers, dates, and nested fields — so that software can read it easily.
                A JSON file looks like this:
              </p>
              <div className="mt-4">
                <CodeBlock>{`{
  "chain": "bitcoin",
  "as_of": "2026-04-13",
  "status_label": "HEATING",
  "confidence_score": 0.82
}`}</CodeBlock>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--urd-text-muted)]">
                You can open a JSON file in any text editor. You can also load it into
                Python, Excel, or any other tool that reads structured data.
              </p>
            </div>
            <div className="rounded-2xl border bg-[var(--urd-raised)] p-5">
              <h3 className="text-base font-semibold text-[var(--urd-text-strong)]">API access</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--urd-text-body)]">
                API access means your computer can request the JSON file directly from
                Urd Atlas instead of you opening a page and copying values by hand.
              </p>
              <div className="mt-4 rounded-xl border border-[var(--urd-border-soft)] bg-[var(--urd-raised)] p-4 text-sm leading-7 text-[var(--urd-text-body)]">
                <div><span className="font-semibold text-[var(--urd-text-strong)]">Without API:</span> open page → read screen → copy values manually → repeat daily</div>
                <div className="mt-2"><span className="font-semibold text-[var(--urd-text-strong)]">With API:</span> your script sends request → receives JSON → saves it → done</div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--urd-text-muted)]">
                An API key is just a password that identifies you. You include it in your
                request so the server knows you are a subscriber.
              </p>
            </div>
          </div>
        </Section>

        {/* ── 4. What happens after you subscribe ── */}
        <Section
          id="after-subscribe"
          eyebrow="In practice"
          title="What actually happens after you create an account and subscribe"
          subtitle="Step by step, from zero to your first JSON file."
        >
          <div className="grid gap-4 xl:grid-cols-3 lg:grid-cols-2">
            <StepCard number="1" title="Create your account">
              Click Sign Up, enter your email and a password. Urd Atlas uses a secure
              identity provider — your password is never stored in plain text.
            </StepCard>

            <StepCard number="2" title="Choose your plan and subscribe">
              Go to the plans section. Basic gives you one chain of your choice.
              Pro gives you all four. Choose your plan and complete payment via Stripe.
              Your card is charged immediately and the subscription is active right away.
            </StepCard>

            <StepCard number="3" title="Go to your Dashboard">
              After payment, you are redirected to your{" "}
              <Link href="/dashboard" className="text-blue-700 underline">Dashboard</Link>.
              This is your subscriber area. It shows your current plan, entitled chain,
              and lets you create API keys.
            </StepCard>

            <StepCard number="4" title="Create an API key">
              In Dashboard, click &quot;Create API key&quot;. Give it a label (for example:
              &quot;my laptop&quot;). Copy the key immediately — it is only shown once in full.
              Store it somewhere safe, like a password manager or a local environment file.
            </StepCard>

            <StepCard number="5" title="Make your first request">
              Open a terminal. Run this command with your actual API key:
              <div className="mt-3">
                <CodeBlock>{`curl -H "X-API-Key: YOUR_KEY_HERE" \\
  https://urdatlas.com/api/v1/files/meta/bitcoin/latest.json`}</CodeBlock>
              </div>
              You will see a JSON response printed in the terminal.
            </StepCard>

            <StepCard number="6" title="Save the file locally">
              Add a redirect to save the output to a file:
              <div className="mt-3">
                <CodeBlock>{`curl -H "X-API-Key: YOUR_KEY_HERE" \\
  https://urdatlas.com/api/v1/files/meta/bitcoin/latest.json \\
  -o bitcoin_meta_latest.json`}</CodeBlock>
              </div>
              You now have a local JSON file you can open and use.
            </StepCard>
          </div>

          <Callout color="emerald">
            <span className="font-semibold text-[var(--urd-text-strong)]">That is it.</span>{" "}
            Steps 1–6 take less than 10 minutes. Once you have one file working manually,
            you can add automation, history bundles, and additional chains at your own pace.
          </Callout>
        </Section>

        {/* ── 5. Plans ── */}
        <Section
          id="plans"
          eyebrow="Plans"
          title="What Basic and Pro give you"
          subtitle="The biggest difference is not the JSON format — it is how many chains and how much history you can access."
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <PlanCard title="Basic" price="$29/month" accent="border-cyan-500/20 bg-cyan-500/5">
              <BulletList items={[
                <><span className="font-semibold text-[var(--urd-text-strong)]">One chain</span> of your choice: bitcoin, ethereum, arbitrum, or base</>,
                <>All three file types: <InlineCode>gold</InlineCode>, <InlineCode>meta</InlineCode>, and <InlineCode>derived</InlineCode></>,
                <>History up to <span className="font-semibold text-[var(--urd-text-strong)]">90 days</span></>,
                <>Up to <span className="font-semibold text-[var(--urd-text-strong)]">2 API keys</span></>,
              ]} />
              <div className="mt-5 rounded-2xl border border-[var(--urd-border-soft)] bg-[var(--urd-raised)] p-4">
                <div className="text-xs uppercase tracking-[0.12em] text-[var(--urd-text-muted)] mb-2">Example — if your chain is bitcoin</div>
                <CodeBlock>{`/api/v1/files/gold/bitcoin/latest.json
/api/v1/files/meta/bitcoin/latest.json
/api/v1/files/derived/bitcoin/latest.json`}</CodeBlock>
              </div>
            </PlanCard>

            <PlanCard title="Pro" price="$79/month" accent="border-purple-500/20 bg-purple-500/5">
              <BulletList items={[
                <><span className="font-semibold text-[var(--urd-text-strong)]">All four chains:</span> bitcoin, ethereum, arbitrum, and base</>,
                <>All three file types: <InlineCode>gold</InlineCode>, <InlineCode>meta</InlineCode>, and <InlineCode>derived</InlineCode></>,
                <>History up to <span className="font-semibold text-[var(--urd-text-strong)]">365 days</span></>,
                <>Up to <span className="font-semibold text-[var(--urd-text-strong)]">2 API keys</span></>,
              ]} />
              <div className="mt-5 rounded-2xl border border-[var(--urd-border-soft)] bg-[var(--urd-raised)] p-4">
                <div className="text-xs uppercase tracking-[0.12em] text-[var(--urd-text-muted)] mb-2">Example — all four chains, Meta only</div>
                <CodeBlock>{`/api/v1/files/meta/bitcoin/latest.json
/api/v1/files/meta/ethereum/latest.json
/api/v1/files/meta/arbitrum/latest.json
/api/v1/files/meta/base/latest.json`}</CodeBlock>
              </div>
            </PlanCard>
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--urd-border-soft)] bg-[var(--urd-raised)] p-5">
            <h3 className="text-base font-semibold text-[var(--urd-text-strong)]">History Add-on</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--urd-text-body)]">
              Standard subscriber scope stays explicit: Basic includes up to 90 days and
              Pro includes up to 365 days. Where a separate History Add-on is offered, it
              unlocks the full currently available archive beyond those default API windows.
              The public track record can therefore be longer than the standard subscriber
              API range without changing what standard Pro includes.
            </p>
          </div>
        </Section>

        {/* ── 6. The three file types ── */}
        <Section
          id="file-types"
          eyebrow="File types"
          title="What the three file types actually contain"
          subtitle="Both Basic and Pro get all three. The difference is scope, not format."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border bg-[var(--urd-raised)] p-5">
              <div className="text-lg font-semibold text-amber-800">Gold</div>
              <p className="mt-2 text-sm leading-6 text-[var(--urd-text-muted)]">
                The raw source layer. Transaction counts, fees, block times, gas utilization,
                active addresses — exactly as published. In native units, unmodified.
              </p>
              <div className="mt-3 text-xs text-[var(--urd-text-muted)]">
                Use Gold when you want raw facts and plan to do your own calculations.
              </div>
            </div>
            <div className="rounded-2xl border bg-[var(--urd-raised)] p-5">
              <div className="text-lg font-semibold text-violet-300">Meta</div>
              <p className="mt-2 text-sm leading-6 text-[var(--urd-text-muted)]">
                The interpretation layer. Regime label (STABLE / HEATING / CONGESTED / CHEAP),
                confidence score, scorecard across three axes, and ranked driver signals.
              </p>
              <div className="mt-3 text-xs text-[var(--urd-text-muted)]">
                Use Meta when you want the shortest route to &quot;what is happening now?&quot;
              </div>
            </div>
            <div className="rounded-2xl border bg-[var(--urd-raised)] p-5">
              <div className="text-lg font-semibold text-sky-300">Derived</div>
              <p className="mt-2 text-sm leading-6 text-[var(--urd-text-muted)]">
                Smoothed trend series built from Gold. 7-day and 30-day rolling averages
                for every Gold metric — useful for separating structural shifts from noise.
              </p>
              <div className="mt-3 text-xs text-[var(--urd-text-muted)]">
                Use Derived when you want cleaner trend data for charts or analysis.
              </div>
            </div>
          </div>
          <Callout>
            <span className="font-semibold text-[var(--urd-text-strong)]">Start with Meta.</span>{" "}
            It contains the regime label and confidence score — the two fields most
            new subscribers care about first. Add Gold and Derived once you know what
            you want to do with them.
          </Callout>
        </Section>

        {/* ── 7. Common questions ── */}
        <Section
          id="questions"
          eyebrow="Common questions"
          title="Questions new subscribers usually ask"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <QA question="Do I need to be a developer to use this?">
              No. The simplest workflow is: create account → subscribe → create API key →
              run one curl command → save the file. You can do all of this without writing
              any code. Automation is optional and comes later.
            </QA>

            <QA question="What time does the new data arrive each day?">
              The pipeline runs daily but does not publish at a fixed clock time. You can
              check the public status endpoint at{" "}
              <Link href="/status" className="text-blue-700 underline">/status</Link>{" "}
              to see the latest published date for each chain. When the date changes, new
              files are available.
            </QA>

            <QA question="Do I get notified when new data is available?">
              Not automatically — there is no push notification or email alert.
              The recommended approach is to poll the status endpoint periodically
              (for example every 5 minutes) and check whether the as_of date has changed.
              If it has, fetch the new file.
            </QA>

            <QA question="What happens if I miss a day?">
              Nothing bad. The files for each day stay available on the API. If you
              want yesterday&apos;s file, you can fetch the history bundles within your plan scope.
              Missing a daily fetch does not cause any data loss on our side.
            </QA>

            <QA question="Can I use the same API key on multiple machines?">
              Yes. An API key is just a string. You can use it on your laptop, a server,
              or a scheduled job. You can also create multiple keys from Dashboard and
              use different keys for different purposes.
            </QA>

            <QA question="What happens to my data if I cancel?">
              Your subscription stops at the end of the billing period. After that, your
              API key stops working and you can no longer fetch new files. The data you
              have already downloaded and saved locally is yours to keep.
            </QA>

            <QA question="Is the JSON format the same for Basic and Pro?">
              Yes. Both plans receive identical file formats. The difference is scope:
              Basic gets one chain and 90-day history. Pro gets all four chains and
              365-day history. The public track record may be longer because it reflects
              the full published archive, but standard Pro still means 365 days unless a
              separate archive unlock is explicitly added. The fields inside the files are the same.
            </QA>

            <QA question="What does the confidence score mean?">
              The confidence score (0–1) tells you how much to trust the regime label.
              Above 0.40, the model publishes a named label. Below 0.40, it publishes
              UNKNOWN/DEGRADED instead of a potentially misleading label. A score of
              0.80+ means the model has strong, consistent evidence.
            </QA>
          </div>
        </Section>

        {/* ── 8. Automation ── */}
        <Section
          id="automation"
          eyebrow="Automation"
          title="How to automatically fetch the newest file every day"
          subtitle="Do not automate until the manual version works. This is the correct order."
        >
          <Callout>
            <span className="font-semibold text-[var(--urd-text-strong)]">Recommended beginner pattern:</span>{" "}
            check the public status endpoint for your chain → compare the as_of date
            with what you last downloaded → if new, fetch the authenticated file → save it.
            This avoids unnecessary requests and only downloads when something is actually new.
          </Callout>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-base font-semibold text-[var(--urd-text-strong)] mb-3">Install dependency once</h3>
              <CodeBlock>{`pip install requests`}</CodeBlock>
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--urd-text-strong)] mb-3">Set your API key as an environment variable</h3>
              <CodeBlock>{`# Windows
set URD_ATLAS_API_KEY=your_key_here

# macOS / Linux
export URD_ATLAS_API_KEY=your_key_here`}</CodeBlock>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-base font-semibold text-[var(--urd-text-strong)] mb-3">Complete automation script</h3>
            <CodeBlock>{`import json
import os
from pathlib import Path
import requests

BASE_URL = "https://urdatlas.com"
API_KEY = os.environ["URD_ATLAS_API_KEY"]  # set this as an environment variable

CHAIN = "bitcoin"   # change to your entitled chain
GENRE = "meta"      # gold, meta, or derived

STATE_DIR = Path("automation_state")
DATA_DIR = Path("downloaded_files") / GENRE / CHAIN
STATE_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

LAST_SEEN_FILE = STATE_DIR / f"{CHAIN}_{GENRE}_last_seen.json"

def load_last_seen():
    if not LAST_SEEN_FILE.exists():
        return None
    return json.loads(LAST_SEEN_FILE.read_text(encoding="utf-8"))

def save_last_seen(payload):
    LAST_SEEN_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")

def fetch_status():
    response = requests.get(f"{BASE_URL}/api/v1/status", timeout=30)
    response.raise_for_status()
    return response.json()

def fetch_latest_file():
    url = f"{BASE_URL}/api/v1/files/{GENRE}/{CHAIN}/latest.json"
    response = requests.get(url, headers={"X-API-Key": API_KEY}, timeout=30)
    response.raise_for_status()
    return response.json()

def main():
    status = fetch_status()
    target = next((r for r in status.get("chains", []) if r.get("chain") == CHAIN), None)
    if target is None:
        raise RuntimeError(f"Chain '{CHAIN}' not found in status")

    current_as_of = target.get("as_of")
    if not current_as_of:
        raise RuntimeError("Status did not contain as_of date")

    last_seen = load_last_seen()
    if last_seen and last_seen.get("as_of") == current_as_of:
        print(f"No new data yet. Latest is still {current_as_of}.")
        return

    payload = fetch_latest_file()
    output_path = DATA_DIR / f"{current_as_of}_latest.json"
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    save_last_seen({"chain": CHAIN, "genre": GENRE, "as_of": current_as_of, "file": str(output_path)})
    print(f"Saved: {output_path}")

if __name__ == "__main__":
    main()`}</CodeBlock>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border bg-[var(--urd-raised)] p-5">
              <h3 className="text-base font-semibold text-[var(--urd-text-strong)]">Schedule on Windows (Task Scheduler)</h3>
              <BulletList items={[
                "Save the script as fetch_urdatlas.py",
                "Open Task Scheduler → Create Basic Task",
                "Set trigger: Daily, repeat every 5 minutes for a few hours around your expected publication window",
                "Action: Start a program — Python.exe with the script path as argument",
              ]} />
              <div className="mt-4">
                <CodeBlock>{`Program: C:\\Python311\\python.exe
Argument: C:\\scripts\\fetch_urdatlas.py`}</CodeBlock>
              </div>
            </div>
            <div className="rounded-2xl border bg-[var(--urd-raised)] p-5">
              <h3 className="text-base font-semibold text-[var(--urd-text-strong)]">Schedule on macOS / Linux (cron)</h3>
              <BulletList items={[
                "Open terminal and type: crontab -e",
                "Add a line that runs the script every 5 minutes",
                "Save and exit — cron runs it automatically",
              ]} />
              <div className="mt-4">
                <CodeBlock>{`*/5 * * * * /usr/bin/python3 /home/you/fetch_urdatlas.py >> /home/you/urdatlas.log 2>&1`}</CodeBlock>
              </div>
            </div>
          </div>
        </Section>

        {/* ── 9. What to do next ── */}
        <Section
          id="next-steps"
          eyebrow="What to do next"
          title="After this page"
          subtitle="In the correct order — do not skip ahead."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/dashboard", title: "1. Dashboard", desc: "Create your API key. Start here." },
              { href: "/api-docs", title: "2. API Docs", desc: "Technical route reference once you have a key." },
              { href: "/api-docs/schema", title: "3. JSON Schema", desc: "Every field in every file, explained." },
              { href: "/methodology", title: "4. Methodology", desc: "How the regime classification works." },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border bg-[var(--urd-raised)] p-4 transition hover:border-cyan-500/30 hover:bg-white/[0.04]"
              >
                <div className="text-base font-semibold text-[var(--urd-text-strong)]">{item.title}</div>
                <div className="mt-2 text-sm leading-6 text-[var(--urd-text-body)]">{item.desc}</div>
              </Link>
            ))}
          </div>
        </Section>

      </div>
    </main>
  );
}
