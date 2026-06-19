# Urd Atlas - Remaining Work to Reach 100% Open-Market Production Readiness

Date prepared: 2026-06-19  
Project: Urd Atlas / Trendanalytics  
Repository: `martibal/Trendanalytics`  
Web app root: `D:\css\main\web-v1-app`  
Production domain: `https://www.urdatlas.com`

## Purpose of this document

This document is intended as a handoff checklist for a new chat/session.

The product is currently cleared for **soft launch / limited live testing**. It is not yet declared **100% open-market production-ready**. This file lists the remaining gates that should be closed before calling the product fully ready for broad public launch.

The structure for every item is:

- **Why this exists**: the technical or operational reason this gate matters.
- **Green criteria**: the exact condition that makes the item complete.
- **How to solve**: practical implementation and verification steps.
- **Suggested evidence**: what should be recorded or committed.

Do not paste production secrets, Stripe secret keys, webhook secrets, Clerk secrets, database URLs, Supabase service-role keys, or full API keys into chat, GitHub issues, logs, docs, or screenshots.

---

## Current verified green baseline

The following items are already green and should not be reopened unless there is a regression:

- Production deploy is green.
- `npm run check:launch-readiness` passed.
- `npm run check:audit-gates` passed.
- Product boundary audit passed.
- API contract audit passed.
- Calculation correctness audit passed with accepted non-blocking warnings.
- Publication integrity audit passed with accepted non-blocking warnings.
- Production build passed.
- `npm run check:production-health` passed.
- `/api/v1/status` reports:
  - `ok_count = 4`
  - `warn_count = 0`
  - `fail_count = 0`
  - `unknown_count = 0`
- BTC and ETH freshness policy is `1` day.
- Base and Arbitrum freshness policy is `8` days.
- Billing lifecycle was verified in production:
  - active subscription grants entitlement,
  - inactive/cancelled subscription removes entitlement,
  - cancellation auto-revokes non-revoked API keys,
  - refunded payment does not leave entitlement active.
- Launch decision record exists:
  - `web-v1-app/docs/launch-decision-2026-06-19.md`

Relevant recent commits:

- `fd0154e9d Record production launch decision`
- `b19ba1999 Ignore local Vercel project files`
- `e55a73789 Align L2 freshness policy with weekly lag`
- `99ed406af Record verified billing launch evidence`
- `fccb4e1a9 Keep Stripe webhook audit import compatibility`
- `95fc915a9 Auto revoke API keys on subscription cancellation`

---

# Phase 1 - Must be green before broad public launch

## 1. Full new-user checkout test from scratch

### Why this exists

Existing tests proved billing and entitlement behavior for controlled test cases, but a broad public launch requires proving that a completely unknown user can arrive at the site, sign up, choose a plan, pay, return to the app, receive entitlement, create an API key, and use the API without manual intervention.

This is the most important open-market gate because it validates the real customer path, not just individual backend components.

### Green criteria

This item is green when all of the following are true in production:

- A new incognito/browser-profile user can sign up from scratch.
- The user can select a purchasable plan.
- Stripe Checkout opens with the correct live product/price.
- Payment succeeds.
- The user returns to the correct app page.
- Dashboard shows active entitlement without manual database changes.
- Dashboard shows correct chain/window scope.
- API key creation is available after payment.
- Created key works against allowed endpoints.
- Disallowed endpoints return the expected 403 response.
- Test subscription can be cancelled/refunded cleanly afterward.

### How to solve

Use a new browser profile or incognito session. Use a real test customer identity that is not already associated with an existing account. Complete the full path through the public UI.

Suggested test sequence:

1. Open `https://www.urdatlas.com`.
2. Click the intended CTA.
3. Sign up as a new user.
4. Select the intended plan.
5. Complete Stripe Checkout.
6. Return to dashboard.
7. Create API key.
8. Call one allowed endpoint.
9. Call one forbidden endpoint.
10. Cancel/refund the test subscription.
11. Confirm entitlement is removed.
12. Confirm API key is revoked or blocked.

