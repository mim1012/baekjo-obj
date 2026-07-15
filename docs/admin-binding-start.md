# 관리자 UX · 데이터 바인딩 PR-00

> 상태: 초기 정리 / 동작 변경 없음  
> 기준 브랜치: `main`  
> 실행 원칙: 이후 구현은 `Product → Home → Brand → Category → Content → Partner` 순서로 진행한다.

## 1. 목적

관리자가 SQL·seed 파일 수정 없이 운영할 수 있어야 하는 화면을 도메인별로 정리한다. 이번 PR은 구현 PR이 아니라 다음 구현을 안전하게 시작하기 위한 **진행형 인벤토리**다.

이번 PR에서 확정하는 것:

1. 우선 도메인은 Product, Home, Brand, Category, Content, Partner다.
2. Home 기준은 별도 결정이 있기 전까지 **현재 공개 Home 화면을 정본**으로 둔다.
3. 계약 변경이 없으면 backend/frontend를 강제로 분리하지 않는다.
4. schema, migration, 공통 타입, `storage.ts` 시그니처, 공유 계약 변경만 별도 contract PR로 분리한다.
5. 저장되지 않는 관리자 기능은 다음 도메인 PR에서 실제 저장으로 연결하거나, 버튼 제거/읽기 전용/de-claim 처리한다.

## 2. 공통 완료 조건

각 도메인 구현 PR은 아래 5개를 완료해야 한다.

| # | 완료 조건 | 의미 |
|---|---|---|
| 1 | 관리자 저장 | 관리자 화면에서 실제 저장 액션이 성공한다. |
| 2 | API 확인 | 저장 요청 payload/API 경로가 검증된다. |
| 3 | DB/repo readback | 저장 후 DB 또는 repo/API readback으로 값이 확인된다. |
| 4 | 공개 페이지 확인 | 공개 화면 DOM에서 변경값이 확인된다. |
| 5 | 정적 import 정리 | live-editable 데이터의 `@/data/*` 직접 import가 제거되거나 seed/default/read-only로 분류된다. |

## 3. 데이터 분류 기준

| 분류 | 정의 | 허용 조건 |
|---|---|---|
| `live-editable` | 관리자 저장이 공개 화면에 반영되어야 하는 운영 데이터 | DB/API/repo readback + 공개 DOM 검증 필요 |
| `seed-only` | DB 재시드 원본이며 런타임 공개 화면이 직접 읽으면 안 되는 파일 | `products.ts`, `brands.ts`처럼 seed 원본임을 문서화하고 import guard 유지 |
| `default-only` | 저장값이 없을 때만 쓰는 기본값 | provider/config 내부 fallback으로만 사용 |
| `read-only` | 현재 운영에서 관리자 저장 대상이 아닌 정적 콘텐츠 | 저장/수정 버튼을 제거하거나 읽기 전용임을 표시 |
| `de-claim` | UI가 저장되는 척하지 않게 명시적으로 내려놓은 상태 | 성공 toast·저장 버튼·수정 가능 문구 제거 |

## 4. 우선 도메인 인벤토리

### 4-1. Product

| 항목 | 현재 상태 |
|---|---|
| 관리자 화면 | `/admin/products`, `/admin/products/[id]`, `/admin/products/[id]/editor`, `/admin/products/display` |
| 공개 화면 | `/shop`, `/shop/[id]`, Home 추천 상품, 진단 결과 추천 |
| 런타임 source | DB `products` → `src/lib/products/repo.ts` → API/storage/repo |
| seed 파일 | `src/data/products.ts` = seed-only. 런타임 화면 직접 import 금지. |
| import guard | `eslint.config.mjs`가 `@/data/products` 직접 import를 차단한다. |
| 저장 경로 | `src/lib/storage.ts`의 `createProduct/updateProduct/deleteProduct` → `/api/admin/products*` → repo |
| 공개 readback | `/shop`·PDP 서버 컴포넌트가 repo를 직접 호출한다. |
| 현재 강점 | 상품 가격/재고/갤러리/옵션/상세 블록 등 주요 필드가 최근 PR들로 상당 부분 열렸다. |
| 남은 UX/QA 후보 | bulk action의 native `confirm/alert`, 진열 관리의 실제 정렬 semantics, 상세 에디터 drag 정렬은 가짜(↑↓ 버튼만 실제), 가격/재고 운영 시나리오 검증. |
| 다음 PR | `fe/behavior-product-binding` |

