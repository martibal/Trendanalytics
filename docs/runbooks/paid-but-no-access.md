# Paid but No Access Runbook

## Purpose

This runbook describes how to diagnose and recover a customer case where Stripe shows payment or subscription activity, but the Urd Atlas dashboard or API does not show active access.

## Use this runbook when

- A customer says they paid but dashboard still shows public or inactive access.
- Stripe shows a completed checkout or active subscription, but Urd Atlas does not show an active entitlement.
- API requests return 401 or 403 even though the customer believes they have paid access.
- A Stripe webhook failed, was delayed, or may not have written entitlement state correctly.

## First response to the customer

Ask the customer for:

- The email address used at checkout.
- The approximate checkout time.
- The selected plan and chain, if they remember it.
- A screenshot of the dashboard state, without API secrets.

Do not ask the customer to send:

- Full API keys.
- Card details.
- Passwords.
- Stripe secrets or webhook secrets.

## Step 1 — Check Stripe

In Stripe, search by the customer email address and confirm:

- A customer record exists.
- Checkout completed successfully.
- A subscription exists if the purchased product is subscription-based.
- The subscription status is active, trialing, canceled, unpaid, past_due, or incomplete.
- The selected plan and chain metadata match what the customer intended to buy.
- The relevant Stripe event exists, usually checkout.session.completed.

If Stripe does not show a successful checkout or active subscription, do not manually grant access until the payment state is understood.

## Step 2 — Check Stripe webhook delivery

In Stripe Workbench or the Stripe dashboard, inspect the relevant event delivery:

- Confirm the endpoint is the production webhook URL.
- Confirm the event was delivered to /api/v1/stripe/webhook.
- Confirm the latest delivery returned 200.
- If delivery returned 500, inspect the response body and Vercel logs.
- If the failure mentions a missing table, column, or database object, use the Production Migration Runbook.

Do not use the deprecated /api/v1/webhook endpoint for production Stripe delivery.

## Step 3 — Check Urd Atlas account state

In the Urd Atlas dashboard or database records, confirm:

- The customer account exists.
- The auth user maps to the expected customer email.
- The Stripe customer ID is linked to the account.
- The Stripe subscription ID is linked to the account or entitlement record.
- The subscription status is active when Stripe says it should be active.
- The entitlement tier matches the purchased plan.
- The entitled chain matches the chain selected at checkout.
- The allowed history depth and API windows match the plan.

If Stripe is correct but Urd Atlas state is missing or stale, suspect webhook delivery, webhook processing, database migration, or reconciliation failure.

## Step 4 — Check API access

If the customer has an API key, test only with the documented header:

```http
X-API-Key: <api-key>
```

Do not ask the customer to send the full API key. Ask them to create a temporary key, test locally, or share only the visible prefix/last characters shown in the dashboard.

Interpret common responses:

- 200 means the key and entitlement work for that file.
- 401 usually means missing, malformed, unknown, or revoked API key.
- 403 usually means inactive subscription, wrong chain, wrong window, suspended key, or entitlement mismatch.
- 404 usually means wrong path, unsupported genre, unsupported chain, or missing artifact.

If API returns 403 but Stripe and entitlement state are active, check whether the customer is requesting the wrong chain or a window outside their plan.

## Step 5 — Recovery decision

Use the evidence from Stripe, webhook delivery, dashboard state, and API status to choose one recovery path:

- If Stripe payment did not complete, tell the customer checkout/payment is not complete and do not grant access manually.
- If Stripe is active but webhook delivery failed, fix the webhook issue and resend the Stripe event.
- If the webhook failed because of a missing database object, use the Production Migration Runbook first.
- If Stripe is active and webhook delivery succeeded but entitlement is missing, perform a manual reconciliation after documenting the Stripe customer ID, subscription ID, account ID, plan, and chain.
- If entitlement is active but API returns 403, check wrong chain, wrong window, inactive key, suspended key, or plan mismatch.
- If API returns 401, ask the customer to create a new API key and test again with X-API-Key.

## Manual reconciliation rules

Manual reconciliation is allowed only when Stripe is the source of truth and the mismatch is understood.

Before changing access manually, document:

- Customer email.
- Stripe customer ID.
- Stripe subscription ID.
- Checkout session ID or event ID.
- Purchased plan.
- Entitled chain.
- Expected subscription status.
- Reason webhook replay or automatic recovery was not enough.

After manual reconciliation, verify dashboard state and one API request that should be allowed by the customer's plan.

If a full API key was exposed during support, revoke it and ask the customer to create a new key.

## Customer follow-up

After recovery, tell the customer:

- Access has been checked or restored.
- Which dashboard state they should now see.
- Which plan and chain are active.
- Whether they should create a new API key.
- That they should test again using X-API-Key, not Authorization Bearer.

Do not include internal Stripe IDs, database IDs, webhook secrets, or full API keys in the customer reply.

## Completion checklist

- [ ] Customer email and checkout time were collected.
- [ ] Stripe checkout, customer, subscription, plan, and chain were checked.
- [ ] Stripe webhook delivery status was checked.
- [ ] Urd Atlas account and entitlement state were checked.
- [ ] API behavior was tested or explained using X-API-Key.
- [ ] Recovery path was documented.
- [ ] Dashboard state was verified after recovery.
- [ ] At least one allowed API request was verified after recovery, if API access was part of the issue.
- [ ] Any exposed API key was revoked.
- [ ] Customer reply did not include internal IDs, secrets, or full API keys.