### Suggested evidence

Create a short Markdown evidence file or update the launch checklist with:

- timestamp,
- test user email alias, without exposing private details,
- selected plan,
- Stripe customer ID suffix only,
- subscription ID suffix only,
- API key prefix/last4 only,
- endpoint results,
- cancellation/refund result,
- screenshots with sensitive values masked.

---

## 2. Basic plan test matrix for all purchasable chains

### Why this exists

A Bitcoin Basic test has already been performed. Open-market readiness requires proving that every chain sold through Basic has the same entitlement behavior: allowed data is accessible, disallowed data is blocked, and chain/window boundaries are enforced consistently.

If only Bitcoin is tested, customers buying Ethereum/Base/Arbitrum could hit hidden entitlement bugs.

### Green criteria

For every Basic purchasable chain, verify:

- `gold/latest.json` returns 200 for the purchased chain.
- `derived/latest.json` returns 200 for the purchased chain.
- `meta/latest.json` returns 200 for the purchased chain.
- promised windows return 200.
- windows outside Basic scope return 403.
- non-purchased chains return 403.
- inactive/refunded/cancelled account loses access.
- response bodies contain correct chain/date/genre/window metadata.
- no response leaks internal paths, secrets, stack traces, or raw DB details.

### How to solve

Build a small smoke-test matrix per chain:

- Bitcoin Basic
- Ethereum Basic
- Base Basic
- Arbitrum Basic

For each chain, use one live controlled test subscription or a safe verified entitlement record. Use PowerShell or Node to hit endpoints with `X-API-Key`.

Suggested endpoint groups:

- allowed:
  - `/api/v1/files/gold/<chain>/latest.json`
  - `/api/v1/files/derived/<chain>/latest.json`
  - `/api/v1/files/meta/<chain>/latest.json`
  - allowed window endpoints such as `7d`, `30d`, `90d`
- forbidden:
  - other chains
  - windows beyond Basic scope, if Basic is limited
  - revoked key
  - missing key
  - invalid key

### Suggested evidence

Commit or archive a sanitized matrix like:

| Plan | Purchased chain | Endpoint | Expected | Actual | Result |
|---|---|---:|---:|---:|---|
| Basic | bitcoin | gold/bitcoin/latest | 200 | 200 | pass |
| Basic | bitcoin | gold/ethereum/latest | 403 | 403 | pass |

Do not commit API keys or customer-sensitive payloads.

---

## 3. Pro plan tested or hidden

### Why this exists

If Pro is visible but not fully tested, users may buy a plan that has unclear entitlement boundaries, incomplete dashboard copy, or incomplete API behavior.

### Green criteria

One of these must be true:

Option A - Pro is launch-ready:

- Pro checkout works.
- Pro entitlement is correctly stored.
- Pro API scope is clearly defined.
- Pro dashboard text is accurate.
- Pro API windows/chains behave as documented.
- Pro cancellation/refund/revoke behavior works.

Option B - Pro is intentionally hidden:

- Pro plan is not purchasable from public pages.
- Pro references are removed or clearly marked as unavailable/waitlist.
- Checkout cannot be opened for Pro through public UI.
- API docs do not promise Pro-only access unless it is not purchasable yet.

### How to solve

Decide whether Pro is part of open-market launch.

If Pro is not ready, hide it from:

- landing/pricing cards,
- mobile plans page,
- dashboard upgrade prompts,
- checkout-start logic,
- docs/examples that imply Pro is live.

If Pro is ready, run the same matrix as Basic but with Pro-specific scope.

### Suggested evidence

Commit the decision:

- `docs/pro-plan-launch-decision.md`
- or add section to launch checklist.

---

## 4. API key revoke test from dashboard and API boundary

### Why this exists

