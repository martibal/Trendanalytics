# Billing launch checklist

This checklist is the final launch gate for subscription billing.

It must be completed before live checkout traffic is enabled.

## Code and build gates

Confirm that the current commit has passed:

```text
npm run check:publication-integrity
npm run check:audit-gates
npm run build
```

The build must run Prisma Client generation before Next.js build.

## Database gates

Confirm that the production database has received the Prisma migration for:

```text
stripe_webhook_events
StripeWebhookEventStatus
```

The committed migration is:

```text
prisma/migrations/20260608120000_add_stripe_webhook_events/migration.sql
```

Do not enable live checkout traffic before this migration is applied.

## Stripe environment gates

Confirm production environment variables are set:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_BASIC
STRIPE_PRICE_PRO
NEXT_PUBLIC_APP_URL
DATABASE_URL
DIRECT_URL
```

`STRIPE_SECRET_KEY` must be a live key in production.

`STRIPE_WEBHOOK_SECRET` must come from the exact Stripe Dashboard webhook endpoint used for production.

## Stripe Dashboard gates

Confirm Stripe Dashboard has:

```text
- Product/price for basic plan
- Product/price for pro plan
- Webhook endpoint pointing to /api/v1/stripe/webhook
- Webhook event checkout.session.completed enabled
- Webhook event customer.subscription.updated enabled
- Webhook event customer.subscription.deleted enabled
```

Confirm `STRIPE_PRICE_BASIC` and `STRIPE_PRICE_PRO` match the production Stripe prices.

## Checkout gates

Confirm checkout behavior:

```text
- unauthenticated users cannot create checkout sessions
- checkout requires same-origin validation
- checkout applies pre-auth rate limiting
- basic checkout asks for entitled_chain
- pro checkout does not require entitled_chain
- checkout sets client_reference_id to account id
- checkout writes metadata used by webhook sync
```

## Webhook gates

Confirm webhook behavior:

```text
- webhook rejects invalid signatures
- webhook accepts valid signed events
- webhook creates stripe_webhook_events row before business processing
- duplicate Stripe event id returns safe ignored acknowledgement
- checkout.session.completed creates or updates local subscription state
- customer.subscription.updated updates local subscription state
- customer.subscription.deleted marks local subscription inactive
```

## Account and API access gates

Confirm account/API behavior after subscription sync:

```text
- dashboard displays subscription tier
- dashboard displays allowed chains and windows
- API key creation is authenticated
- generated API key is shown only once
- file/API delivery enforces API key authentication
- file/API delivery enforces entitlement before storage access
- public preview data remains public-only and does not expose private delivery paths
```

## Billing portal gates

Confirm billing portal behavior:

```text
- authenticated user can open billing portal
- unauthenticated user cannot open billing portal
- billing portal uses existing Stripe customer id only
- billing portal requests are same-origin protected
- billing portal responses are no-store
```

## Operational verification gates

Complete the operational verification checklist:

```text
docs/stripe-webhook-operational-verification.md
```

Complete the deployment runbook:

```text
docs/stripe-webhook-deployment-runbook.md
```

## Rollback gates

Before launch, define the rollback path:

```text
- stop live checkout traffic
- keep Stripe failed events available for replay
- preserve stripe_webhook_events history
- do not delete subscription records as a rollback shortcut
- replay failed Stripe events only after the underlying issue is fixed
```

## Completion criteria

Billing launch is complete only when:

```text
- all audit gates are green
- production DB migration is applied
- production Stripe env vars are set
- Stripe Dashboard webhook endpoint is configured
- checkout creates Stripe sessions
- webhook syncs subscription state
- duplicate events are ignored safely
- billing portal opens for subscribed users
- API/file delivery enforces entitlements
- logs and responses expose no secrets or raw Stripe payloads
```

This checklist is operational and descriptive only. It is not financial, investment, trading, or price advice.
