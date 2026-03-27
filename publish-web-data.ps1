# publish-web-data.ps1
[CmdletBinding()]
param(
    [string]$RepoRoot = "D:\css\main",
    [string]$WebAppRoot = "D:\css\main\web-v1-app",
    [string]$SyncScriptPath = "D:\css\main\sync-published-data.ps1",
    [string]$Branch = "main",
    [string]$CommitMessage = "",
    [switch]$SkipBuild,
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

function Get-CurrentTimestampForCommit {
    return (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
}

function Ensure-GitRepo {
    param([Parameter(Mandatory = $true)][string]$WorkingDirectory)

    Push-Location $WorkingDirectory
    try {
        $null = git rev-parse --show-toplevel 2>$null
        if ($LASTEXITCODE -ne 0) {
            Fail "No git repository detected at: $WorkingDirectory"
        }
    }
    finally {
        Pop-Location
    }
}

function Get-TrackedChanges {
    param([Parameter(Mandatory = $true)][string]$WorkingDirectory)

    Push-Location $WorkingDirectory
    try {
        $output = git status --short -- sync-published-data.ps1 web-v1-app/public/data/published/v1
        if ($LASTEXITCODE -ne 0) {
            Fail "git status failed in: $WorkingDirectory"
        }

        if ($null -eq $output) {
            return @()
        }

        return @($output | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    }
    finally {
        Pop-Location
    }
}

Ensure-PathExists -PathValue $RepoRoot -Label "Repo root"
Ensure-PathExists -PathValue $WebAppRoot -Label "Web app root"
Ensure-PathExists -PathValue $SyncScriptPath -Label "Sync script"

Ensure-GitRepo -WorkingDirectory $RepoRoot

Write-Step "Running published-data sync"
Invoke-Native -WorkingDirectory $RepoRoot -FilePath "powershell" -Arguments @(
    "-ExecutionPolicy", "Bypass",
    "-File", $SyncScriptPath
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

$changes = @(Get-TrackedChanges -WorkingDirectory $RepoRoot)
if ($changes.Count -eq 0) {
    Write-Step "No changes detected"
    Write-Host "Nothing to commit. Published data snapshot is already up to date." -ForegroundColor Yellow
    exit 0
}

Write-Step "Detected changes"
$changes | ForEach-Object { Write-Host $_ }

$finalCommitMessage = $CommitMessage
if ([string]::IsNullOrWhiteSpace($finalCommitMessage)) {
    $finalCommitMessage = "Update published data snapshot $(Get-CurrentTimestampForCommit)"
}

Write-Step "Creating commit"
Invoke-Native -WorkingDirectory $RepoRoot -FilePath "git" -Arguments @("commit", "-m", $finalCommitMessage)

if (-not $SkipPush) {
    Write-Step "Pushing to origin/$Branch"
    Invoke-Native -WorkingDirectory $RepoRoot -FilePath "git" -Arguments @("push", "origin", $Branch)
}
else {
    Write-Step "Skipping push because -SkipPush was provided"
}

Write-Step "Publish flow complete"
Write-Host "Sync, build, git add, commit, and push completed successfully." -ForegroundColor Green