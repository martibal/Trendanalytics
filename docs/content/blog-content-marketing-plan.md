# Urd Atlas blog and content marketing plan

Status: Active launch plan.

## Purpose

The content program exists to build trust, explain methodology, and show how Urd Atlas turns on-chain activity data into transparent descriptive trend context.

It must never make market calls, investment recommendations, return projections, or price-linked claims.

## Audience

Primary readers:

- professional crypto investors evaluating data infrastructure
- advanced amateurs who want context rather than intraday noise
- analysts who need transparent definitions and reproducible JSON outputs
- technically curious subscribers who want methodology before paying

## Core content promise

Each post should answer one of these questions:

- What changed in the published dataset?
- Which observation is notable relative to historical context?
- Which methodology detail helps users interpret the platform?
- Which data-quality or freshness caveat matters this week?
- How should a user reproduce the observation from the public or subscriber artifacts?

## Publishing cadence

Default cadence:

- one article per week
- target production time: 45 to 60 minutes
- publish only when the dataset and methodology references are current
- skip rather than publish thin or ambiguous content

Optional cadence during launch:

- one launch explainer
- one methodology explainer
- one weekly observation article
- one API/getting-started article

## Recurring article formats

### Weekly observation note

Goal: explain one or two notable descriptive observations.

Required sections:

- headline
- short summary
- chain and window
- metric or axis involved
- what changed
- historical context
- confidence and freshness caveat
- how to reproduce from JSON
- non-advisory boundary note

### Methodology explainer

Goal: teach one concept behind the product.

Allowed topics:

- robust z-score
- percentile rank
- MA7 versus MA30
- confidence score
- freshness and lag policy
- regime axis definitions
- coverage and non-null ratios

Required sections:

- concept
- why it exists
- how it is calculated or derived
- what it can and cannot mean
- link to methodology/wiki page

### API education note

Goal: help a subscriber use the product correctly.

Allowed topics:

- creating an access value
- reading file paths
- choosing windows
- interpreting meta, gold, and derived outputs
- handling freshness and lag
- building a local reproducibility check

Required sections:

- task
- endpoint or file path family
- expected output shape
- safe operational caveats
- link to dashboard/API docs

## Editorial rules

Every post must follow these rules:

- write in English
- be descriptive, not prescriptive
- avoid price data, price language, and forecast language
- avoid investment advice
- separate observation from interpretation
- include caveats when data lag or coverage matters
- include methodology links for technical terms
- include source artifact paths where possible
- never include subscriber-only values unless they are already intended for the reader's own account
- never include access values, billing identifiers, raw event payloads, browser session material, or private operational logs

## Weekly production workflow

1. Open the current dataset index and the relevant chain files.
2. Identify one observation with enough confidence, coverage, and freshness context.
3. Draft using one of the article formats above.
4. Verify every metric name and window against the published artifacts.
5. Add caveats for lag, coverage, and methodology limitations.
6. Run a boundary review for advice, price language, and unsupported claims.
7. Publish or schedule the article.
8. Record the article title, date, and artifact references in the content log.

## Boundary checklist before publishing

A post is publishable only if the answer is yes to all checks:

- Is the post descriptive?
- Does it avoid advice and forecast language?
- Does it avoid price data and price-linked claims?
- Are metric names and chain names correct?
- Are windows and dates explicit?
- Is freshness or lag explained where relevant?
- Are caveats included?
- Are methodology links included?
- Are reproduction paths included where practical?
- Are no access values or private operational details included?

## Initial eight-week calendar

Week 1:
Launch explainer â€” What Urd Atlas measures and what it deliberately excludes.

Week 2:
Methodology explainer â€” Why regime context is different from raw daily spikes.

Week 3:
API education â€” How to read gold, meta, and derived files.

Week 4:
Weekly observation note â€” One notable demand-axis observation with freshness caveats.

Week 5:
Methodology explainer â€” How confidence and coverage affect interpretation.

Week 6:
API education â€” Reproducing a weekly observation from JSON artifacts.

Week 7:
Weekly observation note â€” One friction or capacity observation with historical context.

Week 8:
Methodology explainer â€” How lag policies differ across Bitcoin, Ethereum, Base, and Arbitrum.

## Success measures

Operational measures:

- weekly cadence maintained or intentionally skipped with reason
- every post passes boundary checklist
- every post links to methodology or API docs
- no post requires urgent correction for unsupported claims

Business measures:

- newsletter or article click-through to dashboard/API docs
- conversion from education pages to checkout
- subscriber support questions reduced through better explanations
- recurring readers returning for weekly observation notes

## Ownership

The operator owns topic selection, drafting, review, and publication.

A post is not considered ready until the boundary checklist is complete.
