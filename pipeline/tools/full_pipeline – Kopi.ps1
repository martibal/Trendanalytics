param(
  [ValidateSet('incremental','rebuild')]
  [string]$Mode = 'incremental'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$env:CSS_PIPELINE_MODE = $Mode

function Write-Log([string]$msg) {
  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Write-Host "[$ts] $msg"
}

function Ensure-Dir([string]$p) {
  if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null }
}

function Parse-IsoDate([string]$s) { return [DateTime]::ParseExact($s, 'yyyy-MM-dd', $null) }
function Format-IsoDate([DateTime]$d) { return $d.ToString('yyyy-MM-dd') }

function Get-LatestRawDay([string]$rawRoot) {
  $probe = Join-Path $rawRoot 'bitcoin\blocks'
  $candidates = @()

  if (Test-Path $probe) {
    $candidates = @(
      Get-ChildItem -Path $probe -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}$' } |
        Select-Object -ExpandProperty Name
    )
  }

  if ($candidates.Length -eq 0) {
    $candidates = @(
      Get-ChildItem -Path $rawRoot -Directory -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}$' } |
        Select-Object -ExpandProperty Name
    )
  }

  if ($candidates.Length -eq 0) { return $null }

  $dates = @($candidates | Sort-Object -Unique)
  return Parse-IsoDate($dates[-1])
}

function Get-RawDaysForChain([string]$rawRoot, [string]$chain) {
  $blocksDir = Join-Path $rawRoot (Join-Path $chain 'blocks')
  if (-not (Test-Path $blocksDir)) { return @() }

  $days = @(
    Get-ChildItem -Path $blocksDir -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}$' } |
      Select-Object -ExpandProperty Name |
      Sort-Object
  )
  return $days
}

function Get-MissingFeatureDays([string]$featuresRoot, [string]$chain, [string[]]$rawDays, [DateTime]$startDate) {
  Ensure-Dir (Join-Path $featuresRoot $chain)

  $existing = @{}
  $files = @(
    Get-ChildItem -Path (Join-Path $featuresRoot $chain) -File -Filter '*.parquet' -ErrorAction SilentlyContinue
  )
  foreach ($f in $files) {
    if ($f.BaseName -match '^\d{4}-\d{2}-\d{2}$') { $existing[$f.BaseName] = $true }
  }

  $missing = New-Object System.Collections.Generic.List[string]
  foreach ($d in $rawDays) {
    if (-not $d) { continue }
    $dt = Parse-IsoDate([string]$d)
    if ($dt -lt $startDate) { continue }
    if (-not $existing.ContainsKey([string]$d)) { [void]$missing.Add([string]$d) }
  }

  return @($missing.ToArray())
}

