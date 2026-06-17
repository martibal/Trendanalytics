# Stripe Webhook 500 Runbook

## Purpose

This runbook describes how to diagnose and recover a production Stripe webhook event that returns 500 or otherwise fails to process safely.

## Use this runbook when

- Stripe shows a failed delivery for the production webhook endpoint.
- The webhook response status is 500.
- A checkout, subscription, invoice, or cancellation event did not update Urd Atlas state.
- A customer paid but the dashboard or API did not reflect the expected entitlement.
- Vercel logs show an exception from /api/v1/stripe/webhook.

## Safety rules

- Do not repeatedly resend Stripe events before identifying the failure cause.
- Do not switch production Stripe delivery back to the deprecated /api/v1/webhook endpoint.
- Do not paste Stripe webhook secrets, API keys, database URLs, or customer payment details into chat, commits, screenshots, or tickets.
- Do not manually grant customer access unless Stripe state is verified and the mismatch is understood.
- Prefer fixing the underlying webhook, migration, or configuration issue before manual reconciliation.
- If the incident affects customer access, also use the Paid but No Access Runbook.

## Step 1 — Check the Stripe event

In Stripe Workbench or the Stripe dashboard, inspect the failed event and record:

- Event ID.
- Event type.
- Event created time.
- Delivery endpoint.
- Delivery status.
- Latest response status.
- Latest response body or error summary.
- Number of delivery attempts.
- Whether Stripe allows the event to be resent.

Confirm the event was sent to:

```text
/api/v1/stripe/webhook
```

If the event was sent to the deprecated `/api/v1/webhook` endpoint, update the Stripe webhook endpoint configuration before replaying events.

## Step 2 — Check Vercel logs

In Vercel production logs, inspect the request for the failed webhook delivery.

Look for:

- Route path.
- Request timestamp.
- Request ID, if available.
- Exception name and message.
- Database errors.
- Missing table, column, index, or migration errors.
- Stripe signature verification errors.
- Missing environment variables.
- Timeout or network errors.
- Unhandled event type errors.
- Entitlement/account update errors.

Do not paste raw secret values from logs into the incident record.

## Step 3 — Classify the failure

Classify the issue before taking action:

- If the error says a database object is missing, use the Production Migration Runbook.
- If the error is a Stripe signature verification failure, check production webhook secret configuration.
- If the error is caused by a missing environment variable, fix Vercel production environment variables and redeploy if needed.
- If the event was delivered to the deprecated endpoint, fix the Stripe endpoint URL.
- If the event was already processed, verify idempotency and do not duplicate customer access.
- If the event type is intentionally ignored, confirm the route returns 200 for ignored event types.
- If entitlement creation or update failed, use the Paid but No Access Runbook after the webhook issue is understood.

## Step 4 — Recover the webhook path

Use the smallest safe recovery path:

- Fix endpoint configuration if Stripe delivered to the wrong URL.
- Apply missing production migrations if the database schema is behind.
- Fix production environment variables if configuration is missing or stale.
- Deploy a code fix if the handler has a bug.
- Confirm the active production deployment contains the fix.
- Resend the failed Stripe event once the cause has been fixed.
- Confirm the resent event returns 200.
- Confirm the webhook event is recorded or processed as expected.

If the same event still returns 500 after the fix, stop and inspect the new Vercel logs before resending again.

## Step 5 — Verify customer-facing state

After the webhook returns 200, verify the downstream state that the event should have changed.

For checkout or subscription activation:

- Customer account exists.
- Stripe customer ID is linked.
- Stripe subscription ID is linked.
- Subscription status is active when expected.
- Entitlement tier matches the purchased plan.
- Entitled chain matches the purchased chain.
- Dashboard shows paid or active access.
- API allows at least one file that should be included in the customer's plan.

For cancellation:

- Subscription state is inactive or canceled when expected.
- Dashboard no longer shows paid access.
- Existing API keys no longer authorize paid files.

For refund:

- Refund does not accidentally re-enable entitlement.
- Dashboard and API state remain consistent with the intended subscription state.

## Manual reconciliation

Manual reconciliation is allowed only after Stripe state and webhook failure cause are understood.

Before manual reconciliation, document:

- Customer email.
- Stripe customer ID.
- Stripe subscription ID.
- Event ID.
- Account ID or safe account identifier.
- Purchased plan.
- Entitled chain.
- Expected subscription state.
- Reason automatic webhook processing did not complete.
- Exact manual action performed.

After manual reconciliation, verify dashboard state and API behavior.

## Customer communication

If the customer was affected, tell them:

- The payment/access issue has been investigated.
- Access has been restored or the payment state has been clarified.
- Which plan and chain should now be active, if applicable.
- Whether they should refresh the dashboard, sign out/in, or create a new API key.
- That API tests should use X-API-Key, not Authorization Bearer.

Do not include internal Stripe IDs, database IDs, webhook secrets, or full API keys in the customer reply.

## Completion checklist

- [ ] Stripe event ID and event type were recorded.
- [ ] Delivery endpoint was confirmed as /api/v1/stripe/webhook.
- [ ] Deprecated /api/v1/webhook was not used for recovery.
- [ ] Vercel production logs were checked.
- [ ] Failure cause was classified.
- [ ] Migration, configuration, endpoint, or code issue was fixed.
- [ ] Failed Stripe event was resent only after the cause was understood.
- [ ] Resent event returned 200.
- [ ] Dashboard/account state was verified.
- [ ] API entitlement behavior was verified if the event affected access.
- [ ] Customer communication did not include internal IDs, secrets, or full API keys.