Product 실제 시나리오:

1. 관리자가 상품 가격/재고/노출/상세 필드를 수정한다.
2. 저장 API가 성공한다.
3. repo readback에서 수정값이 보인다.
4. `/shop` 카드 또는 `/shop/[id]` PDP에 반영된다.
5. `@/data/products` 직접 import가 없는지 확인한다.

### 4-2. Home

| 항목 | 현재 상태 |
|---|---|
| 관리자 화면 | `/admin/settings` |
| 공개 화면 | `/` (`src/app/page.tsx` + `src/components/home/HomeClient.tsx`) |
| 런타임 source | 공개 Home은 현재 props로 받은 products/brands + 하드코딩 UI + `notices/reviews` 정적 import를 사용한다. |
| 저장 경로 | `/admin/settings` → `useSiteSettings().updateSettings` → `/api/admin/settings` → `src/lib/settings/repo.ts` |
| 공개 readback | `/api/settings`와 provider는 있으나 `HomeClient`가 저장된 HomeSettings를 실제 공개 Home 문구에 직접 소비하지 않는다. |
| 기준 결정 | 현재 공개 Home 화면을 정본으로 둔다. 기존 HomeSettings 스키마가 화면과 맞지 않는 필드는 다음 Home PR에서 제거/숨김/읽기 전용/de-claim 처리한다. |
| 정적 import | `HomeClient`가 `@/data/notices`, `@/data/reviews`를 사용한다. Home 자체 설정값은 `src/data/homeContent.ts`가 default-only 후보. |
| 저장되지 않는 UX | `/admin/settings`의 “홈페이지 주요 콘텐츠 편집” 문구는 공개 Home 반영 범위가 아직 과장되어 있다. |
| 다음 PR | `fe/behavior-home-binding` 또는 계약 필요 시 선행 `contract/home-settings-realign` |

Home 실제 시나리오:

1. 관리자가 현재 공개 Home에 실제 존재하는 필드를 수정한다.
2. settings API가 성공한다.
3. settings repo/API readback에서 수정값이 확인된다.
4. 공개 Home DOM에서 수정값이 확인된다.
5. `homeContent`는 default-only로 남기거나 live-editable 경로로 전환한다.

### 4-3. Brand

| 항목 | 현재 상태 |
|---|---|
| 관리자 화면 | `/admin/brands`, `/admin/brands/[id]` |
| 공개 화면 | `/brands`, `/brands/[id]`, PDP 하단 브랜드 링크/자료 |
| 런타임 source | DB `brands` → `src/lib/brands/repo.ts` |
| seed 파일 | `src/data/brands.ts` = seed-only. 런타임 화면 직접 import 금지. |
| import guard | `eslint.config.mjs`가 `@/data/brands` 직접 import를 차단한다. |
| 저장 경로 | `/api/admin/brands*` + `updateBrand` + `buildBrandDetailPayload` |
| 공개 readback | 브랜드 목록/상세 서버 컴포넌트가 repo를 직접 호출한다. |
| 현재 강점 | 상세 에디터가 노출/신규/순서/감사 리포트/대표상품/연관 고민/출처 URL 등 대형 필드를 연다. |
| 남은 UX/QA 후보 | 기존 감사 보고서 삭제는 계약 한계로 차단됨, concern option은 `@/data/concerns` read-only 예외, public 반영 시나리오 체계화 필요. |
| 다음 PR | `fe/behavior-brand-binding` |

Brand 실제 시나리오:

1. 관리자가 브랜드 노출/순서/검증 리포트/대표상품을 수정한다.
2. brand payload/API가 성공한다.
3. brand repo readback에서 수정값이 확인된다.
4. `/brands` 또는 `/brands/[id]` DOM에서 수정값이 확인된다.
5. `@/data/brands` 직접 import가 없는지 확인한다.

### 4-4. Category

