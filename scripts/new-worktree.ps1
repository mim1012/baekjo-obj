param(
    [Parameter(Mandatory = $true)]
    [string]$WorktreePath,
    [Parameter(Mandatory = $true)]
    [string]$Branch,
    [string]$BaseBranch = 'main',
    [string]$SourceRepo = 'D:\Project\BAGJO1',
    [switch]$IncludeProduction
)

$ErrorActionPreference = 'Stop'
$resolvedSource = (Resolve-Path -LiteralPath $SourceRepo).Path
$target = [System.IO.Path]::GetFullPath($WorktreePath)

if (Test-Path -LiteralPath $target) {
    throw "Target worktree path already exists: $target"
}

git -C $resolvedSource worktree add -b $Branch $target $BaseBranch
if ($LASTEXITCODE -ne 0) {
    throw "git worktree add failed"
}

$syncScript = Join-Path $target 'scripts\sync-worktree-env.ps1'
if (-not (Test-Path -LiteralPath $syncScript)) {
    $launcherSyncScript = Join-Path $PSScriptRoot 'sync-worktree-env.ps1'
    New-Item -ItemType Directory -Path (Split-Path -Parent $syncScript) -Force | Out-Null
    Copy-Item -LiteralPath $launcherSyncScript -Destination $syncScript -Force
}

$syncArgs = @('-SourceRepo', $resolvedSource, '-TargetRepo', $target)
if ($IncludeProduction) {
    $syncArgs += '-IncludeProduction'
}

& powershell -NoProfile -ExecutionPolicy Bypass -File $syncScript @syncArgs
if ($LASTEXITCODE -ne 0) {
    throw "Environment sync failed"
}

Write-Host "Worktree created and environment injected: $target"
