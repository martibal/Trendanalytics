# Phase 1 / Item 4 — API key revoke readiness evidence

Status: **GREEN**
Last updated UTC: `2026-06-19T21:34:56Z`

## Scope

This evidence covers the open-market readiness requirement:

- API key can be manually revoked from the customer dashboard.
- A revoked API key is rejected at the API boundary.
- The revoked key no longer grants access to a previously valid paid endpoint.

## Test setup

- Active test subscription: Single Chain / Bitcoin.
- One new API key was created from the dashboard.
- The API key secret was only pasted locally into PowerShell.
- The API key secret was not copied into chat or evidence.

## API boundary before manual revoke

| Check | Expected | Actual | Result |
|---|---:|---:|---|
| Active API key: `gold/bitcoin/latest.json` | 200 | 200 | PASS |

## Manual dashboard revoke

| Check | Expected | Actual | Result |
|---|---:|---:|---|
| API key revoked from dashboard | yes | yes | PASS |
| Revoked key no longer shown as active | yes | yes | PASS |

## API boundary after manual revoke

| Check | Expected | Actual | Result |
|---|---:|---:|---|
| Same API key after manual revoke: `gold/bitcoin/latest.json` | 401 or 403 | 401 | PASS |

## Billing cleanup

| Check | Expected | Actual | Result |
|---|---:|---:|---|
| Revoke-test subscription cancelled | yes | yes | PASS |
| Revoke-test payment refunded | yes | yes | PASS |

## Result

Phase 1 / Item 4 is **GREEN**.

Manual API key revoke from the dashboard is enforced at the API boundary.
