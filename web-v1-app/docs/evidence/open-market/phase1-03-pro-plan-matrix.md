# Phase 1 / Item 3 — Pro / Research plan readiness evidence

Status: **GREEN**
Last updated UTC: $utc

## Scope

This evidence covers the open-market readiness requirement:

- Pro / Research plan is either tested or hidden.
- Decision: **tested and kept available**.
- Product label in UI: **Research / Full Access / Pro**.
- Expected Pro entitlement:
  - all supported chains
  - Gold, Derived, Meta
  - latest, 180d, and 365d windows
  - API key removed after cancellation

## Notes

A first API test attempt returned 401 for every endpoint because the local PowerShell environment still contained an old cancelled Basic API key in $env:URD_API_KEY.

The variable was cleared and replaced locally with the new Pro API key. The API key was not copied into evidence or chat.

## Pro API access matrix before cancellation

| Check | Expected | Actual | Result |
|---|---:|---:|---|
| gold/bitcoin/latest.json | 200 | 200 | PASS |
| derived/bitcoin/latest.json | 200 | 200 | PASS |
| meta/bitcoin/latest.json | 200 | 200 | PASS |
| meta/bitcoin/180d/latest.json | 200 | 200 | PASS |
| meta/bitcoin/365d/latest.json | 200 | 200 | PASS |
| gold/ethereum/latest.json | 200 | 200 | PASS |
| derived/ethereum/latest.json | 200 | 200 | PASS |
| meta/ethereum/latest.json | 200 | 200 | PASS |
| meta/ethereum/180d/latest.json | 200 | 200 | PASS |
| meta/ethereum/365d/latest.json | 200 | 200 | PASS |
| gold/base/latest.json | 200 | 200 | PASS |
| derived/base/latest.json | 200 | 200 | PASS |
| meta/base/latest.json | 200 | 200 | PASS |
| meta/base/180d/latest.json | 200 | 200 | PASS |
| meta/base/365d/latest.json | 200 | 200 | PASS |
| gold/arbitrum/latest.json | 200 | 200 | PASS |
| derived/arbitrum/latest.json | 200 | 200 | PASS |
| meta/arbitrum/latest.json | 200 | 200 | PASS |
| meta/arbitrum/180d/latest.json | 200 | 200 | PASS |
| meta/arbitrum/365d/latest.json | 200 | 200 | PASS |

## Post-cancellation access removal

| Check | Expected | Actual | Result |
|---|---:|---:|---|
| Same Pro API key after cancellation: gold/bitcoin/latest.json | 401 or 403 | 401 | PASS |

## Billing cleanup

| Check | Expected | Actual | Result |
|---|---:|---:|---|
| Pro / Research subscription cancelled | yes | yes | PASS |
| Pro / Research payment refunded | yes | yes | PASS |

## Result

Phase 1 / Item 3 is **GREEN**.

Pro / Research does not need to be hidden for launch based on this test.
