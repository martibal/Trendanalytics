# Urd Atlas — Landing Page Refactor Patch

This patch addresses every issue raised in the landing-page review:

1. **Hero shortened** — height reduced ~30%, secondary CTA demoted to ghost style
2. **HeroJsonPeek added** — concrete JSON tease directly under the hero, clickable end-to-end (opens existing `#json-example-picker` modal)
3. **Section order rewired** — the new sequence flows: Hero → JSON peek → Trust pills → WhoThisIsFor → Latest chain status → JSON layers → Get started → Pricing
4. **WhoThisIsFor 2x2 grid** — the previously cramped "Concrete uses" line is now a balanced 2x2 grid, the most valuable content for quants is now actually readable
5. **Sample-JSON link points to JSON modal** — the "Inspect sample JSON →" link now opens `#json-example-picker` (the live JSON viewer), not the abstract API docs page
6. **Competitor comparison table added** — explicit rows vs Glassnode / Nansen / Dune
7. **"Most popular" tag on Pro plan** — anchors plan choice
8. **Honest counterclaim trust-pills** — `0 retroactive label changes` replaces the soft "Deterministic methodology" copy

---

## Files in this patch

| File | Action | Path in repo |
|------|--------|--------------|
| `src/components/landing/HeroJsonPeek.tsx` | **New** — create | exact path |
| `src/components/landing/WhoThisIsFor.tsx` | **New** — create | exact path |
| `src/app/page.tsx` | **Edit** — apply 6 surgical replacements below | exact path |

---

## How to apply the page.tsx edits

Each edit is a `BEFORE` block (search for it exactly) and an `AFTER` block (replace with). The blocks are uniquely searchable — no two `BEFORE` blocks appear elsewhere in the file. Apply them in order.

---

### EDIT 1 — Add component imports

**FIND** (around line 17–18):

```tsx
import { readStorageObject } from "@/lib/storage";
import { cx, urd } from "@/components/site/UrdDesignSystem";
```

**REPLACE WITH**:

```tsx
import { readStorageObject } from "@/lib/storage";
import { cx, urd } from "@/components/site/UrdDesignSystem";
import HeroJsonPeek from "@/components/landing/HeroJsonPeek";
import WhoThisIsFor from "@/components/landing/WhoThisIsFor";
```

---

### EDIT 2 — Shorten hero, fix CTA hierarchy

**FIND** (around line 1820–1845):

```tsx
        <SectionShell className="relative pb-20 pt-[140px] md:pb-24 md:pt-[150px] lg:pb-[4.4rem] lg:pt-[165px]">
            <div className="max-w-[820px]">
              <h1 className="max-w-[820px] text-[54px] font-black leading-[0.98] tracking-[-0.055em] text-white sm:text-[58px] lg:text-[68px]">
                Separate blockchain noise
                <span className="block text-[#2f7cff]">from structural change.</span>
              </h1>
              <p className="mt-7 max-w-[800px] text-[24px] font-semibold leading-8 text-white/88 sm:text-[20px]">
                Daily Gold, Meta, Derived, and Briefs JSON for BTC, ETH, ARB, and BASE. Regime context without maintaining your own pipeline
              </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#json-example-picker"
                className="inline-flex h-14 min-w-[260px] items-center justify-center rounded-[8px] bg-blue-600 px-6 text-[14px] font-extrabold text-white shadow-[0_16px_34px_rgba(37,99,235,0.28)] transition hover:bg-blue-700"
              >
                View historical example JSONs
              </a>
              <Link
                href="/api-docs"
                className="inline-flex h-14 min-w-[190px] items-center justify-center rounded-[8px] bg-blue-600 px-6 text-[14px] font-extrabold text-white shadow-[0_16px_34px_rgba(37,99,235,0.28)] transition hover:bg-blue-700"
              >
                View API Docs
              </Link>
            </div>
          </div>
        </SectionShell>
      </section>
```

**REPLACE WITH**:

