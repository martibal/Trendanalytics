# Phase 1 / Item 1 - Full new-user checkout from scratch

Status: **GREEN**

Generated UTC: $utc

## Scope tested

- Production domain: https://www.urdatlas.com
- New user/profile: yes
- Plan purchased: Basic Bitcoin
- Stripe Checkout: live production checkout completed
- Dashboard after payment: active Basic Bitcoin entitlement shown
- API key created: yes
- Subscription cancelled after test: yes
- Refund completed after test: yes
- Dashboard after cancellation: no active access shown
- Secret handling: no full API key stored in this evidence file

## API checks

| Check | Expected | Actual | Result |
|---|---:|---:|---|
| Purchased scope: gold/bitcoin/latest.json | 200 | 200 | PASS |
| Non-purchased chain: gold/ethereum/latest.json | 403 | 403 | PASS |
| Basic blocked window: meta/bitcoin/180d/latest.json | 403 | 403 | PASS |
| Basic allowed max window: meta/bitcoin/90d/latest.json | 200 | 200 | PASS |
| Same API key after cancellation: gold/bitcoin/latest.json | 401 or 403 | 401 | PASS |

## Manual confirmations

| Criterion | Result |
|---|---|
| Brand-new user created from scratch | PASS |
| Live Stripe payment completed | PASS |
| Dashboard showed active entitlement after payment | PASS |
| API key worked while subscription was active | PASS |
| Non-entitled access was blocked | PASS |
| Subscription cancellation removed access | PASS |
| Dashboard no longer showed active access | PASS |
| Refund completed | PASS |

## Result

Phase 1 / Item 1 is **GREEN**.

Do not commit screenshots, logs, or copied terminal output containing full API keys, Stripe secrets, Clerk secrets, database URLs, webhook secrets, or service-role keys.
