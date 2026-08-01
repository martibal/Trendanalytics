# Urd Atlas 2.0 implementation notes

## Implemented in this branch

- Replaced the landing page with workflow-first positioning.
- Added `/explorer` for no-setup chain-state reading.
- Added `/analyst-kit` for no-pipeline use cases.
- Added `/workflows` for concrete technical implementation paths.
- Added `/validation` for proof, diagnostics and limitations.
- Updated the primary navigation to prioritize Explorer, Analyst Kit, Workflows and Validation.
- Added a product-plan document to preserve the 2.0 thesis in the repository.

## Why this matters

The old product surface explained what Urd Atlas produced. The new surface explains what a customer can do with it:

- read current network state
- download a regime calendar
- join network state to a report or model dataset
- segment results by regime
- gate weak rows by confidence
- validate whether the feature varies enough to be useful

## Known follow-up work

- Add actual downloadable CSV routes or UI links.
- Add chart-pack generation.
- Add Python notebook files.
- Add Google Sheets / Excel template export.
- Add point-in-time availability fields where the published data contract supports them.
- Add true research examples using public external datasets.
- Run local `npm run lint`, `npm run typecheck`, and `npm run build` before merging.
