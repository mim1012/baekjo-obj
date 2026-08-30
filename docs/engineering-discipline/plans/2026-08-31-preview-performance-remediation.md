# Preview 모바일·PC 웹 성능 개선 실행계획

> **Worker note:** 각 작업은 별도 검증 게이트를 통과한 뒤 다음 작업으로 진행한다.

**Goal:** Preview 공개 쇼핑 경로의 모바일 첫 화면 전송량과 체감 로딩을 줄이고, PC·모바일에서 반복 방문 시 불필요한 네트워크 요청과 콘솔 오류가 발생하지 않도록 만든다.

**Architecture:** 공개 읽기 데이터는 서버 캐시와 브라우저 캐시를 함께 사용하고, 내비게이션에 필요한 데이터는 전체 도메인 payload 대신 요약 payload만 내려보낸다. 홈의 대형 시각 리소스는 반응형 포맷·크기 후보를 제공하고, 첫 화면 리소스와 아래 화면 리소스의 로딩 우선순위를 분리한다. 성능 측정은 실제 Chrome에서 모바일/PC viewport를 각각 새 세션으로 열어 같은 경로를 비교한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Next Image, Playwright, Supabase read repositories, Vercel Preview.

**Work Scope:**
- **In scope:** 홈·쇼핑·브랜드 공개 화면의 이미지 전송량, API payload/cache, Link prefetch, 비로그인 wishlist 요청, Preview 성능 측정/보고.
- **Out of scope:** 주문·결제·환불·관리자 CRUD의 동작 변경, Production 요청/측정, DB 스키마 변경, 새 런타임 의존성 추가.

**Measured baseline:** `https://staging.baekjo-objet.com`에서 2026-08-31에 측정한 값. 모바일 홈은 TTFB 12ms, FCP 2,892ms, load 5,761ms, 총 전송 4.32MB, 이미지 3.97MB였다. PC 홈은 TTFB 13ms, FCP 1,456ms, load 1,910ms였다. 홈 모바일의 최대 리소스는 `insurance-analysis-banner.png` 2,460,508 bytes였고, `/api/brands`는 최대 2,521ms, `/api/settings`는 최대 1,885ms였다.

**Verification Strategy:**
- **Level:** e2e + real-browser performance audit
- **Command:** `npx playwright test tests/performance/public-pages-performance.spec.ts --project=performance --workers=1 --retries=0`
- **What it validates:** 모바일/PC 공개 경로의 요청 수·전송량·TTFB·FCP·LCP·load, 금지된 비로그인 wishlist 요청, 공개 API cache header, 주요 화면 렌더링을 검증한다.

## File Structure Mapping

- Create: `tests/performance/public-pages-performance.spec.ts` — 로컬/Preview 공개 페이지 성능 측정 및 회귀 계약
- Modify: `playwright.config.ts` — `performance` project를 단일 worker·재시도 없음으로 추가
- Modify: `src/components/home/HomeClient.tsx:339-348` — 보험 배너 반응형 이미지 포맷·크기·지연 로딩
- Modify: `src/components/common/Header.tsx:75-94` — 내비게이션용 브랜드 요약 조회와 중복 요청 방지
- Modify: `src/lib/storage.ts:83-100, 911-920` — 브랜드 요약 endpoint 사용 및 비로그인 wishlist 요청 차단
- Modify: `src/app/api/brands/route.ts` — `view=nav` 요약 응답 계약과 cache header
- Modify: `src/app/api/products/route.ts`, `src/app/api/category-settings/route.ts` — 공개 읽기 cache 계약 유지/검증
- Modify: `src/components/home/HomeClient.tsx` 및 공개 `Link` 소비부 — 아래 화면 prefetch 요청 축소
- Modify: `tests/admin/category-binding-flow.spec.ts` — 공개 읽기 cache 계약 회귀 검증
- Create: `public/images/insurance-analysis-banner-mobile.webp`, `public/images/insurance-analysis-banner-wide.webp` — 원본과 시각 동일한 압축 전달 자산

## Task 1: 성능 회귀 측정 인프라 고정

**Dependencies:** None (sequential start gate)

**Files:**
- Create: `tests/performance/public-pages-performance.spec.ts`
- Modify: `playwright.config.ts`

