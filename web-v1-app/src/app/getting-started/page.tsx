import Link from "next/link";

export const metadata = {
  title: "Getting Started | Urd Atlas",
  description: "A step-by-step guide for testing Urd Atlas files, joining them to your own data, and choosing subscriber delivery.",
};

const fileCards = [
  {
    name: "Meta",
    use: "Use the regime and confidence score as the daily state row you join to your own table.",
    example: `urd[["observation_date", "chain", "regime", "confidence_score"]]`,
  },
  {
    name: "Gold",
    use: "Use the measured chain activity behind the label when you want to inspect the evidence yourself.",
    example: `gold[["date", "chain", "metrics"]]`,
  },
  {
    name: "Derived",
    use: "Use pre-computed rolling windows when you do not want to rebuild feature engineering.",
    example: `derived.filter(regex="ma7|ma30|chain|date")`,
  },
  {
    name: "Briefs",
    use: "Use the plain-language sentence when a report or dashboard needs readable context.",
    example: `brief["one_liner"]`,
  },
];

export default function GettingStartedPage() {
  return (
    <main className="bg-background text-foreground">
      <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-200">Getting started</p>
        <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-[-0.05em] text-white sm:text-6xl">
          Test one file, join it to your data, then subscribe only when the workflow works.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
          This page assumes no prior Urd Atlas setup. Follow it from top to bottom to run your first CSV join or copy your first readable context note.
        </p>
        <p className="mt-5 inline-flex rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-200">
          No price data · No forecasts · No recommendations
        </p>
      </section>

      <section className="border-y border-white/10 bg-white/[0.018]">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 lg:grid-cols-3 lg:px-8">
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <p className="font-mono text-xs text-cyan-200">01</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">Start free.</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400">Open the Analyst Kit and use a public regime-calendar CSV endpoint directly. You do not need an account or a manual download for the first test.</p>
            <Link href="/analyst-kit" className="mt-6 inline-flex rounded-full border border-cyan-300/35 bg-cyan-300/12 px-5 py-3 font-mono text-xs uppercase tracking-[0.12em] text-white">Open Analyst Kit →</Link>
          </article>
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <p className="font-mono text-xs text-cyan-200">02</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">Join on date + chain.</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400">Your table needs a date column and a chain column. Urd Atlas adds the published state for that same daily row.</p>
          </article>
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <p className="font-mono text-xs text-cyan-200">03</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">Subscribe for delivery.</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400">After the join is useful, choose one chain for $49/mo or all four chains for $149/mo to receive authenticated daily files.</p>
            <Link href="/#pricing" className="mt-6 inline-flex rounded-full border border-emerald-300/35 bg-emerald-300/12 px-5 py-3 font-mono text-xs uppercase tracking-[0.12em] text-white">View pricing →</Link>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-200">The four files</p>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white">Pick the layer that matches your workflow.</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {fileCards.map((file) => (
            <article key={file.name} className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
              <h3 className="text-2xl font-semibold text-white">{file.name}</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{file.use}</p>
              <pre className="mt-5 overflow-auto rounded-2xl border border-white/10 bg-black/50 p-4 font-mono text-xs leading-6 text-zinc-200"><code>{file.example}</code></pre>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.018]">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-200">Join example</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white">Attach Urd Atlas to your own daily table.</h2>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-400">The example reads Ethereum's public regime calendar directly from Urd Atlas, so only your own daily table needs to exist locally. Change the chain in the URL when you want to test BTC, ARB or BASE.</p>
          <pre className="mt-8 overflow-auto rounded-[2rem] border border-white/10 bg-black/55 p-6 font-mono text-xs leading-6 text-zinc-100"><code>{`import pandas as pd

urd = pd.read_csv(
    "https://urdatlas.com/api/v1/analyst-kit/ethereum/regime-calendar"
)
my_data = pd.read_csv("my_daily_metrics.csv")

joined = my_data.merge(
    urd[["observation_date", "chain", "regime", "confidence_score"]],
    left_on=["date", "chain"],
    right_on=["observation_date", "chain"],
    how="left",
)

usable = joined[joined["confidence_score"] >= 0.70]`}</code></pre>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-amber-200">No-code path</p>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white">Use Explorer and Briefs when you do not have a pipeline.</h2>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-400">Open Explorer to read the current published state. Use Briefs when you need a short sentence for a report, internal note or dashboard.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/explorer" className="rounded-full border border-emerald-300/35 bg-emerald-300/12 px-5 py-3 font-mono text-xs uppercase tracking-[0.12em] text-white">Open Explorer →</Link>
          <Link href="/methodology" className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 font-mono text-xs uppercase tracking-[0.12em] text-zinc-200">Read methodology →</Link>
        </div>
      </section>
    </main>
  );
}
