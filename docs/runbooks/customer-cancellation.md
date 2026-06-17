# Customer Cancellation Runbook

## Purpose

This runbook describes how to handle a customer request to cancel an Urd Atlas subscription and how to verify that billing, dashboard access, entitlement state, and API access are consistent afterward.

## Use this runbook when

- A customer asks to cancel their subscription.
- A customer asks whether access stops immediately or at the end of the paid period.
- Stripe shows a canceled subscription but Urd Atlas still shows active access.
- Urd Atlas shows inactive access but Stripe still shows an active subscription.
- A cancellation webhook was delayed, failed, or may not have updated entitlement state correctly.

## Safety rules

- Do not ask the customer for card details, passwords, API keys, Stripe secrets, or webhook secrets.
- Do not promise a refund unless the refund decision has been approved under the refund process.
- Do not manually disable access until the Stripe subscription state and intended cancellation timing are understood.
- Do not expose internal Stripe IDs, database IDs, full API keys, or webhook details in the customer reply.
- If the customer exposed a full API key during support, use the API Key Rotation Runbook.

## Step 1 — Collect the cancellation request

Ask the customer for:

- The email address used for checkout.
- Whether they want cancellation at the end of the paid period or immediate cancellation, if the product supports both.
- Whether they are also asking for a refund.
- A short description of the issue if they are canceling because something did not work.

Do not ask for card details or full API keys.

## Step 2 — Check Stripe subscription state

In Stripe, search by customer email and confirm:

- Customer record exists.
- Active subscription exists.
- Subscription ID.
- Product or price.
- Current subscription status.
- Current period end.
- Cancellation setting, if any.
- Whether cancellation is immediate or scheduled at period end.
- Whether any refund has already been created.

If Stripe does not show an active subscription, do not attempt to cancel anything before confirming whether the customer used another email address.

## Step 3 — Perform or verify cancellation

Use the supported billing flow or Stripe dashboard/admin process.

For end-of-period cancellation:

- Confirm the subscription is marked to cancel at period end.
- Confirm the current period end date.
- Confirm access is expected to remain active until the period ends unless product policy says otherwise.

For immediate cancellation:

- Confirm the subscription status becomes canceled or inactive.
- Confirm access should stop as soon as the cancellation state is processed.
- Confirm the customer understands that API access may stop immediately.

If cancellation is performed outside the self-service flow, document who performed it and why.

## Step 4 — Check webhook delivery

In Stripe Workbench or the Stripe dashboard, confirm the relevant cancellation event was delivered to:

```text
/api/v1/stripe/webhook
```

Check:

- The event type, usually `customer.subscription.deleted` or `customer.subscription.updated`.
- The delivery status.
- The latest response status.
- Whether the latest response returned 200.
- Whether Vercel logs show any exception.

If the webhook returns 500, use the Stripe Webhook 500 Runbook.

## Step 5 — Verify Urd Atlas account state

After cancellation processing, verify:

- The account maps to the expected customer email.
- Stripe customer ID is linked to the account.
- Stripe subscription ID is linked to the account or subscription record.
- Subscription status matches Stripe.
- Entitlement state matches the intended cancellation behavior.
- Dashboard shows the expected active, inactive, canceled, or no-active-entitlement state.
- Existing API keys are blocked if subscription access should be inactive.
- The customer cannot create new active API keys if the account no longer has an active subscription.

## Step 6 — Verify API behavior

If access should remain active until period end:

- Confirm a current API key still allows files included in the plan.
- Confirm out-of-plan chain/window requests remain blocked.

If access should stop immediately:

- Confirm existing keys no longer authorize paid files.
- Confirm blocked requests return the intended 401 or 403 response.
- Confirm key state and dashboard state are consistent.

Use only:

```http
X-API-Key: <api-key>
```

Do not use `Authorization: Bearer`.

## Refund separation

Cancellation and refund are separate operational actions.

If the customer asks for a refund:

- Do not promise approval in the cancellation reply.
- Use the Customer Refund Runbook.
- Confirm whether cancellation should happen immediately before issuing any approved refund.
- Confirm refund does not accidentally re-enable entitlement.

## Customer follow-up

After cancellation is complete or scheduled, tell the customer:

- Whether the subscription was canceled immediately or scheduled to cancel at period end.
- Whether access remains active until the paid period ends or stops immediately.
- Whether they need to create or revoke any API keys.
- Whether refund handling is separate, if relevant.
- How to contact support if dashboard/API state still looks wrong.

Do not include internal Stripe IDs, database IDs, webhook details, secrets, or full API keys.

## Completion checklist

- [ ] Customer email was collected.
- [ ] Cancellation timing was clarified.
- [ ] Stripe customer and subscription were found.
- [ ] Cancellation was performed or verified.
- [ ] Relevant Stripe webhook delivery returned 200.
- [ ] Urd Atlas subscription state matched Stripe.
- [ ] Dashboard state matched the intended cancellation behavior.
- [ ] API access matched the intended cancellation behavior.
- [ ] Refund request, if any, was routed to the refund process.
- [ ] Customer reply included no internal IDs, secrets, or full API keys.