- [ ] `performance` Playwright project를 추가한다. `use`에는 실제 Chrome executable 설정을 재사용하고, `workers: 1`, `retries: 0`, `trace: 'retain-on-failure'`를 사용한다. Target은 기존 `resolveE2EBaseUrl()`과 `assertNoProductionOrPreviewTarget()`를 사용하며 Preview는 `PREVIEW_QA_ACK=1`과 사용자가 지정한 URL이 없으면 실패시킨다.
- [ ] `/`, `/shop`, `/brands`를 각각 모바일 `390x844`, PC `1280x900`에서 새 page로 열고 `performance.getEntriesByType('navigation')`, `paint`, `resource`를 수집한다. 각 결과에 `target`, `route`, `viewport`, `ttfb`, `fcp`, `lcp`, `domInteractive`, `load`, `requestCount`, `transferBytes`, `scriptBytes`, `imageBytes`, 느린 상위 10개 리소스를 포함한다.
- [ ] 로컬 기본 실행은 네트워크 상태에 의존하는 절대 threshold로 실패시키지 않는다. 대신 다음 불변 계약은 실패시키도록 한다: 홈에 `insurance-analysis-banner.png` 원본만 단독 요청되지 않을 것, 공개 API 응답에 `Cache-Control`이 있을 것, 공개 홈에서 `/api/settings`가 호출되지 않을 것, 비로그인 `/api/wishlist`가 호출되지 않을 것.
- [ ] 실행 명령을 `npx playwright test tests/performance/public-pages-performance.spec.ts --project=performance --workers=1 --retries=0`로 문서화하고 JSON 결과를 `artifacts/performance/`에 저장한다.

**Acceptance gate:** 테스트 파일이 현재 Preview에서 측정 JSON을 만들고, target guard가 Production/Preview 미지정 실행을 거부하며, 기존 전체 테스트 설정을 깨뜨리지 않는다.

## Task 2: 홈 보험 배너 이미지 전송량 축소

**Dependencies:** Task 1 완료 후 sequential

**Files:**
- Create: `public/images/insurance-analysis-banner-mobile.webp`
- Create: `public/images/insurance-analysis-banner-wide.webp`
- Modify: `src/components/home/HomeClient.tsx:339-348`

- [ ] 기존 PNG의 시각 영역과 현재 `<picture>` breakpoint를 확인한다. 새 자산은 기존 이미지와 같은 종횡비를 유지하고, 모바일 후보는 640px 폭 WebP quality 72, PC 후보는 1280px 폭 WebP quality 76으로 생성한다. 변환은 이미 설치된 `sharp`만 사용하고 dependency manifest는 변경하지 않는다.
- [ ] `<picture>`에 `type="image/webp"` source를 먼저 두고 모바일·PC source를 분리한다. `<img>`에는 명시적인 `width`/`height`, `decoding="async"`, `loading="lazy"`를 적용한다. 보험 배너는 홈 히어로가 아니므로 `priority`를 추가하지 않는다.
- [ ] 변환 전후 `identify` 또는 Node 이미지 메타데이터로 width·height를 확인하고, 새 모바일 파일은 400KB 미만, 새 PC 파일은 700KB 미만인지 확인한다. 시각 내용이 달라지는 crop 변경은 하지 않는다.

**Acceptance gate:** 모바일 홈에서 보험 배너 요청이 WebP 후보를 사용하고 원본 2.46MB PNG가 요청되지 않으며, 화면 캡처에서 배너 텍스트/버튼이 가려지지 않는다.

## Task 3: 공개 API payload와 브라우저 캐시 정리

**Dependencies:** Task 1 완료 후 parallel with Task 2; Task 4는 이 작업 완료 후

**Files:**
- Modify: `src/app/api/brands/route.ts`
- Modify: `src/lib/storage.ts:911-920`
- Modify: `src/components/common/Header.tsx:81-94`
- Modify: `tests/admin/category-binding-flow.spec.ts`

- [ ] `/api/brands?view=nav` 요청에는 Header에 필요한 `id`, 표시명, `slug`, `isVisible`만 반환하고 기존 `/api/brands` 전체 응답 계약은 보존한다. 요약 응답도 `PUBLIC_READ_CACHE_CONTROL`을 사용한다.
- [ ] `getPublicBrands()`와 별개로 `getPublicBrandLinks()`를 만들어 Header가 요약 endpoint를 호출하도록 한다. 반환 타입은 `Array<{ label: string; href: string }>`로 경계에서 변환하고, `unknown` payload를 UI까지 전달하지 않는다.
- [ ] `/api/brands`, `/api/products`, `/api/category-settings`의 cache header 계약을 유지하고 source contract test에 `max-age=60` 및 `stale-while-revalidate=300` 검증을 추가한다.
- [ ] Header가 페이지마다 전체 브랜드 payload를 재요청하지 않는지, 첫 방문과 동일 세션 내 이동에서 Resource Timing으로 확인한다.

**Acceptance gate:** `/api/brands?view=nav` 응답이 기존 전체 목록보다 작고 Header 링크가 기존과 동일하며, 공개 읽기 API cache header 테스트가 통과한다.

## Task 4: 불필요한 prefetch와 비로그인 wishlist 요청 제거

**Dependencies:** Task 3 완료 후 sequential

**Files:**
- Modify: `src/components/common/ProductCard.tsx:43-72`
- Modify: `src/lib/storage.ts:83-100`
- Modify: 공개 홈·Header의 아래 화면 Link 소비부
- Test: `tests/golden/home.spec.ts`, `tests/golden/home-quick-shop.spec.ts` 또는 `tests/performance/public-pages-performance.spec.ts`

