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

Due-diligence conclusion for Q36: the behavior is now known and can be answered precisely. Public Terms must describe the live behavior rather than hypothetical plan-switching behavior.

### Tax / VAT

- Stripe Tax settings are in `pending` status.
- Stripe reports `head_office` as a missing field in the Tax setup.
- Recent live Checkout Sessions show `automatic_tax.enabled=false` and `amount_tax=0`.
- Therefore Urd Atlas must not state that Stripe Automatic Tax/VAT calculation is currently enabled.

Due-diligence conclusion for Q37: the live state is verified, but automatic tax/VAT calculation is not configured. This remains an open business/account configuration item until the operator determines the applicable tax/VAT obligations and completes the Stripe Tax setup accordingly.

## Supabase — production project

Verified against the connected Supabase account on 2026-08-27.

- Project: `trendanalytics-prod`.
- Region: `eu-west-1`.
- Management API currently reports the project status as `INACTIVE`.
- A direct table-listing request could not establish a database connection and timed out.

Due-diligence conclusion: the account-side project state requires operational follow-up before it should be used as evidence of an active production database. This does not by itself prove a customer-facing outage, because public pages can be served without a successful database query, but authenticated/account workflows that depend on this database should be checked separately.

## Encryption / provider assurance boundary

Repository documentation can prove application-level controls and provider selection. Provider documentation can establish standard transport/storage protections. Account-specific or plan-specific settings that are not exposed through the connected management APIs must not be represented as independently verified.

Due-diligence conclusion for Q47: retain a provider-verification caveat until every account-side encryption/storage setting that materially affects customer data has dated evidence. The public Security page should distinguish provider-documented defaults from account-specific verification.

## Closeout rule

A question may be marked PASS when the requested answer is fully evidenced and accurately describes the current service, including an explicit negative answer where a feature is not enabled. A feature that is required by the acceptance criterion itself (for example automatic tax/VAT presentation when applicable) remains open until the underlying provider/account configuration is actually completed.
