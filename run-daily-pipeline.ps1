# run-daily-pipeline.ps1
[CmdletBinding()]
param(
    [string]$RootDir = "",
    [string]$FullPipelinePath = "",
    [string]$PublishScriptPath = "",
    [string]$LogDirectory = "",
    [switch]$SkipBuild,
    [switch]$SkipPush,
    [switch]$CleanupEphemeralRaw
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

    Write-Log "STEP 2: Publish web data"
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

    Write-Log "=== DAILY INCREMENTAL PIPELINE OK ==="
}
catch {
    $failed = $true
    Write-Log ("FATAL: " + $_.Exception.Message)
    throw
}
finally {
    if ($cleanupEnabled) {
        Write-Log "STEP 3: Cleanup raw/parquet (always)"
        Cleanup-ParquetAndRaw -RepoRoot $RootDir -RawRootOverride $rawRootForCleanup
    }
    else {
        Write-Log "STEP 3: Cleanup skipped because CleanupEphemeralRaw/CSS_CLEANUP_EPHEMERAL_RAW is not enabled"
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