- [ ] `ProductCard`는 `getCurrentUser()`가 비어 있는 초기 익명 세션에서 `getWishlist()`를 호출하지 않는다. 찜 버튼을 누르면 기존 로그인 redirect 계약은 유지한다.
- [ ] 로그인 사용자의 wishlist 초기화는 세션당 inflight coalescing을 유지하고, `STORAGE_EVENTS.WISHLIST_CHANGED` 발생 시에만 재동기화한다. 기존 401 API 계약과 `tests`의 비로그인 보안 기대값은 변경하지 않는다.
- [ ] 홈 첫 화면 밖의 고비용 route link에는 `prefetch={false}`를 적용한다. Header의 사용자가 바로 열 가능성이 높은 `/shop` 링크처럼 UX에 직접 영향을 주는 링크는 유지하고, footer·아래 후기/공지·보험 배너처럼 첫 상호작용 전 불필요한 링크만 대상으로 한다.
- [ ] 모바일 홈에서 `/api/wishlist` 401 콘솔 오류가 사라지고, 첫 진입 RSC prefetch request 수가 수정 전보다 증가하지 않는지 확인한다.

**Acceptance gate:** 비로그인 홈/쇼핑/브랜드 화면에서 `/api/wishlist` 요청 0건, console error 0건이며, 링크 클릭 시 목적지·로그인 redirect 동작이 기존 테스트와 동일하다.

## Task 5: 최신 변경을 Preview에 배포하고 실측 재검증

**Dependencies:** Tasks 2-4 완료 후 sequential

**Files:** None (deployment/verification only)

- [ ] main 통합 대상 PR에서 build, lint, typecheck, 공개 경로 관련 Playwright 테스트를 실행한다. Production URL과 Production DB에는 요청하지 않는다.
- [ ] 사용자가 지정한 Preview URL 한 곳에서만, 단일 worker·재시도 없음·최대 5개 top-level navigation으로 `/`, `/shop`, `/brands`를 모바일/PC 각각 측정한다.
- [ ] 이전 Preview 기준과 다음 목표를 비교한다: 모바일 홈 FCP `< 1.8s`, load `< 3.0s`, 총 전송 `< 2.0MB`, 이미지 전송 `< 1.0MB`; PC 홈 FCP `< 1.2s`, load `< 2.0s`; 두 환경 모두 `/api/settings` 0건·비로그인 wishlist 0건·console error 0건.
- [ ] 목표를 충족하지 못하면 가장 큰 전송 리소스와 가장 느린 API 한 건만 다음 수정 대상으로 선정하고, 원인 확인 없이 추가 최적화를 하지 않는다.

**Acceptance gate:** Preview 재측정 JSON·스크린샷·콘솔 로그가 저장되고, 모바일/PC 목표와 네트워크 불변 계약이 모두 통과한다. 실패 시 미충족 수치와 다음 단일 병목을 기록한 상태로 멈춘다.

## Task 6 (Final): 전체 검증 및 계획 체크

**Dependencies:** Tasks 1-5 완료 후, parallel 불가

**Files:** None (read-only verification)

- [ ] `npm run lint`를 실행한다. 기대 결과: exit 0, 이번 변경 파일의 신규 error 0.
- [ ] `npx tsc --noEmit`를 실행한다. 기대 결과: exit 0.
- [ ] `npm run build`를 실행한다. 기대 결과: optimized production build exit 0.
- [ ] `npx playwright test --project=products --project=admin --project=tracking --project=security`를 실행한다. 기대 결과: 기존 테스트 회귀 0. 현재 알려진 `workflow-preview-safety.spec.ts`의 CI 문구 불일치는 별도 기존 이슈로 분리한다.
- [ ] `npx playwright test tests/performance/public-pages-performance.spec.ts --project=performance --workers=1 --retries=0`를 실행하고 결과 JSON, 모바일/PC 스크린샷, 콘솔 로그를 읽는다.
- [ ] 체크한다: 이미지 원본 미요청, 공개 캐시 header, `/api/settings` 홈 0건, 비로그인 wishlist 0건, FCP/load 목표, 화면 주요 콘텐츠 렌더링, Production 미접근.
- [ ] 각 변경 파일의 pure LOC를 측정한다. 200줄 초과 파일은 추가 라인을 넣지 않고 분할 필요성을 기록한다.

## Self-Review

- [x] 프리뷰 실측에서 확인된 대용량 이미지·API 지연·불필요 요청·401 콘솔 오류를 각각 작업으로 연결했다.
- [x] 주문·결제·환불·관리자 쓰기 경로는 범위에서 제외했다.
- [x] Task 2와 Task 3은 파일 소유권이 겹치지 않아 병렬 가능하고, Task 4는 Task 3의 endpoint/캐시 계약 이후로 고정했다.
- [x] 모든 작업에 정확한 파일 경로와 acceptance gate를 넣었다.
- [x] 최종 검증이 build·lint·typecheck·Playwright·실제 Preview 브라우저 측정을 모두 포함한다.
- [x] 절대 성능 목표는 반복 측정 변동성을 고려해 Preview 최종 게이트에서만 적용하고, 원인 없는 추가 최적화는 금지했다.
