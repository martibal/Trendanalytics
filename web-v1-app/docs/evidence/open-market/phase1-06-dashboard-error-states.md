# Phase 1 / Item 6 - Dashboard error states

Status: **GREEN**
Last updated UTC: 2026-06-19T22:00:19Z

## Scope

This evidence covers the open-market readiness requirement:

- The dashboard must render safe and understandable states when account, auth, billing, entitlement, or API-key operations are unavailable.
- Error states must be user-facing and not expose secrets.
- API-key create/revoke failures must render actionable UI feedback.
- A dashboard render failure must be contained by a dashboard-specific error boundary.

## Implementation evidence

Relevant files:

- src/app/dashboard/error.tsx
- src/app/dashboard/page.tsx
- src/app/dashboard/page.test.tsx
- src/components/dashboard/ApiKeyManagerClient.tsx
- src/components/dashboard/ApiKeyManagerClient.test.tsx

Supporting commit:

- d0cf30d54 test: align api key revoke row selector

## Covered states

| State | Surface | Result |
|---|---|---|
| Dashboard render failure | src/app/dashboard/error.tsx | PASS |
| Signed-out user | Dashboard page and API-key manager | PASS |
| Auth configured but no linked account | API-key manager | PASS |
| Billing/customer linkage incomplete | Dashboard page | PASS |
| Inactive subscription | Dashboard/API-key manager | PASS |
| No API keys yet | API-key manager | PASS |
| API-key create failure | API-key manager | PASS |
| API-key revoke/update flow | API-key manager | PASS |

## Automated verification

Command:

- npm test -- src/app/dashboard/page.test.tsx src/components/dashboard/ApiKeyManagerClient.test.tsx

Result:

- PASS src/components/dashboard/ApiKeyManagerClient.test.tsx
- PASS src/app/dashboard/page.test.tsx
- Test Suites: 2 passed, 2 total
- Tests: 11 passed, 11 total

## Notes

- The dashboard error boundary offers retry, home navigation, and sign-in actions.
- API-key mutation errors display server-provided details when available.
- API-key secrets are still shown only once at creation and are not included in this evidence.
- This item verifies user-facing dashboard error handling, not lower-level API authorization semantics; those are covered by earlier entitlement and API-boundary checks.

## Result

Phase 1 / Item 6 is **GREEN**.

The subscriber dashboard has tested user-facing states for auth, account linkage, billing linkage, inactive subscription, empty API-key state, API-key mutation errors, and dashboard render failure containment.
