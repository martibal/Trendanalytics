# Phase 1 Item 20 - Rate Limit and Quota Behavior Review

Status: PASS
Checked at UTC: 2026-06-22T07:16:46Z
Git HEAD checked: 4f885c279

## Scope

This evidence covers the open-market readiness requirement that API delivery has predictable abuse controls, documented fair-use limits, safe 429 behavior, quota headers, and an operator review path.

## Implementation reviewed

The authenticated file delivery route imports and uses:

- pre-auth request limiting
- account-level request limiting
- daily delivery quota enforcement
- rate-limit response headers
- daily-quota response headers

The route returns 429 with a safe public error shape when account rate limits or daily quota limits are exceeded.

## Authenticated limits

The authenticated delivery helper defines tier limits:

- Single Chain: 60 requests per minute
- Research: 300 requests per minute
- Single Chain daily delivery quota: 500 requests per UTC day
- Research daily delivery quota: 5,000 requests per UTC day

The daily quota resets at the next UTC midnight.

The helper emits:

- X-RateLimit-Limit
- X-RateLimit-Remaining
- X-RateLimit-Reset
- X-DailyQuota-Limit
- X-DailyQuota-Remaining
- X-DailyQuota-Reset
- Retry-After when relevant

## Pre-auth limits

The pre-auth limiter defines scoped public and unauthenticated limits:

- checkout-api: 30 per minute
- portal-api: 30 per minute
- keys-api: 30 per minute
- stripe-webhook: 120 per minute
- public-read-api: 120 per minute
- file-api: 300 per minute

The pre-auth layer returns 429 with:

- code: rate_limited
- message: Too many API requests.
- detail field
- X-RateLimit headers
- Retry-After when relevant

## Backend behavior

The implementation uses Upstash Redis when configured.

Production behavior is fail closed if the rate-limit backend or daily quota backend is unavailable. Non-production fallback uses in-memory counters so local development can continue without external infrastructure.

## Public documentation

The public getting-started API docs explain:

- authenticated access is subject to technical rate limits and daily request quotas
- Single Chain allows 500 authenticated file-delivery requests per UTC day by default
- Research allows 5,000 authenticated file-delivery requests per UTC day by default
- responses may include X-RateLimit and X-DailyQuota headers
- 429 means the caller should slow down or wait until reset before retrying

## Operator runbook coverage

The API 429 support runbook exists and covers:

- separating single-customer, endpoint-specific, and global 429 events
- reviewing customer usage patterns
- checking plan and expected limits
- deciding whether enforcement is expected or unexpected
- investigating spikes
- communicating safe customer guidance
- recording evidence without protected access material

## Verification performed

A static review command was run for:

- authenticated rate-limit constants
- daily quota constants
- pre-auth scope limits
- 429 response behavior
- Retry-After headers
- rate-limit and daily-quota response headers
- public fair-use documentation

Audit gates were also run after review.

Result:

- Product boundary audit: PASS
- API contract audit: PASS
- Calculation correctness audit: PASS, with existing warnings
- Publication integrity audit: PASS, with existing warnings
- Overall audit gate runner: PASS

No high-volume production load test was run as part of this evidence step. The review was intentionally non-load-generating and relied on source-level verification, public documentation, and existing launch gates.

## Result

PASS.

Rate-limit and quota behavior is implemented, documented, safely error-shaped, and supported by an operator runbook.

## Evidence hygiene

This evidence file contains only public implementation notes, public documentation checks, audit status, and commit references. It does not contain customer records, protected browser material, provider payloads, private redirect URLs, or protected access values.