Auto-revoke on subscription cancellation is implemented and tested. The remaining distinct gate is user/manual revoke behavior: a customer or operator should be able to revoke a key, and that key must permanently lose access.

### Green criteria

This is green when:

- user can revoke a key from dashboard, if dashboard revoke is supported,
- revoked key immediately returns 401 or the intended blocked response,
- revoked key cannot be reactivated accidentally,
- prefix/last4 remains visible for audit,
- full secret remains irretrievable,
- last-used and status display remain safe,
- support/operator manual revoke works if self-service revoke is not available.

### How to solve

Create a temporary key under an active test subscription. Use it successfully once. Revoke it. Re-test the same endpoint. Confirm access is blocked.

Also inspect the database/API key row:

- status should be `revoked`,
- full key secret should not be retrievable,
- hash should remain only server-side,
- logs should not contain the full key.

### Suggested evidence

Record:

- API key prefix/last4 only,
- endpoint before revoke,
- endpoint after revoke,
- UI screenshot with masked key,
- DB status only, no secret.

---

## 5. Customer-specific dashboard API examples

### Why this exists

A paying customer needs to know exactly how to use their subscription immediately after purchase. Generic API docs are not enough if the dashboard does not show the correct chain, plan, allowed windows, and header format.

This reduces support burden and prevents customers from thinking the API is broken.

### Green criteria

Dashboard shows customer-specific examples including:

- `X-API-Key` header usage,
- purchased chain(s),
- allowed genres: gold, derived, meta, briefs if applicable,
- allowed windows: latest, 7d, 30d, 90d, etc.,
- Basic plan max window,
- blocked chain explanation,
- blocked window explanation,
- copy-pasteable cURL example,
- copy-pasteable Python example,
- clear next step after key creation.

### How to solve

Patch dashboard components to generate examples from current entitlement object rather than hardcoded copy.

Recommended UI module:

- `Your API examples`
- `Allowed data`
- `Blocked by plan`
- `How to use your key`
- `Common errors`

Do not display full key after initial creation unless the system is intentionally designed for one-time secret display.

### Suggested evidence

Manual screenshots:

- active Basic user,
- inactive user,
- missing key state,
- key-created state,
- mobile dashboard.

---

## 6. Dashboard error states

### Why this exists

The dashboard must explain what went wrong for common customer states. Without explicit error states, support tickets will increase and customers may assume billing or API access is broken.

### Green criteria

Dashboard has clear states for:

- not logged in,
- logged in without subscription,
- checkout started but not completed,
- active subscription,
- inactive subscription,
- cancelled/refunded subscription,
- API key missing,
- API key revoked,
- API key limit reached,
- entitlement forbidden,
- rate limited,
- server error with request ID,
- no secret/internal details in production.

### How to solve

Map account/subscription/API key state to a small finite state machine.

Example states:

- `anonymous`
- `authenticated_no_account`
- `no_subscription`
- `checkout_pending`
- `active_entitlement_no_key`
- `active_entitlement_with_key`
- `inactive_subscription`
- `revoked_key_only`
- `server_error`

Each state should have:

- title,
- plain-English explanation,
- next action,
- support link,
- request ID if relevant.

### Suggested evidence

Screenshot or Playwright/manual checklist for each state.

---

## 7. Mobile checkout and mobile dashboard check

### Why this exists

A customer may subscribe from phone. If checkout, return-to-app, dashboard, key lifecycle, or API examples are not usable on mobile, public launch creates conversion and support risk.

### Green criteria

On mobile viewport:

- landing CTA visible and usable,
- plan selection readable,
- checkout start works,
- Stripe Checkout opens,
- return URL works,
- dashboard shows entitlement,
- API key section is usable,
- API examples do not overflow badly,
- status/errors are readable,
- navigation back to docs/support works.

### How to solve

Test on:

- Chrome mobile emulator,
- at least one real mobile device if available,
- logged out,
- logged in without subscription,
- logged in active subscription.

