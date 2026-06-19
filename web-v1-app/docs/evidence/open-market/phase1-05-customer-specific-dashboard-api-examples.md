# Phase 1 / Item 5 - Customer-specific dashboard API examples

Status: **GREEN**
Last updated UTC: 2026-06-19T21:50:11Z

## Scope

This evidence covers the open-market readiness requirement:

- Dashboard API examples must be customer-specific.
- Examples must reflect the subscriber active entitlement snapshot.
- Single Chain customers must not see examples for non-entitled chains or unavailable history windows.
- Research customers may see all-chain/full-window examples.
- Endpoint examples remain informational only; enforcement stays server-side on /api/v1/files/[...path].

## Implementation evidence

Commit:

- 042230580 fix: make dashboard api examples entitlement aware

Changed files:

- src/app/dashboard/page.tsx
- src/app/dashboard/page.test.tsx

The dashboard endpoint reference now derives examples from:

- accountView.snapshot.tier
- accountView.snapshot.entitledChain
- accountView.snapshot.maxWindowDays

## Expected behavior

| Subscriber state | Expected dashboard examples | Result |
|---|---|---|
| No active subscription | No customer-specific examples; active subscription required | PASS |
| Single Chain / Bitcoin | Bitcoin examples only; latest and windows up to 90d | PASS |
| Single Chain / Ethereum | Ethereum examples only; latest and windows up to 90d | PASS |
| Research / Pro | Account-level examples for supported chains and windows up to 365d | PASS |

## Automated verification

Dashboard test command:

- npm test -- src/app/dashboard/page.test.tsx

Result:

- PASS src/app/dashboard/page.test.tsx
- Tests: 3 passed, 3 total

Production build command:

- npm run build

Result:

- Compiled successfully
- Finished TypeScript
- Static page generation completed

## Regression coverage

The dashboard test now verifies:

- Research entitlement renders allowed endpoint examples.
- The old hardcoded gold/base/365d/latest.json example is not shown as a generic static example.
- Single Chain / Ethereum renders Ethereum examples.
- Single Chain / Ethereum does not render unavailable 365d examples.
- API key manager still receives persisted API key display rows.

## Result

Phase 1 / Item 5 is **GREEN**.

The dashboard no longer presents generic API examples that can conflict with the customer actual subscription. Examples are now derived from the active entitlement snapshot while server-side API enforcement remains authoritative.
