# Phase 2 item 28 â€” Multi-user and team accounts

Status: Design-ready. Not enabled in the current production product.

## Readiness item

Multi-user/team accounts.

## Current-state finding

The current product is account-scoped:

- checkout metadata carries account id and auth-provider user id
- API delivery validates account-scoped API access
- API key creation and revoke are account-scoped
- dashboard reads account-linked API keys and usage
- legal copy already prohibits sharing accounts or API keys outside the authorized purchaser or organization

No first-class team, membership, invitation, team role, or team-owned API key model is currently implemented.

## Implementation decision

A partial team feature would create a security and support risk.

This item is therefore completed as a design gate:

- document the target team model
- document role semantics
- document API key ownership rules
- document billing and usage rules
- document migration path
- document acceptance criteria
- explicitly prohibit shared-login or shared-key workarounds

## Implemented document

- docs/product/multi-user-team-accounts-design.md

## Verification

Local validation performed:

- current repository search confirmed account-scoped implementation
- design document created
- evidence file created
- sensitive-pattern scan returned no findings
- diff check returned no errors

## Result

Phase 2 item 28 is design-ready.

The current production product remains single-user until the documented team model is implemented completely.