Fix layout issues in relevant mobile components/pages.

### Suggested evidence

Record device/browser, viewport, screenshots, and pass/fail notes.

---

## 8. Incognito/new-browser user flow check

### Why this exists

A normal public customer has no cached auth, no existing account, and no previous Stripe/customer state. Incognito testing catches hidden assumptions from your own browser session.

### Green criteria

In a clean browser context:

- public pages render correctly,
- CTA path is understandable,
- sign-up works,
- checkout works,
- return path works,
- dashboard state is correct,
- logout/login does not break entitlement display.

### How to solve

Use a clean browser profile or incognito. Avoid using the same email/account as previous tests. Test from homepage to API call.

### Suggested evidence

Short manual checklist with timestamp and result.

---

## 9. Stripe Workbench has no unresolved current 500s

### Why this exists

Historical failed Stripe events can be harmless after fixes, but unresolved current webhook 500s before launch are a critical billing/entitlement risk.

### Green criteria

Stripe Workbench shows:

- no current unresolved webhook 500s,
- recent checkout/session/subscription events deliver successfully,
- cancellation/refund events deliver successfully,
- failed historical events are either replayed successfully, ignored with documented reason, or marked as non-current.

### How to solve

Open Stripe Workbench.

Review recent events for:

- `checkout.session.completed`,
- `customer.subscription.created`,
- `customer.subscription.updated`,
- `customer.subscription.deleted`,
- `invoice.payment_succeeded`,
- `charge.refunded` / refund-related events.

Replay only events that are safe to replay. Do not replay random old events without understanding idempotency.

### Suggested evidence

Record:

- latest successful event timestamps,
- event types,
- no current 500 status,
- any old ignored events and reason.

---

## 10. Production migration process final runbook

### Why this exists

A production app must not depend on memory for database migrations. If a migration is needed later, the operator must know exactly how to verify status, deploy, rollback, and avoid destructive changes.

### Green criteria

A runbook exists and states:

- who runs production migrations,
- when they are allowed,
- exact commands,
- how to verify before/after,
- how to detect drift,
- rollback decision path,
- what not to do,
- how to coordinate with Vercel deploys,
- how to handle failed Prisma migration.

### How to solve

Review existing migration docs/runbook and make sure it includes:

```powershell
npx prisma migrate status
npx prisma migrate deploy
npx prisma migrate status
```

Also include:

- production environment source of truth,
- database backup/checkpoint policy,
- abort criteria,
- incident steps if migration fails.

### Suggested evidence

Commit a final `docs/runbooks/production-migrations.md` or update the current runbook.

---

## 11. Alert coverage for critical production failures

### Why this exists

The production healthcheck and daily pipeline alerts are now implemented, but broad launch requires alert or review process coverage for all critical failure classes.

### Green criteria

The following have alerts or explicit review processes:

- Stripe webhook 500,
- checkout route 500,
- API file delivery 500,
- high 401/403 spike,
- 429/rate-limit spike,
- pipeline failure,
- stale data,
- Vercel deployment failure,
- Supabase connection/auth failure.

### How to solve

Use the simplest acceptable mechanism first:

- GitHub Actions issue creation for scheduled checks,
- Vercel alerts/log drains,
- Supabase logs/alerts,
- Stripe Workbench webhook failure email/monitoring,
- manual daily review if automation is not available yet.

For each alert, define:

- trigger,
- owner,
- destination,
- severity,
- runbook link,
- how to verify alert path.

### Suggested evidence

Update `docs/runbooks/production-alerts-and-observability.md` with a table:

| Failure class | Detection | Alert target | Runbook | Verified |
|---|---|---|---|---|

---

## 12. Support runbook inventory complete

### Why this exists

Open-market customers will report operational problems. Support should not require debugging from scratch while a customer is waiting.

### Green criteria

Runbooks exist for:

