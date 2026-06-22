import Link from "next/link";
import type { ReactNode } from "react";

// ─── Primitives ───────────────────────────────────────────────────────────────

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>;
}

function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <div>
      {label && <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>}
      <pre className="overflow-x-auto rounded-2xl border bg-black/30 p-5 text-xs leading-6 text-slate-200">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Section({ eyebrow, title, subtitle, children, id }: {
  eyebrow?: string; title: string; subtitle?: ReactNode; children: ReactNode; id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-3xl border p-6 shadow-sm">
      {eyebrow && <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">{eyebrow}</div>}
      <h2 className="mt-1 text-2xl font-semibold text-white">{title}</h2>
      {subtitle && <div className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">{subtitle}</div>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function QA({ question, children }: { question: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-cyan-400 font-black text-sm">Q</span>
        <h3 className="text-sm font-bold text-white">{question}</h3>
      </div>
      <div className="mt-3 pl-6 text-sm leading-7 text-muted-foreground">{children}</div>
    </div>
  );
}

function StepCard({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white/[0.02] p-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-500/25 bg-cyan-500/10 text-xs font-semibold text-cyan-200">
          {number}
        </span>
        <h3 className="text-base font-semibold text-white">{title}</h3>
      </div>
      <div className="mt-4 text-sm leading-7 text-muted-foreground">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

function Callout({ children, color = "cyan" }: { children: ReactNode; color?: "cyan" | "amber" | "emerald" }) {
  const s = { cyan: "border-cyan-500/20 bg-cyan-500/5", amber: "border-amber-500/20 bg-amber-500/5", emerald: "border-emerald-500/20 bg-emerald-500/5" };
  return <div className={`rounded-2xl border p-5 text-sm leading-7 text-slate-200 ${s[color]}`}>{children}</div>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GettingStartedJsonApiPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">

      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/api-docs" className="hover:text-cyan-400 transition-colors">← API Docs</Link>
        <span>/</span>
        <span className="text-slate-400">Getting started</span>
      </div>

      {/* Header */}
      <header className="mb-10">
        <div className="rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_40%)] p-8 shadow-sm">
          <div className="max-w-4xl">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">Getting started</div>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Getting started with the Urd Atlas JSON API
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              A complete beginner guide. No prior experience with APIs or JSON required.
              Read this from top to bottom before opening the technical reference.
            </p>
          </div>

          {/* Table of contents */}
          <div className="mt-8 rounded-2xl border border-white/10 bg-black/10 p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Contents</div>
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              {[
                ["#what-is-json", "1. What JSON is"],
                ["#what-is-api", "2. What an API is"],
                ["#what-you-get", "3. What you actually receive"],
                ["#files-explained", "4. The files — explained in full"],
                ["#daily-or-manual", "5. Automatic vs manual delivery"],
                ["#after-subscribe", "6. What happens after you subscribe"],
                ["#first-request", "7. Your first API request"],
                ["#tools", "8. What software you need locally"],
                ["#analysis", "9. How to analyse the data"],
                ["#automation", "10. How to automate daily fetching"],
                ["#questions", "11. Common questions answered"],
                ["#next-steps", "12. What to do next"],
              ].map(([href, label]) => (
                <a key={href} href={href} className="text-cyan-200 hover:underline py-0.5">{label}</a>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-8">

        {/* ── 1. What is JSON ── */}
        <Section id="what-is-json" eyebrow="Chapter 1" title="What JSON is">
          <p className="text-sm leading-7 text-muted-foreground">
            JSON stands for JavaScript Object Notation. Despite the name, it has nothing to do
            with JavaScript in practice — it is simply a text format for storing and transmitting
            structured data. Any programming language can read it. You can also open it in a
            plain text editor.
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            A JSON file looks like this:
          </p>
          <div className="mt-4">
            <CodeBlock label="Example: a simple JSON file">{`{
  "chain": "bitcoin",
  "date": "2026-04-13",
  "status_label": "HEATING",
  "confidence_score": 0.82,
  "drivers": [
    { "metric": "tx_count_daily", "z_robust": 1.74 },
    { "metric": "median_tx_fee_native", "z_robust": -2.02 }
  ]
}`}</CodeBlock>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {[
              { title: "Curly braces { }", desc: "Wrap a group of named fields. Each field has a name (in quotes) and a value." },
              { title: "Square brackets [ ]", desc: "Wrap a list of items. Items can be numbers, text, or other objects." },
              { title: "Colon :", desc: "Separates a field name from its value. Comma separates multiple fields." },
            ].map(item => (
              <div key={item.title} className="rounded-2xl border bg-white/[0.02] p-4">
                <div className="text-sm font-bold text-white font-mono">{item.title}</div>
                <p className="mt-2 text-xs leading-5 text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
          <Callout color="cyan">
            <span className="font-semibold text-white">Key point:</span>{" "}
            JSON is just text. It is not a program, not a database, and not a spreadsheet.
            It is a file — like a .txt file — that happens to be structured in a way that
            software can read easily.
          </Callout>
        </Section>

        {/* ── 2. What is an API ── */}
        <Section id="what-is-api" eyebrow="Chapter 2" title="What an API is">
          <p className="text-sm leading-7 text-muted-foreground">
            API stands for Application Programming Interface. In plain language: it is a way
            for your computer to ask a server for data and get a structured response back.
            Instead of opening a webpage and reading it with your eyes, your script sends a
            request and receives machine-readable data directly.
          </p>
          <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-5">
            <h3 className="text-sm font-bold text-white mb-4">The difference — with and without an API</h3>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-white/6 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Without API</div>
                <div className="text-sm leading-6 text-slate-300">
                  Open browser → navigate to page → read regime label → write it down →
                  repeat tomorrow → repeat for each chain → build your own table manually
                </div>
                <div className="mt-2 text-xs text-slate-500">Time per day: 10–30 minutes. Error-prone. Cannot be automated.</div>
              </div>
              <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-cyan-500 mb-2">With API</div>
                <div className="text-sm leading-6 text-slate-300">
                  Script runs → sends one request per chain → receives full JSON with all
                  fields → saves files locally → done
                </div>
                <div className="mt-2 text-xs text-slate-500">Time per day: seconds. Fully automated. No manual steps.</div>
              </div>
            </div>
          </div>
          <div className="mt-5">
            <h3 className="text-sm font-bold text-white mb-3">What an API key is</h3>
            <p className="text-sm leading-7 text-muted-foreground">
              An API key is a long string of characters that identifies you as a subscriber.
              You include it in every request so the server knows who you are and what you
              are entitled to access. Think of it like a key card — you swipe it every time
              you enter, and the system knows which rooms you are allowed into.
            </p>
            <div className="mt-3">
              <CodeBlock label="Example: what an API key looks like">{`ta_live_<replace-with-your-access-value>`}</CodeBlock>
            </div>
            <Callout color="amber">
              <span className="font-semibold text-white">Important:</span>{" "}
              Treat your API key like a password. Do not paste it into public files, share
              it in screenshots, or commit it to a public code repository. If compromised,
              revoke it from Dashboard and create a new one.
            </Callout>
          </div>
        </Section>

        {/* ── 3. What you actually receive ── */}
        <Section id="what-you-get" eyebrow="Chapter 3" title="What you actually receive as a subscriber">
          <p className="text-sm leading-7 text-muted-foreground">
            When you subscribe to Urd Atlas, you get API access to structured JSON files.
            There are three types of files (called genres), and they are published for each
            chain every day. Here is the complete picture:
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 pr-6 text-xs font-bold uppercase tracking-wider text-slate-400">Genre</th>
                  <th className="text-left py-3 pr-6 text-xs font-bold uppercase tracking-wider text-slate-400">What it contains</th>
                  <th className="text-left py-3 text-xs font-bold uppercase tracking-wider text-slate-400">Best for</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-6 font-bold text-amber-300">Gold</td>
                  <td className="py-3 pr-6">Raw daily chain metrics in native units. Transaction counts, fees, block times, active addresses.</td>
                  <td className="py-3 text-slate-400">Your own calculations, raw data analysis</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 pr-6 font-bold text-violet-300">Meta</td>
                  <td className="py-3 pr-6">The regime label (STABLE/HEATING/CONGESTED/CHEAP), confidence score, scorecard, and ranked driver signals.</td>
                  <td className="py-3 text-slate-400">Dashboards, alerts, research conditioning</td>
                </tr>
                <tr>
                  <td className="py-3 pr-6 font-bold text-sky-300">Derived</td>
                  <td className="py-3 pr-6">7-day and 30-day rolling averages for every Gold metric.</td>
                  <td className="py-3 text-slate-400">Trend charts, smoothed analysis</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-bold text-white mb-3">Files available per plan</h3>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-cyan-300 mb-3">Basic — $29/mo — 1 chain</div>
                <p className="text-xs text-slate-400 mb-3">If your entitled chain is bitcoin, you can fetch:</p>
                <CodeBlock>{`/api/v1/files/gold/bitcoin/latest.json
/api/v1/files/meta/bitcoin/latest.json
/api/v1/files/derived/bitcoin/latest.json

/api/v1/files/gold/bitcoin/7d/latest.json
/api/v1/files/meta/bitcoin/7d/latest.json
/api/v1/files/derived/bitcoin/7d/latest.json

/api/v1/files/gold/bitcoin/30d/latest.json
/api/v1/files/meta/bitcoin/30d/latest.json
/api/v1/files/derived/bitcoin/30d/latest.json

/api/v1/files/gold/bitcoin/90d/latest.json
/api/v1/files/meta/bitcoin/90d/latest.json
/api/v1/files/derived/bitcoin/90d/latest.json`}</CodeBlock>
                <p className="mt-3 text-xs text-slate-500">That is 12 files total per day — 3 genres × 4 windows.</p>
              </div>
              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-3">Pro — $79/mo — all 4 chains</div>
                <p className="text-xs text-slate-400 mb-3">Same structure, but for all four chains and 6 windows (adds 180d and 365d):</p>
                <CodeBlock>{`/api/v1/files/meta/bitcoin/latest.json
/api/v1/files/meta/ethereum/latest.json
/api/v1/files/meta/arbitrum/latest.json
/api/v1/files/meta/base/latest.json

/api/v1/files/meta/bitcoin/365d/latest.json
/api/v1/files/meta/ethereum/365d/latest.json
...and so on for gold and derived`}</CodeBlock>
                <p className="mt-3 text-xs text-slate-500">That is 72 files total — 3 genres × 4 chains × 6 windows.</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── 4. Files explained ── */}
        <Section id="files-explained" eyebrow="Chapter 4" title="The window files — explained in full">
          <p className="text-sm leading-7 text-muted-foreground">
            This is where most new subscribers get confused. The URL structure looks like this:
          </p>
          <div className="mt-4">
            <CodeBlock label="URL structure">{`/api/v1/files/{genre}/{chain}/{window}/latest.json
/api/v1/files/{genre}/{chain}/latest.json`}</CodeBlock>
          </div>

          <div className="mt-6 grid gap-4">
            <QA question="What does 'latest.json' (without a window) mean?">
              This is always the most recently published file for today.
              It contains data for the most recent date the pipeline has published.
              This file is updated every day when the pipeline runs.
              <span className="block mt-2 font-semibold text-white">Fetch this every day to always have the newest data.</span>
            </QA>

            <QA question="What does '90d/latest.json' mean?">
              This is a bundle file containing the last 90 days of data in a single JSON file.
              It is not 90 separate files — it is one file with an array of 90 daily records.
              <div className="mt-3 rounded-xl border border-white/6 bg-black/20 p-4">
                <CodeBlock label="What the 90d file looks like inside">{`{
  "chain": "bitcoin",
  "window": "90d",
  "days": [
    { "date": "2026-01-14", "status_label": "STABLE", "confidence_score": 0.79, ... },
    { "date": "2026-01-15", "status_label": "STABLE", "confidence_score": 0.81, ... },
    { "date": "2026-01-16", "status_label": "HEATING", "confidence_score": 0.76, ... },
    ...90 records total
  ]
}`}</CodeBlock>
              </div>
              <span className="block mt-2 font-semibold text-white">
                This file is also updated every day — it always contains the most recent 90 days,
                rolling forward one day at a time.
              </span>
            </QA>

            <QA question="Is the 90d file the same every day, or does it change?">
              It changes every day. Every morning after the pipeline runs, the 90d file is
              updated to include the newest day and drop the oldest day. It is always a
              rolling 90-day window ending on the most recent published date.
              Think of it like a conveyor belt — one new day gets added at the front,
              one old day falls off the back.
            </QA>

            <QA question="Which file should I fetch every day?">
              <span className="font-semibold text-white">For daily monitoring:</span> fetch <InlineCode>latest.json</InlineCode> (without a window).
              One request per chain, one file, always fresh.
              <br /><br />
              <span className="font-semibold text-white">For building a historical dataset:</span> fetch <InlineCode>90d/latest.json</InlineCode>
              once when you sign up to get your history, then fetch <InlineCode>latest.json</InlineCode>
              daily to add one new day at a time.
              <br /><br />
              <span className="font-semibold text-white">For backtesting or analysis over a long period:</span>{" "}
              fetch the largest window your plan allows (<InlineCode>90d</InlineCode> for Basic,
              <InlineCode>365d</InlineCode> for Pro) to get everything in one request.
            </QA>

            <QA question="What are the available windows?">
              <div className="mt-1 overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 pr-4 text-slate-400">Window token</th>
                      <th className="text-left py-2 pr-4 text-slate-400">What it contains</th>
                      <th className="text-left py-2 text-slate-400">Available on</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {[
                      ["latest", "Most recent single day only", "Basic + Pro"],
                      ["7d", "Last 7 days as an array", "Basic + Pro"],
                      ["30d", "Last 30 days as an array", "Basic + Pro"],
                      ["90d", "Last 90 days as an array", "Basic + Pro"],
                      ["180d", "Last 180 days as an array", "Pro only"],
                      ["365d", "Last 365 days as an array", "Pro only"],
                    ].map(([token, desc, plan]) => (
                      <tr key={token} className="border-b border-white/5">
                        <td className="py-2 pr-4 font-mono text-cyan-300">{token}</td>
                        <td className="py-2 pr-4">{desc}</td>
                        <td className="py-2 text-slate-500">{plan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </QA>
          </div>
        </Section>

        {/* ── 5. Automatic vs manual ── */}
        <Section id="daily-or-manual" eyebrow="Chapter 5" title="Do I get the data automatically, or do I have to fetch it manually?">
          <Callout color="amber">
            <span className="font-semibold text-white">Short answer:</span>{" "}
            Urd Atlas publishes new files every day automatically. But they are not
            pushed to you — you must fetch them. Think of it like a library that gets
            new books every morning: the books arrive automatically, but you still have
            to go pick them up.
          </Callout>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-sm font-bold text-white mb-3">What Urd Atlas does automatically</h3>
              <BulletList items={[
                "Runs the classification pipeline every day",
                "Publishes new Gold, Meta, and Derived files for each chain",
                "Updates the window bundle files (7d, 30d, 90d, etc.) to include the new day",
                "Makes all files available on the API immediately after publication",
                "Updates the public /status endpoint so you can check freshness",
              ]} />
            </div>
            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-sm font-bold text-white mb-3">What you do</h3>
              <BulletList items={[
                "Send a GET request to the API with your API key",
                "Receive the JSON file as the response body",
                "Save it locally or pass it directly to your script",
                "Optionally: automate this with a scheduled script",
              ]} />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-5">
            <h3 className="text-sm font-bold text-white mb-4">Two ways subscribers work</h3>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Manual (start here)</div>
                <p className="text-sm leading-6 text-slate-300">
                  You open a terminal and run one command. You get the file. You repeat when
                  you want new data. No setup, no scheduler, no code. Good for: occasional
                  checks, one-off analysis, getting started.
                </p>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Automated (next step)</div>
                <p className="text-sm leading-6 text-slate-300">
                  You write a small script that checks for new data and downloads it if found.
                  You schedule it to run every day. Good for: daily archives, feeding a
                  dashboard, keeping data fresh without thinking about it.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── 6. After subscribe ── */}
        <Section id="after-subscribe" eyebrow="Chapter 6" title="What happens step by step after you subscribe">
          <div className="grid gap-4 xl:grid-cols-3 lg:grid-cols-2">
            <StepCard number="1" title="Complete payment on Stripe">
              Click &quot;Start Basic&quot; or &quot;Start Pro&quot; on the plans page. For Basic, choose your
              chain first. You are redirected to Stripe&apos;s checkout page. Enter your card
              details. Your subscription is active immediately after payment.
            </StepCard>
            <StepCard number="2" title="Arrive at your Dashboard">
              After payment, you land on the{" "}
              <Link href="/dashboard" className="text-cyan-200 underline">Dashboard</Link>.
              It shows your plan, entitled chain (Basic) or all chains (Pro), allowed
              windows, and history depth. This is your subscriber control panel.
            </StepCard>
            <StepCard number="3" title="Create an API key">
              In Dashboard, give your key a label (e.g. &quot;my laptop&quot;) and click Create.
              The full key appears once — copy it immediately and store it safely.
              A password manager or a local .env file works well.
            </StepCard>
            <StepCard number="4" title="Make your first request">
              Open a terminal. Run:
              <div className="mt-3">
                <CodeBlock>{`curl -H "X-API-Key: YOUR_KEY" \\
  https://urdatlas.com/api/v1/files/meta/bitcoin/latest.json`}</CodeBlock>
              </div>
              You will see a full JSON response printed.
            </StepCard>
            <StepCard number="5" title="Save the file">
              Add <InlineCode>-o filename.json</InlineCode> to save to disk:
              <div className="mt-3">
                <CodeBlock>{`curl -H "X-API-Key: YOUR_KEY" \\
  https://urdatlas.com/api/v1/files/meta/bitcoin/latest.json \\
  -o bitcoin_meta_latest.json`}</CodeBlock>
              </div>
            </StepCard>
            <StepCard number="6" title="You are done — for now">
              You have a local JSON file. Open it in a text editor to see the data.
              Load it into Python, Excel, or whatever tool you use. Come back tomorrow
              and fetch again — or automate it (see Chapter 10).
            </StepCard>
          </div>
          <Callout color="emerald">
            <span className="font-semibold text-white">Total time for steps 1–6:</span>{" "}
            Under 10 minutes. Everything after this is optional enhancement.
          </Callout>
        </Section>

        {/* ── 7. First request ── */}
        <Section id="first-request" eyebrow="Chapter 7" title="How to make your first API request">
          <p className="text-sm leading-7 text-muted-foreground">
            There are several ways to make an HTTP request. Pick the one that matches
            what you already have installed.
          </p>

          <div className="mt-5 grid gap-5">
            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-base font-semibold text-white mb-1">Option A: curl (simplest — works on Windows, Mac, Linux)</h3>
              <p className="text-xs text-slate-400 mb-3">curl is usually pre-installed. Open any terminal and run:</p>
              <CodeBlock>{`curl -H "X-API-Key: YOUR_KEY_HERE" https://urdatlas.com/api/v1/files/meta/bitcoin/latest.json`}</CodeBlock>
              <p className="mt-3 text-xs text-slate-400">To save to a file instead of printing:</p>
              <CodeBlock>{`curl -H "X-API-Key: YOUR_KEY_HERE" https://urdatlas.com/api/v1/files/meta/bitcoin/latest.json -o meta_bitcoin_latest.json`}</CodeBlock>
            </div>

            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-base font-semibold text-white mb-1">Option B: Python (recommended for analysis)</h3>
              <p className="text-xs text-slate-400 mb-3">Install requests once: <InlineCode>pip install requests</InlineCode></p>
              <CodeBlock>{`import requests, json

API_KEY = "YOUR_KEY_HERE"
url = "https://urdatlas.com/api/v1/files/meta/bitcoin/latest.json"

response = requests.get(url, headers={"X-API-Key": API_KEY}, timeout=30)
response.raise_for_status()  # raises an error if request failed

data = response.json()
print(data["status"]["label"])         # prints e.g. HEATING
print(data["confidence"]["confidence_score"])  # prints e.g. 0.82

# Save to file
with open("meta_bitcoin_latest.json", "w") as f:
    json.dump(data, f, indent=2)`}</CodeBlock>
            </div>

            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-base font-semibold text-white mb-1">Option C: PowerShell (Windows)</h3>
              <CodeBlock>{`$key = "YOUR_KEY_HERE"
$url = "https://urdatlas.com/api/v1/files/meta/bitcoin/latest.json"
$headers = @{ "X-API-Key" = $key }

$response = Invoke-RestMethod -Uri $url -Headers $headers
$response | ConvertTo-Json -Depth 10 | Out-File -FilePath "meta_bitcoin_latest.json"`}</CodeBlock>
            </div>
          </div>
        </Section>

        {/* ── 8. What software you need ── */}
        <Section id="tools" eyebrow="Chapter 8" title="What software you need on your computer">
          <p className="text-sm leading-7 text-muted-foreground">
            You do not need much. Here is the minimum and the recommended setup.
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-sm font-bold text-white">Minimum (already have)</h3>
              <BulletList items={[
                "A terminal (Command Prompt, PowerShell, or Terminal on Mac/Linux)",
                "curl — usually pre-installed",
                "A text editor to open JSON files (Notepad works, VS Code is better)",
              ]} />
              <p className="mt-3 text-xs text-slate-500">Good enough for: manual daily fetching and reading the output.</p>
            </div>
            <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-5">
              <h3 className="text-sm font-bold text-white">Recommended for analysis</h3>
              <BulletList items={[
                <>Python 3.x — free at <a href="https://python.org" className="text-cyan-200 underline" target="_blank" rel="noopener noreferrer">python.org</a></>,
                "pip install requests (one command)",
                "pip install pandas (for data manipulation)",
                <>VS Code — free code editor at <a href="https://code.visualstudio.com" className="text-cyan-200 underline" target="_blank" rel="noopener noreferrer">code.visualstudio.com</a></>,
                "Jupyter Notebook — for interactive analysis (pip install jupyter)",
              ]} />
              <p className="mt-3 text-xs text-slate-500">Good for: building your own analysis, charts, and automation.</p>
            </div>
            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-sm font-bold text-white">For non-coders</h3>
              <BulletList items={[
                "Excel or Google Sheets — can load JSON with a bit of setup",
                "Power Query in Excel — imports JSON natively",
                "Postman — visual tool for testing API requests (free)",
                "Zapier or Make — no-code automation platforms",
              ]} />
              <p className="mt-3 text-xs text-slate-500">Good for: spreadsheet users who want structured data without writing code.</p>
            </div>
          </div>
        </Section>

        {/* ── 9. How to analyse ── */}
        <Section id="analysis" eyebrow="Chapter 9" title="How to analyse the data — practical examples">
          <p className="text-sm leading-7 text-muted-foreground">
            Once you have JSON files on your computer, here are the most common things
            new subscribers want to do with them.
          </p>

          <div className="mt-5 grid gap-5">
            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-base font-semibold text-white mb-3">Read the regime label and confidence from a file</h3>
              <CodeBlock>{`import json

with open("meta_bitcoin_latest.json") as f:
    data = json.load(f)

label = data["status"]["label"]           # e.g. "HEATING"
confidence = data["confidence"]["confidence_score"]  # e.g. 0.82
date = data["date"]                       # e.g. "2026-04-13"

print(f"{date}: {label} (confidence: {confidence:.2f})")`}</CodeBlock>
            </div>

            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-base font-semibold text-white mb-3">Load a 90-day history file into a table (pandas)</h3>
              <CodeBlock>{`import json
import pandas as pd

with open("meta_bitcoin_90d.json") as f:
    data = json.load(f)

# The days array contains one record per day
rows = []
for day in data["days"]:
    rows.append({
        "date": day["date"],
        "label": day["status"]["label"],
        "confidence": day["confidence"]["confidence_score"],
    })

df = pd.DataFrame(rows)
df["date"] = pd.to_datetime(df["date"])
df = df.sort_values("date")

print(df.tail(10))  # show last 10 rows
print(df["label"].value_counts())  # how many days each label appeared`}</CodeBlock>
            </div>

            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-base font-semibold text-white mb-3">Compare all four chains (Pro) — build a daily summary table</h3>
              <CodeBlock>{`import requests, pandas as pd

API_KEY = "YOUR_KEY_HERE"
CHAINS = ["bitcoin", "ethereum", "arbitrum", "base"]

rows = []
for chain in CHAINS:
    url = f"https://urdatlas.com/api/v1/files/meta/{chain}/latest.json"
    data = requests.get(url, headers={"X-API-Key": API_KEY}).json()
    rows.append({
        "chain": chain,
        "label": data["status"]["label"],
        "confidence": data["confidence"]["confidence_score"],
        "date": data["date"],
    })

df = pd.DataFrame(rows)
print(df.to_string(index=False))`}</CodeBlock>
            </div>

            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-base font-semibold text-white mb-3">Load into Excel — no code required</h3>
              <BulletList items={[
                "Open Excel → Data tab → Get Data → From File → From JSON",
                "Select your .json file",
                "Excel opens Power Query Editor — click the fields you want to expand",
                "Click Load — you get a table with one row per day",
                "Refresh tomorrow: Data → Refresh All",
              ]} />
              <p className="mt-3 text-xs text-slate-400">
                This works best with the window files (90d, 365d) because they contain
                an array of daily records. The latest.json file contains only one day.
              </p>
            </div>
          </div>
        </Section>

        {/* ── 10. Automation ── */}
        <Section id="automation" eyebrow="Chapter 10" title="How to automate daily fetching">
          <Callout>
            <span className="font-semibold text-white">Do not automate until the manual version works.</span>{" "}
            First: fetch one file manually. Then: fetch it in a script. Then: schedule that script.
          </Callout>

          <div className="mt-5">
            <h3 className="text-base font-semibold text-white mb-3">The recommended beginner automation pattern</h3>
            <p className="text-sm leading-7 text-muted-foreground mb-4">
              Instead of fetching blindly every day, the script checks the public status endpoint
              first. If the published date has changed since the last fetch, it downloads the new
              file. This avoids unnecessary requests and makes logs easy to read.
            </p>
            <CodeBlock label="Save this as fetch_urdatlas.py">{`import json, os
from pathlib import Path
import requests

BASE_URL = "https://urdatlas.com"
API_KEY = os.environ["URD_ATLAS_API_KEY"]  # set this as environment variable — never hardcode

CHAIN = "bitcoin"   # change to your entitled chain
GENRE = "meta"      # gold, meta, or derived

DATA_DIR = Path("urdatlas_data") / GENRE / CHAIN
STATE_FILE = Path("urdatlas_state") / f"{CHAIN}_{GENRE}.json"
DATA_DIR.mkdir(parents=True, exist_ok=True)
STATE_FILE.parent.mkdir(parents=True, exist_ok=True)

def get_last_seen():
    if not STATE_FILE.exists():
        return None
    return json.loads(STATE_FILE.read_text())

def save_last_seen(as_of):
    STATE_FILE.write_text(json.dumps({"as_of": as_of}))

def check_status():
    r = requests.get(f"{BASE_URL}/api/v1/status", timeout=30)
    r.raise_for_status()
    chains = r.json().get("chains", [])
    for row in chains:
        if row.get("chain") == CHAIN:
            return row.get("as_of")
    raise RuntimeError(f"Chain {CHAIN} not found in status")

def fetch_file():
    url = f"{BASE_URL}/api/v1/files/{GENRE}/{CHAIN}/latest.json"
    r = requests.get(url, headers={"X-API-Key": API_KEY}, timeout=30)
    r.raise_for_status()
    return r.json()

def main():
    current_as_of = check_status()
    last_seen = get_last_seen()

    if last_seen and last_seen.get("as_of") == current_as_of:
        print(f"No new data. Still at {current_as_of}.")
        return

    data = fetch_file()
    out = DATA_DIR / f"{current_as_of}_latest.json"
    out.write_text(json.dumps(data, indent=2))
    save_last_seen(current_as_of)
    print(f"Saved: {out}")

if __name__ == "__main__":
    main()`}</CodeBlock>
          </div>

          <div className="mt-5">
            <h3 className="text-base font-semibold text-white mb-3">Set your API key as an environment variable</h3>
            <div className="grid gap-3 lg:grid-cols-2">
              <CodeBlock label="Windows (Command Prompt)">{`set URD_ATLAS_API_KEY=your_key_here
python fetch_urdatlas.py`}</CodeBlock>
              <CodeBlock label="Mac / Linux">{`export URD_ATLAS_API_KEY=your_key_here
python3 fetch_urdatlas.py`}</CodeBlock>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-sm font-bold text-white mb-3">Schedule on Windows — Task Scheduler</h3>
              <BulletList items={[
                "Press Windows key → search Task Scheduler → Open it",
                "Click Create Basic Task in the right panel",
                "Name: Urd Atlas Daily Fetch",
                "Trigger: Daily — set a time in the afternoon (data publishes during the day)",
                "Action: Start a program",
                <>Program: path to your Python, e.g. <InlineCode>C:\Python311\python.exe</InlineCode></>,
                <>Arguments: path to your script, e.g. <InlineCode>C:\scripts\fetch_urdatlas.py</InlineCode></>,
                "Finish — the task runs automatically every day",
              ]} />
            </div>
            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-sm font-bold text-white mb-3">Schedule on Mac / Linux — cron</h3>
              <p className="text-xs text-slate-400 mb-3">Open Terminal and type <InlineCode>crontab -e</InlineCode>, then add:</p>
              <CodeBlock>{`# Run every day at 14:00 and 18:00 (catches most publication windows)
0 14,18 * * * URD_ATLAS_API_KEY=your_key /usr/bin/python3 /home/you/fetch_urdatlas.py >> /home/you/urdatlas.log 2>&1`}</CodeBlock>
              <p className="mt-3 text-xs text-slate-400">
                Save and exit. Cron runs the script automatically. Check the log file to
                see what happened.
              </p>
            </div>
          </div>
        </Section>

        {/* ── 11. Questions ── */}
        <Section id="questions" eyebrow="Chapter 11" title="Common questions — answered directly">
          <div className="grid gap-4 lg:grid-cols-2">
            <QA question="Do I need to be a developer?">
              No. The simplest workflow is: create account → subscribe → create API key →
              run one curl command → save the file. You can do this without writing any code.
            </QA>
            <QA question="What time does the new data arrive?">
              The pipeline runs daily but not at a fixed clock time. Check{" "}
              <Link href="/status" className="text-cyan-200 underline">/status</Link>{" "}
              to see the latest published date. When the date changes, new files are available.
            </QA>
            <QA question="Do I get notified when new data is available?">
              No push notification or email. The recommended approach: poll the status endpoint
              every few hours and check if the as_of date has changed.
            </QA>
            <QA question="What happens if I miss a day?">
              Nothing is lost. You can fetch the window files (7d, 30d, 90d) to get
              any days you missed, within your plan history depth.
            </QA>
            <QA question="Can I use the same API key on multiple machines?">
              Yes. Copy the key string and use it wherever you want. You can also create
              a second key in Dashboard for a different machine.
            </QA>
            <QA question="Is the JSON format the same for Basic and Pro?">
              Yes — identical format. The difference is scope: which chains and how many
              days of history you can access, not the structure of the files.
            </QA>
            <QA question="What does the confidence score mean exactly?">
              It is a number from 0 to 1. Above 0.40, the model publishes a named label.
              Below 0.40, it publishes UNKNOWN/DEGRADED to avoid overclaiming on weak evidence.
              A score of 0.80+ means strong, consistent evidence across all metrics.
            </QA>
            <QA question="What happens to my data if I cancel my subscription?">
              Your API key stops working at the end of your billing period. Files you have
              already downloaded and saved locally are yours to keep — we do not delete them.
            </QA>
            <QA question="I get a 403 error — what does that mean?">
              A 403 means your request is outside your entitlement. Common causes:
              requesting a chain you are not entitled to (Basic only gets one chain),
              requesting a window larger than your plan allows (e.g. 365d on Basic),
              or your subscription is not active. Check Dashboard to confirm your plan status.
            </QA>
            <QA question="I get a 401 error — what does that mean?">
              A 401 means authentication failed. Check that you are sending the API key
              in the header named exactly <InlineCode>X-API-Key</InlineCode> and that the
              key value is correct. API keys are case-sensitive.
            </QA>
          </div>
        </Section>

        {/* ── 12. Next steps ── */}
        <Section id="next-steps" eyebrow="Chapter 12" title="What to do after reading this guide">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/dashboard", title: "1. Dashboard", desc: "Create your API key. Start here — everything depends on having a key." },
              { href: "/api-docs", title: "2. API Docs", desc: "Technical route reference with all endpoints, parameters, and error codes." },
              { href: "/api-docs/schema", title: "3. JSON Schema", desc: "Every field in every file explained in full. Use this when you encounter an unfamiliar field." },
              { href: "/methodology", title: "4. Methodology", desc: "How the regime classification works — baselines, persistence filter, confidence gate." },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="rounded-2xl border bg-white/[0.02] p-4 transition hover:border-cyan-500/30 hover:bg-white/[0.04]">
                <div className="text-base font-semibold text-white">{item.title}</div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">{item.desc}</div>
              </Link>
            ))}
          </div>
        </Section>

      </div>
    </main>
  );
}
