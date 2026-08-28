# Urd Atlas commercial and legal operating policy

Status: active internal source of truth for public Terms/checkout documentation. This is an operating policy, not legal advice or a substitute for professional legal review.

## Standard plans

Customer-facing names are **Single Chain** and **Research**. Internal application/Stripe identifiers `basic` and `pro` may remain in code and metadata but are not customer-facing plan names.

- Single Chain: USD 49/month, one selected chain, latest/7d/30d/90d Gold/Derived/Meta plus latest per-chain Briefs.
- Research: USD 149/month, all four chains, standard windows through 365d plus complete published archive.
- No separate Urd Atlas setup fee.
- No separate Urd Atlas per-request usage fee on the standard plans.
- Current live checkout has Stripe Automatic Tax disabled and no Stripe Tax registrations. The amount shown before confirmation is the amount charged under the current configuration. This is not a legal determination about future tax-registration obligations.

## Cancellation and retained data

- The live Stripe Customer Portal schedules cancellation at period end with no cancellation proration.
- A cancellation scheduled for period end leaves access active through the already-paid period unless entitlement state requires otherwise.
- Immediate cancellation/refund may end subscriber delivery when Stripe/Urd Atlas entitlement becomes inactive.
- Files lawfully downloaded while an entitlement was active may be retained and used internally after cancellation.
- Cancellation ends the right to obtain new daily files, later corrections/revisions, new historical files or other subscriber delivery.
- Retained files may not be resold, redistributed, sublicensed, publicly mirrored or used to operate a substitutive commercial data service.

## Plan changes

- Self-service Single Chain ↔ Research switching is currently disabled in the live Stripe Customer Portal.
- The live portal therefore performs no self-service plan-change proration.
- Customers requesting a plan change must contact support; any manually arranged charge, credit, entitlement scope and effective date must be confirmed before the change is applied.
- A future self-service plan-switching flow must be verified against live Stripe configuration and documented publicly before it is represented as available.

## Attribution and external excerpts

Allowed without separate written permission:

- internal reports, models, dashboards and data-warehouse use within entitlement;
- limited labels, summary statistics, charts or excerpts in the customer's own external reports/presentations, provided they do not substitute for the paid dataset;
- attribution should state `Source: Urd Atlas` and preserve chain/date/methodology context where material.

Not allowed without written permission:

- systematic redistribution of subscriber rows/files;
- resale, sublicensing, public mirrors or API proxying;
- white-label/substitutive data products materially republishing the paid Urd Atlas dataset.

## Automation / AI / model use

- Internal analytics, data pipelines, statistical/ML models and internal agents are allowed within entitlement.
- Urd Atlas remains descriptive and does not endorse downstream automated financial actions.
- The customer owns responsibility for model validation, trading/financial controls and applicable regulation.
- Subscriber outputs may not be repackaged into a competing/substitutive commercial data, signal or API product.

## Wind-down

For a planned permanent discontinuation of subscriber service, target at least 30 calendar days' notice where reasonably practicable and provide active subscribers a reasonable export window for data within their active entitlement. No permanent hosting guarantee survives shutdown.

## Governing law

Public Terms state that the service relationship is governed by Norwegian law, subject to mandatory rights that cannot lawfully be excluded.

## Security incidents

Security/privacy incidents are distinct from ordinary freshness/availability incidents. Where applicable law requires regulator or affected-individual notification, follow the applicable threshold and timing requirements. Do not promise a universal customer-notification clock that misstates GDPR.

## Breaking changes

Target at least 30 calendar days' public notice for planned breaking API/schema changes. Critical security, legal, corruption-repair or data-integrity fixes may use a shorter timeline but require prompt changelog disclosure.

## Production security boundary

Urd Atlas uses server-side Prisma/Postgres access for subscriber/account state. Supabase `public` tables are not intended as a client-facing Data API. RLS is enabled on those tables and privileges for `anon` and `authenticated` are revoked. Any future client-side Supabase table access requires an explicit access model and reviewed RLS policies before privileges are granted.

## Items requiring ongoing external/account-level review

These are ongoing governance items rather than claims inferred from repository text:

1. Reassess tax/VAT obligations as sales footprint changes; configure registrations/checkout before representing collection as enabled.
2. Re-verify Stripe portal behavior before documenting future self-service plan changes.
3. Re-run provider security/advisor checks after material infrastructure or schema changes.
4. Confirm the final production subprocessor inventory whenever a provider is added or removed.
5. Obtain professional legal review before representing Terms/Privacy as externally reviewed for institutional procurement.
