# 검증 기록

## 기록 규칙

작업 ID별로 변경 파일, 고객 원본, 테스트 명령, 로컬 화면 확인, 결과와 잔여 리스크를 기록한다.

자동 테스트와 로컬 브라우저 확인이 모두 끝나지 않은 작업은 완료로 표시하지 않는다.

## 2026-08-27 문서 감사

### 변경 파일

- `docs/baekjo-0827/source-matrix.md`
- `docs/baekjo-0827/spec.md`
- `docs/baekjo-0827/source-index.md`
- `docs/baekjo-0827/tracker.md`
- `docs/baekjo-0827/decisions.md`
- `docs/baekjo-0827/verification.md`

### 원본 카운트 검증

명령:

```powershell
$src='C:\Users\PC_1M\Desktop\0827 백조오브제 수정본'
Get-ChildItem -LiteralPath $src -Recurse -File |
  Group-Object Extension |
  Sort-Object Name |
  Select-Object Name,Count
```

결과:

| 확장자 | 수량 |
|---|---:|
| `.docx` | 6 |
| `.gif` | 7 |
| `.hwpx` | 36 |
| `.jpg` | 24 |
| `.mp4` | 1 |
| `.pdf` | 12 |
| `.png` | 2 |
| `.pptx` | 1 |
| 합계 | 89 |

### 중복 해시 검증

명령:

```powershell
$src='C:\Users\PC_1M\Desktop\0827 백조오브제 수정본'
Get-ChildItem -LiteralPath $src -Recurse -File |
  ForEach-Object {
    $rel=$_.FullName.Substring($src.Length+1)
    $hash=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLower()
    [pscustomobject]@{RelativePath=$rel; Ext=$_.Extension.ToLower(); Size=$_.Length; Hash=$hash}
  } |
  Group-Object Hash |
  Where-Object Count -gt 1
```

결과:

- DUP-01: `2 (2).hwpx`, `2 (3).hwpx`
- DUP-02: `써니사이드업_백조오브제_AUDIT.docx`, `써니사이드업_백조오브제_AUDIT (1).docx`, `써니사이드업_백조오브제_AUDIT (2).docx`
- DUP-03: `알로밍_백조오브제_AUDIT (1).pdf`, `알로밍_백조오브제_AUDIT (2).pdf`
- DUP-04: `10 (1).hwpx`, `10 (2).hwpx`
- DUP-05: `알로밍2 (1).hwpx`, `알로밍2 (2).hwpx`
- DUP-06: `백조오브제_홈페이지_수정요청사항.docx`, `백조오브제_홈페이지_수정요청사항 (1).docx`
- DUP-07: `챠콜스토리 배송정책.pdf`, `챠콜스토리 배송정책 (1).pdf`

### 문서 텍스트 추출 검증

명령:

```powershell
@'
# HWPX/DOCX/PPTX: zip/xml 텍스트 추출
# PDF: pypdf 텍스트 추출 및 page count 확인
'@ | python -X utf8 -
```

결과:

- HWPX 36개: ZIP/XML 텍스트 추출 성공. 각 파일의 embedded image reference 존재 확인.
- DOCX 6개: ZIP/XML 텍스트 추출 성공.
- PPTX 1개: ZIP/XML 텍스트 추출 성공. 결제 심사자료 캡처 설명과 URL 텍스트 확인.
- PDF 12개: `pypdf`로 page count 확인. Audit/배송정책 PDF는 텍스트 추출 성공, `통신판매업신고.pdf`는 텍스트 미추출로 스캔/이미지 PDF로 기록.
- 이미지/영상 34개: 파일 존재와 파일명 순서만 확인. Preview 판독 미완료이므로 `visual-review-needed`.

### CLI 인증 확인

명령:

```powershell
gh auth status
claude -p "Return exactly: AUTH_CHECK_OK"
grok -p "Return exactly: AUTH_CHECK_OK"
```

결과:

- `gh auth status`: `github.com` 계정 `mim1012` 로그인 확인.
- `claude -p ...`: 실패. `Failed to authenticate: OAuth session expired and could not be refreshed`.
- `grok -p ...`: 실패. `unauthenticated:bad-credentials: The OAuth2 access token could not be validated.`, HTTP 403.

외부 CLI reviewer는 인증 실패로 사용하지 않았고, 고객 원본 감사는 로컬 PowerShell/Python 추출 결과로만 작성했다.

### source-matrix 커버리지 및 UTF-8 검증

명령:

```powershell
$src='C:\Users\PC_1M\Desktop\0827 백조오브제 수정본'
$root='C:\Users\PC_1M\.paseo\worktrees\33guibe6\rugged-meerkat'
$sourceFiles = Get-ChildItem -LiteralPath $src -Recurse -File |
  Sort-Object FullName |
  ForEach-Object { $_.FullName.Substring($src.Length+1) }
$matrix = Get-Content -LiteralPath (Join-Path $root 'docs\baekjo-0827\source-matrix.md') -Raw -Encoding utf8
$matrixPaths = [regex]::Matches($matrix, '^\| `([^`]+)` \|', 'Multiline') |
  ForEach-Object { $_.Groups[1].Value }
$missing = $sourceFiles | Where-Object { $_ -notin $matrixPaths }
$extra = $matrixPaths | Where-Object { $_ -notin $sourceFiles }
```

결과:

- `SourceCount`: 89
- `MatrixRows`: 89
- `MissingCount`: 0
- `ExtraCount`: 0
- 확장자별 수량: `.docx=6; .gif=7; .hwpx=36; .jpg=24; .mp4=1; .pdf=12; .png=2; .pptx=1`
- UTF-8 확인: `decisions.md`, `source-index.md`, `source-matrix.md`, `spec.md`, `tracker.md`, `verification.md` 모두 `utf8-ok`

## 이전 작업 기록

### HOME-03

- 변경 파일: `src/components/home/BrandShowcaseSlider.tsx`
- 변경: 카드 내부 `브랜드 자세히 보기` 링크 제거
- 정적 확인: diff 확인
- 자동 검증: ESLint/TypeScript는 당시 `node_modules` 부재로 실행 불가
- 브라우저 확인: 대기
