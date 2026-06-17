# Urd Atlas Production Runbooks

## Purpose

This directory contains operational runbooks for Urd Atlas production support, billing recovery, API access, data publishing, and incident response.

Use these runbooks when production behavior must be diagnosed or recovered in a controlled, documented way.

## Runbook index

### Billing, subscription, and customer access

- [Paid but No Access](./paid-but-no-access.md)
  Use when Stripe shows payment or subscription activity, but the dashboard or API does not show active access.

- [Customer Cancellation](./customer-cancellation.md)
  Use when a customer wants to cancel, has canceled, or cancellation state must be verified.

- [Customer Refund](./customer-refund.md)
  Use when a refund is requested, approved, processed, or must be reconciled against entitlement state.

- [Stripe Webhook 500](./stripe-webhook-500.md)
  Use when Stripe webhook delivery returns 500 or fails to process safely.

### API access and security

- [API 401 and 403](./api-401-403.md)
  Use when authenticated API requests fail because of authentication, entitlement, subscription, chain, genre, or window scope.

- [API 429 Rate Limit](./api-429-rate-limit.md)
  Use when API requests are rate limited or quota limited.

- [API Key Rotation](./api-key-rotation.md)
  Use when a key is exposed, suspected compromised, no longer needed, or must be rotated.

### Data, pipeline, and publishing

- [Data Stale or Missing](./data-stale-or-missing.md)
  Use when published JSON appears stale, missing, inconsistent, or unavailable through the website or API.

- [Daily Pipeline Failure](./daily-pipeline-failure.md)
  Use when the daily data pipeline fails or produces incomplete output.

- [Production Migration](./production-migrations.md)
  Use when checking, applying, or recovering production database migrations.

## General safety rules

- Do not paste secrets into chat, tickets, commits, screenshots, or logs.
- Do not ask customers to send full API keys.
- Do not manually grant or widen access unless Stripe state and entitlement state are understood.
- Do not repeatedly resend Stripe webhook events before identifying the failure cause.
- Do not publish partial or stale data as fresh.
- Do not introduce price data, forecast language, advice language, or unsupported metrics while recovering incidents.
- Prefer fixing root cause over manual reconciliation.
- If manual reconciliation is unavoidable, document exactly what changed and why.

## Common routing guide

Use this quick routing table when an incident starts:

| Symptom | Start with |
|---|---|
| Customer paid but dashboard is public/inactive | Paid but No Access |
| Stripe webhook returns 500 | Stripe Webhook 500 |
| Customer wants to cancel | Customer Cancellation |
| Customer asks for refund | Customer Refund |
| API returns 401 | API 401 and 403 |
| API returns 403 | API 401 and 403 |
| API returns 429 | API 429 Rate Limit |
| API key was exposed | API Key Rotation |
| Data is stale or file is missing | Data Stale or Missing |
| Daily pipeline failed | Daily Pipeline Failure |
| Production database schema issue | Production Migration |

## Completion expectation

For every production incident:

- Identify the correct runbook.
- Record the customer/account-safe identifiers.
- Classify the root cause before recovery.
- Apply the smallest safe recovery path.
- Verify production behavior after recovery.
- Communicate to the customer without exposing internal IDs, secrets, or full API keys.
- Preserve an incident record when production behavior was affected.
