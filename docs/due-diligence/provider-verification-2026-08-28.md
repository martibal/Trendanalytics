# Provider verification — 2026-08-28

Purpose: final dated evidence for Q37 and Q47 in the 62-question due-diligence closeout.

## Q37 — Stripe tax/VAT presentation

Verified against the connected live Urd Atlas Stripe account and live Checkout Sessions on 2026-08-28.

- Stripe Tax registrations list: empty (`data=[]`).
- Recent live Checkout Sessions show `automatic_tax.enabled=false`.
- Those sessions show `amount_tax=0`, with the displayed checkout total equal to the amount charged under the current configuration.
- Public Terms already state that Stripe Automatic Tax is not enabled and that the amount shown by Stripe before confirmation is the amount charged.

Conclusion: Q37 is complete as a due-diligence answer. Urd Atlas currently does not add tax through Stripe Tax, and the customer-visible checkout amount reflects that current state. This is not a legal determination that Urd Atlas will never have a tax-registration obligation. If an obligation arises, the applicable registration and checkout configuration must be completed before tax collection is represented as enabled.

## Q47 — encryption/security statement

Provider evidence reviewed on 2026-08-28:

- Vercel documents AES-256 encryption at rest for platform data and HTTPS/TLS 1.3 in transit.
- Clerk's Data Processing Addendum includes encryption in transit and at rest among its data-security controls.
- Supabase documents SSL-capable managed Postgres connectivity and managed authenticated encryption for Vault-stored secrets; the connected project is in `eu-west-1` but was reported `INACTIVE` by the management API on 2026-08-27.
- Upstash documents TLS for Redis traffic. Upstash encryption at rest is a Production Pack / plan-specific control, so it must not be claimed as enabled without account-side evidence.
- Urd Atlas uses Upstash for bounded rate-limit metadata, not for the subscriber reference dataset.

Conclusion: Q47 is complete as an encryption/security disclosure because the public Security page now distinguishes verified provider-documented controls from plan-specific controls that are not independently verified. No unverified encryption-at-rest claim is made for Upstash.

## Closeout principle

A due-diligence answer is complete when it accurately and evidentially describes the current service. Completion does not require enabling every optional provider feature. Where an optional control is not verified or enabled, the correct answer is an explicit limitation rather than an inferred positive claim.
