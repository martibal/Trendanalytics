# Advanced custom threshold UI design

Status: Design-ready. Current production surface remains a local simulator and canonical-output explainer.

## Purpose

Advanced users may want to inspect how threshold choices affect regime classification. This must be supported without changing canonical published Meta artifacts, without implying forecasts, and without turning the product into advice.

This document defines the safe model for an advanced custom threshold UI.

## Current state

The current product already includes threshold-related surfaces:

- public Thresholds page
- canonical default threshold documentation
- threshold controls component
- threshold preview component
- client-side threshold control wrapper
- public defaults route
- copy stating that local controls do not overwrite canonical published outputs

The current product does not publish a customer-specific threshold editor that rewrites canonical Meta.

## Product boundary

Canonical published outputs remain authoritative.

Custom threshold outputs are:

- user-defined
- local or explicitly customer-scoped
- separate from canonical Meta
- reproducible only within the stated custom configuration
- descriptive only
- not recommendations
- not forecasts
- not investment signals

## Required UI labels

Every advanced custom threshold view must visibly label itself as:

- User-defined threshold configuration
- Local simulation or customer-scoped output
- Does not overwrite canonical published Meta
- Not part of canonical public history
- Descriptive only

Do not use wording that suggests:

- better prediction
- optimized signal
- trade timing
- recommendation
- expected return
- strategy performance
- market advice

## Required layout

### 1. Canonical reference panel

Show the current canonical defaults:

- confidence gate
- percentile bands
- robust z-score bands
- momentum threshold
- axis-level score interpretation
- named-state rule order

The user must be able to compare custom inputs against canonical defaults.

### 2. Custom controls panel

Controls should include:

- confidence gate
- high percentile threshold
- extreme-high percentile threshold
- low percentile threshold
- extreme-low percentile threshold
- high robust z-score threshold
- extreme-high robust z-score threshold
- low robust z-score threshold
- extreme-low robust z-score threshold
- momentum threshold
- minimum persistence days if supported

Each control must include basic and advanced explanation text.

### 3. Preview panel

Preview must clearly show:

- custom label
- canonical label
- changed/not changed indicator
- confidence impact if simulated
- driver changes if available
- chain
- date
- window
- methodology version
- custom configuration hash or stable export id

### 4. Reproducibility panel

The user must be able to export a bounded configuration object.

Minimum export fields:

- schema_version
- generated_at_utc
- chain
- date
- window_days
- methodology_version
- canonical_threshold_version
- custom_thresholds
- canonical_result_reference
- custom_result
- caveats

The export must not include account access values, session material, billing identifiers, or raw operational logs.

### 5. Caveats panel

Must state:

- custom thresholds are user-defined
- canonical Meta is unchanged
- historical comparisons are descriptive
- no price data is used
- no forecast is produced
- no recommendation is produced
- reproduced output depends on the same source artifacts and methodology version

## Persistence model

Safe options:

### Local-only mode

- browser state only
- exportable configuration
- no database write
- suitable for public simulator

### Customer-scoped saved configuration

Only later, if account model requires it:

- saved under account id or team id
- name and description are customer-provided
- no access values stored
- audit log records create/update/delete metadata
- export includes configuration id and version

Do not mix local-only simulation with canonical publication.

## API model

If an API is added later, it should be separate from canonical endpoints.

Suggested route shape:

- custom threshold preview route
- custom threshold export route
- optional saved configuration routes

Required response boundaries:

- no-store for customer-specific outputs
- no mutation of canonical Meta
- no public cache for customer-specific simulations
- explicit custom_mode field
- explicit canonical_unchanged field
- explicit caveats array

## Governance

Any custom threshold feature must keep these guarantees:

- canonical published Meta is immutable from the customer UI
- custom output is not mixed into public history
- custom settings are versioned
- export is deterministic for the same input bundle and configuration
- UI copy remains non-advisory
- no price data is introduced
- no forecast language is introduced
- no recommendation language is introduced

## Testing requirements

Before enabling an advanced customer-facing custom threshold UI, test:

- default configuration equals canonical reference where expected
- changing one threshold updates preview only
- canonical Meta files are not changed
- export payload is stable and bounded
- export payload excludes customer access values
- no-store headers on customer-scoped preview routes
- copy guard passes
- local simulator does not require sign-in
- saved configuration routes, if added, require account authorization
- unauthorized users cannot read saved configurations

## Launch posture

The current product may safely keep the existing Thresholds page as a public educational simulator.

A full advanced custom threshold UI should be enabled only after:

- canonical product is stable
- export schema is finalized
- tests prove canonical Meta is not overwritten
- saved configuration model is explicitly scoped
- customer-facing copy passes non-advisory review

## Acceptance criteria

This item is ready when the product has:

- current-state threshold inventory
- documented canonical-vs-custom boundary
- documented export schema
- documented reproducibility requirements
- documented safety tests
- evidence that current UI does not overwrite canonical Meta
- explicit implementation gate before customer-scoped saved configurations

## Decision

Advanced custom threshold UI is design-ready.

The current public threshold surface remains educational and local. A future customer-scoped advanced UI must follow this document before it is sold or presented as an advanced subscriber feature.
