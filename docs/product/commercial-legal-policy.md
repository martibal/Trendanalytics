# Urd Atlas commercial and legal operating policy

Status: active internal source of truth for public Terms/checkout documentation. This is an operating policy, not legal advice or a substitute for professional legal review.

## Standard plans

- Basic: USD 49/month, one selected chain, latest/7d/30d/90d Gold/Derived/Meta plus latest per-chain Briefs.
- Pro: USD 149/month, all four chains, standard windows through 365d plus complete published archive.
- No separate Urd Atlas setup fee.
- No separate Urd Atlas per-request usage fee on the standard plans.
- Applicable taxes must be visible in the Stripe confirmation flow before purchase when Urd Atlas is required/configured to collect them.

## Cancellation and retained data

- A cancellation scheduled for period end leaves access active through the already-paid period unless entitlement state requires otherwise.
- Immediate cancellation/refund may end subscriber delivery when Stripe/Urd Atlas entitlement becomes inactive.
- Files lawfully downloaded while an entitlement was active may be retained and used internally after cancellation.
- Cancellation ends the right to obtain new daily files, later corrections/revisions, new historical files or other subscriber delivery.
- Retained files may not be resold, redistributed, sublicensed, publicly mirrored or used to operate a substitutive commercial data service.

## Plan changes

- Basic -> Pro: intended to take effect immediately when the Stripe plan change is confirmed; Stripe may apply proration.
- Pro -> Basic: intended to take effect at the next renewal so already-paid Pro access is not removed mid-period.
- Pro -> Basic requires selection of the one chain that remains entitled for the next Basic period.
- The amount charged/credited is the amount shown by Stripe before confirmation.

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

## Items requiring external/account-level verification

These are not deemed complete solely by repository text:

1. Stripe tax/MVA configuration and customer-location behavior in live checkout.
2. Stripe customer-portal plan-switch configuration and proration behavior.
3. Provider encryption/region settings where provider-specific configuration, not code, controls the fact.
4. Final legal review of Terms/Privacy before higher-risk institutional sales.
