#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one match in {path}: {old[:120]!r}; found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


downloader = ROOT / "pipeline/tools/download_up_to_date_minimal.py"
replace_once(
    downloader,
    '    ap.add_argument("--published-root", default="", help="Published JSON root used as state reference (recommended: data/published/v1)")\n    ap.add_argument("--start", required=True, help="ISO date YYYY-MM-DD (inclusive)")',
    '    ap.add_argument("--published-root", default="", help="Published JSON root used as state reference (recommended: data/published/v1)")\n    ap.add_argument("--include-published", action="store_true", help="Allow already-published days to be downloaded again (intended for explicit historical rebuilds only)")\n    ap.add_argument("--start", required=True, help="ISO date YYYY-MM-DD (inclusive)")',
)
replace_once(
    downloader,
    '        "published_root": published_root,\n        "dry_run": bool(args.dry_run),',
    '        "published_root": published_root,\n        "include_published": bool(args.include_published),\n        "dry_run": bool(args.dry_run),',
)
replace_once(
    downloader,
    '            "If --published-root is provided, already-published day-json files are treated as state and are not re-downloaded.",',
    '            "If --published-root is provided, already-published day-json files are treated as state and are not re-downloaded unless --include-published is explicitly set.",\n            "--include-published is reserved for explicit historical rebuilds that must regenerate previously published calculations from raw source data.",',
)
replace_once(
    downloader,
    '                if day in published_days:\n                    skipped_published.append(day)\n                    continue',
    '                if (not args.include_published) and day in published_days:\n                    skipped_published.append(day)\n                    continue',
)

full = ROOT / "pipeline/tools/full_pipeline.ps1"
replace_once(
    full,
    '''      $rawLookbackDays = Get-EnvIntOrDefault -Name 'CSS_RAW_LOOKBACK_DAYS' -DefaultValue 60\n      $startRaw = (Get-Date).ToUniversalTime().AddDays(-1 * $rawLookbackDays)\n      $startRawIso = Format-IsoDate $startRaw\n      $downloadReportPath = Join-Path $MAIN_ROOT 'reports\\download_up_to_date_minimal.json'\n\n      Write-Log ("  raw sync start: " + $startRawIso + " (lookback " + $rawLookbackDays + "d)")\n      Write-Log ("  published state root: " + $PUBLISHED_ROOT)\n\n      & $PY -u $PY_DOWNLOAD_RAW --root $MAIN_ROOT --raw-root $RAW_ROOT --published-root $PUBLISHED_ROOT --start $startRawIso --chains $chainsCsv --lag-l1-days 1 --lag-l2-days 7\n      if ($LASTEXITCODE -ne 0) {\n        throw "download_up_to_date_minimal.py failed rc=$LASTEXITCODE"\n      }''',
    '''      $rawLookbackDays = Get-EnvIntOrDefault -Name 'CSS_RAW_LOOKBACK_DAYS' -DefaultValue 60\n      if ($Mode -eq 'rebuild') {\n        $startRawIso = Get-EnvOrDefault -Name 'CSS_REBUILD_START_DATE' -DefaultValue '2024-12-01'\n        $null = Parse-IsoDate $startRawIso\n      }\n      else {\n        $startRaw = (Get-Date).ToUniversalTime().AddDays(-1 * $rawLookbackDays)\n        $startRawIso = Format-IsoDate $startRaw\n      }\n      $downloadReportPath = Join-Path $MAIN_ROOT 'reports\\download_up_to_date_minimal.json'\n\n      if ($Mode -eq 'rebuild') {\n        Write-Log ("  raw rebuild start: " + $startRawIso + " (includes already-published days)")\n      }\n      else {\n        Write-Log ("  raw sync start: " + $startRawIso + " (lookback " + $rawLookbackDays + "d)")\n      }\n      Write-Log ("  published state root: " + $PUBLISHED_ROOT)\n\n      $downloadArgs = @(\n        '-u', $PY_DOWNLOAD_RAW,\n        '--root', $MAIN_ROOT,\n        '--raw-root', $RAW_ROOT,\n        '--published-root', $PUBLISHED_ROOT,\n        '--start', $startRawIso,\n        '--chains', $chainsCsv,\n        '--lag-l1-days', '1',\n        '--lag-l2-days', '7'\n      )\n      if ($Mode -eq 'rebuild') {\n        $downloadArgs += '--include-published'\n      }\n\n      & $PY @downloadArgs\n      if ($LASTEXITCODE -ne 0) {\n        throw "download_up_to_date_minimal.py failed rc=$LASTEXITCODE"\n      }''',
)

# Static invariants used by the targeted CI helper.
downloader_text = downloader.read_text(encoding="utf-8")
full_text = full.read_text(encoding="utf-8")
required_downloader = [
    'ap.add_argument("--include-published", action="store_true"',
    'if (not args.include_published) and day in published_days:',
    '"include_published": bool(args.include_published)',
]
required_full = [
    "CSS_REBUILD_START_DATE",
    "DefaultValue '2024-12-01'",
    "$downloadArgs += '--include-published'",
    "if ($Mode -eq 'rebuild')",
]
for needle in required_downloader:
    if needle not in downloader_text:
        raise RuntimeError(f"Missing downloader invariant: {needle}")
for needle in required_full:
    if needle not in full_text:
        raise RuntimeError(f"Missing full-pipeline invariant: {needle}")

print("Rebuild published-raw history patch applied and invariants verified.")