- customer paid but dashboard shows public,
- Stripe webhook returns 500,
- API key gives 401,
- API key gives 403,
- API gives 429,
- data is stale,
- wrong chain entitlement,
- customer wants cancellation,
- customer wants refund,
- customer reports wrong JSON data,
- Vercel deployment fails,
- Prisma migration missing in production.

### How to solve

Audit `docs/runbooks/`.

For each missing item:

- create short runbook,
- include symptoms,
- likely cause,
- checks,
- safe actions,
- escalation,
- what not to do,
- expected customer-safe wording.

### Suggested evidence

Update `docs/runbooks/README.md` with links to all runbooks and run a link/existence check.

---

## 13. Support basics / operator traceability

### Why this exists

Even if the system works, the operator must be able to trace customer issues across Clerk, Stripe, Supabase/database, API key rows, and Vercel logs.

### Green criteria

You can perform the following without guessing:

- locate Stripe customer from app account,
- locate app account from Stripe customer,
- locate subscription row,
- locate API key row,
- revoke API key manually,
- cancel subscription manually,
- refund manually,
- resend Stripe webhook safely,
- check Vercel logs,
- check Supabase/database data/logs,
- find request ID in logs.

### How to solve

Create an internal operator checklist with exact locations and safe search identifiers:

- account ID,
- user email,
- Stripe customer ID,
- subscription ID,
- API key prefix/last4,
- request ID.

Do not use full API key secrets.

### Suggested evidence

Record a sanitized “operator drill” showing that each lookup path works.

---

## 14. Data contract proof for all sold chains and promised windows

### Why this exists

Publication integrity audit passed, but open-market launch should have an explicit product-contract proof: what the sales/docs promise must match what the API serves.

### Green criteria

For every sold chain and promised genre/window:

- artifact exists,
- endpoint returns intended status,
- `latest.json` exists,
- window files exist where promised,
- manifests are current,
- `dataset.json` points to valid artifacts,
- `contract.json` matches UI/API assumptions,
- dates align or divergence is explicitly documented,
- responses contain as-of/freshness metadata.

### How to solve

Run a smoke-test script that enumerates:

- chains,
- genres,
- windows,
- expected access per plan.

Compare actual endpoint status and artifact presence with the product docs.

### Suggested evidence

Commit or archive a sanitized matrix report.

---

## 15. Data-quality and caveat documentation

### Why this exists

The product is based on transparent interpretation of on-chain data. Users need to understand null fields, missing days, coverage, confidence, units, transformations, historical windows, and chain-specific quirks.

### Green criteria

Docs/UI explain:

- null fields,
- missing days,
- coverage/non-null ratio,
- confidence values,
- chain-specific quirks,
- all units,
- transformations,
- historical reference windows,
- freshness and lag,
- why L2 lag differs from BTC/ETH.

### How to solve

Review methodology and docs pages. Ensure every displayed metric or field has:

- what it is,
- how it is calculated,
- why it is included,
- what value it gives users,
- caveats.

### Suggested evidence

Add a methodology coverage checklist and mark every metric/field.

---

## 16. Methodology documentation complete

### Why this exists

The core product promise is transparency. If Gold/Derived/Meta/Briefs, regime labels, confidence, coverage, freshness, lag, robust z-scores, percentiles, and MA7/MA30 are not fully documented, the product loses trust and supportability.

### Green criteria

Methodology docs include Basic and Advanced explanations for:

- Gold,
- Derived,
- Meta,
- Briefs,
- regime labels,
- noise vs structural change,
- confidence,
- coverage,
- freshness,
- lag,
- robust z-scores,
- percentiles,
- MA7/MA30,
- methodology version,
- methodology changelog,
- previous definitions.

### How to solve

Audit `/methodology`, `/methodology/*`, `/mobile/wiki`, `/api-docs/schema`, and related docs.

Add missing pages/sections and link them from the UI.

### Suggested evidence

