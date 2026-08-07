param(
  [ValidateSet('incremental','rebuild')]
  [string]$Mode = 'incremental',

  [switch]$SkipRawDownload
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

function Get-EnvOrDefault([string]$Name, [string]$DefaultValue) {
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) { return $DefaultValue }
  return $value.Trim()
}

function Get-EnvIntOrDefault([string]$Name, [int]$DefaultValue) {
  $raw = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($raw)) { return $DefaultValue }

  $parsed = 0
  if ([int]::TryParse($raw.Trim(), [ref]$parsed)) {
    return $parsed
  }

  return $DefaultValue
}

function Is-FalseLike([string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) { return $false }
  $v = $value.Trim().ToLowerInvariant()
  return $v -in @('0','false','no','off')
}

function Get-SyncWebEnabled() {
  $raw = [Environment]::GetEnvironmentVariable('CSS_SYNC_WEB')
  if ([string]::IsNullOrWhiteSpace($raw)) { return $true }
  return -not (Is-FalseLike $raw)
}

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

function Get-MissingFeatureDays([string]$featuresRoot, [string]$chain, [string[]]$rawDays, [DateTime]$startDate, [bool]$RecomputeExisting = $false) {
  Ensure-Dir (Join-Path $featuresRoot $chain)

  $existing = @{}
  $files = @(
    Get-ChildItem -Path (Join-Path $featuresRoot $chain) -File -Filter '*.parquet' -ErrorAction SilentlyContinue
  )

  foreach ($f in $files) {
    if ($f.BaseName -match '^\d{4}-\d{2}-\d{2}$') {
      $existing[$f.BaseName] = $true
    }
  }

  $missing = New-Object System.Collections.Generic.List[string]

  foreach ($d in $rawDays) {
    if (-not $d) { continue }

    $dt = Parse-IsoDate([string]$d)
    if ($dt -lt $startDate) { continue }

    if ($RecomputeExisting -or -not $existing.ContainsKey([string]$d)) {
      [void]$missing.Add([string]$d)
    }
  }

  return @($missing.ToArray())
}

function Get-LatestPublishedDay([string]$publishedRoot, [string[]]$chains) {
  if (-not (Test-Path $publishedRoot)) { return $null }

  $candidates = New-Object System.Collections.Generic.List[string]

  foreach ($genre in @('gold', 'derived', 'meta')) {
    foreach ($chain in $chains) {
      $dir = Join-Path $publishedRoot (Join-Path $genre $chain)
      if (-not (Test-Path $dir)) { continue }

      $files = Get-ChildItem -Path $dir -File -Filter '*.json' -ErrorAction SilentlyContinue |
        Where-Object { $_.BaseName -match '^\d{4}-\d{2}-\d{2}$' } |
        Select-Object -ExpandProperty BaseName

      foreach ($f in $files) {
        [void]$candidates.Add($f)
      }
    }
  }

  if ($candidates.Count -eq 0) { return $null }

  $sorted = @($candidates | Sort-Object -Unique)
  return Parse-IsoDate($sorted[-1])
}

function Read-DownloadReport([string]$path) {
  if (-not (Test-Path $path)) { return $null }

  try {
    $raw = Get-Content -LiteralPath $path -Raw -ErrorAction Stop
    if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
    return $raw | ConvertFrom-Json -ErrorAction Stop
  }
  catch {
    Write-Log "WARN: Could not parse download report: $path"
    Write-Log "WARN: $($_.Exception.Message)"
    return $null
  }
}

function Get-ObjectPropertyValue($Object, [string]$PropertyName) {
  if (-not $Object) { return $null }

  $property = $Object.PSObject.Properties[$PropertyName]
  if (-not $property) { return $null }

  return $property.Value
}

