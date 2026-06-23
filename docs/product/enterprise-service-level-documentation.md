# Enterprise service-level documentation

Status: Enterprise-ready documentation. Not a public contractual offer unless attached to a signed enterprise agreement.

## Purpose

This document defines how Urd Atlas should describe enterprise reliability, support, maintenance, and incident boundaries.

It is intended for professional or enterprise buyers who need clear expectations before procurement.

## Scope

This document covers:

- service availability expectations
- data publication expectations
- support response expectations
- incident communication
- maintenance communication
- exclusions and customer responsibilities
- escalation and review process

This document does not create a separate enterprise product by itself.

## Current commercial status

Current public product status:

- self-service subscription product
- single-account access model
- API and dashboard access
- documented public status page
- support through published support channel

Enterprise terms should only be offered when an enterprise plan is explicitly sold or a signed agreement exists.

## Service components

Covered components:

- public website
- authenticated dashboard
- API file delivery
- API key management
- checkout and billing portal entry points
- published methodology and documentation pages
- status and freshness pages

Data components:

- published dataset index
- gold JSON artifacts
- meta JSON artifacts
- derived JSON artifacts
- manifests and contract files

Operational components:

- daily pipeline
- publication validation
- entitlement enforcement
- rate-limit and quota enforcement
- support triage
- incident review

## Availability language

The product may state an operational availability objective only when monitoring and alerting support that claim.

Recommended wording before formal enterprise SLA:

> Urd Atlas is operated with a best-effort commercial availability target. Formal service credits, guaranteed uptime, and custom support response terms require a signed enterprise agreement.

Do not publish unconditional uptime guarantees in public product copy.

## Support response expectations

Default self-service support:

- support channel: support email
- first review target: next business day
- urgent production access issue: best effort same business day
- billing issue: next business day
- methodology/data interpretation question: next business day or next weekly review cycle, depending on scope

Enterprise support, if sold:

- support scope must be attached to the customer agreement
- response targets must define business hours and time zone
- escalation path must identify the operator contact
- excluded issues must be explicit
- support history must be retained in the customer record or support system

## Incident severity model

Severity 1 â€” Critical:

- authenticated API delivery unavailable for paying customers
- widespread entitlement failure
- billing state blocks access for valid subscribers
- published subscriber files unavailable for all supported chains

Severity 2 â€” Major:

- one chain or genre unavailable outside expected freshness policy
- dashboard unavailable while API delivery remains available
- customer portal unavailable while subscriptions remain active
- high error rate affecting a subset of customers

Severity 3 â€” Minor:

- documentation issue
- non-critical UI display issue
- delayed methodology page update
- limited support backlog

Severity 4 â€” Informational:

- scheduled maintenance
- known upstream delay within stated lag policy
- planned methodology or copy update

## Incident communication

Required communication for Severity 1 or Severity 2:

- acknowledge the issue
- identify affected surface
- state whether API delivery, dashboard, billing, or published data is affected
- state whether the issue is active, mitigated, or resolved
- avoid speculation
- avoid financial, trading, or investment language
- update the status page or customer channel as appropriate
- record post-incident notes when resolved

## Data freshness and lag boundary

Urd Atlas is a descriptive data product with explicit freshness and lag policies.

Enterprise documentation must explain:

- Bitcoin and Ethereum are expected to be closer to daily publication
- Base and Arbitrum can have weekly-style lag by design
- data lag is not the same as product outage when it is within stated policy
- data outside policy should be treated as a freshness incident
- status page and manifests are the source for current publication state

## Maintenance policy

Planned maintenance should include:

- affected surface
- expected window
- whether API delivery is affected
- whether dashboard is affected
- whether billing is affected
- whether published artifacts are affected
- planned rollback condition

Emergency maintenance should be documented after the fact if advance notice is not practical.

## Exclusions

Enterprise service-level terms should exclude:

- customer-side network failures
- customer-side code errors
- misuse of API access values
- exceeded rate limits or quotas
- unsupported scraping or mirroring
- browser/plugin issues outside supported environments
- upstream source delay within stated data-lag policy
- force majeure events
- scheduled maintenance communicated in advance
- issues caused by customer sharing access outside allowed scope

## Customer responsibilities

Customer must:

- store access values securely
- rotate access values when staff or systems change
- avoid sharing account access outside the permitted scope
- monitor their own application integration
- respect rate limits and quotas
- provide request timestamps and request identifiers when asking for support
- verify chain/window entitlement before reporting access issues

## Service credit position

Do not offer service credits unless all of these exist:

- signed enterprise agreement
- measurable uptime target
- monitoring source of truth
- incident classification process
- credit calculation method
- exclusions
- claim process
- maximum liability cap

Before that, use availability objectives, not enforceable credits.

## Enterprise evidence package

For enterprise prospects, the operator can provide:

- methodology documentation
- data contract proof
- publication integrity evidence
- billing and entitlement boundary evidence
- support runbooks
- backup/restore runbook
- public launch rollback runbook
- incident response process
- service-level documentation

Do not include credentials, customer-specific records, billing-provider payloads, or raw operational logs in prospect-facing packages.

## Review cadence

Review this document:

- before offering an enterprise plan
- after a Severity 1 or Severity 2 incident
- after changing data publication policy
- after changing rate limits or quotas
- after changing billing or entitlement logic
- at least quarterly if enterprise customers exist

## Decision

Enterprise/SLA documentation is ready as a boundary document.

A binding SLA must not be sold until a signed enterprise agreement defines exact targets, measurement source, exclusions, escalation path, and remedy terms.