Create a `docs/methodology-coverage-matrix.md` listing every concept and URL/anchor where it is explained.

---

## 17. Manual non-advisory language review

### Why this exists

Automated copy guard passed, but full open-market launch should include manual review for nuanced wording that could be interpreted as advice, forecast, price signal, or investment recommendation.

### Green criteria

Manual review confirms:

- no price data,
- no price charts,
- no forecasts,
- no buy/sell/hold language,
- no “will rise/fall” wording,
- no investment advice,
- no hidden normative recommendations,
- notable observations are descriptive,
- alternative explanations/caveats are shown where relevant,
- automated legal/public copy guard passes.

### How to solve

Review key public pages and dynamic components:

- landing,
- chain pages,
- dashboard,
- methodology,
- status,
- API docs,
- mobile pages,
- notables/briefs.

Search for risky words:

- “will”
- “predict”
- “forecast”
- “signal”
- “buy”
- “sell”
- “hold”
- “should”
- “likely to rise”
- “investment”
- “profit”

Be careful not to remove legitimate non-advice disclaimer wording.

### Suggested evidence

Record reviewed pages and search results in a short Markdown audit note.

---

## 18. Landing page open-market UX review

### Why this exists

Even if the backend is ready, customers must understand the product quickly and safely. The landing page must communicate the niche value proposition without overpromising.

### Green criteria

Landing page confirms:

- product purpose understandable within 10 seconds,
- no-price-data positioning clear,
- descriptive/not-advice positioning clear,
- pricing clear,
- Basic vs Pro clear or Pro hidden,
- chain selection clear,
- CTA works on desktop,
- CTA works on mobile,
- CTA works after sign-in,
- checkout cancellation path back is clear,
- no internal/debug/placeholder text,
- all public links work,
- performance is acceptable,
- mobile layout checked.

### How to solve

Use manual review plus automated route checks. Test:

- logged out,
- logged in without subscription,
- active user,
- mobile viewport,
- cancelled checkout return.

### Suggested evidence

A pass/fail checklist with screenshots.

---

## 19. Legal/operator identity and cookie/analytics policy

### Why this exists

Open-market launch requires customer trust and regulatory clarity. Terms/Privacy/Refund/Cancellation may be live, but operator identity and cookie/analytics disclosures must also be clear where needed.

### Green criteria

Verify:

- Terms live,
- Privacy live,
- Refund policy live,
- Cancellation policy live,
- non-advice disclaimer live,
- data limitation disclaimer live,
- subscription renewal language live,
- contact/support language live,
- company/operator identity published where needed,
- cookie/analytics policy clarified,
- privacy page discloses Clerk, Stripe, account/subscription storage, API key metadata, API logs if relevant, data retention, deletion, and access request process.

### How to solve

Review legal pages. Add missing operator identity and cookie/analytics language if applicable.

Do not invent legal claims. Use conservative factual descriptions of processors and stored data.

### Suggested evidence

Commit legal page updates and add a legal readiness note.

---

## 20. Rate-limit and quota behavior review

### Why this exists

Customers need predictable API behavior. Rate limits must block abuse but not surprise normal users. Error responses must be documented and safe.

### Green criteria

Verify:

- pre-auth rate limiting active,
- authenticated rate limiting active,
- daily quota active if promised,
- 429 response has safe body,
- `Retry-After` or equivalent guidance exists if implemented,
- docs explain 429 behavior,
- logs contain request/account/key identifiers but not secrets,
- spike review process exists.

### How to solve

Run controlled tests with a low-limit test configuration or safe repeated requests. Do not overload production.

Review:

- route middleware,
- rate-limit helpers,
- API docs,
- runbook `api-429-rate-limit.md`.

### Suggested evidence

Record expected vs actual 429 behavior.

---

## 21. Endpoint security review

### Why this exists

Before broad launch, all customer and billing endpoints must be hardened against common operational failures and accidental leaks.

### Green criteria

Verify:

- Stripe webhook signature validation active,
- webhook live-mode check active,
- pre-auth rate limiting active,
- authenticated rate limiting active,
- daily quota active if promised,
- production error bodies sanitized,
- CORS policy reviewed,
- dependency audit reviewed,
- no critical dependency vulnerabilities,
- sensitive routes are server-only,
- `.env` files ignored and not committed.

### How to solve

Run:

```powershell
npm audit
npm run check:audit-gates
npm run check:production-health
```

Also inspect route handlers for:

- `process.env` usage only server-side,
- no secret exposure in responses,
- no stack traces in production,
- no client imports of server-only secrets.

### Suggested evidence

Create a security review note with commands and results.

---

## 22. Secrets and key-handling manual audit

### Why this exists

This is a high-impact risk area. A product can pass functional tests but still be unsafe if secrets appear in logs, Git history, screenshots, support tickets, or chat.

### Green criteria

Verify:

- Stripe secret key only in secret/env manager,
- Stripe webhook secret only in secret/env manager,
- Clerk secrets only in secret/env manager,
- database URL only in secret/env manager,
- Supabase service-role key, if used, never exposed client-side,
- no secrets in Git history,
- no secrets in logs,
- no API keys pasted into chat/tickets,
- exposed test keys rotated,
- API key secrets are hashed in DB,
- full secret cannot be retrieved after creation,
- only prefix/last4 displayed later,
- revoke is permanent,
- suspended/inactive state blocks delivery,
- key count limit enforced,
- last-used update does not log secret.

### How to solve

Use code review and secret scanning. Rotate any secret that may have been exposed during development/testing.

Do not paste secrets into a new chat for verification. Use redacted screenshots or suffix/prefix only.

### Suggested evidence

Record a redacted security audit summary.

---

## 23. Public launch rollback plan

### Why this exists

Open-market launch needs a fast, safe way to stop new damage if billing, data delivery, or API access breaks.

### Green criteria

A rollback plan exists and answers:

- how to disable checkout,
- how to hide/pause pricing CTA,
- how to revert latest Vercel deployment,
- how to disable or pause API delivery if needed,
- how to stop scheduled pipeline if it is publishing bad data,
- how to revoke compromised keys,
- how to communicate with affected users,
- how to decide between rollback, hotfix, or maintenance mode.

### How to solve

Create `docs/runbooks/public-launch-rollback.md`.

Include:

- decision tree,
- commands/UI steps,
- owner,
- expected time to execute,
- customer communication template,
- post-incident checklist.

### Suggested evidence

Commit rollback runbook and perform a tabletop exercise without making destructive changes.

---

# Phase 2 - Product maturity items for a "100% complete" product

These items are not necessarily required for a controlled beta, but should be completed before saying the product is fully mature and self-service at scale.

## 24. Fully automated customer portal

### Why this exists

Customers should be able to manage billing without manual support.

### Green criteria

Users can self-serve:

- view subscription,
- update payment method,
- cancel,
- access invoices,
- understand renewal/cancellation.

### How to solve

Finalize Stripe Customer Portal integration and link it from dashboard.

---

## 25. Advanced customer usage dashboard

### Why this exists

Professional API customers need visibility into usage, limits, and recent requests.

### Green criteria

Dashboard shows:

- API usage,
- daily quota,
- rate-limit status,
- last used,
- recent request status summary,
- plan scope.

### How to solve

Store and aggregate safe request metadata. Never store full API keys.

---

## 26. Automated onboarding emails

### Why this exists

New customers need immediate guidance after purchase.

### Green criteria

Emails are sent for:

- welcome,
- API key guidance,
- plan limits,
- support contact,
- cancellation/refund information.

### How to solve

Choose email provider and implement transactional templates. Keep copy non-advisory.

---

## 27. Blog/content marketing plan

### Why this exists

The business model depends on trust and education. Content can explain methodology and notable observations without advice.

