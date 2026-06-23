# SOC2-style process documentation

Status: Internal process documentation. Not a SOC 2 audit report.

## Purpose

This document defines SOC2-style operating controls for Urd Atlas.

It is not a certification, attestation, or external audit report. It is a structured internal control map that explains how the operator handles access, change, incident, recovery, vendor, and review processes.

## Scope

Covered systems:

- production website
- authenticated dashboard
- API file delivery
- checkout and billing portal entry points
- subscription and entitlement records
- API access lifecycle
- published JSON artifacts
- daily pipeline and publication validation
- documentation and methodology pages
- operational runbooks

Covered process areas:

- access control
- change management
- incident response
- backup and recovery
- vendor inventory
- security review cadence
- evidence retention

## Control ownership

Urd Atlas is currently operated by a small operator team.

Default owner:

- Operator: accountable for production access, change review, incident response, recovery decisions, vendor configuration, and customer-support escalation.

When additional staff or contractors are added, every control must be updated with:

- named owner
- backup owner
- review cadence
- evidence location
- approval requirement

## Access control

### Objectives

- Limit production access to the minimum needed.
- Prevent shared logins.
- Preserve traceability for operational actions.
- Keep customer account access, billing access, and production infrastructure access separated where possible.

### Current control expectations

- Use individual accounts for provider dashboards.
- Require multi-factor authentication where provider support exists.
- Use least-privilege access for operational providers.
- Remove access immediately when a person no longer needs it.
- Review access before enterprise sales, before hiring, and after incidents.

### Evidence to retain

- provider access review notes
- list of active operator accounts by provider
- date of last access review
- access removal confirmations
- production deployment permission review

### Minimum review cadence

- monthly during launch period
- quarterly after stable operations
- immediately after personnel or contractor changes

## Change management

### Objectives

- Keep production changes traceable.
- Prevent unreviewed changes from bypassing test and audit gates.
- Preserve rollback paths for customer-visible changes.

### Required process

Every production-bound change should have:

- Git commit
- clear commit message
- build or test evidence when code changes
- public-copy guard result when web copy changes
- operational evidence when readiness items change
- rollback or fix-forward path for high-risk changes

### High-risk change examples

- billing behavior
- entitlement behavior
- API access lifecycle
- publication pipeline
- storage location
- database schema
- rate limit or quota behavior
- legal or product-boundary copy
- methodology logic

### Evidence to retain

- Git commit hash
- test output
- audit-gate output
- migration status if database schema changes
- deployment reference
- rollback decision notes if needed

## Incident response

### Objectives

- Detect production-impacting issues.
- Triage quickly.
- Communicate status without speculation.
- Preserve a post-incident record.

### Incident categories

- API delivery unavailable
- billing or entitlement mismatch
- customer portal issue
- webhook processing failure
- stale or missing data outside expected lag policy
- publication mismatch
- infrastructure outage
- suspected exposure of sensitive runtime values
- customer support escalation

### Required incident steps

1. Confirm affected surface.
2. Confirm whether customer access is affected.
3. Identify whether the issue is active, mitigated, or resolved.
4. Follow the relevant runbook.
5. Record timestamps and actions.
6. Confirm recovery with a repeatable check.
7. Add post-incident notes if the issue was customer-visible.

### Evidence to retain

- start time
- detection source
- affected surface
- actions taken
- recovery check
- customer communication if any
- post-incident note

## Backup and recovery

### Objectives

- Restore consistent service after data, deployment, billing, or provider failure.
- Avoid destructive recovery when a fix-forward path is safer.
- Preserve customer access integrity during recovery.

### Required process

Use the backup and restore runbook as the single recovery entry point.

Recovery decisions should consider:

- published data artifacts
- production database
- billing provider state
- deployment state
- storage provider state
- support evidence

### Evidence to retain

- reason for restore
- restore point
- affected system
- operator
- recovery command or provider action
- verification result
- follow-up action

## Vendor inventory

### Current vendor categories

- Hosting and deployment
- Source control
- Authentication
- Billing
- Database
- Object storage
- Email delivery
- Analytics or observability, if enabled
- Upstream data provider

### Required vendor record

For each vendor, maintain:

- vendor name
- purpose
- data category handled
- production criticality
- access owner
- account access review date
- relevant runbook or dashboard link
- backup or export path if applicable
- termination or migration consideration

### Vendor review cadence

- before launch
- quarterly after launch
- before enterprise sales
- after any vendor incident that affects production

## Data retention and operational evidence

### Objectives

- Retain enough operational evidence to support customer issues and compliance questions.
- Avoid retaining unnecessary sensitive material.
- Keep evidence bounded and redacted.

### Retain

- Git commit history
- audit-gate output
- readiness evidence
- runbook updates
- customer-visible documentation history
- bounded operational metadata
- billing state references needed for support

### Do not retain in ordinary evidence packages

- full API access values
- raw webhook bodies
- full request headers
- browser session material
- unbounded provider logs
- customer payment instrument data
- unnecessary personal data

## Security review cadence

Minimum recurring reviews:

| Review area | Cadence | Evidence |
| --- | --- | --- |
| Production access | Monthly during launch, quarterly when stable | Access review note |
| Billing and entitlement flow | Monthly during launch | Test or reconciliation note |
| API access lifecycle | Monthly during launch | Key lifecycle review note |
| Public copy boundary | Every content or product-boundary change | Copy guard output |
| Backup and recovery | Quarterly | Runbook review note |
| Vendor inventory | Quarterly | Vendor review note |
| Incident process | After every major incident, otherwise quarterly | Incident review note |
| Data publication integrity | Every pipeline/deployment change | Audit or build output |

## Customer-facing boundary

Do not describe this document as SOC 2 certification.

Allowed wording:

> Urd Atlas maintains SOC2-style internal process documentation for access control, change management, incident response, backup and recovery, vendor review, and security review cadence.

Avoid wording that implies:

- completed SOC 2 audit
- third-party attestation
- guaranteed enterprise compliance status
- certification
- formal assurance report

## Process gaps tracked before enterprise sales

Before enterprise sales, complete or explicitly defer:

- formal vendor inventory table with dates
- named access review evidence
- incident register
- admin view audit model
- team-account access review model if teams are sold
- signed enterprise agreement template if SLA terms are offered

## Review process

This document should be reviewed:

- before public launch
- before enterprise sales
- after any major incident
- after adding a new production vendor
- after adding staff or contractor access
- quarterly while the product has paying customers

## Decision

SOC2-style process documentation is ready as an internal control map.

It does not replace a formal SOC 2 audit, external attestation, legal review, enterprise agreement, or vendor security review.