function Get-PlannedDownloadCount($downloadReport) {
  if (-not $downloadReport) { return 0 }

  $plannedDownloads = Get-ObjectPropertyValue $downloadReport 'planned_downloads'
  if ($plannedDownloads) {
    return @($plannedDownloads).Count
  }

  $summary = Get-ObjectPropertyValue $downloadReport 'summary'
  if ($summary) {
    $summaryPlannedDownloads = Get-ObjectPropertyValue $summary 'planned_downloads'
    if ($null -ne $summaryPlannedDownloads) {
      return [int]$summaryPlannedDownloads
    }

    $summaryMissingUnpublished = Get-ObjectPropertyValue $summary 'missing_unpublished'
    if ($null -ne $summaryMissingUnpublished) {
      return [int]$summaryMissingUnpublished
    }
  }

  return 0
}
try {
  Write-Log '=== PIPELINE START ==='
  Write-Log "Mode: $Mode"
  Write-Log ("SkipRawDownload: " + [bool]$SkipRawDownload)

  $TOOLS_ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
  $PIPELINE_ROOT = Resolve-Path (Join-Path $TOOLS_ROOT '..') | Select-Object -ExpandProperty Path
  $MAIN_ROOT = Resolve-Path (Join-Path $TOOLS_ROOT '..\..') | Select-Object -ExpandProperty Path

  $PY = Get-EnvOrDefault -Name 'CSS_PYTHON' -DefaultValue 'python'

  $DATA_ROOT = Join-Path $MAIN_ROOT 'data'
  $RAW_ROOT  = Get-EnvOrDefault -Name 'CSS_RAW_ROOT' -DefaultValue (Join-Path $DATA_ROOT 'raw')
  $CALC_ROOT = Join-Path $DATA_ROOT 'calculated'

  $GOLD_PARQUET_ROOT = Join-Path $CALC_ROOT 'gold'
  $GOLD_WEEKLY_ROOT  = Join-Path $CALC_ROOT 'gold_weekly'

  $GOLD_JSON_ROOT = Join-Path $CALC_ROOT 'gold_json'
  $META_JSON_ROOT = Join-Path $CALC_ROOT 'meta'
  $DERIVED_OUT_ROOT = Join-Path $CALC_ROOT 'derived'

  $PUBLISHED_ROOT = Get-EnvOrDefault -Name 'CSS_PUBLISHED_ROOT' -DefaultValue (Join-Path $DATA_ROOT 'published\v1')

  $SYNC_WEB = Join-Path $TOOLS_ROOT 'sync_web_data.py'
  $SYNC_WEB_ENABLED = Get-SyncWebEnabled

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

  $allowedChains = @('bitcoin','ethereum','arbitrum','base')
  $chainsRaw = Get-EnvOrDefault -Name 'CSS_CHAINS' -DefaultValue ($allowedChains -join ',')
  $chains = @(
    $chainsRaw.Split(',') |
      ForEach-Object { $_.Trim().ToLowerInvariant() } |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
      Select-Object -Unique
  )

  if ($chains.Length -eq 0) {
    throw 'CSS_CHAINS resolved to an empty chain set.'
  }

  foreach ($c in $chains) {
    if ($allowedChains -notcontains $c) {
      throw "Unsupported chain in CSS_CHAINS: $c. Allowed: $($allowedChains -join ',')"
    }
  }

  $chainsCsv = ($chains -join ',')
  $publishChainsCsv = ($allowedChains -join ',')
  Write-Log ("Recompute chains: " + $chainsCsv)
  Write-Log ("Global publish chains: " + $publishChainsCsv)
  $windowsCsv = '7,30,90,180,365'

  Push-Location $MAIN_ROOT
  try {
    $downloadReport = $null

    if ($SkipRawDownload) {
      Write-Log 'STEP -1: Skipping RAW download because -SkipRawDownload was provided'
    }
    elseif (Test-Path $PY_DOWNLOAD_RAW) {
      Write-Log 'STEP -1: Download/sync RAW from AWS (JSON-aware minimal catch-up)'

      $rawLookbackDays = Get-EnvIntOrDefault -Name 'CSS_RAW_LOOKBACK_DAYS' -DefaultValue 60
      if ($Mode -eq 'rebuild') {
        $startRawIso = Get-EnvOrDefault -Name 'CSS_REBUILD_START_DATE' -DefaultValue '2024-12-01'
        $null = Parse-IsoDate $startRawIso
      }
      else {
        $startRaw = (Get-Date).ToUniversalTime().AddDays(-1 * $rawLookbackDays)
        $startRawIso = Format-IsoDate $startRaw
      }
      $downloadReportPath = Join-Path $MAIN_ROOT 'reports\download_up_to_date_minimal.json'

      if ($Mode -eq 'rebuild') {
        Write-Log ("  raw rebuild start: " + $startRawIso + " (includes already-published days)")
      }
      else {
        Write-Log ("  raw sync start: " + $startRawIso + " (lookback " + $rawLookbackDays + "d)")
      }
      Write-Log ("  published state root: " + $PUBLISHED_ROOT)

      $downloadArgs = @(
        '-u', $PY_DOWNLOAD_RAW,
        '--root', $MAIN_ROOT,
        '--raw-root', $RAW_ROOT,
        '--published-root', $PUBLISHED_ROOT,
        '--start', $startRawIso,
        '--chains', $chainsCsv,
        '--lag-l1-days', '1',
        '--lag-l2-days', '7'
      )
      if ($Mode -eq 'rebuild') {
        $downloadArgs += '--include-published'
      }

      & $PY @downloadArgs
      if ($LASTEXITCODE -ne 0) {
        throw "download_up_to_date_minimal.py failed rc=$LASTEXITCODE"
      }

      $downloadReport = Read-DownloadReport -path $downloadReportPath
    }
    else {
      Write-Log "STEP -1: Skipping RAW download (missing tool): $PY_DOWNLOAD_RAW"
    }

    Write-Log 'STEP 0: Probe latest raw day'

    $latestRaw = Get-LatestRawDay $RAW_ROOT
    $latestPublished = Get-LatestPublishedDay $PUBLISHED_ROOT $chains
    $plannedDownloadCount = Get-PlannedDownloadCount $downloadReport

    if ($latestRaw) {
      Write-Log ("Latest raw day: " + (Format-IsoDate $latestRaw))
    }
    else {
      Write-Log "Latest raw day: none found"
    }

    if ($latestPublished) {
      Write-Log ("Latest published day: " + (Format-IsoDate $latestPublished))
    }
    else {
      Write-Log "Latest published day: none found"
    }

    Write-Log ("Planned raw downloads from report: " + $plannedDownloadCount)

    if ($Mode -eq 'incremental' -and -not $SkipRawDownload -and $latestPublished -and $plannedDownloadCount -eq 0) {
      Write-Log "No new unpublished raw days were detected for incremental mode."
      Write-Log "Pipeline exits successfully as a no-op before feature/gold rebuild."
      Write-Log '=== PIPELINE OK (NO-OP) ==='
      return
    }

    if (-not $latestRaw) {
      if ($Mode -eq 'incremental' -and $latestPublished -and $plannedDownloadCount -eq 0) {
        Write-Log "No local raw day folders are available, and no unpublished missing raw days were detected."
        Write-Log "Pipeline exits successfully as a no-op."
        Write-Log '=== PIPELINE OK (NO-OP) ==='
        return
      }

      throw "No raw day folders found under $RAW_ROOT"
    }

    $startDate = $latestRaw.AddDays(-30)
    if ($Mode -eq 'rebuild') {
      $rebuildRawDays = @(
        foreach ($c in $chains) {
          Get-RawDaysForChain $RAW_ROOT $c
        }
      )
      if ($rebuildRawDays.Length -gt 0) {
        $earliestRebuildDay = @($rebuildRawDays | Sort-Object -Unique)[0]
        $startDate = Parse-IsoDate $earliestRebuildDay
      }
    }

    Write-Log ("Start date: " + (Format-IsoDate $startDate))

    $startIso = Format-IsoDate $startDate

    Write-Log 'STEP 1: Build daily features (feature_daily_agg.py)'

    foreach ($c in $chains) {
      $rawDays = @(Get-RawDaysForChain $RAW_ROOT $c)

      if ($rawDays.Length -eq 0) {
        Write-Log "No raw days for chain=$c (skipping)"
        continue
      }

      $featureDays = @(Get-MissingFeatureDays $FEATURES_ROOT $c $rawDays $startDate -RecomputeExisting ($Mode -eq 'rebuild'))

      if ($featureDays.Length -eq 0) {
        Write-Log "chain=$c feature parquet up-to-date (no missing days)"
        continue
      }

      if ($Mode -eq 'rebuild') {
        Write-Log ("chain=$c recompute feature days: " + $featureDays.Length)
      }
      else {
        Write-Log ("chain=$c missing feature days: " + $featureDays.Length)
      }

      foreach ($d in $featureDays) {
        Write-Log ("  build features: " + $c + " " + $d)

        & $PY -u $PY_DAILY_AGG --chain $c --date $d --raw_root $RAW_ROOT --out_root $FEATURES_ROOT
        if ($LASTEXITCODE -ne 0) {
          throw "feature_daily_agg.py failed chain=$c day=$d rc=$LASTEXITCODE"
        }
      }
    }

    $activeChains = @(
      foreach ($c in $chains) {
        $featureDir = Join-Path $FEATURES_ROOT $c
        $featureFiles = @(
          Get-ChildItem -Path $featureDir -File -Filter '*.parquet' -ErrorAction SilentlyContinue
        )

        if ($featureFiles.Length -gt 0) {
          $c
        }
      }
    )

    if ($activeChains.Length -eq 0) {
      Write-Log "No feature parquet files were built or available for this incremental run."
      Write-Log "Pipeline exits successfully as a no-op before GOLD/DERIVED/META publication."
      Write-Log '=== PIPELINE OK (NO-OP) ==='
      return
    }

    $activeChainsCsv = ($activeChains -join ',')
    Write-Log ("Active chains for calculated artifact rebuild: " + $activeChainsCsv)

    Write-Log 'STEP 2: Build GOLD timeseries'

    foreach ($c in $activeChains) {
      Write-Log ("  build gold timeseries: " + $c)

      & $PY -u $PY_BUILD_GOLD_TS --chain $c --features_root $FEATURES_ROOT --gold_root $GOLD_PARQUET_ROOT --status_root $STATUS_ROOT --reports_dir $REPORTS_DIR
      if ($LASTEXITCODE -ne 0) {
        throw "build_gold_timeseries.py failed chain=$c rc=$LASTEXITCODE"
      }
    }

    Write-Log 'STEP 3: Build GOLD weekly'

    foreach ($c in $activeChains) {
      Write-Log ("  build gold weekly: " + $c)

      & $PY -u $PY_BUILD_GOLD_WEEKLY --chain $c --gold_root $GOLD_PARQUET_ROOT --gold_weekly_root $GOLD_WEEKLY_ROOT
      if ($LASTEXITCODE -ne 0) {
        throw "build_gold_weekly.py failed chain=$c rc=$LASTEXITCODE"
      }
    }

    Write-Log 'STEP 4: Sync GOLD json history + windows'

    & $PY -u $PY_SYNC_GOLD --repo-root $MAIN_ROOT --gold-root $GOLD_PARQUET_ROOT --out-root $GOLD_JSON_ROOT --chains $activeChainsCsv --mode $syncModeGold --windows $windowsCsv
    if ($LASTEXITCODE -ne 0) {
      throw "sync_gold_json_history.py failed rc=$LASTEXITCODE"
    }

    Write-Log 'STEP 5: Export DERIVED json history + windows'

    & $PY -u $PY_EXPORT_DERIVED --root $MAIN_ROOT --gold-json-root $GOLD_JSON_ROOT --meta-json-root $META_JSON_ROOT --out-root $DERIVED_OUT_ROOT --chains $activeChainsCsv --mode $modeIncRebuild --windows $windowsCsv
    if ($LASTEXITCODE -ne 0) {
      throw "export_derived_json_history.py failed rc=$LASTEXITCODE"
    }
    Write-Log 'STEP 6: Export META json history + windows'
    Write-Log '  forcing api.main paths for META export to the freshly calculated run outputs'
    Write-Log ("  GOLD_DIR        = " + $GOLD_JSON_ROOT)
    Write-Log ("  GOLD_STATUS_DIR = " + $STATUS_ROOT)
    Write-Log ("  GOLD_WEEKLY_DIR = " + $GOLD_WEEKLY_ROOT)
    Write-Log ("  META_DIR        = " + $META_JSON_ROOT)

    $previousApiMainEnv = @{
      GOLD_DIR = [Environment]::GetEnvironmentVariable('GOLD_DIR', [EnvironmentVariableTarget]::Process)
      GOLD_STATUS_DIR = [Environment]::GetEnvironmentVariable('GOLD_STATUS_DIR', [EnvironmentVariableTarget]::Process)
      GOLD_WEEKLY_DIR = [Environment]::GetEnvironmentVariable('GOLD_WEEKLY_DIR', [EnvironmentVariableTarget]::Process)
      META_DIR = [Environment]::GetEnvironmentVariable('META_DIR', [EnvironmentVariableTarget]::Process)
    }

    try {
      [Environment]::SetEnvironmentVariable('GOLD_DIR', $GOLD_JSON_ROOT, [EnvironmentVariableTarget]::Process)
      [Environment]::SetEnvironmentVariable('GOLD_STATUS_DIR', $STATUS_ROOT, [EnvironmentVariableTarget]::Process)
      [Environment]::SetEnvironmentVariable('GOLD_WEEKLY_DIR', $GOLD_WEEKLY_ROOT, [EnvironmentVariableTarget]::Process)
      [Environment]::SetEnvironmentVariable('META_DIR', $META_JSON_ROOT, [EnvironmentVariableTarget]::Process)

      & $PY -u $PY_EXPORT_META --root $MAIN_ROOT --out-root $META_JSON_ROOT --start $startIso --mode $modeIncRebuild --windows $windowsCsv --chains $activeChainsCsv
      if ($LASTEXITCODE -ne 0) {
        throw "export_meta_json_history.py failed rc=$LASTEXITCODE"
      }
    }
    finally {
      foreach ($name in $previousApiMainEnv.Keys) {
        [Environment]::SetEnvironmentVariable($name, $previousApiMainEnv[$name], [EnvironmentVariableTarget]::Process)
      }
    }

    Write-Log 'STEP 7: Publish artifacts -> data/published/v1'

    & $PY -u $PY_PUBLISH --root $MAIN_ROOT --calculated-root $CALC_ROOT --published-root $PUBLISHED_ROOT --chains $publishChainsCsv --genres 'gold,meta,derived' --windows $windowsCsv
    if ($LASTEXITCODE -ne 0) {
      throw "publish_artifacts.py failed rc=$LASTEXITCODE"
    }

    Write-Log 'STEP 8: Validate published dataset contract'

    & $PY -u $PY_VALIDATE_PUBLISHED --published-root $PUBLISHED_ROOT --chains $publishChainsCsv --genres 'gold,meta,derived' --windows $windowsCsv
    if ($LASTEXITCODE -ne 0) {
      throw "validate_published_dataset.py failed rc=$LASTEXITCODE"
    }

    if ($SYNC_WEB_ENABLED -and (Test-Path $SYNC_WEB)) {
      Write-Log 'STEP 9: Sync published dataset -> web public'

      try {
        & $PY -u $SYNC_WEB --root $MAIN_ROOT
        if ($LASTEXITCODE -ne 0) {
          throw "sync_web_data.py failed rc=$LASTEXITCODE"
        }
      }
      catch {
        Write-Log "NOTE: sync_web_data.py failed (non-fatal): $($_.Exception.Message)"
      }
    }
    elseif (-not $SYNC_WEB_ENABLED) {
      Write-Log 'STEP 9: Skipping web sync because CSS_SYNC_WEB disables it'
    }

    Write-Log '=== PIPELINE OK ==='
  }
  finally {
    Pop-Location
  }
}
catch {
  Write-Log ("FATAL: " + $_.Exception.Message)
  throw
}
