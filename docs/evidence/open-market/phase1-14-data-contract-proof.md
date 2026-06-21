# Phase 1 Item 14 - Data Contract Proof for Sold Chains and Windows

Status: PASS
Checked at UTC: 2026-06-21T21:19:10Z
Git HEAD checked: d2017126f

## Scope

This evidence covers the open-market readiness requirement that sold chains, genres, and windows have tracked published JSON data and parseable contract/index files.

## Sold access surface checked

Genres checked:

- gold
- derived
- meta

Chains checked:

- bitcoin
- ethereum
- arbitrum
- base

Windows checked:

- latest
- 7d
- 30d
- 90d
- 180d
- 365d

## Tracked contract and index files

The following files were confirmed tracked in git:

- data/published/v1/dataset.json
- data/published/v1/contract.json

Both files parsed as JSON objects.

## Tracked delivery files

For every checked genre and chain, the following tracked files were confirmed:

- latest.json
- manifest.json
- last7d.json
- last30d.json
- last90d.json
- last180d.json
- last365d.json

This covers the Basic / Single Chain sold window surface up to 90d and the Pro / Research sold window surface up to 365d.

## Parse and shape results

The data contract proof check confirmed:

- latest.json parsed as a JSON object for every checked genre and chain.
- latest.json contained the expected chain value and a date-like field.
- last7d.json parsed as an array with 7 rows.
- last30d.json parsed as an array with 30 rows.
- last90d.json parsed as an array with 90 rows.
- last180d.json parsed as an array with 180 rows.
- last365d.json parsed as an array with 365 rows.
- Each window row contained the expected chain value and a date-like field.

## As-of dates observed

Bitcoin:

- gold latest: 2026-06-20
- derived latest: 2026-06-20
- meta latest: 2026-06-20

Ethereum:

- gold latest: 2026-06-19
- derived latest: 2026-06-19
- meta latest: 2026-06-19

Arbitrum:

- gold latest: 2026-06-14
- derived latest: 2026-06-14
- meta latest: 2026-06-14

Base:

- gold latest: 2026-06-14
- derived latest: 2026-06-14
- meta latest: 2026-06-14

## Daily JSON coverage observed

Tracked daily JSON counts observed:

| Genre | Chain | Tracked daily JSON files |
|---|---:|---:|
| gold | bitcoin | 567 |
| gold | ethereum | 566 |
| gold | arbitrum | 561 |
| gold | base | 561 |
| derived | bitcoin | 567 |
| derived | ethereum | 566 |
| derived | arbitrum | 561 |
| derived | base | 561 |
| meta | bitcoin | 567 |
| meta | ethereum | 566 |
| meta | arbitrum | 561 |
| meta | base | 561 |

## Result

PASS.

The sold chain/window delivery surface is backed by tracked published JSON files and parseable contract/index files. Basic / Single Chain access up to 90d and Pro / Research access up to 365d are covered for gold, derived, and meta across bitcoin, ethereum, arbitrum, and base.

## Evidence hygiene

This evidence file contains only repository paths, parse results, row counts, and dates. It does not contain customer records, protected browser material, provider payloads, or private redirect URLs.
