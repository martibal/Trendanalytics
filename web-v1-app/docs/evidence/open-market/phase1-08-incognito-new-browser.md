# Phase 1 / Item 8 - Incognito / new-browser verification

Status: **GREEN**
Last updated UTC: 2026-06-20T22:28:17Z

## Scope

This evidence covers the open-market readiness requirement:

- Public pages must load in a fresh browser session.
- Subscriber dashboard must not crash when opened without an authenticated session.
- Checkout start must route unauthenticated users to sign-in instead of failing.
- Sign-in return flow must work from an incognito session.

## Production verification

Production URL:

- https://www.urdatlas.com

Incognito checks performed:

| Check | Result |
|---|---|
| / loads in Chrome incognito | PASS |
| /mobile/plans loads in Chrome incognito | PASS |
| /dashboard shows sign-in required state instead of crashing | PASS |
| Start Single Chain from /mobile/plans redirects unauthenticated user to sign-in | PASS |
| Sign-in return flow from incognito works | PASS |

## Notes

- No payment was completed during this check.
- No API key was created during this check.
- No browser auth material, checkout redirect URL, API key, or Stripe secret is stored in this evidence.

## Result

Phase 1 / Item 8 is **GREEN**.

Fresh-session public browsing, dashboard auth gating, checkout auth redirect, and sign-in return were production-verified.