```tsx
        <SectionShell className="relative pb-12 pt-[110px] md:pb-14 md:pt-[120px] lg:pb-12 lg:pt-[130px]">
            <div className="max-w-[820px]">
              <h1 className="max-w-[820px] text-[48px] font-black leading-[0.98] tracking-[-0.055em] text-white sm:text-[54px] lg:text-[62px]">
                Separate blockchain noise
                <span className="block text-[#2f7cff]">from structural change.</span>
              </h1>
              <p className="mt-6 max-w-[800px] text-[19px] font-semibold leading-7 text-white/88 sm:text-[20px]">
                Daily Gold, Meta, Derived, and Briefs JSON for BTC, ETH, ARB, and BASE. Regime context without maintaining your own pipeline.
              </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#json-example-picker"
                className="inline-flex h-12 min-w-[240px] items-center justify-center rounded-[8px] bg-blue-600 px-6 text-[14px] font-extrabold text-white shadow-[0_14px_30px_rgba(37,99,235,0.32)] transition hover:bg-blue-700"
              >
                View historical example JSONs →
              </a>
              <Link
                href="/api-docs"
                className="inline-flex h-12 min-w-[170px] items-center justify-center rounded-[8px] border border-white/14 bg-white/4 px-6 text-[14px] font-extrabold text-white transition hover:bg-white/10"
              >
                View API Docs
              </Link>
            </div>
          </div>
        </SectionShell>
      </section>

      <HeroJsonPeek />

      <WhoThisIsFor />
```

> Note: `<HeroJsonPeek />` and `<WhoThisIsFor />` are inserted **immediately after the hero `</section>`**. They render their own `<section>` wrappers with appropriate gradients.

---

### EDIT 3 — Move trust pills above chain status, refresh copy

**FIND** (around line 1847–1881):

```tsx
      <section className="relative bg-[linear-gradient(180deg,#eaf5ff_0%,#f5f9ff_58%,#eef6ff_100%)] pb-0 pt-10">
        <SectionShell>
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-[13px] font-black uppercase tracking-[0.12em] text-[#0d2447]">
                Latest chain status
              </div>
              <p className="mt-1 text-[14px] font-medium leading-5 text-[#557099]">
                Click any chain card to open the full chain view and history.
              </p>
            </div>

            <p className="shrink-0 pt-0.5 text-right text-[13px] font-medium leading-5 text-[#7187a8]">
              Last data load: {lastDataLoad}
            </p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {displayRows.slice(0, 4).map((row) => (
              <StatusCard
                key={row.chain}
                row={row}
                primaryChange={primaryChangeMap.get(row.chain)}
              />
            ))}
          </div>

          <div className="mt-12 grid overflow-hidden rounded-[14px] border border-[#c9d9ea] bg-[#edf5fb] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)] sm:grid-cols-2 lg:grid-cols-5">
            <FeaturePill icon={<CalendarIcon />} title="Daily JSON" note="Fresh data every day" />
            <FeaturePill icon={<CalendarIcon />} title="Long history" note={`${publishedDays} days and growing`} />
            <FeaturePill icon={<TriangleIcon />} title="4 Chains" note="BTC, ETH, ARB, BASE" />
            <FeaturePill icon={<ApiIcon />} title="API First" note="Built for developers" />
            <FeaturePill icon={<ShieldIcon />} title="Transparent" note="Deterministic methodology" />
          </div>
```

**REPLACE WITH**:

```tsx
      <section className="relative bg-[linear-gradient(180deg,#eaf5ff_0%,#f5f9ff_58%,#eef6ff_100%)] pb-0 pt-10">
        <SectionShell>
          <div className="grid overflow-hidden rounded-[14px] border border-[#c9d9ea] bg-[#edf5fb] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)] sm:grid-cols-2 lg:grid-cols-5">
            <FeaturePill icon={<CalendarIcon />} title="Daily JSON" note="Fresh data every day" />
            <FeaturePill icon={<CalendarIcon />} title={`${publishedDays} days`} note="Public archive, growing daily" />
            <FeaturePill icon={<TriangleIcon />} title="4 Chains" note="One identical schema" />
            <FeaturePill icon={<ApiIcon />} title="API First" note="Authenticated JSON, your stack" />
            <FeaturePill icon={<ShieldIcon />} title="0 rewrites" note="No retroactive label changes" />
          </div>

          <div className="mt-12 flex items-start justify-between gap-6">
            <div>
              <div className="text-[13px] font-black uppercase tracking-[0.12em] text-[#0d2447]">
                Latest chain status
              </div>
              <p className="mt-1 text-[14px] font-medium leading-5 text-[#557099]">
                Click any chain card to open the full chain view and history.
              </p>
            </div>

            <p className="shrink-0 pt-0.5 text-right text-[13px] font-medium leading-5 text-[#7187a8]">
              Last data load: {lastDataLoad}
            </p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {displayRows.slice(0, 4).map((row) => (
              <StatusCard
                key={row.chain}
                row={row}
                primaryChange={primaryChangeMap.get(row.chain)}
              />
            ))}
          </div>
```

