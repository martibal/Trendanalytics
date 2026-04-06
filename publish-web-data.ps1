# publish-web-data.ps1
[CmdletBinding()]
param(
    [string]$RepoRoot = "",
    [string]$WebAppRoot = "",
    [string]$SyncScriptPath = "",
    [string]$SourceRoot = "",
    [string]$TargetRoot = "",
    [string]$Branch = "main",
    [string]$CommitMessage = "",
    [switch]$SkipBuild,
    [switch]$SkipPush,
    [switch]$DryRun
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

function Get-CurrentTimestampForCommit {
    return (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot ".")).Path
}
if ([string]::IsNullOrWhiteSpace($WebAppRoot)) {
    $WebAppRoot = Join-Path $RepoRoot "web-v1-app"
}
if ([string]::IsNullOrWhiteSpace($SyncScriptPath)) {
    $SyncScriptPath = Join-Path $RepoRoot "sync-published-data.ps1"
}
if ([string]::IsNullOrWhiteSpace($SourceRoot)) {
    $SourceRoot = Join-Path $RepoRoot "data\published\v1"
}
if ([string]::IsNullOrWhiteSpace($TargetRoot)) {
    $TargetRoot = Join-Path $WebAppRoot "public\data\published\v1"
}

Ensure-PathExists -PathValue $RepoRoot -Label "Repo root"
Ensure-PathExists -PathValue $WebAppRoot -Label "Web app root"
Ensure-PathExists -PathValue $SyncScriptPath -Label "Sync script"
Ensure-PathExists -PathValue $SourceRoot -Label "Published source root"

Write-Step "Publish configuration"
Write-Host "RepoRoot      : $RepoRoot"
Write-Host "WebAppRoot    : $WebAppRoot"
Write-Host "SyncScriptPath: $SyncScriptPath"
Write-Host "SourceRoot    : $SourceRoot"
Write-Host "TargetRoot    : $TargetRoot"
Write-Host "Branch        : $Branch"
Write-Host "SkipBuild     : $SkipBuild"
Write-Host "SkipPush      : $SkipPush"
Write-Host "DryRun        : $DryRun"

if ($DryRun) {
    Write-Step "Dry-run command preview"
    Write-Host "powershell -ExecutionPolicy Bypass -File `"$SyncScriptPath`" -SourceRoot `"$SourceRoot`" -TargetRoot `"$TargetRoot`""
    if (-not $SkipBuild) {
        Write-Host "cd `"$WebAppRoot`" ; npm run build"
    }
    Write-Host "cd `"$RepoRoot`" ; git add sync-published-data.ps1 web-v1-app/public/data/published/v1"
    if (-not $SkipPush) {
        Write-Host "cd `"$RepoRoot`" ; git commit -m `"Update published data snapshot ...`""
        Write-Host "cd `"$RepoRoot`" ; git push origin $Branch"
    }
    else {
        Write-Host "Push/commit stage will be skipped because -SkipPush was provided."
    }
    exit 0
}

Write-Step "Running published-data sync"
Invoke-Native -WorkingDirectory $RepoRoot -FilePath "powershell" -Arguments @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $SyncScriptPath,
    "-SourceRoot", $SourceRoot,
    "-TargetRoot", $TargetRoot
)

if (-not $SkipBuild) {
    Write-Step "Running web app production build"
    Invoke-Native -WorkingDirectory $WebAppRoot -FilePath "npm" -Arguments @("run", "build")
}
else {
    Write-Step "Skipping build because -SkipBuild was provided"
}

Write-Step "Staging sync script and published data"
Invoke-Native -WorkingDirectory $RepoRoot -FilePath "git" -Arguments @("add", "sync-published-data.ps1")
Invoke-Native -WorkingDirectory $RepoRoot -FilePath "git" -Arguments @("add", "web-v1-app/public/data/published/v1")

Push-Location $RepoRoot
try {
    $statusOutput = git status --short -- sync-published-data.ps1 web-v1-app/public/data/published/v1
    $statusOutput = @($statusOutput | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })

    if ($statusOutput.Count -eq 0) {
        Write-Host "Nothing to commit. Published data snapshot is already up to date." -ForegroundColor Yellow
        return
    }

    Write-Step "Pending staged changes"
    $statusOutput | ForEach-Object { Write-Host $_ }

    if ($SkipPush) {
        Write-Step "Skipping commit/push because -SkipPush was provided"
        return
    }

    $finalCommitMessage = $CommitMessage
    if ([string]::IsNullOrWhiteSpace($finalCommitMessage)) {
        $finalCommitMessage = "Update published data snapshot $(Get-CurrentTimestampForCommit)"
    }

    Write-Step "Creating commit"
    Invoke-Native -WorkingDirectory $RepoRoot -FilePath "git" -Arguments @("commit", "-m", $finalCommitMessage)

    Write-Step "Pushing to origin/$Branch"
    Invoke-Native -WorkingDirectory $RepoRoot -FilePath "git" -Arguments @("push", "origin", $Branch)

    Write-Host "Sync, build, git add, commit, and push completed successfully." -ForegroundColor Green
}
finally {
    Pop-Location
}