| 항목 | 현재 상태 |
|---|---|
| 관리자 화면 | `/admin/categories` |
| 공개 화면 | Header, `/shop` 필터, `/brands` 필터, 상품 폼 카테고리 select |
| 런타임 source | `CategorySettingsProvider`가 `/api/category-settings`를 읽고 `/api/admin/category-settings`에 저장한다. |
| 정적/default 파일 | `src/lib/categorySettings/config.ts` = default-only |
| 남은 drift | `src/data/shopFilters.ts`가 Header/ShopContent/filters에서 여전히 직접 import된다. |
| UX 후보 | 관리자 설명은 “드래그”라고 하지만 실제 조작은 ▲▼ 버튼이다. |
| 다음 PR | `fe/behavior-category-binding`, 공유 source 변경이 크면 `contract/category-source` 선행 |

Category 실제 시나리오:

1. 관리자가 카테고리를 수정한다.
2. category-settings API가 성공한다.
3. 설정 readback에서 수정값이 확인된다.
4. Header, `/shop` 필터, `/brands` 필터 DOM에 반영된다.
5. `shopFilters` 직접 import를 제거하거나 default-only/de-claim 처리한다.

### 4-5. Content

| 항목 | 현재 상태 |
|---|---|
| 관리자 화면 | `/admin/notices`, `/admin/reviews`, `/admin/concerns`, 일부 `/admin/qna` |
| 공개 화면 | `/notices`, `/reviews`, `/concerns`, Home 후기/공지 섹션, 브랜드/고민 상세 보조 콘텐츠 |
| 현재 source | notices/reviews/concerns는 대부분 `src/data/*` static-public. |
| 저장 UX | `AdminResourcePage`는 actionLabel이 있으면 “MVP mock 입력 UI이며 실제 서버 저장은 연결되지 않습니다”라고 쓰지만 저장 버튼과 수정/삭제 UX가 있어 운영상 오해 가능성이 높다. 삭제는 `onDeleteRow`가 없으면 로컬 Set 숨김뿐이다. |
| product_reviews | 실제 상품 리뷰 API/repo는 존재하지만 `/admin/reviews`는 editorial seed reviews를 보여준다. |
| 다음 PR | `fe/behavior-content-binding`, DB 테이블 추가가 필요하면 도메인별 contract/backend PR 선행 |

Content 실제 시나리오:

1. 운영 대상으로 삼은 콘텐츠는 관리자 저장 → API → DB/repo → 공개 DOM을 증명한다.
2. 이번 단계에서 운영하지 않는 콘텐츠는 저장/수정/삭제 버튼을 제거하거나 읽기 전용으로 바꾼다.
3. `@/data/notices`, `@/data/reviews`, `@/data/concerns`는 live-editable로 전환하거나 read-only/de-claim한다.

### 4-6. Partner

| 항목 | 현재 상태 |
|---|---|
| 관리자 화면 | `/admin/partners`, 회원 승인 관련 `/admin/members` |
| 공개 화면 | `/landing/care-kit`, 회원/파트너 상품 관리 흐름 |
| 런타임 source | partners config는 내부 CRM 성격. partner product API는 별도 존재한다. |
| 운영 목표 | 파트너 승인과 브랜드 배정이 SQL 없이 가능해야 한다. |
| public DOM | 파트너 승인 자체는 공개 DOM 대상이 아니다. 공개 페이지 반영이 없으면 명시적으로 de-claim한다. |
| 다음 PR | `fe/behavior-partner-onboarding`, 타입 변경 시 `contract/member-managed-brands` 선행 |

Partner 실제 시나리오:

1. 관리자가 파트너를 승인하고 브랜드를 배정한다.
2. API/DB readback에서 managed brand가 확인된다.
3. 파트너가 배정 브랜드만 관리 가능하고 타 브랜드는 거부된다.
4. 공개 페이지 반영이 없는 항목은 de-claim한다.

## 5. 현재 정적 import 분류 초안

