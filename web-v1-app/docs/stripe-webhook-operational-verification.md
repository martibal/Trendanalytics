# Stripe webhook operational verification checklist

This checklist is used after code deploy, database migration, and Stripe Dashboard webhook configuration.

It verifies that the Stripe webhook works end-to-end without exposing raw Stripe payloads or secret values.

## Prerequisites

Confirm these are complete before running verification:

```text
- Application code is deployed.
- Prisma Client was generated from the current schema.
- Production database migration was applied.
- Stripe Dashboard webhook endpoint points to /api/v1/stripe/webhook.
- STRIPE_WEBHOOK_SECRET is set from that exact Stripe endpoint.
- STRIPE_SECRET_KEY is a live key in production.
- STRIPE_PRICE_BASIC and STRIPE_PRICE_PRO match the configured products.
```

## Required event delivery test

Send or trigger these Stripe events against the configured endpoint:

```text
checkout.session.completed
customer.subscription.updated
customer.subscription.deleted
```

Each event must return a safe 2xx acknowledgement when accepted.

Invalid signatures must return a safe 4xx response and must not create subscription state.

## Database verification

After a valid event, verify the database contains:

```text
- one stripe_webhook_events row for the Stripe event id
- stripe_event_id populated
- event_type populated
- status is processed or ignored
- received_at populated
- processed_at populated after handling
```

For checkout completion, verify the subscription row contains:

```text
- stripe_customer_id
- stripe_subscription_id
- tier
- status
- history_unlocked
- entitled_chain when tier is basic
- current_period_end when Stripe supplied it
```

## Replay verification

Replay the same Stripe event id.

Expected result:

```text
- webhook returns a safe 2xx acknowledgement
- no duplicate stripe_webhook_events row is created
- subscription state remains stable
- duplicate event is treated as ignored
```

## Failure and recovery verification

Force or observe a failing webhook event only in a controlled non-production environment.

Expected result:

```text
- webhook returns webhook_error
- stripe_webhook_events row is marked failed
- no raw Stripe event payload is returned
- no secret values are logged
- failed event can be replayed after the underlying issue is fixed
```

In production, use Stripe Dashboard failed-event replay only after the application/database issue is fixed.


## Stale processing and failed replay recovery

A Stripe webhook event may be received and written to `stripe_webhook_events` with status `processing` before the request is fully handled.

This can happen during a deploy interruption, process crash, transient database failure, or serverless timeout.

The webhook recovery contract is:

```text
- status processed means the Stripe event id has already been handled
- status ignored means the Stripe event id was accepted but did not require a local entitlement change
- status failed means processing errored and the event may be replayed after the root cause is fixed
- status processing younger than WEBHOOK_PROCESSING_STALE_AFTER_MS is treated as an active duplicate
- status processing older than WEBHOOK_PROCESSING_STALE_AFTER_MS is stale and may be replayed
- stale processing replay resets status to processing, clears processed_at, clears error_code, and continues normal handling
- failed replay resets status to processing, clears processed_at, clears error_code, and continues normal handling
```


D-064 threshold evidence:

```text
WEBHOOK_PROCESSING_STALE_AFTER_MS is the replay recovery threshold.
processing younger than the stale threshold is treated as an active duplicate.
processing older than WEBHOOK_PROCESSING_STALE_AFTER_MS is treated as stale and may be replayed after inspection.
```
Operational verification steps:

```text
1. Find the Stripe event id in Stripe Dashboard.
2. Inspect the matching stripe_webhook_events row by stripe_event_id.
3. If status is processed or ignored, replay should return a safe 2xx acknowledgement without creating another row.
4. If status is failed, inspect error_code and logs, fix the underlying issue, then replay from Stripe Dashboard.
5. If status is processing, compare received_at with the stale threshold.
6. If processing is younger than the stale threshold, do not replay repeatedly.
7. If processing is older than WEBHOOK_PROCESSING_STALE_AFTER_MS, replay from Stripe Dashboard and confirm status becomes processed or ignored.
8. Confirm replay logs mention only event id, event type, status, and safe operational context.
```

Do not log or copy raw Stripe event JSON, webhook secrets, or live/restricted Stripe key values during replay recovery.

Do not manually delete `stripe_webhook_events` rows to force replay unless a documented database recovery procedure explicitly requires it.

## Security verification

Confirm responses and logs never include:

```text
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- sk_live_
- rk_live_
- whsec_
- raw Stripe event JSON
```

## Rollback verification

If migration or deployment is rolled back:

```text
- stop live checkout traffic if subscription sync cannot be trusted
- keep failed Stripe events available for later replay
- do not delete Stripe webhook event history unless retention policy explicitly allows it
```

## Completion criteria

The Stripe webhook operational verification is complete only when:

```text
- valid signed events are accepted
- invalid signatures are rejected
- checkout completion creates or updates local subscription state
- subscription update changes local subscription state
- subscription deletion marks local subscription state inactive
- duplicate event id is safely ignored
- failed events are observable and replayable
- logs and responses expose no secrets or raw payloads
```
