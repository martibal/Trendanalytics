# run-daily-pipeline.ps1
[CmdletBinding()]
param(
    [string]$RootDir = "",
    [string]$FullPipelinePath = "",
    [string]$PublishScriptPath = "",
    [string]$LogDirectory = "",
    [switch]$SkipBuild,
    [switch]$SkipPush,
    [switch]$CleanupEphemeralRaw,
    [int]$JsonFinalizerLookbackDays = 90
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Message)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$ts] $Message"
}

function Fail {
    param([string]$Message)
    throw $Message
}

function Ensure-PathExists {
    param(
        [Parameter(Mandatory = $true)][string]$PathValue,
        [Parameter(Mandatory = $true)][string]$Label
    )
    if (-not (Test-Path -LiteralPath $PathValue)) {
        Fail "$Label not found: $PathValue"
    }
}

function Ensure-Dir {
    param([Parameter(Mandatory = $true)][string]$PathValue)
    if (-not (Test-Path -LiteralPath $PathValue)) {
        New-Item -ItemType Directory -Force -Path $PathValue | Out-Null
    }
}

function Build-LogFilePath {
    param([Parameter(Mandatory = $true)][string]$Directory)
    $ts = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    return (Join-Path $Directory "daily-pipeline-incremental-$ts.log")
}

function Is-TruthyEnv {
    param([string]$Name)
    $raw = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($raw)) { return $false }
    $v = $raw.Trim().ToLowerInvariant()
    return $v -in @("1","true","yes","on")
}

function Get-CleanupEnabled {
    param([switch]$SwitchValue)
    if ($SwitchValue) { return $true }
    return (Is-TruthyEnv -Name "CSS_CLEANUP_EPHEMERAL_RAW")
}

function Remove-PathIfExists {
    param([Parameter(Mandatory = $true)][string]$PathValue)

    if (-not (Test-Path -LiteralPath $PathValue)) {
        Write-Log "Cleanup skip (missing): $PathValue"
        return
    }

    Write-Log "Cleanup removing: $PathValue"
    Remove-Item -LiteralPath $PathValue -Recurse -Force -ErrorAction Stop
}

function Cleanup-ParquetAndRaw {
    param(
        [Parameter(Mandatory = $true)][string]$RepoRoot,
        [string]$RawRootOverride = ""
    )

    $paths = New-Object System.Collections.Generic.List[string]

    if (-not [string]::IsNullOrWhiteSpace($RawRootOverride)) {
        $paths.Add($RawRootOverride)
    }
    else {
        $paths.Add((Join-Path $RepoRoot "data\raw"))
    }

    $paths.Add((Join-Path $RepoRoot "pipeline\_work\prod\features_agg"))
    $paths.Add((Join-Path $RepoRoot "data\calculated\gold"))
    $paths.Add((Join-Path $RepoRoot "data\calculated\gold_weekly"))

    $deduped = $paths | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique
    foreach ($p in $deduped) {
        try {
            Remove-PathIfExists -PathValue $p
        }
        catch {
            Write-Log "Cleanup warning for $p : $($_.Exception.Message)"
        }
    }

    $parquetFiles = @(
        Get-ChildItem -Path (Join-Path $RepoRoot "data") -Recurse -File -Filter "*.parquet" -ErrorAction SilentlyContinue
    )

    foreach ($f in $parquetFiles) {
        try {
            Write-Log "Cleanup removing parquet file: $($f.FullName)"
            Remove-Item -LiteralPath $f.FullName -Force -ErrorAction Stop
        }
        catch {
            Write-Log "Cleanup warning for parquet file $($f.FullName) : $($_.Exception.Message)"
        }
    }
}

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [Parameter(Mandatory = $true)][string]$FilePath,
        [string[]]$Arguments = @()
    )

    Push-Location $WorkingDirectory
    try {
        & $FilePath @Arguments
        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0) {
            Fail "Command failed with exit code ${exitCode}: $FilePath $($Arguments -join ' ')"
        }
    }
    finally {
        Pop-Location
    }
}


function Resolve-PythonExecutable {
    $envPython = [Environment]::GetEnvironmentVariable("CSS_PYTHON")
    if (-not [string]::IsNullOrWhiteSpace($envPython)) {
        return $envPython
    }
    return "python"
}

function Get-FinalizerLookbackDays {
    param([int]$DefaultValue)

    $envValue = [Environment]::GetEnvironmentVariable("CSS_JSON_FINALIZER_LOOKBACK_DAYS")
    if (-not [string]::IsNullOrWhiteSpace($envValue)) {
        $parsed = 0
        if ([int]::TryParse($envValue.Trim(), [ref]$parsed) -and $parsed -gt 0) {
            return $parsed
        }
        Write-Log "WARN: CSS_JSON_FINALIZER_LOOKBACK_DAYS is not a positive integer: $envValue. Using $DefaultValue."
    }

    if ($DefaultValue -gt 0) {
        return $DefaultValue
    }

    return 90
}

