
import Link from "next/link";
import type { ReactNode } from "react";

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>;
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border bg-black/30 p-5 text-xs leading-6 text-slate-200">
      <code>{children}</code>
    </pre>
  );
}

function Section({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border p-6 shadow-sm">
      {eyebrow ? (
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="mt-1 text-2xl font-semibold text-white">{title}</h2>
      {subtitle ? (
        <div className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
          {subtitle}
        </div>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
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
    <div className="rounded-2xl border bg-white/[0.02] p-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-cyan-500/25 bg-cyan-500/10 text-xs font-semibold text-cyan-200">
          {number}
        </span>
        <h3 className="text-base font-semibold text-white">{title}</h3>
      </div>
      <div className="mt-4 text-sm leading-7 text-muted-foreground">{children}</div>
    </div>
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
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-300">
        {title}
      </div>
      <div className="mt-2 text-3xl font-semibold text-white">{price}</div>
      <div className="mt-5 text-sm leading-7 text-slate-200">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export default function GettingStartedJsonApiPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-10">
        <div className="rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_40%)] p-8 shadow-sm">
          <div className="max-w-4xl">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
              Beginner guide
            </div>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Getting started with JSON API
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              This page is for subscribers who are completely new to JSON and API access.
              It explains what you actually receive from Urd Atlas, what the difference is
              between Basic and Pro, how to fetch the newest files, and how to automate the
              process without building a large system first.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                What this page covers
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-200">
                What JSON is, what API access means, what files you get, and how to automate
                fetching the newest published output.
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                Best first goal
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-200">
                Get one authenticated request working for <InlineCode>latest.json</InlineCode>.
                After that, add history bundles and automation.
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                Related pages
              </div>
              <div className="mt-2 flex flex-col gap-2 text-sm">
                <Link href="/api-docs" className="text-cyan-200 underline">
                  API Docs
                </Link>
                <Link href="/api-docs/schema" className="text-cyan-200 underline">
                  JSON Schema Reference
                </Link>
                <Link href="/dashboard" className="text-cyan-200 underline">
                  Dashboard / API keys
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-8">
        <Section
          eyebrow="First principles"
          title="What you are actually buying"
          subtitle="Urd Atlas does not only show information on a webpage. The product is the published JSON output."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-base font-semibold text-white">The website</h3>
              <BulletList
                items={[
                  "Lets you inspect current regime, confidence, freshness, and explanations.",
                  "Helps you understand what the data means.",
                  "Is the human-readable surface.",
                ]}
              />
            </div>
            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-base font-semibold text-white">The subscriber product</h3>
              <BulletList
                items={[
                  "Lets your own tools fetch structured JSON directly.",
                  "Makes the output reusable in spreadsheets, scripts, dashboards, and internal workflows.",
                  "Removes the need to copy values manually from pages.",
                ]}
              />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 text-sm leading-7 text-slate-200">
            <span className="font-semibold text-white">Simple mental model:</span>{" "}
            the website explains the output, while the JSON API delivers the output.
          </div>
        </Section>

        <Section
          eyebrow="Definitions"
          title="What JSON and API mean in plain language"
          subtitle="You do not need to be a backend engineer to use this."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-base font-semibold text-white">JSON</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                JSON is just structured text. It is a clean way of writing dates, labels,
                values, arrays, and nested fields so that software can read them easily.
              </p>
              <div className="mt-4">
                <CodeBlock>{`{
  "chain": "bitcoin",
  "as_of": "2026-04-13",
  "status_label": "STABLE",
  "confidence_score": 0.82
}`}</CodeBlock>
              </div>
            </div>

            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-base font-semibold text-white">API access</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                API access means your computer can request that JSON directly from Urd Atlas
                instead of you opening pages and copying values by hand.
              </p>
              <div className="mt-4 rounded-xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-slate-200">
                <div>
                  <span className="font-semibold text-white">Without API:</span>{" "}
                  open page → read screen → copy values manually
                </div>
                <div className="mt-2">
                  <span className="font-semibold text-white">With API:</span>{" "}
                  your script sends request → Urd Atlas returns JSON → your script stores it automatically
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section
          eyebrow="What you need"
          title="What a brand-new user needs before the first API call"
          subtitle="This is the full beginner checklist."
        >
          <BulletList
            items={[
              <>
                A Urd Atlas account
              </>,
              <>
                An active subscription
              </>,
              <>
                An API key from{" "}
                <Link href="/dashboard" className="text-cyan-200 underline">
                  Dashboard
                </Link>
              </>,
              <>
                A place to run requests from — your own laptop is enough
              </>,
              <>
                A place to save files — for example a folder on your computer
              </>,
              <>
                Optional, if you want automation: a scheduler such as Windows Task Scheduler,
                cron, GitHub Actions, or another job runner
              </>,
            ]}
          />

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="text-base font-semibold text-white">You do not need</h3>
            <BulletList
              items={[
                "A cloud platform on day one",
                "A database on day one",
                "A complex backend",
                "A full internal data platform before you start getting value",
              ]}
            />
          </div>
        </Section>

        <Section
          eyebrow="Plans"
          title="Exactly what Basic and Pro give you"
          subtitle="The biggest difference is not the JSON structure. It is the scope of access."
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <PlanCard
              title="Basic"
              price="$29/month"
              accent="border-cyan-500/20 bg-cyan-500/5"
            >
              <BulletList
                items={[
                  <>
                    Access to <span className="font-semibold text-white">one chain</span> of your
                    choice
                  </>,
                  <>
                    Access to all three published genres:{" "}
                    <InlineCode>gold</InlineCode>, <InlineCode>meta</InlineCode>, and{" "}
                    <InlineCode>derived</InlineCode>
                  </>,
                  <>
                    Standard history bundles within your plan scope, up to{" "}
                    <span className="font-semibold text-white">90 days</span>
                  </>,
                  <>
                    Up to <span className="font-semibold text-white">2 API keys</span>
                  </>,
                  <>
                    Rate limit: <span className="font-semibold text-white">60 requests/minute</span>
                  </>,
                  <>
                    No custom threshold output feed
                  </>,
                ]}
              />

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                  What this means in practice
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-200">
                  If your Basic chain is <InlineCode>bitcoin</InlineCode>, you can fetch:
                  <div className="mt-3">
                    <CodeBlock>{`/api/v1/files/gold/bitcoin/latest.json
/api/v1/files/meta/bitcoin/latest.json
/api/v1/files/derived/bitcoin/latest.json`}</CodeBlock>
                  </div>
                  And you can also fetch the standard historical bundles for that same chain,
                  but only within the Basic history ceiling.
                </div>
              </div>
            </PlanCard>

            <PlanCard
              title="Pro"
              price="$79/month"
              accent="border-purple-500/20 bg-purple-500/5"
            >
              <BulletList
                items={[
                  <>
                    Access to <span className="font-semibold text-white">all four chains</span>:{" "}
                    <InlineCode>bitcoin</InlineCode>, <InlineCode>ethereum</InlineCode>,{" "}
                    <InlineCode>arbitrum</InlineCode>, and <InlineCode>base</InlineCode>
                  </>,
                  <>
                    Access to all three published genres:{" "}
                    <InlineCode>gold</InlineCode>, <InlineCode>meta</InlineCode>, and{" "}
                    <InlineCode>derived</InlineCode>
                  </>,
                  <>
                    Standard history bundles within your plan scope, up to{" "}
                    <span className="font-semibold text-white">365 days</span>
                  </>,
                  <>
                    Up to <span className="font-semibold text-white">2 API keys</span>
                  </>,
                  <>
                    Rate limit: <span className="font-semibold text-white">300 requests/minute</span>
                  </>,
                  <>
                    Includes custom threshold outputs
                  </>,
                ]}
              />

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                  What this means in practice
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-200">
                  You can fetch the latest published file for all chains and all genres:
                  <div className="mt-3">
                    <CodeBlock>{`/api/v1/files/meta/bitcoin/latest.json
/api/v1/files/meta/ethereum/latest.json
/api/v1/files/meta/arbitrum/latest.json
/api/v1/files/meta/base/latest.json`}</CodeBlock>
                  </div>
                  And you can also fetch the standard historical bundles for all four chains,
                  up to the Pro history ceiling.
                </div>
              </div>
            </PlanCard>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="text-base font-semibold text-white">History Add-on</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              The History Add-on is a separate one-time purchase for full available history
              inside your entitled scope. That means:
            </p>
            <BulletList
              items={[
                "Basic + History Add-on = one chain, but no longer limited to the included 90-day history depth",
                "Pro + History Add-on = all four chains, but no longer limited to the included 365-day history depth",
              ]}
            />
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              This page focuses on the beginner workflow around the standard published bundles
              and the newest files. Your main{" "}
              <Link href="/api-docs" className="text-cyan-200 underline">
                API Docs
              </Link>{" "}
              page remains the reference for the currently exposed route shapes in your deployed build.
            </p>
          </div>
        </Section>

        <Section
          eyebrow="Genres"
          title="What the three file types actually are"
          subtitle="Both Basic and Pro get the same genres. The difference is plan scope."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <div className="text-lg font-semibold text-amber-300">Gold</div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                The raw published source layer. This is where concrete chain metrics live:
                counts, fees, utilization, addresses, block-time-type metrics, and similar
                network-state observations.
              </p>
              <div className="mt-4 text-xs text-slate-400">
                Use Gold when you want raw facts and your own downstream calculations.
              </div>
            </div>

            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <div className="text-lg font-semibold text-violet-300">Meta</div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                The interpretation layer. This is where the compact answer lives:
                regime label, confidence, drivers, scorecard context, and freshness-related
                interpretation fields.
              </p>
              <div className="mt-4 text-xs text-slate-400">
                Use Meta when you want the shortest route to “what is going on now?”
              </div>
            </div>

            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <div className="text-lg font-semibold text-sky-300">Derived</div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                The trend layer built from Gold. This is where smoothed series and rolling
                views live, so you can work with less noise than the raw daily figures alone.
              </p>
              <div className="mt-4 text-xs text-slate-400">
                Use Derived when you want cleaner trend series for analysis or charting.
              </div>
            </div>
          </div>
        </Section>

        <Section
          eyebrow="Newest file first"
          title="The easiest possible first workflow"
          subtitle="Start with latest.json before you do anything more advanced."
        >
          <div className="grid gap-4 xl:grid-cols-3">
            <StepCard number="1" title="Create account and subscribe">
              Create your Urd Atlas account, choose your plan, and complete billing.
              After that, sign in and open{" "}
              <Link href="/dashboard" className="text-cyan-200 underline">
                Dashboard
              </Link>
              .
            </StepCard>

            <StepCard number="2" title="Create an API key">
              In Dashboard, create an API key. Copy it immediately and store it safely.
              The full raw key is only shown once.
            </StepCard>

            <StepCard number="3" title="Pick one file">
              Do not start with everything. Start with one file only, for example:
              <div className="mt-3">
                <CodeBlock>{`/api/v1/files/meta/bitcoin/latest.json`}</CodeBlock>
              </div>
            </StepCard>

            <StepCard number="4" title="Make one request manually">
              Use curl, Postman, Python, or another HTTP client. The important point is that
              you send your API key in the <InlineCode>X-API-Key</InlineCode> header.
            </StepCard>

            <StepCard number="5" title="Save the file locally">
              Save the response into a folder such as:
              <div className="mt-3">
                <CodeBlock>{`data/urdatlas/meta/bitcoin/latest.json`}</CodeBlock>
              </div>
            </StepCard>

            <StepCard number="6" title="Only then add automation">
              Once one file works manually, automate the exact same request. Do not try to
              build a multi-chain system before you have one file working end-to-end.
            </StepCard>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-base font-semibold text-white">Example with curl</h3>
              <div className="mt-3">
                <CodeBlock>{`curl -H "X-API-Key: YOUR_REAL_API_KEY" \\
  https://urdatlas.com/api/v1/files/meta/bitcoin/latest.json`}</CodeBlock>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-white">Example with Python</h3>
              <div className="mt-3">
                <CodeBlock>{`import requests

url = "https://urdatlas.com/api/v1/files/meta/bitcoin/latest.json"
headers = {
    "X-API-Key": "YOUR_REAL_API_KEY"
}

response = requests.get(url, headers=headers, timeout=30)
response.raise_for_status()

print(response.json())`}</CodeBlock>
              </div>
            </div>
          </div>
        </Section>

        <Section
          eyebrow="What to automate"
          title="How to automatically fetch the newest file as soon as it is available"
          subtitle="This is the most practical beginner automation pattern."
        >
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
            <h3 className="text-base font-semibold text-white">Recommended beginner pattern</h3>
            <BulletList
              items={[
                "Check the public status endpoint for your target chain",
                "Compare the newest published as_of date against your own last seen date",
                "If the date is new, fetch the authenticated latest.json file",
                "Save it locally with the date in the filename",
              ]}
            />
            <p className="mt-3 text-sm leading-7 text-slate-200">
              This is better than blind downloading all day long, because it only fetches the
              authenticated file once a new publication is actually visible.
            </p>
          </div>

          <div className="mt-6">
            <h3 className="text-base font-semibold text-white">What you need for this setup</h3>
            <BulletList
              items={[
                <>
                  A target chain, for example <InlineCode>bitcoin</InlineCode>
                </>,
                <>
                  A target genre, for example <InlineCode>meta</InlineCode>
                </>,
                <>
                  A local folder to save files into
                </>,
                <>
                  An environment variable for your API key
                </>,
                <>
                  A small script
                </>,
                <>
                  A scheduler that runs the script regularly
                </>,
              ]}
            />
          </div>

          <div className="mt-6">
            <h3 className="text-base font-semibold text-white">
              Complete beginner automation example
            </h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              This example watches the public status endpoint. When it detects a new published
              date for your target chain, it downloads the newest authenticated Meta file and
              stores it locally.
            </p>

            <div className="mt-4">
              <CodeBlock>{`# install once
pip install requests`}</CodeBlock>
            </div>

            <div className="mt-4">
              <CodeBlock>{`import json
import os
from pathlib import Path

import requests

BASE_URL = os.getenv("URD_ATLAS_BASE_URL", "https://urdatlas.com")
API_KEY = os.environ["URD_ATLAS_API_KEY"]

CHAIN = "bitcoin"
GENRE = "meta"

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
    url = f"{BASE_URL}/api/v1/status"
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.json()

def fetch_latest_file():
    url = f"{BASE_URL}/api/v1/files/{GENRE}/{CHAIN}/latest.json"
    headers = {"X-API-Key": API_KEY}
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()
    return response.json()

def main():
    status = fetch_status()

    target = None
    for row in status.get("chains", []):
        if row.get("chain") == CHAIN:
            target = row
            break

    if target is None:
        raise RuntimeError(f"Could not find chain '{CHAIN}' in /api/v1/status")

    current_as_of = target.get("as_of")
    if not current_as_of:
        raise RuntimeError("Status payload did not contain 'as_of'")

    last_seen = load_last_seen()
    last_as_of = None if last_seen is None else last_seen.get("as_of")

    if current_as_of == last_as_of:
        print(f"No new publication yet for {CHAIN}. Latest known date is still {current_as_of}.")
        return

    latest_payload = fetch_latest_file()

    output_path = DATA_DIR / f"{current_as_of}_latest.json"
    output_path.write_text(json.dumps(latest_payload, indent=2), encoding="utf-8")

    save_last_seen({
        "chain": CHAIN,
        "genre": GENRE,
        "as_of": current_as_of,
        "saved_file": str(output_path),
    })

    print(f"Saved new file: {output_path}")

if __name__ == "__main__":
    main()`}</CodeBlock>
            </div>
          </div>
        </Section>

        <Section
          eyebrow="Scheduling"
          title="How to run that script automatically"
          subtitle="You do not need a cloud platform to start."
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-base font-semibold text-white">Option A: Windows Task Scheduler</h3>
              <BulletList
                items={[
                  "Save the script as a .py file",
                  "Create a task that runs Python with that file as argument",
                  "Run it every few minutes around your expected publication windows",
                  "Keep the saved files in a dated folder structure",
                ]}
              />
              <div className="mt-4">
                <CodeBlock>{`Program/script:
C:\\Path\\To\\python.exe

Add arguments:
C:\\Path\\To\\fetch_urdatlas_latest.py`}</CodeBlock>
              </div>
            </div>

            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-base font-semibold text-white">Option B: cron on Linux/macOS</h3>
              <BulletList
                items={[
                  "Put the script on a machine that is always on",
                  "Add a cron job",
                  "Write logs to a text file so you can see when the last successful fetch happened",
                ]}
              />
              <div className="mt-4">
                <CodeBlock>{`*/5 * * * * /usr/bin/python3 /home/you/fetch_urdatlas_latest.py >> /home/you/urdatlas.log 2>&1`}</CodeBlock>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h3 className="text-base font-semibold text-white">
              What “as soon as it is available” means in practice
            </h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              For a beginner setup, “as soon as it is available” does not mean real-time
              event streaming. It usually means one of these:
            </p>
            <BulletList
              items={[
                "Run a small check every 5 minutes around your expected publication windows",
                "Let the script compare the newest public as_of date with the last one you already saved",
                "Only download the authenticated file when the public date changes",
              ]}
            />
          </div>
        </Section>

        <Section
          eyebrow="What beginners usually do next"
          title="What to do after latest.json is working"
          subtitle="Do not jump directly from zero to a large internal platform."
        >
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-base font-semibold text-white">Path 1: Spreadsheet user</h3>
              <BulletList
                items={[
                  "Keep saving daily latest files",
                  "Load them into Excel or Google Sheets",
                  "Build simple tables and comparisons",
                ]}
              />
            </div>

            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-base font-semibold text-white">Path 2: Analyst / researcher</h3>
              <BulletList
                items={[
                  "Add standard history bundles in your plan scope",
                  "Store daily files locally",
                  "Use Python or R for your own analysis",
                ]}
              />
            </div>

            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-base font-semibold text-white">Path 3: Internal system user</h3>
              <BulletList
                items={[
                  "Move the script onto a server or scheduled runner",
                  "Store files in a database or object store",
                  "Build internal alerts or dashboards on top",
                ]}
              />
            </div>
          </div>
        </Section>

        <Section
          eyebrow="Common misunderstandings"
          title="What new users often misunderstand"
          subtitle="These are worth clearing up early."
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-base font-semibold text-white">
                “I need to be a developer first”
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                No. The simplest subscriber workflow is just:
                create account → subscribe → create API key → fetch one latest JSON file →
                save it locally.
              </p>
            </div>

            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-base font-semibold text-white">
                “API access means the website disappears”
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                No. The website is still the explanatory surface. API access gives you the same
                published output in a machine-readable form your own tools can use directly.
              </p>
            </div>

            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-base font-semibold text-white">
                “Basic and Pro get different JSON formats”
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                No. Both plans get the same published genres. The difference is entitlement
                scope: number of chains, maximum history depth, rate limits, and Pro-only extras.
              </p>
            </div>

            <div className="rounded-2xl border bg-white/[0.02] p-5">
              <h3 className="text-base font-semibold text-white">
                “I should automate everything immediately”
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                No. The correct order is:
                manual latest file first → stable saved output second → scheduler third →
                multi-chain system last.
              </p>
            </div>
          </div>
        </Section>

        <Section
          eyebrow="Where to go next"
          title="After this page"
          subtitle="These are the pages you use immediately after the beginner guide."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                href: "/dashboard",
                title: "Dashboard",
                desc: "Create and manage your API keys",
              },
              {
                href: "/api-docs",
                title: "API Docs",
                desc: "Technical route reference and entitlement model",
              },
              {
                href: "/api-docs/schema",
                title: "JSON Schema",
                desc: "Field-by-field explanation of what is inside the files",
              },
              {
                href: "/terms",
                title: "Terms",
                desc: "Usage terms for subscriber JSON and API access",
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border bg-white/[0.02] p-4 transition hover:border-cyan-500/30 hover:bg-white/[0.04]"
              >
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
