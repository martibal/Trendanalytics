# Urd Atlas Regime Briefs

Deterministic V1 builder for the fourth published Urd Atlas data layer: `Briefs`.

## Build all outputs

From repo root:

```bash
python scripts/build_briefs/build_all_briefs.py
```

The scripts resolve the published root in this order:

1. `--root <path>`
2. `URD_PUBLISHED_ROOT`
3. `public/data/published/v1` if present
4. `data/published/v1` if present
5. `public/data/published/v1` as default write target

## Outputs

```text
data/published/v1/briefs/chains/<chain>/latest.json
data/published/v1/briefs/chains/<chain>/<date>.json
data/published/v1/briefs/cross-chain/latest.json
data/published/v1/briefs/cross-chain/<date>.json
data/published/v1/briefs/site/latest.json
data/published/v1/briefs/manifest.json
```

If your web app reads local data through `public/data/published/v1`, build into that directory.

## Language policy

Narrative fields are generated from templates and validated by:

```bash
python scripts/build_briefs/validate_brief_language.py <file.json>
```

The validator only checks narrative fields, not technical metadata. If narrative validation fails during build, facts are still published, but `brief_status` becomes `degraded` and narrative text is replaced with fallback.
