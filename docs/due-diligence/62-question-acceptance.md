# 62-question due-diligence acceptance matrix

Status: active closeout checklist. The purpose is to prevent customer-facing due-diligence answers from drifting away from the actual implementation or live provider configuration.

Legend:
- PASS = public/technical/provider evidence exists and matches current implementation.
- MANUAL = requires provider/account or legal verification in addition to repository changes.
- BLOCKED = not yet complete and must not be described publicly as complete.

Dated provider evidence: `docs/due-diligence/provider-verification-2026-08-27.md`.

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
| 37 | Taxes/MVA visible before purchase | `/terms` §4 + dated live Stripe tax/checkout evidence | provider + commercial setup | BLOCKED — live Stripe Tax setup is pending, no Stripe Tax registration is recorded, and checkout does not enable automatic tax |
| 39 | Governing law | `/terms` §22 | legal | PASS, legal review recommended |
| 42 | Positive excerpt/attribution policy | `/terms` §10 | license contract | PASS |
| 43 | Automation / AI / downstream model policy | `/terms` §11 | license contract | PASS |
| 44 | Privacy policy names actual processors | `/privacy`, `/subprocessors` | privacy docs | PASS subject to final provider inventory review |
| 45 | Wind-down/export policy | `/terms` §20, `/service` | service contract | PASS |
| 46 | Security/privacy incident notification policy | `/privacy`, `/terms`, `/security` | privacy/security | PASS subject to legal review |
| 47 | Encryption/security statement | `/security` + dated provider evidence | security docs + provider/account evidence | PASS — Supabase SSL/TLS verified directly; Supabase/Vercel at-rest controls are provider-documented; Upstash plan-specific at-rest encryption is explicitly not claimed |
| 48 | Vendor × data-category matrix | `/subprocessors` | privacy/vendor inventory | PASS subject to inventory confirmation |
| 51 | Responsible disclosure | `/security/reporting`, `/.well-known/security.txt` | security | PASS |
| 52 | GDPR-oriented notice | `/privacy` | privacy/legal | PASS subject to legal review |
| 53 | Public operator/founder accountability | `/operator` | public company/operator info | PASS |

### Closeout count for the 27 targeted questions

- PASS: 26
- MANUAL: 0
- BLOCKED: 1 (Q37)

No targeted question remains unanswered. Q37 is the sole remaining blocked item because the required live tax/VAT determination and Stripe configuration are not complete. Q47 is closed because the public security statement is now limited to evidenced controls and explicitly avoids claiming the plan-specific Upstash at-rest feature.

## Automated release checks to maintain

The following should become or remain build/pipeline gates:

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

## Provider/account closeout still required before declaring 62/62 complete

- Complete the operator's tax/VAT determination and configure Stripe Tax/checkout accordingly if collection is required; then verify the customer-visible amount before purchase confirmation (Q37).
- Confirm the final production subprocessor inventory, including any email/observability provider not represented in repository code.
- Complete legal review of governing-law, retention-after-cancellation, excerpt/attribution, GDPR and incident-notification language before representing an institutional legal review as complete.

## Supabase verification note from 2026-08-27

The connected Supabase project named `trendanalytics-prod` is in region `eu-west-1`. Its management API currently reports `INACTIVE`, but a subsequent direct SQL query succeeded and returned PostgreSQL `ssl=on` with `ssl_min_protocol_version=TLSv1.2`. The earlier table-listing timeout must therefore not be treated as proof that the database is unreachable. The dated provider evidence file records the stronger direct verification.

## Release rule

Do not convert a MANUAL or BLOCKED item to PASS based only on intended policy text. Attach dated evidence from the relevant production provider/account or a completed legal review where the fact depends on those systems. A negative provider result may make an answer complete, but it does not satisfy an acceptance criterion that requires the underlying capability to be configured.
