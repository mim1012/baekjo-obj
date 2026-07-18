# 검증 절차 — 골든플로우 #7(관리자 콘솔 CRUD) 3층 테스트 모델

> 이 문서는 "어떻게 검증하는가"를 다룬다. 실행 결과·발견 버그 목록은
> [`verification-results-2026-07-18.md`](./verification-results-2026-07-18.md) 참조.
> 이 문서 자체가 독립 검증(Codex/GPT) 대상이다 — 모든 주장에는 파일 경로·PR 번호·워크플로 실행 ID
> 등 확인 가능한 앵커를 붙인다. 앵커가 없는 주장은 "세션 기록 기준(미검증)"이라고 표기했다.

## 배경 — 왜 3층인가

2026-07-18, 관리자 삭제/수정 유실 버그 2건(§8-6 참고)이 **소스-계약 테스트 209개를 전부 통과한 채**
배포됐다. 원인: 그 209개는 순수 함수·타입 검증이었지 "화면을 실제로 클릭"하지 않았다. 이후
`tests/admin/golden-crud-coverage.spec.ts`(PR #158)가 남긴 주석이 이 배경을 그대로 기록하고 있다.

대응으로 3개 층을 분리했다(`.github/workflows/golden-crud.yml:1-16`의 워크플로 헤더 주석이 정본):

| 층 | 무엇을 | 항상 도나 | 파일 |
|---|---|---|---|
| 1. 소스-계약 | 순수 함수/타입/파일 존재 검증. 브라우저·DB 불필요 | 매 PR·push (CI `verify` 잡) | `tests/admin/*.spec.ts`, `tests/products/*.spec.ts` |
| 2. 변경-매핑 실구동 | 실제 Preview에 로그인해 등록→공개반영→수정→삭제→새로고침까지 브라우저로 클릭 | 배포된 커밋이 매핑된 도메인 경로를 건드렸을 때만 | `tests/golden/admin-crud-*.spec.ts` |
| 3. 전체 스윕 | 매핑 무시하고 전체 스펙 강제 실행 | 수동 dispatch 또는 배포 직전 확인 | 동일 스펙군, `workflow_dispatch(all=true)` |

## 층 1 — 소스-계약 테스트 (`tests/admin/`, 항상 켜짐)

CI `verify` 잡(`.github/workflows/ci.yml:39-40`)이 `--project=admin`으로 실행한다. 브라우저·DB 없이
Node에서 파일시스템/타입/문자열 패턴만 검사하므로 초 단위로 끝난다. 대표 3종 — 전부 "새로 추가된
것이 감사망에서 빠지면 CI가 실패한다"는 동일 설계:

### 1-1. `golden-crud-coverage.spec.ts` — admin API 도메인 감사 (21도메인)

`src/app/api/admin/*`의 모든 하위 디렉터리(도메인)를 `LIVE_COVERED`(실구동 스펙 있음, 12개) 또는
`EXCLUDED`(의도적 제외 + 사유, 9개) 중 하나로 강제 분류한다(`tests/admin/golden-crud-coverage.spec.ts:43-89`).
분류 안 된 신규 도메인이 생기면 실패(`:95-103`). 양방향 잔존 검사(EXCLUDED/LIVE_COVERED 양쪽 모두
디렉터리가 삭제됐는데 목록에 남아 있으면 실패, `:119-139`)까지 있어 삭제 시에도 드리프트를 잡는다.

- LIVE_COVERED 12개: brands·concerns·inquiries·insurance-content·kits·members·notices·partners·
  products·settings·showcase-reviews·survey
- EXCLUDED 9개(사유 요약, 원문은 `:65-89`): category-settings(범위 밖, wave4 후보) · dashboard(GET 전용,
  쓰기 없음) · insurance(범위 밖, wave4 후보) · order-policy(범위 밖, wave4 후보) · orders(안전 설계 전
  의도적 제외) · partner-inquiries(범위 밖, wave4 후보) · qna(배선은 됨/#160, 실구동 스펙은 wave4) ·
  reviews(고아 엔드포인트 — PATCH `/api/admin/reviews/[id]` 호출 UI 미발견, 별도 확인 필요) ·
  upload(리소스 아님, brands/products 스펙에서 간접 실행)

### 1-2. `migration-number-duplicates.spec.ts` — 마이그레이션 번호 중복 감사

`supabase/migrations/*.sql` 파일명 접두 숫자가 중복되면 실패(`:36-63`). 2026-07-18에 0045가 두 브랜치에서
독립 배정돼 머지 시점에야 사람이 수작업 발견한 사고(§10-8)에서 도출. 접미 문자(`0004b`)도 "같은 번호"로
취급하며, 도입 시점 기존 중복 3쌍(`0004`·`0034`·`0041`)만 `LEGACY_ALLOWLIST`로 명시 허용(`:26-33`) — 새 중복은
전부 실패.

### 1-3. `admin-nav.spec.ts` — 사이드바 SSOT 회귀 + 고아 라우트 가드

메뉴 21개 href를 순서까지 하드코딩 스냅샷(`:18-49`)하고, `src/app/admin/**/page.tsx`를 파일시스템에서
직접 스캔해 "메뉴에서 도달 가능한가"를 판정한다(`:127-175`) — 2026-07-14 메뉴 4종 유실 + `/admin/products/display`
고아 라우트(파일은 있는데 메뉴에 없어 클릭으로 도달 불가) 재발 방지. 파일 존재만 확인하는 방식은
이 패턴을 못 잡는다는 걸 주석이 명시한다(`:128-132`).

## 층 2 — 변경-매핑 실구동 (`golden-crud.yml`, `deployment_status` 트리거)

### 언제 도나

`deployment_status` 이벤트에서 `environment == 'Preview'` && `state == 'success'`일 때만
(`.github/workflows/golden-crud.yml:38-41`). **production 배포에는 절대 반응하지 않는다** — 그 워크플로
자체가 `if` 조건으로 Preview 환경만 받는다.

### 변경 경로 매핑 — 11개 도메인 grep 패턴 (`golden-crud.yml:92-169`)

배포에 포함된 diff(`git diff --name-only $DIFF_RANGE`)를 11개 도메인별 정규식과 대조해 해당 도메인
스펙만 돌린다. 전체 매핑 표:

| 도메인 | 경로 패턴(요약) | 스펙 파일 |
|---|---|---|
| notices | `src/lib/notices/`·`src/app/{admin,}/notices/`·`src/app/api/{,admin/}notices/`·`AdminResourcePage.tsx` | `admin-crud-notices.spec.ts` |
| reviews | `src/lib/reviews/`·`src/app/{admin,}/reviews/`·`src/app/api/{,admin/}showcase-reviews/` | `admin-crud-showcase-reviews.spec.ts` |
| concerns | `src/lib/concerns/`·`src/app/{admin,}/concerns/`·`src/app/api/{,admin/}concerns/` | `admin-crud-concerns.spec.ts` |
| home_settings | `src/lib/settings/`·`src/app/admin/settings/`·`homeContent.ts`·`SiteSettingsProvider.tsx`·`HomeClient.tsx`·`src/app/page.tsx` | `admin-crud-home-settings.spec.ts` |
| insurance_content | `src/lib/insuranceContent/`·`src/app/admin/insurance-content/`·`src/app/insurance/`·API 양쪽 | `admin-crud-insurance-content.spec.ts` |
| kits_partners | `src/lib/{kits,partners}/`·`src/app/admin/{kits,partners}/`·API 양쪽 | `admin-crud-kits-partners.spec.ts` |
| products | `src/lib/products/`·`src/app/{admin/products,shop}/`·API 양쪽·`src/components/admin-new/products/` | `admin-crud-products.spec.ts` |
| brands | `src/lib/brands/`·`src/app/{admin/brands,brands}/`·API 양쪽·`src/components/admin-new/brands/` | `admin-crud-brands.spec.ts` |
| members | `src/lib/members/`·`src/app/admin/members/`·API·`src/components/admin-new/members/` | `admin-crud-members.spec.ts` |
| qna_inquiries | `src/lib/inquiries/`·`src/lib/adapters.ts`·`src/app/admin/inquiries/`·API·`ProductTabsClient.tsx`·`src/components/inquiries/` | `admin-crud-qna-inquiries.spec.ts` |
| survey | `src/lib/survey/`·`src/app/admin/survey/`·`src/app/diagnosis/`·API 양쪽 | `admin-crud-survey.spec.ts` |

전체 패턴 원문은 `.github/workflows/golden-crud.yml:116-150`에 grep -qE 형태로 있다. **이 표를 정본으로
삼지 말 것** — 스펙 신설/경로 변경 시 이 문서 갱신이 누락될 수 있으므로, 실제 게이트 여부는
`golden-crud.yml`과 `tests/admin/golden-crud-coverage.spec.ts`의 `pathNeedle` 필드를 직접 대조해 확인한다.

### GATE_SELF 원칙 (`golden-crud.yml:90, 103-115`)

게이트 자신의 파일(`admin-crud-*.spec.ts`·`_lib/`·`playwright.config.ts`·`golden-crud.yml` 자체)이
바뀌면 **11개 도메인 전부**를 강제 실행한다. 이유는 워크플로 주석이 직접 밝힌다: "이 매핑에 테스트
레이어 경로가 빠져 있으면 이 PR의 프리뷰 실행이 항상 skip-green으로 떨어져 새 스펙이 CI에서 한 번도
실제로 돌지 않는다"(opus 리뷰 HIGH 지적, `:88-89`) — 즉 게이트 자체를 고치는 PR이 자기 자신을
검증 못 하고 통과하는 역설을 막는 장치.

### 안전장치

- **`E2E_ADMIN_CRUD=1`** 환경변수를 이 워크플로에서만 주입한다(`golden-crud.yml:178` 등). 스펙 자체는
  이 값이 없으면 항상 skip(`tests/golden/_lib/adminCrudHelpers.ts:14` `CRUD_ENABLED`). 로컬에서 실수로
  쓰기 스펙이 도는 사고를 막는다.
- **대상은 Preview(=staging DB)뿐** — `adminCrudHelpers.ts:5-7` 주석이 명시: "절대 production을 겨냥하지
  말 것". staging/prod 판별은 Supabase project ref(staging=`aeooyivfijthfcrfrnyk` / prod=`vgeqpbyyggxxaeowtbtj`,
  AGENTS.md §10-8)로 한다.
- **E2E- 접두어 데이터 + 정리 가드** — `deleteMatchingAdminRows`/`deleteMatchingRowsWithin`
  (`adminCrudHelpers.ts:37-89`)이 검색어 매칭 행을 최대 25회 반복 삭제. 스코프드 버전(`deleteMatchingRowsWithin`)은
  한 페이지에 `AdminResourcePage` 인스턴스가 여러 개(예: `/admin/insurance-content`의 동의문서+FAQ)일 때
  다른 섹션 행까지 지우는 것을 막는다(`:62-67` 주석).
- **`workflow_dispatch`는 `base_url` 입력 필수** — dispatch 이벤트는 `deployment_status` payload가
  없어 `environment_url`이 빈 문자열이 되기 때문(opus 리뷰 MEDIUM, `golden-crud.yml:175-176` 주석).

### 야간/정기 전체 스윕은 없다

`golden-crud.yml:295-300` 주석: `deployment_status` 트리거는 환경 URL을 이벤트 payload에서만 얻으므로
cron으로 "최신 main preview URL"을 안정 재해석할 방법이 마땅치 않다. 필요해지면
`update-baselines.yml`의 "Resolve preview URL" 스텝(`gh api deployments` 조회)을 이식하라고 명시돼 있다 —
**지금은 `workflow_dispatch(all=true)` 수동 실행으로 대체**한다.

## 층 3 — 전체 스윕 (`workflow_dispatch`, `all=true`)

`golden-crud.yml:22-30`의 `workflow_dispatch.inputs`가 `all`(boolean)과 `base_url`(string, 필수)을 받는다.
`all=true`면 변경 경로 판단을 건너뛰고 11개 도메인 전부를 `true`로 세팅(`:63-70`). 배포 직전 확인이나
정기 회귀용으로 설계됨.

## 별도 축 — 전 페이지 스모크 (`be/e2e-all-pages-smoke`, **미머지**)

⚠️ 이 스펙은 origin에 존재하지만(`origin/be/e2e-all-pages-smoke`, 최신 커밋 `5c7a86c`) **main에는
머지되지 않았다** — 구축 중. golden-crud 웨이브(admin 도메인 CRUD)와 다른 축으로, **공개 페이지
전체**(admin 아닌 화면 포함)를 대상으로 한다.

- `tests/golden/all-pages-smoke.spec.ts` 헤더 주석(해당 브랜치 `git show origin/be/e2e-all-pages-smoke:...`
  기준): "src/app 의 모든 page.tsx(62개, 정적+동적)를 실제로 방문해 HTTP 200(또는 문서화된 리다이렉트)·
  에러 오버레이 부재·페이지별 앵커 렌더를 확인한다." **읽기 전용(READ-ONLY, 쓰기 없음)** — `E2E_ADMIN_CRUD`
  게이트 불필요, 어떤 환경에 실행해도 안전.
- 검증 3종(주석 원문 요약): ① HTTP 200 또는 문서화된 리다이렉트 ② `pageerror`(미처리 예외)는 전부
  하드 실패, `hydration` 관련 console 에러도 하드 실패, 그 외 console 에러는 소프트 리포트(NOISE_ALLOWLIST로
  순수 노이즈 제외) ③ 페이지별 앵커(heading/landmark)로 "맞는 페이지가 그려졌는가" 확인.
- 짝을 이루는 소스-계약 스펙 `tests/admin/route-coverage-audit.spec.ts`(같은 브랜치) — `src/app` 아래
  모든 `page.tsx`를 재귀 스캔해 `ALL_APP_ROUTES`(같은 브랜치의 `tests/golden/_lib/allPagesRoutes.ts`,
  63개 route 항목)에 등록됐는지 감사한다. `golden-crud-coverage.spec.ts`와 동일 사상을 페이지 단위로 적용.
- **미검증 상태 명시**: 이 스펙이 실제 Preview에서 몇 회 통과했는지는 이 세션에서 실행 로그를 확보하지
  못했다 — 결과 문서의 해당 섹션은 "커밋 기준 코드 존재 확인"까지만 앵커를 건다. 재실행 명령은
  결과 문서의 크로스체크 섹션 참고.

## 로컬 실행 방법

```bash
# 소스-계약 테스트(브라우저·DB 불필요, 즉시 실행 가능)
npx playwright test --project=admin

# 실구동 CRUD 스펙 1개 (Preview/staging 대상, 계정 필요)
E2E_BASE_URL=https://<preview-url> \
E2E_ADMIN_CRUD=1 \
E2E_ADMIN_EMAIL=<admin 계정> \
E2E_ADMIN_PASSWORD=<비밀번호> \
npx playwright test tests/golden/admin-crud-notices.spec.ts --project=golden-crud --reporter=line
```

- `.env.local`에서 Supabase project ref를 확인해 staging(`aeooyivfijthfcrfrnyk`)을 보고 있는지
  먼저 확인한다(AGENTS.md §10-8, `scripts/session-close.ps1`의 `Get-EnvLabel`과 동일 판별 기준).
- CI에서 쓰는 시크릿 이름(값은 절대 노출 금지): `E2E_ADMIN_EMAIL`·`E2E_ADMIN_PASSWORD`·
  `E2E_MEMBER_EMAIL`·`E2E_MEMBER_PASSWORD`(⚠️ 2026-07-18 기준 미등록 — 미등록 시 해당 스펙은
  `test.skip` 가드로 항상 skip, `golden-crud.yml:263-264` 주석)·`VERCEL_AUTOMATION_BYPASS`.

## 안전 규칙

### 프리뷰 = 스테이징 DB 판별법 (공지 지문)

Vercel Preview 배포는 항상 staging Supabase(`aeooyivfijthfcrfrnyk`)를 본다(AGENTS.md §8-4 환경 매핑).
이 세션에서 쓴 실측 판별법(`admin-cms-immediate-persist` 메모리 기준, 세션 기록): 공지 개수 지문 —
프리뷰 6건(기본 시드값) vs prod 도메인 2건(사용자 실데이터). 실행 전 이 지문으로 대상이 진짜
staging인지 재확인하는 습관이 사고를 막는다.

### 스냅샷/복원 패턴 (싱글턴 config 도메인)

`home_settings`·`survey`처럼 싱글턴 jsonb config를 다루는 도메인은 삭제 대신 **한 필드만 수정 →
확인 → 원상복구**로 검증한다(`admin-crud-home-settings.spec.ts`·`admin-crud-survey.spec.ts`). survey는
`questions`/`rules` 배열 길이를 절대 건드리지 않고 첫 문항 title만 스냅샷/복원한다(PR #158 본문).
`afterAll` 안전망으로 테스트 실패 시에도 원상복구를 시도한다(PR #151 본문).

### 주문 스펙의 일회용 상품 원칙

wave4(members)/orders 확장 계획(§8-6 메모리 기준, 미착수)은 "스펙이 만든 일회용 상품으로만 주문 생성,
실재고 무접촉"을 원칙으로 잡고 있다 — 실재고가 주문 "생성" 시점에 즉시 차감되고 주문 삭제 API가
없어(취소 경로만 재고 복원) 공유 스테이징에서 실 상품을 쓰면 재고가 되돌아오지 않는 사고가 나기 때문.
**이 항목은 코드로 존재를 확인하지 못했다 — 세션 메모리 기준 계획 단계로만 표기한다.**

## §8-6 자기개선 루프 — 3단계와 적용 사례

`AGENTS.md:423-433`(PR #159가 신설)이 정본. 버그·리뷰 finding 수정의 "완료" 기준 3단계:

1. **실패 조건을 인위로 재현한다(pre-seed)** — 수정 전이라면 실패했을 상황을 데이터/상태로 직접 만든다.
2. **독립 경로로 검증한다** — 테스트 자체의 pass/fail 판정을 믿지 않고 별도 경로(API 재조회·공개 화면
   재확인)로 대조한다.
3. **재현 시나리오를 회귀 테스트로 박제한다** — 소스-계약 스펙 또는 golden-crud 실구동 스펙으로.

### 적용 사례 1 — PR #160 (마커 pre-seed 증명)

PR 본문(`gh pr view 160`) 검증 섹션 원문: "**pre-seed 실증**: 스테이징 `qna_config`에 마커 직접 주입 →
공개 `/shop/p1` 문의 탭 **DOM에서 마커 렌더 확인**(스펙 판정 아닌 독립 Playwright 구동) → 마커 삭제 후
seed 폴백 복귀 재확인." 3단계가 전부 명시적으로 등장한다: ① 마커 주입(pre-seed) ② 스펙이 아니라
별도 Playwright 구동으로 DOM 확인(독립 경로) ③ `qna-public-wire-binding-flow.spec.ts` 신설(5 테스트, 박제).

### 적용 사례 2 — PR #158 (`cleanupStaleProducts` 멱등성)

`AGENTS.md:425-427` 원문 예시: "staging에 잔여 테스트 상품 2건을 API로 직접 선주입한 뒤 정리 로직을
실행 — PR #158, `cleanupStaleProducts`의 멱등 버그 수정 검증." PR #158 본문 자체에는 이 세부가
문자 그대로 등장하지 않으나(본문은 wave3 도메인 확장을 다룸), AGENTS.md에 박제된 예시로 존재한다 —
**이 사례는 AGENTS.md 기술을 1차 출처로, PR #158 본문은 보조 확인으로 취급**한다.

## 각 스위트의 한계 — 무엇을 보증하지 않는가

| 스위트 | 실제로 확인하는 것 | 확인하지 않는 것 |
|---|---|---|
| 소스-계약(`tests/admin/*`) | 문자열/파일 존재, 타입, 순수 함수 로직 | 화면이 실제로 렌더되는지, 클릭이 되는지, 데이터가 왕복하는지 — **2026-07-18 사고가 증명**(209개 통과 + 배포된 버그 2건) |
| 변경-매핑 실구동(`admin-crud-*.spec.ts`) | 스펙이 명시적으로 클릭·확인하는 필드만. 등록→소비 화면 매칭→수정→삭제→새로고침 | 스펙 작성자가 매칭 대상으로 고르지 않은 필드·화면(예: PR #143이 검증한 건 공지 3면+홈, 후기 5면 — 그 외 소비처가 있다면 미검증). 동시 편집(멀티탭) 경합, 성능, 접근성 |
| 전 페이지 스모크(`all-pages-smoke`, 미머지) | HTTP 200·미처리 예외 없음·hydration 에러 없음·앵커 렌더 | **렌더 존재만** — 예: 이전 발견 사례인 "장바구니 빈 이미지 placeholder"(PR #146 이전 상태)는 페이지가 200으로 렌더되고 에러도 없었으므로 이런 스모크로는 못 잡고 실제 필드/이미지 값 검증(admin-crud류)이 필요했던 종류의 결함이다. 인증이 필요한 라우트의 role별 접근 제어는 앵커 검사 범위 밖일 수 있음(브랜치 코드 직접 확인 필요) |
| dev/staging 빌드 | Preview 환경(staging DB, Vercel Preview 빌드) 동작 | **prod 빌드와 100% 동일 보장 아님** — 환경변수·시크릿·prod DB 데이터 형상 차이(§10-8 prod notices 2건 vs staging 6건처럼 데이터량 자체가 다름)로 prod 전용 결함(예: prod 전용 시크릿 미등록, prod 데이터의 레거시 값 형상)은 이 3층 어디도 못 잡는다 |

## Codex 리뷰어를 위한 크로스체크 가이드

아래 명령으로 이 문서의 각 주장을 직접 재확인할 수 있다(값은 절대 요구하지 않는다 — 이름/카운트/상태만 조회).

```bash
# PR 본문·머지 커밋 확인
gh pr view <PR번호> --json title,body,mergedAt,mergeCommit

# golden-crud 워크플로 실행 이력 (성공/스킵/실패, 트리거 브랜치)
gh run list --workflow=golden-crud.yml --limit 30 --json databaseId,status,conclusion,createdAt,headBranch,event

# 특정 실행의 스텝별 시각(초 단위 소요시간 직접 계산 가능)
gh api repos/mim1012/baekjo-obj/actions/runs/<runId>/jobs -q '.jobs[].steps[]'

# CI(typecheck/build/lint) 실행 이력
gh run list --workflow=ci.yml --limit 10

# 소스-계약 스펙 직접 실행(로컬, 브라우저·DB 불필요)
npx playwright test --project=admin --reporter=line

# 코드 앵커 직접 확인 (예: busyRef 뮤텍스 패턴)
grep -n "busyRef" src/app/admin/concerns/page.tsx

# wave4/wave5/all-pages-smoke 브랜치가 main에 머지됐는지 확인
git log --oneline origin/main | grep -i "wave4\|wave5"
git ls-remote --heads origin | grep -E "wave4|wave5|all-pages-smoke"
```

이 문서에 등장하는 모든 파일 경로·줄 번호는 이 세션이 실제로 `Read`/`git show`로 읽어 확인한 것이다.
단, **opus/codex 리뷰 통과 여부 자체는 PR 코멘트/리뷰 API에 게시된 아티팩트가 아니라 대부분 PR 본문의
체크박스 자기 보고**다 — 결과 문서의 "이 결과가 보증하지 않는 것" 섹션에 상세.
