# Customer Refund Runbook

## Purpose

This runbook describes how to handle a customer refund request for Urd Atlas in a controlled way without accidentally granting, extending, or re-enabling paid access.

## Use this runbook when

- A customer asks for a refund.
- A payment was made in error.
- A duplicate payment is suspected.
- A customer says they canceled but were charged again.
- A Stripe refund has been issued and Urd Atlas access must be verified afterward.
- Support needs to decide whether the refund request is eligible under the published Terms.

## Safety rules

- Do not promise a refund before checking Stripe, subscription state, and the applicable Terms.
- Do not request card details, passwords, full API keys, or Stripe secrets from the customer.
- Do not process a refund outside Stripe.
- Do not manually grant or extend access as a substitute for refund handling unless explicitly approved.
- Do not assume a refund should re-enable access.
- A refund should not accidentally create, restore, or extend an entitlement.
- If a full API key is exposed during the support conversation, use the API Key Rotation Runbook.

## Step 1 — Collect customer-safe information

Ask the customer for:

- The email address used at checkout.
- Approximate payment date and time.
- Plan and chain purchased, if known.
- Reason for the refund request.
- Whether they also want cancellation, if they have an active subscription.

Do not ask for:

- Card number.
- Card CVC.
- Passwords.
- Full API keys.
- Stripe secrets.
- Screenshots containing payment credentials or full API keys.

## Step 2 — Check Stripe payment state

In Stripe, search by customer email and confirm:

- Customer record exists.
- Payment or invoice exists.
- Payment status.
- Charge amount and currency.
- Product, plan, and chain metadata.
- Subscription status.
- Whether a refund already exists.
- Whether the charge is eligible to refund.
- Whether the customer has an active subscription that also needs cancellation.

If there is no successful charge, do not process a refund. Explain that no successful payment was found and ask for more information if needed.

## Step 3 — Check Urd Atlas account and entitlement state

Before approving or processing a refund, confirm:

- Customer account exists.
- Stripe customer ID is linked to the account.
- Stripe subscription ID is linked if applicable.
- Entitlement tier.
- Entitled chain.
- Dashboard state.
- API key state if the customer used API access.
- Whether the customer currently has active paid access.

If Stripe and Urd Atlas state disagree, use the Paid but No Access Runbook or Stripe Webhook 500 Runbook before deciding whether the issue is refund-related.

## Step 4 — Decide refund outcome

Choose one of these outcomes:

- Refund approved.
- Refund denied under the Terms.
- More information required.
- Cancellation required but refund not approved.
- Duplicate payment investigation required.
- Payment not found.

Document the reason for the decision.

If refund is approved, decide whether it should be:

- Full refund.
- Partial refund.
- Refund of duplicate charge only.
- Refund after immediate cancellation.
- Refund while leaving subscription active until period end only if explicitly approved.

## Step 5 — Process refund in Stripe

If the refund is approved:

- Process the refund through Stripe.
- Record the Stripe charge ID or invoice ID.
- Record the refund ID.
- Record refund amount and currency.
- Record whether subscription was canceled immediately or left active until period end.
- Record who approved and performed the refund.

Do not paste internal Stripe IDs into customer-facing messages unless there is a deliberate support reason to provide a reference.

## Step 6 — Verify access after refund

After refund processing, verify Urd Atlas state:

- Refund did not accidentally re-enable entitlement.
- Dashboard state matches intended access.
- API key behavior matches intended access.
- If subscription should be inactive, paid files return denied access.
- If access should continue until period end, dashboard and API state reflect that boundary.
- If cancellation was immediate, existing keys no longer authorize paid files.

If the refund created unexpected entitlement behavior, treat it as an incident and inspect Stripe webhook delivery plus account state.

## Step 7 — Customer reply

Tell the customer:

- Whether the refund was approved or denied.
- If approved, that the refund was processed through Stripe.
- Whether subscription access is canceled immediately or remains active until the end of the paid period.
- What dashboard state they should expect.
- Whether they need to create a new API key or stop using the previous one.
- That bank/card processing time may vary by payment provider.

Do not include:

- Full API keys.
- Stripe webhook secrets.
- Database IDs.
- Internal logs.
- Unnecessary internal Stripe metadata.

## Completion checklist

- [ ] Customer email and refund reason were collected.
- [ ] Stripe payment, invoice, subscription, and refund state were checked.
- [ ] Urd Atlas account and entitlement state were checked.
- [ ] Refund decision was documented.
- [ ] Refund was processed only through Stripe, if approved.
- [ ] Subscription cancellation state was checked or updated if needed.
- [ ] Dashboard state was verified after refund.
- [ ] API entitlement behavior was verified after refund if API access was involved.
- [ ] Customer reply did not include secrets, full API keys, or internal-only data.
