# run-daily-pipeline.ps1
[CmdletBinding()]
param(
    [string]$RootDir = "D:\css\main",
    [string]$PublishScriptPath = "D:\css\main\publish-web-data.ps1",
    [string]$LogDirectory = "D:\css\main\logs",
    [switch]$SkipPush
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
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

function Ensure-DirectoryExists {
    param([Parameter(Mandatory = $true)][string]$PathValue)

    if (-not (Test-Path -LiteralPath $PathValue)) {
        New-Item -ItemType Directory -Path $PathValue -Force | Out-Null
    }
}

function Resolve-PipelineScript {
    param([Parameter(Mandatory = $true)][string]$ProjectRoot)

    $primary = Join-Path $ProjectRoot "pipeline\tools\full_pipeline.ps1"
    $legacy = Join-Path $ProjectRoot "tools\full_pipeline.ps1"

    if (Test-Path -LiteralPath $primary) {
        return $primary
    }

    if (Test-Path -LiteralPath $legacy) {
        return $legacy
    }

    Fail "Could not find full_pipeline.ps1. Checked: $primary and $legacy"
}

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)][string]$WorkingDirectory,
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter()][string[]]$Arguments = @()
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

function Build-LogFilePath {
    param([Parameter(Mandatory = $true)][string]$Directory)

    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    return Join-Path $Directory "daily-pipeline-incremental-$timestamp.log"
}

Ensure-PathExists -PathValue $RootDir -Label "Project root"
Ensure-PathExists -PathValue $PublishScriptPath -Label "Publish script"
Ensure-DirectoryExists -PathValue $LogDirectory

$pipelineScript = Resolve-PipelineScript -ProjectRoot $RootDir
$logFile = Build-LogFilePath -Directory $LogDirectory

Write-Step "Starting transcript log"
Start-Transcript -Path $logFile -Force | Out-Null

try {
    Write-Step "Resolved pipeline script"
    Write-Host $pipelineScript -ForegroundColor Green

    Write-Step "Running full pipeline in incremental mode only"
    Invoke-Native -WorkingDirectory $RootDir -FilePath "powershell" -Arguments @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", $pipelineScript,
        "-Mode", "incremental"
    )

    Write-Step "Incremental pipeline completed successfully"

    Write-Step "Running publish-web-data"
    $publishArgs = @(
        "-ExecutionPolicy", "Bypass",
        "-File", $PublishScriptPath
    )

    if ($SkipPush) {
        $publishArgs += "-SkipPush"
    }

    Invoke-Native -WorkingDirectory $RootDir -FilePath "powershell" -Arguments $publishArgs

    Write-Step "Incremental pipeline + publish complete"
    Write-Host "Mode: incremental" -ForegroundColor Green
    Write-Host "Log file: $logFile" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Log file: $logFile" -ForegroundColor Yellow
    exit 1
}
finally {
    try {
        Stop-Transcript | Out-Null
    }
    catch {
    }
}