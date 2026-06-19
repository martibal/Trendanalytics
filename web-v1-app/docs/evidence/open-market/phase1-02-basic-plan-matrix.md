# Phase 1 / Item 2 - Basic plan matrix for all purchasable chains

Status: **GREEN**

Last updated UTC: $utc

## Scope

This evidence file verifies Basic-plan entitlement boundaries for all purchasable chains:

- Bitcoin
- Ethereum
- Base
- Arbitrum

Basic must allow:

- purchased chain only
- gold / derived / meta
- latest
- 7d / 30d / 90d windows

Basic must block:

- non-purchased chains
- 180d / 365d windows
- access after cancellation/refund

## Bitcoin Basic

Covered by Phase 1 / Item 1 evidence:

| Check | Expected | Actual | Result |
|---|---:|---:|---|
| Purchased scope: gold/bitcoin/latest.json | 200 | 200 | PASS |
| Non-purchased chain: gold/ethereum/latest.json | 403 | 403 | PASS |
| Basic blocked window: meta/bitcoin/180d/latest.json | 403 | 403 | PASS |
| Basic allowed max window: meta/bitcoin/90d/latest.json | 200 | 200 | PASS |
| Same API key after cancellation: gold/bitcoin/latest.json | 401 or 403 | 401 | PASS |

## Ethereum Basic

| Check | Expected | Actual | Result |
|---|---:|---:|---|
| Purchased scope: gold/ethereum/latest.json | 200 | 200 | PASS |
| Purchased scope: derived/ethereum/latest.json | 200 | 200 | PASS |
| Purchased scope: meta/ethereum/latest.json | 200 | 200 | PASS |
| Basic allowed max window: meta/ethereum/90d/latest.json | 200 | 200 | PASS |
| Basic blocked window: meta/ethereum/180d/latest.json | 403 | 403 | PASS |
| Non-purchased chain: gold/bitcoin/latest.json | 403 | 403 | PASS |
| Same API key after cancellation: gold/ethereum/latest.json | 401 or 403 | 401 | PASS |
| Refund completed | yes | yes | PASS |

## Base Basic

| Check | Expected | Actual | Result |
|---|---:|---:|---|
| Purchased scope: gold/base/latest.json | 200 | 200 | PASS |
| Purchased scope: derived/base/latest.json | 200 | 200 | PASS |
| Purchased scope: meta/base/latest.json | 200 | 200 | PASS |
| Basic allowed max window: meta/base/90d/latest.json | 200 | 200 | PASS |
| Basic blocked window: meta/base/180d/latest.json | 403 | 403 | PASS |
| Non-purchased chain: gold/bitcoin/latest.json | 403 | 403 | PASS |
| Same API key after cancellation: gold/base/latest.json | 401 or 403 | 401 | PASS |
| Refund completed | yes | yes | PASS |

## Arbitrum Basic

| Check | Expected | Actual | Result |
|---|---:|---:|---|
| Purchased scope: `gold/arbitrum/latest.json` | 200 | 200 | PASS |
| Purchased scope: `derived/arbitrum/latest.json` | 200 | 200 | PASS |
| Purchased scope: `meta/arbitrum/latest.json` | 200 | 200 | PASS |
| Basic allowed max window: `meta/arbitrum/90d/latest.json` | 200 | 200 | PASS |
| Basic blocked window: `meta/arbitrum/180d/latest.json` | 403 | 403 | PASS |
| Non-purchased chain: `gold/bitcoin/latest.json` | 403 | 403 | PASS |
| Same API key after cancellation: `gold/arbitrum/latest.json` | 401 or 403 | 401 | PASS |
| Refund completed | yes | yes | PASS |

## Secret-handling note

No full API keys, Stripe secrets, Clerk secrets, database URLs, webhook secrets, or service-role keys are stored in this evidence file.


