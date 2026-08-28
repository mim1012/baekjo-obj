$ErrorActionPreference = 'Stop'

$sourceRepo = $env:PASEO_SOURCE_CHECKOUT_PATH
$targetRepo = $env:PASEO_WORKTREE_PATH

if ([string]::IsNullOrWhiteSpace($sourceRepo)) {
    throw 'PASEO_SOURCE_CHECKOUT_PATH is not set'
}
if ([string]::IsNullOrWhiteSpace($targetRepo)) {
    $targetRepo = (Get-Location).Path
}

$syncScript = Join-Path $targetRepo 'scripts\sync-worktree-env.ps1'
if (-not (Test-Path -LiteralPath $syncScript)) {
    throw "Env sync script not found: $syncScript"
}

& powershell -NoProfile -ExecutionPolicy Bypass -File $syncScript `
    -SourceRepo $sourceRepo `
    -TargetRepo $targetRepo

if ($LASTEXITCODE -ne 0) {
    throw 'Environment sync failed'
}
