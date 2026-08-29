# 62-question due-diligence acceptance matrix

Status: **recertification in progress**. This file previously over-stated completion: the repository preserves the exact numbered wording for only the 27 questions that had been partial/unanswered. Those 27 are evidence-backed, but that is not sufficient evidence for an exact `62/62 VERIFIED` claim.

Legend:
- PASS = public/technical/provider evidence exists and matches current implementation.
- MANUAL = requires provider/account or legal verification in addition to repository changes.
- BLOCKED = not yet complete and must not be described publicly as complete.

Dated provider evidence: `provider-verification-2026-08-27.md`, `provider-verification-2026-08-28.md`, and `provider-verification-2026-08-28-recertification.md`.

## Scope rule

Do not describe Urd Atlas as `62/62 verified` until a canonical file containing the exact Q1–Q62 wording exists and every row has been rechecked against current code, current public copy and fresh provider/account evidence where applicable. The prior 27/27 closeout remains useful evidence, but it is a subset rather than proof of all 62.

## Exact questions preserved in the repository and reverified

| Q | Requirement | Target evidence | Verification class | Status |
|---:|---|---|---|---|
| 2 | Exact Evidence score formula to component level | `/methodology/evidence-score`, `api/confidence_engine.py` | docs + code | PASS |
| 6 | Exact source provider/dataset family per chain | `/methodology/sources` | docs + pipeline | PASS |
| 10 | Failed-transaction aggregation semantics | `/methodology/transaction-semantics` | docs + field contract | PASS |
| 12 | Current changelog aligned to active confidence method | `/methodology/changelog`, `src/lib/methodologyVersion.ts` | docs + source-of-truth | PASS |
| 13 | Every public row artifact self-describes schema version | published Gold/Derived/Meta/Briefs + `dataset.json.schema_versions` | pipeline + published data | PASS |
| 14 | Breaking-change definition and notice period | `/api-docs/versioning` | public contract | PASS |
| 15 | Representative no-payment current sample | landing data surface, `/api-docs/samples` | live public data | PASS |
| 20 | Public product demo | `/demo` | public product walkthrough | PASS |
| 24 | Numeric rate-limit policy + 429 semantics | `/api-docs/rate-limits`, `preAuthRateLimit.ts` | docs + code | PASS |
| 25 | OpenAPI | `/openapi.json` | machine-readable contract | PASS |
| 26 | Official SDK/client | `sdk/python`, `/api-docs/sdk` | code + docs | PASS |
| 30 | Source late/missing/incomplete decision matrix | `/methodology/sources` | public policy | PASS |
| 31 | Explicit price/no setup/no usage-fee statement | `/terms` | commercial contract | PASS — customer names Single Chain / Research |
| 35 | Post-cancellation retention right | `/terms` §6 | legal/commercial policy | PASS |
| 36 | Mid-period upgrade/downgrade/proration behavior | `/terms` §7 + fresh live Stripe portal evidence | repository + provider | PASS — self-service plan switching disabled; cancellation at period end; portal proration none |
| 37 | Taxes/MVA visible before purchase | `/terms` §4 + fresh live Stripe checkout/registration evidence | provider + commercial disclosure | PASS — no Tax registrations; automatic tax disabled; live completed sessions show zero added tax |
| 39 | Governing law | `/terms` §22 | legal | PASS, legal review recommended |
| 42 | Positive excerpt/attribution policy | `/terms` §10 | license contract | PASS |
| 43 | Automation / AI / downstream model policy | `/terms` §11 | license contract | PASS |
| 44 | Privacy policy names actual processors | `/privacy`, `/subprocessors` | privacy docs | PASS subject to final provider inventory review |
| 45 | Wind-down/export policy | `/terms` §20, `/service` | service contract | PASS |
| 46 | Security/privacy incident notification policy | `/privacy`, `/terms`, `/security` | privacy/security | PASS subject to legal review |
| 47 | Encryption/security statement | `/security` + fresh provider evidence + Supabase advisor remediation | security docs + provider controls | PASS — no unverified optional-control claim; production DB Data API exposure hardened |
| 48 | Vendor × data-category matrix | `/subprocessors` | privacy/vendor inventory | PASS subject to inventory confirmation |
| 51 | Responsible disclosure | `/security/reporting`, `/.well-known/security.txt` | security | PASS |
| 52 | GDPR-oriented notice | `/privacy` | privacy/legal | PASS subject to legal review |
| 53 | Public operator/founder accountability | `/operator` | public company/operator info | PASS |