function Invoke-SafeJsonFinalizer {
    param(
        [Parameter(Mandatory = $true)][string]$RepoRoot,
        [int]$LookbackDays = 90
    )

    $finalizer = Join-Path $RepoRoot "pipeline\tools\regenerate_json_safe.py"
    Ensure-PathExists -PathValue $finalizer -Label "V3 safe JSON finalizer"

    $validator = Join-Path $RepoRoot "pipeline\tools\validate_meta_methodology_safety.py"
    Ensure-PathExists -PathValue $validator -Label "META methodology validator"

    $python = Resolve-PythonExecutable
    $days = Get-FinalizerLookbackDays -DefaultValue $LookbackDays
    $start = (Get-Date).ToUniversalTime().Date.AddDays(-1 * $days).ToString("yyyy-MM-dd")

    Write-Log "STEP 2: Finalize V3 META/Brief JSON from existing local GOLD artifacts"
    Write-Log "JSON finalizer start date: $start ($days day lookback)"

    Invoke-Native -WorkingDirectory $RepoRoot -FilePath $python -Arguments @(
        $finalizer,
        "--root", $RepoRoot,
        "--start", $start
    )

    Write-Log "STEP 2A: Validate canonical published META methodology"
    Invoke-Native -WorkingDirectory $RepoRoot -FilePath $python -Arguments @(
        $validator,
        "--root", $RepoRoot
    )
}

function Invoke-WebBriefsBuilderIfPresent {
    param([Parameter(Mandatory = $true)][string]$RepoRoot)

    $webRoot = Join-Path $RepoRoot "web-v1-app"
    $briefBuilder = Join-Path $webRoot "scripts\build_briefs\build_all_briefs.py"
    $publishedRoot = Join-Path $webRoot "public\data\published\v1"

    if (-not (Test-Path -LiteralPath $webRoot)) {
        Write-Log "Web app folder not found, skipping web Regime Briefs builder: $webRoot"
        return
    }

    if (-not (Test-Path -LiteralPath $briefBuilder)) {
        Write-Log "Web Regime Briefs builder not found, skipping: $briefBuilder"
        return
    }

    Ensure-PathExists -PathValue $publishedRoot -Label "web-v1-app published data root"

    $python = Resolve-PythonExecutable
    Write-Log "STEP 3A: Rebuild Regime Briefs in web-v1-app public data"
    Invoke-Native -WorkingDirectory $webRoot -FilePath $python -Arguments @(
        $briefBuilder,
        "--root", $publishedRoot
    )
}

function Validate-WebPublishedMetaIfPresent {
    param([Parameter(Mandatory = $true)][string]$RepoRoot)

    $validator = Join-Path $RepoRoot "pipeline\tools\validate_meta_methodology_safety.py"
    $webMetaRoot = Join-Path $RepoRoot "web-v1-app\public\data\published\v1\meta"

    if (-not (Test-Path -LiteralPath $validator)) {
        Write-Log "META methodology validator not found, skipping web META validation: $validator"
        return
    }

    if (-not (Test-Path -LiteralPath $webMetaRoot)) {
        Write-Log "web-v1-app META root not found, skipping web META validation: $webMetaRoot"
        return
    }

    $python = Resolve-PythonExecutable
    Write-Log "STEP 3B: Validate web-v1-app published META methodology"
    Invoke-Native -WorkingDirectory $RepoRoot -FilePath $python -Arguments @(
        $validator,
        "--root", $RepoRoot,
        "--meta-root", $webMetaRoot
    )
}

function Invoke-Git {
    param(
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [switch]$AllowNonZeroExitCode
    )

    Push-Location $WorkingDirectory
    try {
        & git @Arguments
        $exitCode = $LASTEXITCODE
        if (-not $AllowNonZeroExitCode -and $exitCode -ne 0) {
            Fail "git command failed with exit code ${exitCode}: git $($Arguments -join ' ')"
        }
        return $exitCode
    }
    finally {
        Pop-Location
    }
}

function Get-GitOutput {
    param(
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    Push-Location $WorkingDirectory
    try {
        $output = & git @Arguments
        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0) {
            Fail "git command failed with exit code ${exitCode}: git $($Arguments -join ' ')"
        }
        return ($output | Out-String).Trim()
    }
    finally {
        Pop-Location
    }
}

function Commit-PublishedSnapshotIfNeeded {
    param(
        [Parameter(Mandatory = $true)][string]$RepoRoot
    )

    $publishedPath = "web-v1-app/public/data/published/v1"

    Write-Log "STEP 2B: SkipPush mode detected - ensure local commit exists for published snapshot"

    Ensure-PathExists -PathValue (Join-Path $RepoRoot $publishedPath) -Label "Published snapshot path"

    $aheadRaw = Get-GitOutput -WorkingDirectory $RepoRoot -Arguments @("rev-list", "--count", "origin/main..HEAD")
    $ahead = 0
    if (-not [int]::TryParse($aheadRaw, [ref]$ahead)) {
        Fail "Unable to parse git ahead count: '$aheadRaw'"
    }

    if ($ahead -gt 0) {
        Write-Log "Local branch is already ahead of origin/main by $ahead commit(s); no new local commit needed here"
        return
    }

    Invoke-Git -WorkingDirectory $RepoRoot -Arguments @("add", "-A", "--", $publishedPath) | Out-Null

    $diffExit = Invoke-Git -WorkingDirectory $RepoRoot -Arguments @("diff", "--cached", "--quiet", "--exit-code") -AllowNonZeroExitCode
    if ($diffExit -eq 0) {
        Write-Log "No published snapshot changes detected after publish step; no local commit created"
        return
    }

    $commitMessage = "chore(data): update published snapshot"
    Invoke-Git -WorkingDirectory $RepoRoot -Arguments @("commit", "-m", $commitMessage) | Out-Null
    Write-Log "Created local git commit for updated published snapshot"
}