> **What changed:** trust pills are now **first** (proof of life) before the live status grid. Two pill copies were updated: `Long history` → live `${publishedDays} days` headline; `Transparent / Deterministic methodology` → `0 rewrites / No retroactive label changes`. The `Get started in 3 easy steps` block (originally rendered after the pills) stays in its old position — see EDIT 4.

---

### EDIT 4 — Move "Get started" below "JSON is our product"

**FIND** (around line 1882–1891):

```tsx
          <div className="mt-16 px-2 text-center">
            <h2 className="text-[26px] font-black tracking-[-0.02em] text-[#0d2447]">
              Get started in 3 easy steps
            </h2>
            <div className="mx-auto mt-7 grid max-w-[900px] gap-6 md:grid-cols-3 md:gap-8">
              <StepItem number="1" title="Choose a plan" note="Pick the right plan for your needs" />
              <StepItem number="2" title="Get API access" note="Instant access to the JSON API" />
              <StepItem number="3" title="Pull JSON" note="Integrate and start building" />
            </div>
          </div>

            <div
              id="json-layers"
              className="mt-16 scroll-mt-20 px-0 py-0 text-[#0d2447]"
            >
```

**REPLACE WITH** (the "Get started" block is removed here — it returns later, see EDIT 5):

```tsx
            <div
              id="json-layers"
              className="mt-16 scroll-mt-20 px-0 py-0 text-[#0d2447]"
            >
```

---

### EDIT 5 — Insert "Get started" + "Most popular" pricing tag

**FIND** (around line 1997–2034):

```tsx
          <div className="mt-14 -mx-5 bg-[#031329] px-5 py-10 sm:-mx-7 sm:px-7 lg:-mx-10 lg:px-10 2xl:-mx-16 2xl:px-16">
            <div id="pricing" className="mx-auto w-full">
              <div className="grid gap-7 xl:grid-cols-3">
                <PlanCard
                  tone="free"
                  name="Free"
                  price="$0"
                  pill="Public surface"
                  headline="Full web surface — no API access."
                  body="Track record, status, methodology, glossary, thresholds, and schema reference. The same published artifacts subscribers receive — readable on-site, not downloadable."
                  bestFor="Best for: exploring the product before subscribing."
                  href="/status"
                  cta="Open public surface →"
                />
                <PlanCard
                  tone="basic"
                  name="Single Chain"
                  price="$49/mo"
                  pill="1 chain · 90d · JSON"
                  headline="One chain. API access. 90-day history."
                  body="Gold, Meta, Derived, and Briefs JSON for one chain of your choice — BTC, ETH, ARB, or BASE. Delivered daily via authenticated API."
                  bestFor="Best for: independent analysts validating the dataset against one chain."
                  href="/dashboard"
                  cta="Start Single Chain →"
                />
                <PlanCard
                  tone="pro"
                  name="Research"
                  price="$149/mo"
                  pill="4 chains · 365d · JSON"
                  headline="All four chains. API access. 365-day history."
                  body="Gold, Meta, Derived, and Briefs JSON across BTC, ETH, ARB, and BASE. Standard Research includes 365 days of subscriber API history. The public track record may be longer because it reflects the full published archive."
                  bestFor="Best for: multi-chain research, backtesting, and production pipelines."
                  href="/dashboard"
                  cta="Start Research →"
                />
              </div>
            </div>

          </div>
```

