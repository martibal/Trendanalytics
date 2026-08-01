# Urd Atlas 2.0 product plan

This document captures the product direction implemented in the first Urd Atlas 2.0 branch.

## Core product thesis

Urd Atlas is not primarily a dashboard and not primarily an API. It is a daily blockchain network-state layer that can be used at three levels:

1. Explore: browser-first context for users without a pipeline.
2. Analyze: calendars, CSVs, charts, report snippets and notebooks for analysts.
3. Integrate: point-in-time network-state features for models, backtests, monitoring and feature stores.

## Primary value proposition

Add a reproducible blockchain network-state layer to existing models, reports, dashboards and research workflows. Join on date and chain, gate by confidence and freshness, then measure where behavior changes across network conditions.

## Primary technical workflow

1. Join Urd Atlas to existing rows by observation date and chain.
2. Gate observations using confidence and freshness.
3. Segment model errors, returns, protocol metrics, BI metrics or report summaries by regime.
4. Act by changing model trust, research priority, dashboard annotation, report interpretation or exposure rules.

## Accessible no-pipeline path

A customer should get value before integrating the API. The Analyst Kit should provide:

- regime calendar
- weekly network-state summary
- downloadable chart pack
- notebook starter
- Google Sheets / Excel route
- copyable report snippets

## Product boundaries

Urd Atlas should stay descriptive. It should not be positioned as:

- intraday trading signal
- buy/sell recommendation
- market-making input
- latency-sensitive congestion monitor
- guaranteed price prediction model

BTC and ETH are T+1. Base and Arbitrum are weekly. The product is suitable for research, reporting, monitoring, daily/weekly analysis and model diagnostics.

## Validation requirements

The product should prove usefulness through:

- class balance
- transition frequency
- confidence distribution
- regime entropy
- baseline comparisons against simple z-score/quantile rules
- workflow examples showing model/report/protocol-metric impact
- point-in-time availability rules

## Next build targets

1. Add downloadable CSV and chart pack surfaces.
2. Add reproducible notebooks.
3. Add a point-in-time/vintage history contract.
4. Add baseline comparison outputs.
5. Add research examples that join Urd Atlas to public datasets.
