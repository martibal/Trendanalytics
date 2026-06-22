# Public Launch Rollback Runbook

This runbook defines how to pause, roll back, or recover Urd Atlas during public launch if checkout, billing, access delivery, published data, or customer-facing pages behave incorrectly.

## When to use this runbook

Use this runbook when:

- checkout or billing behaves incorrectly
- customers can buy but cannot access data
- customers can access data outside their entitlement
- public pages should stop creating purchase intent
- production deployment is broken
- published data delivery is unsafe or inconsistent
- customer access values or runtime values may be exposed

## Response modes

| Mode | Use when | Primary action |
| --- | --- | --- |
| Monitor | Minor issue, no customer harm | Keep launch live and monitor |
| Hotfix | Isolated bug with clear low-risk fix | Patch, test, deploy |
| Soft pause | New purchases should stop, existing access is safe | Pause checkout and pricing CTAs |
| Hard rollback | Production access, billing, or entitlement cannot be trusted | Revert deployment, pause delivery, stop pipeline if needed |

Do not use monitor mode if money, entitlement, access delivery, or sensitive runtime values are affected.

## Immediate triage

1. Record incident start time.
2. Identify whether the issue affects public pages, checkout, Stripe state, dashboard, authenticated file delivery, published JSON, pipeline, or provider configuration.
3. Preserve safe references: deployment ID, commit SHA, failing URL, request timestamp, and affected scope.
4. Do not paste runtime values, customer access values, private headers, or provider configuration values into chat, tickets, screenshots, commits, or logs.
5. Choose Monitor, Hotfix, Soft pause, or Hard rollback.

## Soft pause: stop new purchases

Use this when existing customer access is safe but new subscriptions should stop.

Actions:

1. Disable public checkout entry points.
2. Pause landing/pricing/dashboard CTAs that start checkout.
3. Keep Stripe products and prices unchanged unless Stripe itself is the problem.
4. Add or preserve a clear message that new subscriptions are temporarily unavailable.
5. Verify:
   - landing CTA does not start checkout
   - pricing CTA does not start checkout
   - dashboard billing CTA does not start checkout
   - existing entitled API access still works if intended

## Hard rollback: revert production deployment

Use this when the current production deployment is unsafe.

Actions:

1. Identify the last known-good Vercel deployment or Git commit.
2. Prefer Vercel rollback/redeploy when it is enough.
3. If code rollback is needed:
   - revert the bad commit
   - run targeted tests
   - run audit gates
   - push rollback commit
   - verify deployment
4. Verify:
   - public site loads
   - dashboard loads
   - checkout is either working or intentionally paused
   - authenticated file delivery enforces entitlement
   - production healthcheck passes or only shows accepted freshness warnings

Do not roll back database schema blindly if production data has already been written. Use the production migration runbook first.

## Pause API delivery

Use this when authenticated data delivery cannot be trusted.

Use the narrowest safe pause:

1. Revoke or suspend only affected customer access values.
2. Correct affected entitlement state.
3. Block only affected chain/window/genre delivery if possible.
4. Disable all authenticated file delivery only if the issue is platform-wide.

Before pausing paid access, record affected scope, reason, customer impact, and verification needed before re-enable.

## Stop scheduled pipeline

Use this when new published data could worsen the incident.

Actions:

1. Check whether a GitHub workflow or local pipeline run is active.
2. Cancel in-progress publish if it is producing unsafe output.
3. Temporarily disable or pause scheduled publishing if needed.
4. Do not delete historical published artifacts as a shortcut.
5. Before re-enable, verify dataset contract, manifests, affected files, and production URLs.

Use the daily pipeline failure and data stale/missing runbooks for detailed repair.

## Revoke exposed access values

Use this when customer access values or runtime values may be exposed.

Actions:

1. Revoke the affected customer access value.
2. If the affected value cannot be identified safely, revoke all potentially affected values for that account.
3. Ask the customer to create a new value through the supported dashboard flow.
4. Verify the old value no longer works.
5. Verify the new value works only for the intended entitlement.
6. If provider runtime values may be exposed, rotate them in provider dashboards before declaring launch safe.

Use the access-value rotation runbook for detailed handling.

## Billing and Stripe state

Use this when checkout, payment, subscription, cancellation, or refund state is wrong.

Actions:

1. Do not manually grant access until Stripe state is understood.
2. Search Stripe by customer email.
3. Confirm checkout, subscription, cancellation, refund, and webhook delivery state.
4. Confirm webhook delivery target is `/api/v1/stripe/webhook`.
5. If webhook delivery failed, fix the route/config issue and resend only after the route is healthy.
6. If a customer was charged during launch pause, decide whether to refund through Stripe and verify access state afterward.

Use paid-but-no-access, cancellation, refund, and Stripe webhook runbooks for detailed steps.

## Customer communication

Keep customer communication factual and narrow.

Say only:

- what is affected
- whether existing access is available
- whether new purchases are paused
- whether billing action is needed
- what the customer should do next
- when follow-up will happen, if known

Do not include internal IDs, provider values, full customer access values, private headers, stack traces, or unverified root cause.

## Re-enable checklist

Before reopening launch:

- [ ] Response mode was documented.
- [ ] Bad deployment was reverted or fixed.
- [ ] Checkout state is correct.
- [ ] Pricing/landing CTAs are correct.
- [ ] Stripe state is understood for affected customers.
- [ ] Webhook delivery is healthy if billing was affected.
- [ ] Dashboard entitlement state is correct.
- [ ] Authenticated file delivery allows entitled requests.
- [ ] Authenticated file delivery denies non-entitled requests.
- [ ] Published dataset parses if data was affected.
- [ ] Pipeline is safely running or intentionally paused.
- [ ] Exposed customer access values were revoked.
- [ ] Exposed provider runtime values were rotated.
- [ ] Customer-facing communication was sent if customers were affected.
- [ ] Incident notes include cause, action, operator, timestamp, affected scope, and verification result.

## Related runbooks

- `docs/runbooks/backup-restore.md`
- `docs/runbooks/api-401-403.md`
- `docs/runbooks/api-429-rate-limit.md`
- `docs/runbooks/api-key-rotation.md`
- `docs/runbooks/customer-cancellation.md`
- `docs/runbooks/customer-refund.md`
- `docs/runbooks/daily-pipeline-failure.md`
- `docs/runbooks/data-stale-or-missing.md`
- `docs/runbooks/paid-but-no-access.md`
- `docs/runbooks/production-alerts-and-observability.md`
- `docs/runbooks/production-migrations.md`
- `docs/runbooks/stripe-webhook-500.md`