**REPLACE WITH**:

```tsx
          <div className="mt-14 px-2 text-center">
            <h2 className="text-[26px] font-black tracking-[-0.02em] text-[#0d2447]">
              Get started in 3 easy steps
            </h2>
            <div className="mx-auto mt-7 grid max-w-[900px] gap-6 md:grid-cols-3 md:gap-8">
              <StepItem number="1" title="Choose a plan" note="Pick the right plan for your needs" />
              <StepItem number="2" title="Get API access" note="Instant access to the JSON API" />
              <StepItem number="3" title="Pull JSON" note="Integrate and start building" />
            </div>
          </div>

          <div className="mt-14 -mx-5 bg-[#031329] px-5 py-10 sm:-mx-7 sm:px-7 lg:-mx-10 lg:px-10 2xl:-mx-16 2xl:px-16">
            <div id="pricing" className="mx-auto w-full">
              <div className="grid gap-7 xl:grid-cols-3">
                <PlanCard
                  tone="free"
                  name="Free"
                  price="$0"
                  pill="Public surface"
                  headline="Full web surface — no API access."
                  body="Track record, status, methodology, glossary, thresholds, and schema reference. The same published artifacts subscribers receive — readable on-site, not downloadable."
                  bestFor="Best for: exploring the product before subscribing."
                  href="/status"
                  cta="Open public surface →"
                />
                <PlanCard
                  tone="basic"
                  name="Single Chain"
                  price="$49/mo"
                  pill="1 chain · 90d · JSON"
                  headline="One chain. API access. 90-day history."
                  body="Gold, Meta, Derived, and Briefs JSON for one chain of your choice — BTC, ETH, ARB, or BASE. Delivered daily via authenticated API."
                  bestFor="Best for: independent analysts validating the dataset against one chain."
                  href="/dashboard"
                  cta="Start Single Chain →"
                />
                <PlanCard
                  tone="pro"
                  name="Research"
                  price="$149/mo"
                  pill="4 chains · 365d · JSON"
                  headline="All four chains. API access. 365-day history."
                  body="Gold, Meta, Derived, and Briefs JSON across BTC, ETH, ARB, and BASE. Standard Research includes 365 days of subscriber API history. The public track record may be longer because it reflects the full published archive."
                  bestFor="Best for: multi-chain research, backtesting, and production pipelines."
                  href="/dashboard"
                  cta="Start Research →"
                  badge="Most popular"
                />
              </div>
            </div>

          </div>
```

> **Important:** the `badge` prop is added on the Pro `<PlanCard>` only. EDIT 6 below extends the `PlanCard` component to render this badge.

---

### EDIT 6 — Extend PlanCard with optional badge prop

**FIND** (around line 1668–1697):

```tsx
function PlanCard(props: {
  tone: "free" | "basic" | "pro";
  name: string;
  price: string;
  pill: string;
  headline: string;
  body: string;
  bestFor: string;
  href: string;
  cta: string;
}) {
  const cardClass =
    "border border-[#89a9d1]/28 bg-[linear-gradient(145deg,rgba(22,34,54,0.96)_0%,rgba(55,78,112,0.88)_40%,rgba(30,47,73,0.96)_72%,rgba(18,29,47,0.98)_100%)] shadow-[inset_0_1px_0_rgba(210,230,255,0.18),inset_0_-1px_0_rgba(255,255,255,0.03),0_22px_60px_rgba(3,14,32,0.32)]";

  const pillClass =
    "border border-[#b8d1f0]/22 bg-[linear-gradient(180deg,rgba(210,228,248,0.14)_0%,rgba(150,181,214,0.08)_100%)] text-[#e3efff] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]";

  const buttonClass =
    "border border-[#9fc1ea]/30 bg-[linear-gradient(180deg,rgba(176,205,236,0.16)_0%,rgba(107,146,191,0.12)_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[linear-gradient(180deg,rgba(176,205,236,0.22)_0%,rgba(107,146,191,0.16)_100%)]";

  return (
    <article className={`relative flex min-h-[405px] flex-col rounded-[28px] p-8 ${cardClass}`}>
      <div className="flex items-start justify-between gap-5">
        <h3 className="text-[15px] font-black uppercase tracking-[0.22em] text-white">
          {props.name}
        </h3>
        <div className={`rounded-full px-4 py-1.5 text-[12px] font-black ${pillClass}`}>
          {props.pill}
        </div>
      </div>
```

