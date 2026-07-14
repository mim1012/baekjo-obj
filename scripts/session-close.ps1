param(
    [switch]$Apply,
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

function Get-EnvLabel {
    param([string]$RepoRoot)

    $envPath = Join-Path $RepoRoot ".env.local"
    if (-not (Test-Path $envPath)) {
        return "unknown (.env.local missing)"
    }

    $supabaseUrl = Select-String -Path $envPath -Pattern "^SUPABASE_URL=" -ErrorAction SilentlyContinue |
        Select-Object -First 1 |
        ForEach-Object { $_.Line -replace "^SUPABASE_URL=", "" }

    switch -Regex ($supabaseUrl) {
        "aeooyivfijthfcrfrnyk" { return "local -> staging Supabase" }
        "vgeqpbyyggxxaeowtbtj" { return "local -> prod Supabase (CAUTION)" }
        default {
            if ([string]::IsNullOrWhiteSpace($supabaseUrl)) {
                return "unknown (SUPABASE_URL missing)"
            }
            return "custom Supabase URL"
        }
    }
}

function Get-ListeningPorts {
    $ports = 3000, 3001, 3002
    $rows = foreach ($port in $ports) {
        Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
            Where-Object { $_.State -eq "Listen" } |
            Select-Object -First 1 |
            ForEach-Object { "localhost:$port pid=$($_.OwningProcess)" }
    }

    if ($rows) {
        return ($rows -join ", ")
    }
    return "none detected on 3000/3001/3002"
}

function Get-CommandLines {
    param([string]$RepoRoot)

    $branch = git -C $RepoRoot branch --show-current 2>$null
    if ([string]::IsNullOrWhiteSpace($branch)) {
        $branch = "(detached or unavailable)"
    }

    $status = git -C $RepoRoot status --short 2>$null
    if (-not $status) {
        $status = @("(clean)")
    }

    $recentCommits = git -C $RepoRoot log --oneline -5 2>$null
    if (-not $recentCommits) {
        $recentCommits = @("(no commits available)")
    }

    return @{
        Branch = $branch
        Status = $status
        RecentCommits = $recentCommits
    }
}

$sessionPath = Join-Path $RepoRoot "SESSION.md"
if (-not (Test-Path $sessionPath)) {
    throw "SESSION.md not found at $sessionPath"
}

$facts = Get-CommandLines -RepoRoot $RepoRoot
$branch = $facts.Branch
$now = Get-Date -Format "yyyy-MM-dd HH:mm"
$date = Get-Date -Format "yyyy-MM-dd"
$envLabel = Get-EnvLabel -RepoRoot $RepoRoot
$ports = Get-ListeningPorts

$statusBlock = ($facts.Status | ForEach-Object { "  - $_" }) -join "`r`n"
$commitBlock = ($facts.RecentCommits | ForEach-Object { "  - $_" }) -join "`r`n"

$entry = @"
## 현재 상태 ($date 자동 마감 초안)
- 시각: $now (Asia/Seoul)
- 브랜치: $branch
- 로컬 환경: $envLabel
- 실행 중 서버: $ports
- 변경 파일:
$statusBlock
- 최근 커밋:
$commitBlock
- 이번 세션에서 완료한 일:
  - TODO: 실제 완료 내용을 한 줄씩 정리
- 검증:
  - TODO: 실행한 명령과 결과를 기록 (npm run lint, npm run build, Playwright 등)
- 미완/다음 액션:
  - TODO: 다음 세션이 바로 이어받을 작업
- 사용자 결정 필요:
  - TODO: 결정 대기 항목이 없으면 없음

"@

$draftDir = Join-Path $RepoRoot ".omx"
New-Item -ItemType Directory -Force -Path $draftDir | Out-Null
$draftPath = Join-Path $draftDir "session-close-draft.md"
Set-Content -Path $draftPath -Value $entry -Encoding UTF8

if ($Apply) {
    $original = Get-Content -Raw -Path $sessionPath
    $marker = "## 현재 상태"
    $index = $original.IndexOf($marker, [System.StringComparison]::Ordinal)
    if ($index -lt 0) {
        $updated = $original.TrimEnd() + "`r`n`r`n" + $entry
    }
    else {
        $updated = $original.Substring(0, $index) + $entry + $original.Substring($index)
    }
    Set-Content -Path $sessionPath -Value $updated -Encoding UTF8
    Write-Output "Applied session close draft to SESSION.md"
}
else {
    Write-Output "Wrote session close draft to $draftPath"
    Write-Output "Run with -Apply to prepend it to SESSION.md"
}
