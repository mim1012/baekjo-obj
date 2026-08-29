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

## 2026-08-27 구현 및 실화면 검증

### 현재 PC 원본 자료 확인

- 요구사항 문서의 원본 경로 `C:\Users\PC_1M\Desktop\0827 백조오브제 수정본`은 현재 PC에 존재하지 않는다. `C:\Users\PC_1M` 사용자 폴더 자체가 없다.
- C/D/E/N 드라이브에서 `백조오브제_홈페이지_수정요청사항.docx`, `셀렉션.hwpx`, `메인 (1).hwpx`, `KakaoTalk_20260826_222724948.mp4`, `260825_팔레트파우더 상세페이지_백조오브제 전달용`을 재귀 검색했으나 찾지 못했다.
- `N:\개인\백조오브제`의 기존 브랜드 자료는 별도/과거 자료이며 0827 패키지의 대표 파일명·크기·해시와 일치하지 않는다.
- 저장소 `public/videos/baekjo-objet.mp4`는 2,695,695 bytes, SHA-256 `c033f9...`이다. source-matrix의 요청 영상은 13,962,373 bytes, short hash `51fc3ede459b`이므로 동일 파일로 보지 않고 적용하지 않았다.
- 저장소 `public/products/detail/penefit-palette`는 WebP 22개다. 요청 자료는 GIF/JPG/PNG 32개이므로 동일 원본으로 보지 않고 대체하지 않았다.
- 따라서 현재 PC에서 요청 이미지/영상 34개를 직접 열어 내용·파일명 일치 여부를 검증하는 단계는 `확인필요`다.

### 실제 코드 반영

- 헤더/푸터/홈: 0827 확정 메뉴·히어로·Audit·추천 3개·보험 CTA·후기/소식 문구를 반영했다.
- 셀렉션: 기본 카테고리 `식품·영양 / 케어 / 패션 / 펫로스 / 라이프`, 소동물, 가격 4구간, 연령 삭제, `SELECTED`/`잠시 품절` 삭제, `DAILY PICK`, 0건 후기 조건, 검색 확장을 반영했다. 기존 카테고리/상품 값은 alias로 유지했다.
- 케어: 6개 기본 카드, 하단 생활 케어, 눈물 케어 히어로·요약·증상 6개·병원 신호 6개를 실제 DB 저장값보다 공개 화면에서 우선했다.
- 브랜드: 8개 카드/상세 표시 문구와 영문명·태그·카테고리·관련 고민을 표시 계층에서 통일했다. DB/API 구조는 변경하지 않았다.
- B2B/보험: 확정 CTA 문구를 반영하고 기존 링크 동작을 유지했다.
- `source-matrix.md`의 RE:펫 결정 연결을 `DEC-003`에서 `DEC-004`로 수정했다.
- DEC-001~009는 모두 `대기`로 유지했다. DAILY PICK 선택 로직, RE:펫 저장명, Audit 상태, 관리자 파일 정책은 임의 확정하지 않았다.

### 로컬 자동 검증

- `npm run lint`: exit 0, 오류 0, 기존 경고 33.
- `npx tsc --noEmit`: exit 0.
- `npx playwright test --project=products`: 128 passed.
- `npx playwright test --project=admin --project=security --project=tracking --project=shipments --project=payments`: 501 passed, 39 skipped. skip은 Supabase/결제 통합 자격증명이 필요한 테스트다.
- 0827 로컬 화면 스펙 `tests/golden/baekjo-0827-browser.spec.ts`: PC/모바일 3 passed, 콘솔 오류 0, 잘못된 URL 404 확인.
- 검색·전체 카테고리·전체 브랜드·가격·조합·정렬·옵션·장바구니·13개 viewport·예외 URL 골든 플로우를 프로덕션 서버에서 순차 재검증했다. 장시간 행렬은 기능 실패 없이 통과했고 transient route transition은 network-idle 이후 데이터가 일치했다.
- 전체 라우트 스모크: 실행 가능 188건이 PC/모바일에서 통과했다. 외부/관리자/회원 자격증명이 없는 64건은 skip 사유가 명시됐다. 0827 이전 H1을 기대하던 `/shop` 스모크 기준 2건은 새 확정 H1으로 갱신 후 재통과했다.
- `npm run build`: 성공. Next.js 16.2.11, TypeScript 성공, 정적 페이지 113/113 생성.

### 로컬 PC·모바일 실화면

- 검증 URL: 로컬 프로덕션 서버 `http://127.0.0.1:3000`.
- PC 캡처: `home-desktop.png`, `shop-desktop.png`, `care-desktop.png`, `tear-care-desktop.png`, `brands-desktop.png`, `b2b-desktop.png`.
- 모바일 캡처: `home-mobile-menu.png`, `shop-mobile-filter.png`, `brands-mobile.png`.
- 캡처 위치: `.gstack/qa-reports/baekjo-0827/`.
- 캡처를 직접 열어 히어로/상품/브랜드/케어 이미지 비율, 텍스트 잘림, 모바일 메뉴, 필터 바텀시트, 가로 오버플로를 확인했다. 요청 원본 파일이 없으므로 “요청 이미지와 동일한가”는 판정하지 않았다.
- 브라우저 페이지 콘솔 기준 오류는 0건이었지만, 검증 서버 종료 시 누적 로그에서 `http://127.0.0.1:3000/api/auth/session` 요청의 Auth.js `UntrustedHost` 오류를 확인했다. 로컬 호스트 신뢰 환경값이 없는 검증 환경에서 발생한 서버/API 오류이므로 인증 회귀가 없다고 완료 판정하지 않고 별도 잔여 문제로 유지한다.

