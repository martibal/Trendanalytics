# Stripe webhook deployment runbook

This runbook defines the required production setup for Stripe subscription sync.

The application webhook route is:

```text
/api/v1/stripe/webhook
```

The full Stripe endpoint URL must use the production app origin plus the route above.

## Required Stripe webhook events

Configure the Stripe webhook endpoint to send these events:

```text
checkout.session.completed
customer.subscription.updated
customer.subscription.deleted
```

These events are required because checkout creates a Stripe subscription and the webhook route is responsible for syncing the local subscription record.

## Required environment variables

The deployment environment must include:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_BASIC
STRIPE_PRICE_PRO
NEXT_PUBLIC_APP_URL
DATABASE_URL
DIRECT_URL
```

`STRIPE_SECRET_KEY` must be a live key for production checkout. Test keys are valid only in non-production environments.

`STRIPE_WEBHOOK_SECRET` must come from the Stripe Dashboard webhook endpoint configuration. Do not reuse webhook secrets across unrelated endpoints.

`NEXT_PUBLIC_APP_URL` must match the public production origin used when creating Checkout success and cancel URLs.

## Database deployment requirement

Before the webhook endpoint receives production traffic, deploy the Prisma migration that creates:

```text
stripe_webhook_events
StripeWebhookEventStatus
```

The repository contains the migration:

```text
prisma/migrations/20260608120000_add_stripe_webhook_events/migration.sql
```

The migration must be applied to the production database before enabling the webhook endpoint in Stripe Dashboard.

Do not rely on `prisma generate` to update the database. `prisma generate` updates Prisma Client only.

## Recommended deployment sequence

1. Deploy application code containing the webhook route and Prisma Client generated from the current schema.
2. Apply the database migration to the production database.
3. Configure the Stripe Dashboard webhook endpoint.
4. Add `STRIPE_WEBHOOK_SECRET` from the configured endpoint to production environment variables.
5. Send a Stripe test webhook event to verify signature validation and subscription sync.
6. Enable live checkout traffic.

## Operational expectations

The webhook route must:

```text
- verify the stripe-signature header
- use raw request body verification
- reject invalid signatures
- persist Stripe event IDs before business processing
- treat duplicate Stripe event IDs as safe ignored acknowledgements
- sync local subscription state idempotently
- never return raw Stripe event payloads
- never log or expose Stripe secret values
```

## Rollback and failure handling

If webhook processing fails after code deploy:

```text
- keep the webhook endpoint configured but monitor failed events in Stripe Dashboard
- fix the database/schema/app issue
- replay failed events from Stripe Dashboard after the fix
```

If the database migration has not been applied, do not enable live webhook traffic.


## Webhook secret source

STRIPE_WEBHOOK_SECRET must come from the Stripe Dashboard webhook endpoint configuration. Do not reuse webhook secrets across unrelated endpoints.