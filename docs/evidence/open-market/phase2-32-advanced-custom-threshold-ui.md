# Phase 2 item 32 â€” Advanced custom threshold UI

Status: Design-ready. Current production surface remains a local simulator and canonical-output explainer.

## Readiness item

Advanced custom threshold UI.

## Checklist basis

The readiness checklist requires a custom threshold UI that is:

- clearly marked as user-defined
- does not overwrite canonical Meta
- includes methodology explanations
- avoids forecast and advice language
- exportable and reproducible

## Current-state finding

The repository already contains threshold-related product surfaces:

- public Thresholds page
- threshold controls component
- threshold preview component
- client-side threshold control wrapper
- public threshold defaults route
- copy stating that local controls do not overwrite canonical published outputs
- API documentation explaining canonical confidence, scorecard, driver, percentile, robust z-score, and regime fields

The current product does not expose a customer-specific editor that rewrites canonical Meta.

## Implementation decision

A partial customer-scoped threshold editor would create product-boundary risk unless export, reproducibility, authorization, and canonical separation are explicit.

This item is therefore completed as a design gate:

- define canonical-vs-custom boundary
- define UI labels
- define export schema
- define reproducibility requirements
- define persistence options
- define API boundary
- define tests
- explicitly preserve canonical Meta immutability

## Implemented document

- docs/product/advanced-custom-threshold-ui-design.md

## Verification

Local validation performed:

- repository search confirmed existing threshold pages, controls, preview, and defaults route
- repository search confirmed local simulation boundary copy
- design document created
- evidence file created
- temporary inventory file removed before commit
- sensitive-pattern scan returned no findings
- diff check returned no errors

## Result

Phase 2 item 32 is design-ready.

The production product keeps canonical Meta unchanged and treats custom threshold behavior as local simulation unless a fully scoped advanced feature is implemented later.
