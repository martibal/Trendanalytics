# Provider verification — 2026-08-27

Purpose: dated evidence for due-diligence items that cannot be proven from repository code alone.

## Stripe — live account

Verified against the connected live Urd Atlas Stripe account on 2026-08-27.

### Customer portal / plan changes

- The default live Billing Portal configuration is active.
- Customer profile updates, invoice history and payment-method updates are enabled.
- Subscription cancellation is enabled and configured for `at_period_end` with `proration_behavior=none`.
- Self-service `subscription_update` is disabled.
- Therefore customers cannot currently upgrade/downgrade their plan through the live Stripe Customer Portal, and the portal does not currently execute plan-change proration.

Due-diligence conclusion for Q36: PASS. The live behavior is known and the public Terms describe the actual portal behavior rather than a hypothetical switching configuration.

### Tax / VAT

- Stripe Tax settings are in `pending` status.
- Stripe reports `head_office` as a missing field in the Tax setup.
- The live Stripe account currently has no Stripe Tax registrations recorded.
- Recent live Checkout Sessions show `automatic_tax.enabled=false` and `amount_tax=0`.
- The active checkout route creates subscription Checkout Sessions without enabling `automatic_tax`.
- Therefore Urd Atlas must not state that Stripe Automatic Tax/VAT calculation is currently enabled.

Due-diligence conclusion for Q37: BLOCKED pending the operator's tax/VAT determination and corresponding Stripe account configuration. Automatic tax must not be enabled blindly because doing so before the Tax account is ready can break live checkout or collect tax on an unsupported basis. Once the applicable registration is established, complete Stripe Tax setup, enable automatic tax in the production Checkout integration, and verify the customer-visible total before purchase confirmation.

## Supabase — production project

Verified against the connected Supabase account on 2026-08-27.

- Project: `trendanalytics-prod`.
- Region: `eu-west-1`.
- The management API reports the project status as `INACTIVE`; however, a subsequent direct SQL query succeeded, so that control-plane status is not treated as evidence that the database is unreachable.
- Direct SQL verification returned PostgreSQL `ssl=on` and `ssl_min_protocol_version=TLSv1.2`.
- Supabase's current platform documentation states that Supabase projects are encrypted at rest by default.

Due-diligence conclusion: transport encryption for the connected database is directly evidenced, and storage encryption at rest is a documented provider default. The earlier table-listing timeout is superseded by the successful direct SQL verification for purposes of the encryption control.

## Vercel — production hosting

Verified against the connected Vercel project and current provider documentation on 2026-08-27.

- Project: `urdatlas` (`prj_OGJfWPEnSaxvN2qAL5paRiuVK52K`).
- Current production deployments serve `urdatlas.com` and `www.urdatlas.com` over HTTPS.
- Vercel's security documentation states that platform data is encrypted at rest with AES-256 and in transit with HTTPS/TLS.

Due-diligence conclusion: the public Security statement can accurately describe Vercel's provider-documented encryption controls without implying a separate Urd Atlas certification.

## Upstash — production pre-authentication rate limiting

Verified from the production application contract and current provider documentation on 2026-08-27.

- Urd Atlas uses the Upstash REST client for pre-authentication rate limiting.
- Production fails closed when the configured rate-limit backend is unavailable.
- The Upstash store is used for bounded rate-control state and is not the system of record for subscriber entitlements, subscription records, API-key secrets or published subscriber files.
- Upstash documents encryption at rest as a Prod Pack / plan-specific control rather than a universal default.

Due-diligence conclusion: Urd Atlas does not claim Upstash encryption at rest as enabled without account-side evidence. This removes the unsupported inference while preserving an accurate security statement about the data stores that hold material customer/account state.

## Encryption / provider assurance boundary — Q47

Q47 asks for an accurate encryption/security statement, not a blanket claim that every third-party feature offered by every provider is enabled.

Evidence now establishes:

1. Production web traffic is HTTPS/TLS.
2. The connected Supabase PostgreSQL database reports SSL enabled with TLS 1.2 minimum.
3. Supabase documents project storage encryption at rest by default.
4. Vercel documents AES-256 encryption at rest and HTTPS/TLS in transit.
5. Application-level API-key handling stores salted scrypt hashes rather than recoverable plaintext secrets.
6. Upstash at-rest encryption is explicitly treated as unverified/plan-specific and is not claimed as enabled.

Due-diligence conclusion for Q47: PASS. The public Security statement is bounded to evidenced controls and explicitly excludes an unsupported Upstash at-rest claim. Any later enablement of a plan-specific Upstash encryption control should be recorded as additional assurance, but it is no longer required to make the current public statement accurate.

## Closeout rule

A question may be marked PASS when the requested answer is fully evidenced and accurately describes the current service, including explicit scope limitations. A feature that is required by the acceptance criterion itself remains open until the underlying provider/account configuration is actually completed.