if ([string]::IsNullOrWhiteSpace($RootDir)) {
    $RootDir = (Resolve-Path (Join-Path $PSScriptRoot ".")).Path
}
if ([string]::IsNullOrWhiteSpace($FullPipelinePath)) {
    $FullPipelinePath = Join-Path $RootDir "pipeline\tools\full_pipeline.ps1"
}
if ([string]::IsNullOrWhiteSpace($PublishScriptPath)) {
    $PublishScriptPath = Join-Path $RootDir "publish-web-data.ps1"
}
if ([string]::IsNullOrWhiteSpace($LogDirectory)) {
    $LogDirectory = Join-Path $RootDir "logs"
}

Ensure-PathExists -PathValue $RootDir -Label "RootDir"
Ensure-PathExists -PathValue $FullPipelinePath -Label "Full pipeline script"
Ensure-PathExists -PathValue $PublishScriptPath -Label "Publish script"
Ensure-Dir -PathValue $LogDirectory

$cleanupEnabled = Get-CleanupEnabled -SwitchValue:$CleanupEphemeralRaw
$rawRootForCleanup = [Environment]::GetEnvironmentVariable("CSS_RAW_ROOT")
$logFile = Build-LogFilePath -Directory $LogDirectory

$transcriptStarted = $false

Write-Log "=== DAILY INCREMENTAL PIPELINE START ==="
Write-Log "RootDir             : $RootDir"
Write-Log "FullPipelinePath    : $FullPipelinePath"
Write-Log "PublishScriptPath   : $PublishScriptPath"
Write-Log "LogDirectory        : $LogDirectory"
Write-Log "SkipBuild           : $SkipBuild"
Write-Log "SkipPush            : $SkipPush"
Write-Log "CleanupEphemeralRaw : $cleanupEnabled"
Write-Log "JsonFinalizerLookbackDays: $JsonFinalizerLookbackDays"
if (-not [string]::IsNullOrWhiteSpace($rawRootForCleanup)) {
    Write-Log "CSS_RAW_ROOT        : $rawRootForCleanup"
}

$failed = $false

try {
    Start-Transcript -Path $logFile -Force | Out-Null
    $transcriptStarted = $true

    Write-Log "STEP 1: Run full pipeline incremental"
    Invoke-Native -WorkingDirectory $RootDir -FilePath "powershell" -Arguments @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", $FullPipelinePath,
        "-Mode", "incremental"
    )

    Invoke-SafeJsonFinalizer -RepoRoot $RootDir -LookbackDays $JsonFinalizerLookbackDays

    Write-Log "STEP 3: Publish web data"
    $publishArgs = @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", $PublishScriptPath
    )

    if ($SkipBuild) {
        $publishArgs += "-SkipBuild"
    }
    if ($SkipPush) {
        $publishArgs += "-SkipPush"
    }

    Invoke-Native -WorkingDirectory $RootDir -FilePath "powershell" -Arguments $publishArgs

    Invoke-WebBriefsBuilderIfPresent -RepoRoot $RootDir
    Validate-WebPublishedMetaIfPresent -RepoRoot $RootDir

    if ($SkipPush) {
        Commit-PublishedSnapshotIfNeeded -RepoRoot $RootDir
    }

    Write-Log "=== DAILY INCREMENTAL PIPELINE OK ==="
}
catch {
    $failed = $true
    Write-Log ("FATAL: " + $_.Exception.Message)
    throw
}
finally {
    if ($cleanupEnabled) {
        Write-Log "STEP 4: Cleanup raw/parquet (always)"
        Cleanup-ParquetAndRaw -RepoRoot $RootDir -RawRootOverride $rawRootForCleanup
    }
    else {
        Write-Log "STEP 4: Cleanup skipped because CleanupEphemeralRaw/CSS_CLEANUP_EPHEMERAL_RAW is not enabled"
    }

    if ($transcriptStarted) {
        try {
            Stop-Transcript | Out-Null
        }
        catch {
            Write-Log "WARN: Failed to stop transcript cleanly: $($_.Exception.Message)"
        }
    }

    if ($failed) {
        Write-Log "=== DAILY INCREMENTAL PIPELINE END (FAILED) ==="
    }
    else {
        Write-Log "=== DAILY INCREMENTAL PIPELINE END (SUCCESS) ==="
    }
}