### Verified subset count

- PASS: 27
- MANUAL: 0
- BLOCKED: 0

This count is deliberately labeled **27/27 verified subset**, not 62/62.

## Full-recertification findings discovered 2026-08-28

1. **Customer plan-name drift:** live Stripe products and onboarding use `Single Chain` / `Research`, while several public surfaces still used internal identifiers `Basic` / `Pro`. Customer-facing copy is being normalized; internal `basic` / `pro` identifiers remain valid implementation details.
2. **Publication-cadence drift:** the active scheduler and Terms/Service use 08:00/20:00 Europe/Oslo, while FAQ copy still stated 09:00/21:00. Public copy is being normalized to the scheduler contract.
3. **Supabase stale status:** `trendanalytics-prod` was reported INACTIVE on 2026-08-27, but fresh 2026-08-28 management and SQL checks report ACTIVE_HEALTHY and a working database. The old observation remains historical evidence only.
4. **Supabase Data API exposure:** fresh Security Advisor checks found all six `public` tables with RLS disabled and `anon`/`authenticated` SELECT privileges. Production was hardened immediately: RLS enabled, those privileges revoked, server-side Prisma/Postgres access retained, and ERROR-level advisor findings cleared. The change is captured by Prisma migration `20260828202100_lock_down_supabase_data_api`.
5. **Commercial-policy drift:** the internal policy described an intended self-service plan-change/proration flow that did not match the live Stripe portal. It is being replaced with the verified current behavior.

## Automated release checks to maintain

1. Published Gold/Derived/Meta/Briefs JSON contains the expected `schema_version`.
2. `dataset.json.schema_versions` matches the artifact schema contract.
3. No published JSON contains NaN/Infinity.
4. Active public confidence method is `confidence_v3_l2_capacity_required` until deliberately version-bumped.
5. Sample/evaluation surfaces distinguish current live artifacts from frozen historical fixtures.
6. `/openapi.json` parses as JSON and declares OpenAPI 3.1.
7. Public rate-limit documentation remains synchronized with code defaults or explicitly states runtime override behavior.
8. Terms/Service/FAQ publication cadence matches the active scheduler contract (08:00/20:00 Europe/Oslo primary windows).
9. Customer-facing plan names are `Single Chain` and `Research`; `basic`/`pro` may appear only as internal identifiers, metadata, enum values or compatibility aliases.
10. Supabase public subscriber/account tables remain inaccessible to `anon`/`authenticated` unless an explicit reviewed RLS access model is deliberately introduced.
11. Required trust routes exist: `/security`, `/subprocessors`, `/security/reporting`, `/privacy`, `/terms`, `/operator`, `/api-docs/versioning`, `/api-docs/rate-limits`, `/methodology/evidence-score`, `/methodology/sources`.
12. A methodology/schema-breaking change updates the public changelog/version documentation in the same release.

## Ongoing operational/legal follow-up

- Tax registration obligations remain an operator/accounting matter. If collection becomes required, configure the appropriate registration and checkout behavior before representing tax collection as enabled.
- Upstash encryption at rest is plan-specific; Urd Atlas does not claim it is enabled unless separately verified.
- Confirm the production subprocessor inventory whenever a provider is added or removed.
- Legal review is still recommended before representing Terms/Privacy as externally reviewed for institutional procurement.

## Release rule

Do not infer `62/62` from a subset. Do not convert a factual provider control into a stronger public claim than the evidence supports. Negative or limited provider findings are valid evidence when the question asks for current state; optional capabilities must not be represented as enabled merely to make a checklist appear complete.