**REPLACE WITH**:

```tsx
function PlanCard(props: {
  tone: "free" | "basic" | "pro";
  name: string;
  price: string;
  pill: string;
  headline: string;
  body: string;
  bestFor: string;
  href: string;
  cta: string;
  badge?: string;
}) {
  const isFeatured = Boolean(props.badge);

  const cardClass = isFeatured
    ? "border border-[#2f7cff]/55 bg-[linear-gradient(145deg,rgba(20,42,86,0.98)_0%,rgba(36,82,156,0.92)_42%,rgba(20,42,86,0.98)_100%)] shadow-[inset_0_1px_0_rgba(140,180,255,0.28),inset_0_-1px_0_rgba(255,255,255,0.05),0_28px_70px_rgba(8,40,100,0.42)]"
    : "border border-[#89a9d1]/28 bg-[linear-gradient(145deg,rgba(22,34,54,0.96)_0%,rgba(55,78,112,0.88)_40%,rgba(30,47,73,0.96)_72%,rgba(18,29,47,0.98)_100%)] shadow-[inset_0_1px_0_rgba(210,230,255,0.18),inset_0_-1px_0_rgba(255,255,255,0.03),0_22px_60px_rgba(3,14,32,0.32)]";

  const pillClass =
    "border border-[#b8d1f0]/22 bg-[linear-gradient(180deg,rgba(210,228,248,0.14)_0%,rgba(150,181,214,0.08)_100%)] text-[#e3efff] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]";

  const buttonClass = isFeatured
    ? "border border-white/30 bg-white text-[#0d2447] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_24px_rgba(255,255,255,0.18)] hover:bg-[#eaf3fb]"
    : "border border-[#9fc1ea]/30 bg-[linear-gradient(180deg,rgba(176,205,236,0.16)_0%,rgba(107,146,191,0.12)_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[linear-gradient(180deg,rgba(176,205,236,0.22)_0%,rgba(107,146,191,0.16)_100%)]";

  return (
    <article className={`relative flex min-h-[405px] flex-col rounded-[28px] p-8 ${cardClass}`}>
      {props.badge ? (
        <div className="absolute -top-3 left-7 inline-flex rounded-full border border-[#2f7cff]/45 bg-[#2f7cff] px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_8px_18px_rgba(47,124,255,0.42)]">
          {props.badge}
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-5">
        <h3 className="text-[15px] font-black uppercase tracking-[0.22em] text-white">
          {props.name}
        </h3>
        <div className={`rounded-full px-4 py-1.5 text-[12px] font-black ${pillClass}`}>
          {props.pill}
        </div>
      </div>
```

---

## After applying all six edits

The new top-of-page sequence (above the fold + just below) will read:

1. **Hero** — tagline, sub-tagline, primary CTA "View historical example JSONs", ghost CTA "View API Docs"
2. **HeroJsonPeek** — left side: "Three files per chain per day" claim with three concrete stats (`0 retroactive label changes`, `3 JSON layers`, `4 chains one schema`); right side: a syntax-highlighted JSON preview, clickable end-to-end, opens the live JSON modal
3. **WhoThisIsFor** — three audience cards, 2x2 concrete uses, boundary disclaimer, and the Why-Urd-Atlas comparison table beneath
4. **Trust pills** — `Daily JSON · ${publishedDays} days · 4 Chains · API First · 0 rewrites`
5. **Latest chain status** — live cards
6. **JSON is our product** — Gold/Meta/Derived deep dive with example openers
7. **Get started in 3 easy steps**
8. **Pricing** — Pro card now carries a "Most popular" badge

The "View example JSON" call-to-action now appears in **three places** above and around the fold:
- Hero primary CTA
- HeroJsonPeek (clickable JSON card + dedicated button)
- WhoThisIsFor "Inspect sample JSON →"

All three open the same `#json-example-picker` modal.