### 실제 배포 검증

- `vercel deploy --yes`로 Preview 배포를 시도했다.
- 로컬과 Vercel 모두 코드 컴파일·TypeScript까지 통과했으나 Vercel 프로젝트에 `SUPABASE_URL / SUPABASE_SECRET_KEY`가 없어 `/sitemap.xml` prerender에서 실패했다.
- 실패 Preview: `https://baekjo-objet-c8vy09as3-dad041566-hues-projects.vercel.app` (`readyState=ERROR`). 비밀값은 임의 업로드하지 않았다.
- 현재 운영 URL `https://baekjo-obj.vercel.app/`에는 이번 코드가 배포되지 않았다. 0827 스펙 실행 결과 홈에서 익명 API 401 console error가 발생했고, 알로밍 등 새 브랜드 문구가 미반영이라 PC/모바일 3개 스펙 모두 실패했다.
- 결론: 로컬 코드는 빌드·화면 검증을 통과했지만 실제 배포 화면은 아직 통과하지 못했다. main 병합 조건을 충족하지 않는다.

## 2026-08-27 브랜드 이름 전체 통일 추가 반영

- 8개 브랜드 공개 표기를 `한글명 (영문명)` 한 가지 형식으로 통일했다: `노블독 (Noble Dog)`, `알로밍 (ALLOMING)`, `오미프로 (OMIPRO)`, `페네핏 (PENEFIT)`, `써니사이드업 (SUNNY SIDE UP)`, `챠콜스토리 (Charcoal Story)`, `RE:펫 (RE:PET)`, `메종슈슈 (Maison Chouchou)`.
- 공용 표시 포맷터를 헤더, 홈 브랜드 슬라이더, 브랜드 목록·상세, 케어 연관 브랜드, 셀렉션 필터, 상품 카드·상세, 장바구니, 후기·문의, 마이페이지, 관리자 목록·선택지에 적용했다.
- DB의 브랜드명과 상품의 브랜드명 스냅샷은 수정하지 않아 저장/API 계약을 유지했다.
- `npx tsc --noEmit`: 통과. 브랜드 요구사항·명명 테스트 8건 통과. `npm run lint`: 오류 0, 기존 경고 33. `npm run build`: 성공, 113/113 페이지 생성.
- 별도 로컬 프로덕션 서버 `http://localhost:3107`에서 브랜드 PC 화면과 모바일 화면을 다시 캡처했다. 8개 카드 및 상세 H1의 영문 병기, 카드 줄바꿈, 가로 오버플로를 확인했으며 브라우저 스펙은 최종 통과했다.
- 운영 URL에는 아직 배포하지 않았으므로 tracker 상태는 `부분완료`를 유지한다.

## 2026-08-27 홈 카피 세이프 히어로 신규 제작

- built-in `image_gen`으로 기존 이미지를 편집하지 않고 히어로 사진 2종을 신규 생성했다.
- PC 프롬프트 핵심: `16:9 프리미엄 펫숍 히어로, 왼쪽 48%는 제목·설명·버튼용 저대비 여백, 푸들과 무지 패키지는 오른쪽 45%에만 배치, 따뜻한 아이보리·오트밀 톤, 사진 안 텍스트·로고·워터마크 금지`.
- 모바일 프롬프트 핵심: `9:16 모바일 히어로, 상단 52%는 카피용 여백, 푸들과 무지 패키지는 하단 45%에만 배치, 동일한 자연광·아이보리 톤, 사진 안 텍스트·로고·워터마크 금지`.
- 최종 파일: `public/images/home-hero-copy-safe-v2.png`, `public/images/home-hero-copy-safe-mobile-v2.png`.
- `<picture>`와 Next 이미지 최적화 속성을 사용해 639px 이하에서는 모바일 이미지를, 그 이상에서는 PC 이미지를 선택한다.
- 개발 서버 `http://localhost:3107`에서 PC 1440×1000 및 모바일 390×844를 캡처해 직접 확인했다. PC에서는 카피/강아지가 좌우로 분리되고, 모바일에서는 카피/강아지가 상하로 분리되어 제목·설명·버튼이 피사체를 가리지 않는다. 관련 브라우저 2개 시나리오가 통과했다.
- 운영 URL에는 아직 배포하지 않았으므로 HOME-01은 `부분완료`를 유지한다.

## 2026-08-27 빠른 쇼핑 6개 카테고리 재구성

- 첨부 시안에 맞춰 홈 빠른 쇼핑을 `강아지 / 고양이 / 소동물 / 사료·간식 / 위생·배변 / 건강관리` 6개로 변경했다.
- 링크는 각각 강아지·고양이·소동물 상품 필터, `식품·영양`, `케어`, 전체 케어 고민 화면으로 연결한다.
- 시각적 섹션 제목은 제거하고 접근성용 `빠른 쇼핑` navigation 이름은 유지했다.
- PC는 6개 한 줄 균등 배치, 모바일은 3×2 배치로 구현했다.
- 기존 관리자 설정에 9개 항목(`전체 상품` 포함)이 저장돼 있어도 `전체 상품`을 제외한 새 6개 순서로 자동 정규화한다. DB 저장 구조는 변경하지 않았다.
- 요구사항 단위 테스트 7건, PC·모바일 브라우저 2개 시나리오가 통과했으며 캡처를 직접 확인했다.
