# API 429 Rate Limit Runbook

## Purpose

This runbook describes how to diagnose and recover Urd Atlas API requests that return 429 because of rate limiting, quota enforcement, excessive request volume, or suspected abuse.

## Use this runbook when

- A customer reports that API requests return 429.
- API usage suddenly spikes for one account, key, chain, or endpoint.
- A customer asks why requests are being throttled.
- Support needs to determine whether a 429 is expected plan enforcement or an operational issue.
- Rate-limit logs or monitoring show unusual traffic.
- A new release changes API request volume or retry behavior.

## Safety rules

- Do not raise limits manually without understanding the account, plan, and traffic pattern.
- Do not ask the customer to send a full API key.
- Do not paste full API keys into chat, tickets, screenshots, commits, or logs.
- Do not disable global rate limits to fix one customer issue.
- Do not tell customers to retry aggressively.
- Do not expose internal rate-limit thresholds unless those thresholds are intentionally public.
- If suspicious key use is found, use the API Key Rotation Runbook.

## Expected response meaning

A 429 response means the request was understood but was throttled or denied because a rate or quota limit was reached.

429 is different from:

- 401: the request was not authenticated successfully.
- 403: the key was recognized but the requested file is outside the current entitlement.
- 404: the requested file path, chain, genre, or window was not found.
- 500: the server failed unexpectedly.

If the customer receives 401 or 403 instead, use the API 401 and 403 Runbook.

## Step 1 — Capture the request

Record:

- Customer account email.
- Safe API key identifier, never the full key.
- Request path.
- Chain.
- Genre.
- Window.
- Timestamp.
- HTTP status.
- Response body or error code.
- Customer client/tool if known.
- Whether the request was repeated in a loop.
- Whether multiple environments are using the same key.

Do not copy full API keys into the incident record.

## Step 2 — Determine scope

Classify the 429 as one of:

- Single customer / single API key.
- Multiple keys on one account.
- One endpoint or file path.
- One chain or genre.
- All authenticated file delivery.
- Public API or public static artifact traffic.
- Global traffic spike.
- Suspected abuse or accidental loop.

If only one customer or key is affected, do not treat it as a platform outage until wider traffic is checked.

## Step 3 — Check customer usage pattern

Ask or infer:

- How often the customer is polling.
- Whether they run a cron job, script, notebook, dashboard, or integration.
- Whether retries happen automatically after errors.
- Whether multiple machines use the same key.
- Whether the customer requests the same file repeatedly.
- Whether they can cache downloaded JSON locally.
- Whether they only need `latest.json` or are repeatedly downloading history/window files.

Recommend reducing repeated identical requests and caching files locally when appropriate.

## Step 4 — Check plan and quota

Check the account plan and expected limits:

- Subscription status.
- Plan tier.
- Entitled chain.
- Allowed windows.
- API key state.
- Current usage period.
- Current request count or quota usage, if available.
- Whether the limit is daily, monthly, rolling-window, or burst-based.
- Whether the key is suspended, active, or revoked.

If the customer is within plan but still receives 429, investigate enforcement configuration or bug.

If the customer is above plan, the 429 may be expected enforcement.

## Step 5 — Check logs and monitoring

Inspect available API logs or monitoring for:

- Request count by API key safe identifier.
- Request count by account.
- Request count by route.
- Request count by IP or user agent, if available.
- Repeated failed retries.
- Sudden increase after a deployment.
- 429 spike across many customers.
- 500 errors preceding the 429 spike.
- Rate-limit store errors or timeout behavior.

Logs must use safe key identifiers only. Full key values must not appear.

## Step 6 — Recovery paths

Choose the smallest safe recovery path.

If the 429 is expected:

- Explain the limit to the customer.
- Suggest reducing polling frequency.
- Suggest caching JSON locally.
- Suggest downloading only the needed chain/window/genre.
- Suggest waiting for the quota or rate window to reset.
- Suggest upgrading plan only if that is an existing product option and the language remains descriptive.

If the 429 is caused by a customer loop:

- Ask the customer to stop the loop.
- Ask them to add backoff.
- Ask them to cache repeated responses.
- Consider temporary key suspension if traffic risks service stability.

If the 429 is caused by a platform bug:

- Fix enforcement logic.
- Verify quota/rate-limit calculations.
- Verify reset semantics.
- Deploy the fix.
- Confirm affected customers can access expected files again.

If the 429 is caused by abuse or leaked key:

- Revoke or suspend the key.
- Use the API Key Rotation Runbook.
- Preserve safe audit records.

Do not disable platform-level rate limiting as a general recovery step.

## Step 7 — Verify after recovery

After recovery, verify:

- Expected allowed request returns 200.
- Out-of-plan request still returns 403.
- Excessive requests still return 429 when limits are exceeded.
- Key state is correct in dashboard/admin records.
- Last-used or usage audit updates without logging secrets.
- Monitoring no longer shows abnormal traffic.

## Customer response

For expected 429, tell the customer:

- Their request was rate limited or quota limited.
- Which kind of behavior likely caused it, if known.
- That they should reduce request frequency or wait for reset.
- That they should cache repeated JSON downloads locally.
- That they should continue using X-API-Key.

For unexpected 429, tell the customer:

- The issue is being investigated or has been corrected.
- Which request they should retry.
- Whether they should create a new API key, if key safety is involved.

Do not include internal thresholds, full API keys, internal database IDs, or security details unless those details are intended to be public documentation.

## Incident record

For confirmed 429 incidents, record:

- Customer email or account identifier.
- Safe key identifier.
- Time range.
- Request path(s).
- Observed request volume.
- Whether the 429 was expected or unexpected.
- Root cause.
- Recovery action.
- Customer communication.
- Whether key rotation or suspension was needed.

## Completion checklist

- [ ] 429 was confirmed from request status/body.
- [ ] Request path and timestamp were recorded.
- [ ] Full API key was not exposed.
- [ ] Scope was classified as single customer, endpoint, or global.
- [ ] Customer usage pattern was reviewed.
- [ ] Plan and quota state were checked.
- [ ] Logs/monitoring were checked with safe identifiers only.
- [ ] Expected vs unexpected 429 was determined.
- [ ] Recovery action was documented.
- [ ] Allowed request was verified after recovery, if applicable.
- [ ] Out-of-plan request still returned 403, if applicable.
- [ ] Customer response did not include full keys, secrets, or internal IDs.
