# Phase 2 item 26 â€” Automated onboarding emails

Status: Complete.

## Readiness item

Automated onboarding emails.

## Green criteria

Transactional onboarding email flow is present for:

- welcome message after checkout completion
- API access guidance after checkout completion
- non-advisory product copy
- safe operational failure handling
- no full access values in email payloads
- disabled-by-default deployment configuration

## Implementation

Implemented in:

- web-v1-app/src/lib/email/onboarding.ts
- web-v1-app/src/lib/email/onboarding.test.ts
- web-v1-app/src/app/api/v1/stripe/webhook/route.ts

The email provider is Resend through the HTTPS API. No npm dependency was added.

The feature is disabled by default. Sending requires all of these environment variables:

- URD_EMAIL_ONBOARDING_ENABLED=true
- URD_EMAIL_FROM
- RESEND_API_KEY

The Stripe webhook invokes onboarding delivery after checkout.session.completed has synced subscription/account state. Email delivery failures are logged and do not roll back the subscription sync.

## Safe content boundary

The onboarding copy includes:

- plan label
- selected chain scope when relevant
- dashboard link
- getting-started documentation link
- security reminder that access values are shown only when created

The onboarding copy does not include:

- full access values
- payment identifiers
- customer identifiers
- billing-provider payloads
- browser session material

## Verification

Onboarding helper tests passed:

- disabled by default
- skips when provider configuration is incomplete
- sends bounded onboarding copy without access values

Build passed:

- Compiled successfully
- Finished TypeScript
- Generated static pages
- Finalized page optimization

Public copy guard passed:

- Scanned 246 files across product-boundary rules A-001 through A-010

Sensitive literal scan result:

- No new helper-file hits
- Existing Stripe mode-prefix checks remain in webhook route and are not credentials

## Commits

Code commits:

- 07bd25347 feat: add onboarding email helper
- a3e63e0dc feat: send onboarding emails after checkout

## Result

Phase 2 item 26 is complete.
