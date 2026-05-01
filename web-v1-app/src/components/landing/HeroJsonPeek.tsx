// src/components/landing/HeroJsonPeek.tsx
//
// A compact "this is what the JSON looks like" tease that lives directly
// under the hero. Its job: convert the abstract claim "we publish JSON" into
// a concrete visual artefact that a professional reader can recognise in
// under 2 seconds. The card is clickable end-to-end and opens the existing
// JsonExamplePickerModal (#json-example-picker) defined in page.tsx.
//
// No client-side JS — modal is opened by URL hash via Tailwind [&:target]:flex
// in the existing JsonExamplePickerModal.

import Link from "next/link";

export default function HeroJsonPeek() {
  return (
    <section
      id="json-layers"
      className="relative bg-[linear-gradient(180deg,#031329_0%,#06203e_45%,#08294f_100%)] pb-12 pt-2"
      >
      <div className="w-full px-5 sm:px-7 lg:px-10 2xl:px-16">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-stretch">

          {/* ------------ Left: the claim with concrete numbers ----------- */}
          <div className="flex flex-col justify-between rounded-[22px] border border-white/10 bg-[#0a223f]/82 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_40px_rgba(0,0,0,0.32)] lg:p-7">
            <div>
              <div className="text-[12px] font-black uppercase tracking-[0.2em] text-cyan-300">
                The product is the JSON
              </div>
              <h2 className="mt-3 text-[26px] font-black leading-[1.12] tracking-[-0.025em] text-white sm:text-[28px]">
                Three files per chain per day. Every field documented. Every label hash-anchored.
              </h2>
              <p className="mt-3 text-[14px] font-medium leading-[1.7] text-white/72">
                Subscribers do not consume Urd Atlas as a chart. They pull JSON, join it onto
                their own data, and let it drive backtests, monitoring, and audit trails.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-[12px] font-black uppercase tracking-[0.12em] text-white/82 sm:grid-cols-3">
              <div>Daily JSON</div>
              <div>512 days history</div>
              <div>4 chains</div>
              <div>API-first access</div>
              <div>0 rewrites</div>
              <div>One schema</div>
              </div>

              <div className="mt-5 grid gap-3 text-[13px] font-semibold leading-6 text-white/74 sm:grid-cols-3">
              <div><span className="font-black text-white">Gold</span> — raw on-chain observations.</div>
              <div><span className="font-black text-white">Meta</span> — regime, confidence, and drivers.</div>
              <div><span className="font-black text-white">Derived</span> — trend baselines and context.</div>
              </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#json-example-picker"
                className="inline-flex h-12 items-center justify-center rounded-[8px] bg-blue-600 px-5 text-[13px] font-extrabold text-white shadow-[0_12px_28px_rgba(37,99,235,0.32)] transition hover:bg-blue-700"
              >
                View example JSON →
              </a>
              <Link
                href="/api-docs/schema"
                className="inline-flex h-12 items-center justify-center rounded-[8px] bg-blue-600 px-5 text-[13px] font-extrabold text-white shadow-[0_12px_28px_rgba(37,99,235,0.32)] transition hover:bg-blue-700"
              >
                Schema reference →
              </Link>
            </div>
          </div>

          {/* ------------ Right: the JSON peek itself --------------------- */}
          <a
            href="#json-example-picker"
            className="group relative flex flex-col overflow-hidden rounded-[22px] border border-cyan-300/22 bg-[#06182d] shadow-[0_22px_50px_rgba(0,0,0,0.42)] transition hover:border-cyan-300/40 hover:shadow-[0_28px_60px_rgba(0,0,0,0.52)]"
          >
            {/* mock window chrome */}
            <div className="flex items-center justify-between gap-3 border-b border-white/8 bg-[#08203c] px-5 py-3">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 font-mono text-[11px] font-bold text-cyan-200/80">
                  meta/ethereum/2026-03-31.json
                </span>
              </div>
              <span className="hidden font-mono text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/70 sm:inline">
                historical example
              </span>
            </div>

            {/* json body */}
            <pre className="m-0 flex-1 overflow-hidden whitespace-pre px-5 py-4 font-mono text-[12px] leading-[1.7] text-slate-200">
{`{
  "chain": "ethereum",
  "date": "2026-03-31",
  "status": {
    `}<span className="text-cyan-300">{`"label"`}</span>{`: `}<span className="text-amber-300">{`"CONGESTED"`}</span>{`,
    `}<span className="text-cyan-300">{`"one_liner"`}</span>{`: `}<span className="text-emerald-300">{`"Demand, fees, and utilization remain elevated."`}</span>{`
  },
  "confidence": {
    `}<span className="text-cyan-300">{`"confidence_score"`}</span>{`: `}<span className="text-pink-300">{`0.847`}</span>{`,
    `}<span className="text-cyan-300">{`"data_quality_score"`}</span>{`: `}<span className="text-pink-300">{`0.91`}</span>{`
  },
  "regime": {
    `}<span className="text-cyan-300">{`"determinism_hash"`}</span>{`: `}<span className="text-emerald-300">{`"81b295000696"`}</span>{`,
    `}<span className="text-cyan-300">{`"ruleset_id"`}</span>{`: `}<span className="text-emerald-300">{`"eth_l1_v1"`}</span>{`,
    `}<span className="text-cyan-300">{`"drivers"`}</span>{`: [
      { `}<span className="text-cyan-300">{`"axis"`}</span>{`: `}<span className="text-emerald-300">{`"friction"`}</span>{`, `}<span className="text-cyan-300">{`"z_robust"`}</span>{`: `}<span className="text-pink-300">{`2.41`}</span>{`, `}<span className="text-cyan-300">{`"pct_90d"`}</span>{`: `}<span className="text-pink-300">{`0.99`}</span>{` },
      { `}<span className="text-cyan-300">{`"axis"`}</span>{`: `}<span className="text-emerald-300">{`"demand"`}</span>{`,   `}<span className="text-cyan-300">{`"z_robust"`}</span>{`: `}<span className="text-pink-300">{`2.18`}</span>{`, `}<span className="text-cyan-300">{`"pct_90d"`}</span>{`: `}<span className="text-pink-300">{`0.97`}</span>{` }
    ]
  }
}`}
            </pre>

            <div className="flex items-center justify-between gap-3 border-t border-white/8 bg-[#08203c] px-5 py-3">
              <span className="font-mono text-[11px] font-bold text-cyan-200/70">
                Click anywhere to inspect Gold / Meta / Derived examples
              </span>
              <span className="font-mono text-[12px] font-black text-cyan-200 transition group-hover:text-cyan-100">
                Open →
              </span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
