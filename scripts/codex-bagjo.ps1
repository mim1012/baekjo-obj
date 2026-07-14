$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$codexHome = Join-Path $repoRoot ".codex-home"
$nativeCodex = "D:\claudecode\codex.ps1"

New-Item -ItemType Directory -Force -Path $codexHome | Out-Null
$env:CODEX_HOME = $codexHome

if ($env:CODEX_BAGJO_SKIP_PREFLIGHT -ne "1") {
    & (Join-Path $PSScriptRoot "codex-preflight.ps1") -RepoRoot $repoRoot -CodexHome $codexHome
}

& $nativeCodex @args
exit $LASTEXITCODE
