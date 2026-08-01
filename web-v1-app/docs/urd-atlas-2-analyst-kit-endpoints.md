# Urd Atlas 2.0 Analyst Kit endpoints

This note documents the no-pipeline Analyst Kit surface added on the `urd-atlas-2.0` branch.

## Public CSV calendars

- `/api/v1/analyst-kit/bitcoin/regime-calendar`
- `/api/v1/analyst-kit/ethereum/regime-calendar`
- `/api/v1/analyst-kit/arbitrum/regime-calendar`
- `/api/v1/analyst-kit/base/regime-calendar`

Returns a CSV table with observation date, chain, regime, confidence fields, component scores, methodology metadata, one-liner and drivers where published.

## Public report summaries

- `/api/v1/analyst-kit/bitcoin/weekly-summary`
- `/api/v1/analyst-kit/ethereum/weekly-summary`
- `/api/v1/analyst-kit/arbitrum/weekly-summary`
- `/api/v1/analyst-kit/base/weekly-summary`

Returns plain text for report drafts and analyst notes. The language explicitly frames Urd Atlas as descriptive network-state context, not a forecast or recommendation.

## Feature schema

- `/api/v1/analyst-kit/feature-schema`

Returns machine-readable field semantics, safe uses and unsafe uses.

## Starter notebook

- `/api/v1/analyst-kit/starter-notebook`

Returns a downloadable `.ipynb` notebook that loads a chain CSV and joins it to a user's own daily metrics.

## Product purpose

These endpoints are intentionally simple. They make Urd Atlas useful to research analysts, protocol teams, small funds, BI users and semi-technical users before those users have a warehouse, feature store or production API integration.
