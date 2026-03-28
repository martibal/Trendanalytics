# Chain page redesign notes

Target file: `src/app/chains/[chain]/page.tsx`

This note tells you **where** the new explanation system should be wired into the current chain page.

## 1. Add a real chain primer under the chain title

Current problem:
- subtitle is too short
- user still does not know what BTC / ETH / Arbitrum / Base actually are
- page jumps too quickly into model outputs

Implementation:
- import `CHAIN_PAGE_EXPLAINERS` from `@/lib/content/chainExplainers`
- read `const explainers = CHAIN_PAGE_EXPLAINERS[chainId]`
- directly under the title/subtitle/as-of row, insert an `ExplainableCard` using `explainers.primer`

What it should answer:
- what chain is this?
- what makes it different?
- why should I care?
- which metrics matter most here?

## 2. Replace flat Regime / Confidence / Determinism boxes with explainable boxes

Current problem:
- boxes show values but do not teach the user what the value means
- user sees a number or label before understanding the concept

Implementation:
- keep the visible value / badge / gauge
- beneath each visible value, add a short one-sentence explanation
- add an expandable `ExplainableCard` per concept

### Regime card should answer
- what is a regime?
- what does the current label mean?
- why is the page surfacing it?
- why should the user care?
- what are the other possible labels?
- what rule family produced this one?

Recommended content sources:
- `SHARED_EXPLAINERS.regime`
- `SHARED_EXPLAINERS.regimeValue`
- label-specific explainer such as `heating`, `stable`, `congested`, `cheap`, `unknownDegraded`

### Confidence card should answer
- what does confidence mean here?
- what does 0.758 mean?
- what does Good / Caution / Degraded mean?
- why do I need to monitor this?
- what is the 0.40 floor?

Recommended content sources:
- `SHARED_EXPLAINERS.confidence`
- `SHARED_EXPLAINERS.confidenceBand`

Important semantic rule:
- do not show a big warning copy that sounds degraded if the actual band is Good
- warning text must agree with the real confidence band

### Determinism card should answer
- why is this here at all?
- what does the hash mean?
- what does window days mean?
- why should advanced users care?

Recommended content source:
- `SHARED_EXPLAINERS.determinism`

## 3. Upgrade the scorecard section header into a real explanation block

Current user complaint:
- Demand / Friction / Capacity appear multiple times before being properly explained
- "Normal" is unclear because the user does not know the comparison frame

Implementation:
- add an explanation block above the score gauges
- explicitly say: 50 is neutral vs the chain's own history
- explicitly say: higher Demand = more usage pressure
- explicitly say: higher Friction = higher cost / difficulty
- explicitly say: higher Capacity = tighter conditions, not more spare room
- add expandable `ExplainableCard`s or `MetricInfoBox` rows for:
  - Scorecard overview
  - Demand
  - Friction
  - Capacity
  - Coverage
  - Effective confidence

Recommended content sources:
- `SHARED_EXPLAINERS.scorecard`
- `SHARED_EXPLAINERS.demand`
- `SHARED_EXPLAINERS.friction`
- `SHARED_EXPLAINERS.capacity`
- `SHARED_EXPLAINERS.coverage`
- `SHARED_EXPLAINERS.effectiveConfidence`

## 4. Explain why drivers are selective

Current user complaint:
- “why is there only tx_count_daily?”

Implementation:
- add an explanation block above the drivers table and the current-driver cards
- explicitly say:
  - drivers are the strongest currently surfaced evidence rows
  - this is not necessarily the full universe of model inputs
  - a single metric can appear because it is currently the strongest surfaced driver for the visible regime

Recommended content source:
- `SHARED_EXPLAINERS.drivers`

## 5. Upgrade each metric panel so it teaches, not just plots

Current problem:
- charts show the metric but the user does not know why it matters
- nested boxes feel visually confusing

Implementation direction:
- patch `MetricLineChart.tsx` later so each panel shows:
  - one short visible definition,
  - one short “why this metric is useful” sentence,
  - expandable explanation with Basic / Advanced,
  - clearer statement of what MA7 / MA30 are doing here.

Recommended content source:
- `METRIC_EXPLAINERS[metric]`

## 6. Phrase all “normal” labels correctly

Whenever the UI says `Normal`, it should mean:
- normal **relative to the chain's own recent history**
- not normal relative to another chain
- not normal relative to a global market average
- not harmless or unimportant by default

That needs to be said explicitly in the explanatory layer.

## 7. Keep the first view readable

The user explicitly asked for much more substance, but also asked that it be behind buttons.

So the desired interaction model is:
- **visible layer** = short, plain, confidence-inspiring summary
- **expandable layer** = deep Basic / Advanced explanation

Do not dump the full text into the first viewport.