| 파일 | 현재 import 위치 | 분류 | 다음 처리 |
|---|---|---|---|
| `src/data/products.ts` | 런타임 직접 import 없음(guard 대상) | seed-only | 유지. 삭제 금지. |
| `src/data/brands.ts` | 런타임 직접 import 없음(guard 대상) | seed-only | 유지. 삭제 금지. |
| `src/data/homeContent.ts` | settings provider/API/repo type/default | default-only 후보 | Home PR에서 현재 화면 정본에 맞게 축소/재정렬. |
| `src/data/shopFilters.ts` | Header, ShopContent, filters | live-editable 후보 또는 default-only | Category PR에서 category settings와 통합. |
| `src/data/notices.ts` | notices pages, admin notices, Home | live-editable 후보 | Content PR에서 DB 바인딩 또는 read-only 처리. |
| `src/data/reviews.ts` | reviews pages, admin reviews, Home, adapters fallback | live-editable 후보/read-only 혼재 | editorial reviews와 product_reviews 분리 결정 필요. |
| `src/data/concerns.ts` | concerns pages, admin concerns, signup, brand detail options, ShopContent | live-editable 후보/read-only 혼재 | Content/Category 범위에서 단계 처리. |
| `src/data/company.ts` | Footer, terms, privacy, ProductPurchaseInfo | read-only/legal config | 관리자 운영 대상 아님. 별도 법정정보 변경 PR에서만 수정. |
| `src/data/qna.ts` | qna config fallback | default-only | 이미 DB config 경로 존재. fallback으로 유지 가능. |
| `src/data/survey.ts` | survey config fallback | default-only/seed-like | 진단 설정 PR 범위 밖. |

## 6. 저장되지 않는 기능/문구 후보

| 위치 | 현재 UX | 판단 | 다음 처리 |
|---|---|---|---|
| `AdminResourcePage` create drawer | “MVP mock 입력 UI이며 실제 서버 저장은 연결되지 않습니다” + 저장 버튼 | 오해 가능성 높음 | Content PR에서 실제 저장 또는 버튼 제거/읽기 전용 |
| `AdminResourcePage` 삭제 | `onDeleteRow` 없으면 로컬 숨김 | 비영속 | Content PR에서 실제 삭제/숨김 API 또는 삭제 버튼 제거 |
| `/admin/settings` | Home 전체 편집처럼 보임 | dead-CMS/partial | Home PR에서 현재 Home 정본 필드만 노출 |
| `/admin/categories` 설명 | “드래그하여 순서 변경” | 실제 DnD 없음 | Category PR에서 문구 수정 또는 DnD 구현 |
| `/admin/products` bulk action | native confirm/alert | 저장은 되지만 UX 미흡 | Product PR에서 개선 후보 |
| `/admin/brands/[id]` 감사 보고서 삭제 | 기존 보고서 비우기 불가 안내 | 계약 한계 명시됨 | Brand PR에서 유지 또는 contract로 null clear 지원 |
| `/admin/products/[id]/editor` drag handle | 시각 장식, 실제는 ▲▼ | 기능 과장 | Product PR에서 진짜 DnD 또는 문구/아이콘 정리 |

## 7. PR 진행 순서

1. `chore/admin-binding-start` — 이 문서 PR. 동작 변경 없음.
2. `fe/behavior-product-binding` — Product 운영 시나리오 완성.
3. `fe/behavior-home-binding` — Home ADR 기준으로 설정 반영.
4. `fe/behavior-brand-binding` — Brand 공개 반영 시나리오 완성.
5. `fe/behavior-category-binding` — Category source 통합.
6. `fe/behavior-content-binding` — notices/reviews/concerns 저장 또는 de-claim.
7. `fe/behavior-partner-onboarding` — 파트너 승인/브랜드 배정 SQL-free.

계약 변경이 확인되는 순간 해당 PR은 중단하고 `contract/*` 또는 `be/*` 선행 PR로 분리한다.

## 8. PR-00 검증

이번 PR은 문서/인벤토리만 추가한다. 검증 기준은 다음과 같다.

- 문서가 실제 파일 경로와 현재 구현 상태를 기준으로 작성되어 있다.
- Product/Home/Brand/Category/Content/Partner 다음 작업이 5개 완료 조건으로 시작 가능하다.
- 동작 변경이 없다.
- `npm run lint`는 기존 warning만 허용하고 error 0이어야 한다.

