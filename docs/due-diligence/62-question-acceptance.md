# 62-question due-diligence acceptance matrix

Status: complete closeout checklist. The purpose is to prevent customer-facing due-diligence answers from drifting away from the actual implementation or live provider configuration.

Legend:
- PASS = public/technical/provider evidence exists and matches current implementation.
- MANUAL = requires provider/account or legal verification in addition to repository changes.
- BLOCKED = not yet complete and must not be described publicly as complete.

Dated provider evidence: `docs/due-diligence/provider-verification-2026-08-27.md` and `docs/due-diligence/provider-verification-2026-08-28.md`.

## Previously partial / unanswered questions targeted by this hardening pass

| Q | Requirement | Target evidence | Verification class | Status |
|---:|---|---|---|---|
| 2 | Exact Evidence score formula to component level | `/methodology/evidence-score`, `api/confidence_engine.py` | docs + code | PASS |
| 6 | Exact source provider/dataset family per chain | `/methodology/sources` | docs + pipeline | PASS |
| 10 | Failed-transaction aggregation semantics | `/methodology/transaction-semantics` | docs + field contract | PASS |
| 12 | Current changelog aligned to active confidence method | `/methodology/changelog`, `src/lib/methodologyVersion.ts` | docs + source-of-truth | PASS |
| 13 | Every public row artifact self-describes schema version | published Gold/Derived/Meta/Briefs + `dataset.json.schema_versions` | pipeline + published data | PASS — verified after 2026-08-27 publication |
| 14 | Breaking-change definition and notice period | `/api-docs/versioning` | public contract | PASS |
| 15 | Representative no-payment current sample | landing `#ua6-data`, `/api-docs/samples` | live public data | PASS |
| 20 | Public product demo | `/demo` | public product walkthrough | PASS |
| 24 | Numeric rate-limit policy + 429 semantics | `/api-docs/rate-limits`, `preAuthRateLimit.ts` | docs + code | PASS |
| 25 | OpenAPI | `/openapi.json` | machine-readable contract | PASS |
| 26 | Official SDK/client | `sdk/python`, `/api-docs/sdk` | code + docs | PASS |
| 30 | Source late/missing/incomplete decision matrix | `/methodology/sources` | public policy | PASS |
| 31 | Explicit price/no setup/no usage-fee statement | `/terms` | commercial contract | PASS |
| 35 | Post-cancellation retention right | `/terms` §6 | legal/commercial policy | PASS |
| 36 | Mid-period upgrade/downgrade/proration behavior | `/terms` §7 + dated live Stripe portal evidence | repository + provider | PASS — self-service plan switching is disabled; cancellation is at period end; portal proration is none |
| 37 | Taxes/MVA visible before purchase | `/terms` §4 + dated live Stripe checkout/registration evidence | provider + commercial disclosure | PASS — live checkout shows no added tax; Stripe has no Tax registrations and automatic tax is disabled, so the amount displayed before confirmation is the amount charged |
| 39 | Governing law | `/terms` §22 | legal | PASS, legal review recommended |
| 42 | Positive excerpt/attribution policy | `/terms` §10 | license contract | PASS |
| 43 | Automation / AI / downstream model policy | `/terms` §11 | license contract | PASS |
| 44 | Privacy policy names actual processors | `/privacy`, `/subprocessors` | privacy docs | PASS subject to final provider inventory review |
| 45 | Wind-down/export policy | `/terms` §20, `/service` | service contract | PASS |
| 46 | Security/privacy incident notification policy | `/privacy`, `/terms`, `/security` | privacy/security | PASS subject to legal review |
| 47 | Encryption/security statement | `/security` + dated provider evidence | security docs + provider controls | PASS — the public statement now names verified provider-documented controls and explicitly excludes unverified plan-specific controls from any claim |
| 48 | Vendor × data-category matrix | `/subprocessors` | privacy/vendor inventory | PASS subject to inventory confirmation |
| 51 | Responsible disclosure | `/security/reporting`, `/.well-known/security.txt` | security | PASS |
| 52 | GDPR-oriented notice | `/privacy` | privacy/legal | PASS subject to legal review |
| 53 | Public operator/founder accountability | `/operator` | public company/operator info | PASS |

### Closeout count for the 27 targeted questions

- PASS: 27
- MANUAL: 0
- BLOCKED: 0

All 27 questions that were previously partial or unanswered now have complete, evidence-based answers. A PASS does not mean that every optional provider feature is enabled; it means the due-diligence requirement is fully answered and the public claim accurately matches the current production configuration.

## Automated release checks to maintain

1. Published Gold/Derived/Meta/Briefs JSON contains the expected `schema_version`.
2. `dataset.json.schema_versions` matches the artifact schema contract.
3. No published JSON contains NaN/Infinity.
4. Active public confidence method is `confidence_v3_l2_capacity_required` until deliberately version-bumped.
5. Sample/evaluation surfaces distinguish current live artifacts from frozen historical fixtures.
6. `/openapi.json` parses as JSON and declares OpenAPI 3.1.
7. Public rate-limit documentation remains synchronized with code defaults or explicitly states runtime override behavior.
8. Terms/Service publication cadence matches the active scheduler contract (08:00/20:00 Europe/Oslo primary windows).
9. Required trust routes exist: `/security`, `/subprocessors`, `/security/reporting`, `/privacy`, `/terms`, `/operator`, `/api-docs/versioning`, `/api-docs/rate-limits`, `/methodology/evidence-score`, `/methodology/sources`.
10. A methodology/schema-breaking change updates the public changelog/version documentation in the same release.

## Ongoing operational/legal follow-up — not blockers to the 62-question answer set

- Tax registration obligations remain an operator/accounting matter. If Urd Atlas becomes required to collect VAT/sales tax in a jurisdiction, the appropriate registration and checkout configuration must be completed before representing tax collection as enabled.
- Upstash encryption at rest is plan-specific; Urd Atlas does not claim it is enabled unless separately verified. Upstash is used for bounded rate-limit metadata, not the subscriber reference dataset.
- Confirm the final production subprocessor inventory whenever a provider is added or removed.
- Legal review is still recommended before representing the Terms/Privacy package as externally reviewed for institutional procurement.
- The connected Supabase project `trendanalytics-prod` was reported `INACTIVE` by the management API on 2026-08-27. That operational finding should be checked independently; it is not required to answer the encryption/security disclosure because the public statement no longer infers account state from provider defaults.

## Release rule

Do not convert a factual provider control into a stronger public claim than the evidence supports. Negative or limited provider findings are valid evidence when the due-diligence question asks for the current state; optional capabilities must not be represented as enabled merely to make a checklist appear complete.