### Green criteria

A repeatable publishing process exists:

- weekly cadence,
- non-advisory template,
- methodology links,
- no price/forecast language,
- review checklist.

### How to solve

Create content calendar and post template.

---

## 28. Multi-user/team accounts

### Why this exists

Professional customers may need team access.

### Green criteria

Teams can share subscription/API access safely, with roles and auditability.

### How to solve

Design account/team model before implementing. Avoid ad-hoc shared API keys.

---

## 29. Enterprise/SLA documentation

### Why this exists

Enterprise customers need reliability expectations and support boundaries.

### Green criteria

Docs define:

- support response expectations,
- data freshness expectations,
- uptime/failure disclaimers,
- API limits,
- non-advisory boundary.

### How to solve

Create enterprise terms only when offering enterprise plan.

---

## 30. Full admin reconciliation dashboard

### Why this exists

Operator should quickly reconcile Clerk, Stripe, database accounts, subscriptions, entitlements, and API keys.

### Green criteria

Admin view safely shows:

- user/account,
- Stripe customer,
- subscription state,
- entitlement,
- API key prefix/last4,
- recent webhook events,
- request IDs.

### How to solve

Build internal-only dashboard with strict access control.

---

## 31. SOC2-style process documentation

### Why this exists

Not needed for small launch, but helps if selling to professional/enterprise customers.

### Green criteria

Document:

- access control,
- change management,
- incident response,
- backup/recovery,
- vendor inventory,
- security review cadence.

### How to solve

Start with lightweight internal docs.

---

## 32. Advanced custom threshold UI

### Why this exists

Advanced users may want custom thresholds, but this must not alter canonical published data or imply advice.

### Green criteria

Custom threshold UI:

- clearly marked as user-defined,
- does not overwrite canonical META,
- includes methodology explanations,
- no forecast/advice language,
- exportable/reproducible.

### How to solve

Implement only after canonical product is stable.

---

## 33. Automated refund workflow

### Why this exists

Manual refunds work, but automation reduces support time.

### Green criteria

Refund flow is safe, logged, entitlement-aware, and does not accidentally grant access after refund.

### How to solve

Automate only after manual process is fully reliable.

---

## 34. Full self-service billing management

### Why this exists

A mature product should let users manage their own subscription lifecycle.

### Green criteria

Users can self-serve:

- upgrade,
- downgrade,
- cancel,
- renew,
- payment method,
- invoices,
- billing email.

### How to solve

Expand Stripe Portal and dashboard UI.

---

# Recommended execution order

1. Full new-user checkout from scratch.
2. API key revoke dashboard/API test.
3. Basic plan matrix for every purchasable chain.
4. Decide Pro: tested or hidden.
5. Mobile checkout/dashboard check.
6. Incognito/new-browser user flow.
7. Stripe Workbench current-error review.
8. Dashboard API examples and error states.
9. Support runbook inventory completion.
10. Alert coverage completion.
11. Production migration and rollback runbooks.
12. Legal/operator/cookie/privacy final review.
13. Rate-limit/quota and endpoint security review.
14. Methodology/data-quality/manual non-advisory review.
15. Final open-market launch decision record.

---

# Final open-market green command set

When all implementation/manual items are complete, run:

```powershell
cd D:\css\main\web-v1-app

git status --short
npm run check:launch-readiness
npm run check:audit-gates
npm run check:billing-launch
npm run check:production-health
```

All must pass.

Then perform these production manual checks:

- new user checkout from scratch,
- Basic plan matrix for every sold chain,
- Pro tested or hidden,
- cancellation/refund/revoke access loss,
- mobile checkout/dashboard,
- incognito flow,
- Stripe Workbench clean,
- no unresolved GitHub/Vercel/Supabase/Stripe incidents,
- runbooks complete,
- rollback plan exists.

Only then mark:

```text
Urd Atlas open-market production readiness: 100% GREEN
```