try {
  Write-Log '=== PIPELINE START ==='
  Write-Log "Mode: $Mode"

  $TOOLS_ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
  $PIPELINE_ROOT = Resolve-Path (Join-Path $TOOLS_ROOT '..') | Select-Object -ExpandProperty Path
  $MAIN_ROOT = Resolve-Path (Join-Path $TOOLS_ROOT '..\..') | Select-Object -ExpandProperty Path

  $PY = $env:CSS_PYTHON
  if ([string]::IsNullOrWhiteSpace($PY)) { $PY = 'python' }

  $DATA_ROOT = Join-Path $MAIN_ROOT 'data'
  $RAW_ROOT  = Join-Path $DATA_ROOT 'raw'
  $CALC_ROOT = Join-Path $DATA_ROOT 'calculated'

  $GOLD_PARQUET_ROOT = Join-Path $CALC_ROOT 'gold'
  $GOLD_WEEKLY_ROOT  = Join-Path $CALC_ROOT 'gold_weekly'

  $GOLD_JSON_ROOT = Join-Path $CALC_ROOT 'gold_json'
  $META_JSON_ROOT = Join-Path $CALC_ROOT 'meta'
  $DERIVED_OUT_ROOT = Join-Path $CALC_ROOT 'derived'

  $PUBLISHED_ROOT = Join-Path $DATA_ROOT 'published\v1'

  $SYNC_WEB = Join-Path $TOOLS_ROOT 'sync_web_data.ps1'

  $WORK_ROOT = Join-Path $PIPELINE_ROOT '_work'
  $PROD_ROOT = Join-Path $WORK_ROOT 'prod'
  $FEATURES_ROOT = Join-Path $PROD_ROOT 'features_agg'

  $STATUS_ROOT = Join-Path $PROD_ROOT 'status'
  $REPORTS_DIR = Join-Path $PROD_ROOT 'reports'

  $PY_DAILY_AGG = Join-Path $PIPELINE_ROOT 'src\feature_daily_agg.py'
  $PY_BUILD_GOLD_TS = Join-Path $PIPELINE_ROOT 'src\build_gold_timeseries.py'
  $PY_BUILD_GOLD_WEEKLY = Join-Path $PIPELINE_ROOT 'src\build_gold_weekly.py'
  $PY_EXPORT_DERIVED = Join-Path $PIPELINE_ROOT 'tools\export_derived_json_history.py'
  $PY_EXPORT_META = Join-Path $PIPELINE_ROOT 'tools\export_meta_json_history.py'
  $PY_SYNC_GOLD = Join-Path $PIPELINE_ROOT 'tools\sync_gold_json_history.py'
  $PY_PUBLISH = Join-Path $PIPELINE_ROOT 'tools\publish_artifacts.py'
  $PY_VALIDATE_PUBLISHED = Join-Path $PIPELINE_ROOT 'tools\validate_published_dataset.py'
  $PY_DOWNLOAD_RAW = Join-Path $PIPELINE_ROOT 'tools\download_up_to_date_minimal.py'

  Ensure-Dir $WORK_ROOT
  Ensure-Dir $PROD_ROOT
  Ensure-Dir $FEATURES_ROOT
  Ensure-Dir $STATUS_ROOT
  Ensure-Dir $REPORTS_DIR

  Ensure-Dir $GOLD_PARQUET_ROOT
  Ensure-Dir $GOLD_WEEKLY_ROOT

  Ensure-Dir $GOLD_JSON_ROOT
  Ensure-Dir $META_JSON_ROOT
  Ensure-Dir $DERIVED_OUT_ROOT
  Ensure-Dir $PUBLISHED_ROOT
  Ensure-Dir $RAW_ROOT

  $syncModeGold = 'incremental'
  if ($Mode -eq 'rebuild') { $syncModeGold = 'full' }

  $modeIncRebuild = 'incremental'
  if ($Mode -eq 'rebuild') { $modeIncRebuild = 'rebuild' }

  $chains = @('bitcoin','ethereum','arbitrum','base')
  $chainsCsv = 'bitcoin,ethereum,arbitrum,base'
  $windowsCsv = '7,30,90,180,365'

  Push-Location $MAIN_ROOT
  try {
    # ---------------------------
    # STEP -1: Sync RAW from AWS
    # ---------------------------
    if (Test-Path $PY_DOWNLOAD_RAW) {
      Write-Log 'STEP -1: Download/sync RAW from AWS (minimal catch-up)'
      # Small-but-safe lookback so we can catch missing days without full rebuild.
      # If you want even tighter: set to (latestRaw - 14).
      $rawLookbackDays = 60
      $startRaw = (Get-Date).ToUniversalTime().AddDays(-1 * $rawLookbackDays)
      $startRawIso = Format-IsoDate $startRaw

      Write-Log ("  raw sync start: " + $startRawIso + " (lookback " + $rawLookbackDays + "d)")
      & $PY -u $PY_DOWNLOAD_RAW --root $MAIN_ROOT --raw-root $RAW_ROOT --start $startRawIso --chains $chainsCsv --lag-l1-days 1 --lag-l2-days 7
      if ($LASTEXITCODE -ne 0) {
        throw "download_up_to_date_minimal.py failed rc=$LASTEXITCODE"
      }
    } else {
      Write-Log "STEP -1: Skipping RAW download (missing tool): $PY_DOWNLOAD_RAW"
    }

    Write-Log 'STEP 0: Probe latest raw day'
    $latestRaw = Get-LatestRawDay $RAW_ROOT
    if (-not $latestRaw) { throw "No raw day folders found under $RAW_ROOT" }
    Write-Log ("Latest raw day: " + (Format-IsoDate $latestRaw))

    $startDate = $latestRaw.AddDays(-30)
    if ($Mode -eq 'rebuild') { $startDate = $latestRaw.AddDays(-365) }
    Write-Log ("Start date: " + (Format-IsoDate $startDate))

    $startIso = Format-IsoDate $startDate

    Write-Log 'STEP 1: Build daily features (feature_daily_agg.py)'
    foreach ($c in $chains) {
      $rawDays = @(Get-RawDaysForChain $RAW_ROOT $c)

      if ($rawDays.Length -eq 0) {
        Write-Log "No raw days for chain=$c (skipping)"
        continue
      }

      $missing = @(Get-MissingFeatureDays $FEATURES_ROOT $c $rawDays $startDate)

      if ($missing.Length -eq 0) {
        Write-Log "chain=$c feature parquet up-to-date (no missing days)"
        continue
      }

      Write-Log ("chain=$c missing feature days: " + $missing.Length)

      foreach ($d in $missing) {
        Write-Log ("  build features: " + $c + " " + $d)
        & $PY -u $PY_DAILY_AGG --chain $c --date $d --raw_root $RAW_ROOT --out_root $FEATURES_ROOT
        if ($LASTEXITCODE -ne 0) {
          throw "feature_daily_agg.py failed chain=$c day=$d rc=$LASTEXITCODE"
        }
      }
    }

    Write-Log 'STEP 2: Build GOLD timeseries'
    foreach ($c in $chains) {
      Write-Log ("  build gold timeseries: " + $c)
      & $PY -u $PY_BUILD_GOLD_TS --chain $c --features_root $FEATURES_ROOT --gold_root $GOLD_PARQUET_ROOT --status_root $STATUS_ROOT --reports_dir $REPORTS_DIR
      if ($LASTEXITCODE -ne 0) { throw "build_gold_timeseries.py failed chain=$c rc=$LASTEXITCODE" }
    }

    Write-Log 'STEP 3: Build GOLD weekly'
    foreach ($c in $chains) {
      Write-Log ("  build gold weekly: " + $c)
      & $PY -u $PY_BUILD_GOLD_WEEKLY --chain $c --gold_root $GOLD_PARQUET_ROOT --gold_weekly_root $GOLD_WEEKLY_ROOT
      if ($LASTEXITCODE -ne 0) { throw "build_gold_weekly.py failed chain=$c rc=$LASTEXITCODE" }
    }

    Write-Log 'STEP 4: Sync GOLD json history + windows'
    & $PY -u $PY_SYNC_GOLD --repo-root $MAIN_ROOT --gold-root $GOLD_PARQUET_ROOT --out-root $GOLD_JSON_ROOT --chains $chainsCsv --mode $syncModeGold --windows $windowsCsv
    if ($LASTEXITCODE -ne 0) { throw "sync_gold_json_history.py failed rc=$LASTEXITCODE" }

    Write-Log 'STEP 5: Export DERIVED json history + windows'
    & $PY -u $PY_EXPORT_DERIVED --root $MAIN_ROOT --gold-json-root $GOLD_JSON_ROOT --meta-json-root $META_JSON_ROOT --out-root $DERIVED_OUT_ROOT --chains $chainsCsv --mode $modeIncRebuild --windows $windowsCsv
    if ($LASTEXITCODE -ne 0) { throw "export_derived_json_history.py failed rc=$LASTEXITCODE" }

    Write-Log 'STEP 6: Export META json history + windows'
    & $PY -u $PY_EXPORT_META --root $MAIN_ROOT --out-root $META_JSON_ROOT --start $startIso --mode $modeIncRebuild --windows $windowsCsv
    if ($LASTEXITCODE -ne 0) { throw "export_meta_json_history.py failed rc=$LASTEXITCODE" }

    Write-Log 'STEP 7: Publish artifacts -> data/published/v1'
    & $PY -u $PY_PUBLISH --root $MAIN_ROOT --calculated-root $CALC_ROOT --published-root $PUBLISHED_ROOT --chains $chainsCsv --genres 'gold,meta,derived' --windows $windowsCsv
    if ($LASTEXITCODE -ne 0) { throw "publish_artifacts.py failed rc=$LASTEXITCODE" }

    Write-Log 'STEP 8: Validate published dataset contract'
    & $PY -u $PY_VALIDATE_PUBLISHED --published-root $PUBLISHED_ROOT --chains $chainsCsv --genres 'gold,meta,derived' --windows $windowsCsv
    if ($LASTEXITCODE -ne 0) { throw "validate_published_dataset.py failed rc=$LASTEXITCODE" }

    if (Test-Path $SYNC_WEB) {
      Write-Log 'STEP 9: Sync published dataset -> web public'
      try {
        & $SYNC_WEB -Root $MAIN_ROOT
        if ($LASTEXITCODE -ne 0) { throw "sync_web_data.ps1 failed rc=$LASTEXITCODE" }
      }
      catch {
        Write-Log "NOTE: sync_web_data.ps1 failed (non-fatal): $($_.Exception.Message)"
      }
    }

    Write-Log '=== PIPELINE OK ==='
  }
  finally {
    Pop-Location
  }

  Write-Log '=== PIPELINE DONE (OK) ==='
  exit 0
}
catch {
  Write-Log "PIPELINE FAILED: $($_.Exception.Message)"
  Write-Error $_
  exit 1
}