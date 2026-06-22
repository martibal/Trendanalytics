# Phase 1 Item 21 - Endpoint Security Review

Status: PASS
Checked at UTC: 2026-06-22T07:30:55Z
Git HEAD checked: aa1ff90c6

## Scope

This evidence covers the open-market readiness requirement that public and authenticated endpoints have appropriate security boundaries before launch.

## Route inventory reviewed

The production API route inventory includes:

- checkout start route
- billing portal route
- authenticated file-delivery route
- public read routes for glossary, landing, methodology versions, samples, status, summary, thresholds, units, and WHN
- Stripe webhook route
- deprecated webhook compatibility route

## State-changing route protection

State-changing routes use same-origin validation.

Reviewed behavior:

- POST, PUT, PATCH, and DELETE require a trusted Origin or Referer.
- Allowed origins include the configured app URL and the public production domains.
- Rejected origin checks return 403.
- Rejected origin checks use no-store response headers.
- Production error detail is reduced to a generic origin-not-allowed detail.

This protects checkout, billing portal, and dashboard access-key management routes from cross-origin state-changing calls.

## Authenticated delivery boundary

The file-delivery endpoint was reviewed for the following controls:

- authenticated access header is required
- production access-key shape is restricted
- persisted access keys are resolved by prefix and verified against stored hash material
- revoked keys are rejected
- suspended keys are rejected
- inactive subscriptions are rejected
- production error detail is reduced
- request ID is added to responses
- auth failures are audit logged
- entitlement failures are audit logged
- rate and daily quota failures are audit logged
- successful file delivery is audit logged

## Access-key storage and verification

Access-key verification was reviewed.

Observed controls:

- persisted keys are stored as derived hashes, not returned after creation
- scrypt is used for persisted access-key verification
- constant-time hex comparison is used for hash comparison
- only prefix and last-four display metadata is exposed in dashboard rows
- development-only access-key JSON is disabled in production runtime

## File path boundary

The file-delivery route sanitizes requested path segments.

Rejected path shapes include:

- empty segments
- parent-directory traversal markers
- backslashes
- null bytes
- unsupported genre, chain, brief scope, or window shape

The route then builds storage paths under the published data root only.

## Entitlement boundary

The file-delivery route evaluates the requested genre, chain, window, and optional date range against the current entitlement snapshot.

Reviewed behavior:

- requests outside entitled chain return 403
- requests outside entitled genre return 403
- requests outside entitled window return 403
- requests outside allowed history range return 403
- successful responses include entitlement tier and window response headers
- private authenticated file responses use private no-store caching

## Rate and quota boundary

Authenticated file delivery applies:

- pre-auth request limiting
- account-level rate limiting
- daily delivery quota enforcement
- 429 response behavior
- Retry-After headers when relevant
- rate/quota response headers when relevant

## Stripe webhook boundary

The Stripe webhook route was reviewed for:

- no-store responses
- required Stripe signature header
- Stripe event construction from raw payload and signature
- rejection of invalid signatures
- rejection of non-live events in production
- replay persistence by Stripe event ID
- duplicate event handling
- failed and stale processing replay handling
- inactive subscription handling that revokes active delivery keys

## Deprecated webhook route

The deprecated webhook compatibility route returns a no-store response instructing callers to use the Stripe webhook route.

## Verification performed

Targeted source review confirmed the controls above.

Security-related tests were run for:

- entitlement boundary behavior
- access-key storage and verification behavior
- same-origin protection
- file-delivery route behavior
- access-key management route behavior
- Stripe webhook route behavior

Result:

- Test suites: 2 passed
- Tests: 32 passed
- Snapshots: 0

The access-key management route test mock was updated because the route now expects request headers for request-ID and origin handling.

Fix commit:

- aa1ff90c6 test: update access-key route request mock

Audit gates were also run after the test fix.

Result:

- Product boundary audit: PASS
- API contract audit: PASS
- Calculation correctness audit: PASS, with existing warnings
- Publication integrity audit: PASS, with existing warnings
- Overall audit gate runner: PASS

## Result

PASS.

Endpoint security boundaries are implemented, tested, and compatible with the launch audit gates.

## Evidence hygiene

This evidence file contains only public route names, implementation review notes, test status, audit status, and commit references. It does not contain customer records, protected browser material, provider payloads, private redirect URLs, signing values, or protected access values.
