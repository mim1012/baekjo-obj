# 관리자 콘솔 UI/UX 개선안 — 대시보드 · 브랜드관 · 상품상세 완전 연동

> 작성 2026-07-14 · 대상 `main`(`581307b`, dad UI 이식 PR #43·#46·#47·#48 머지 직후)
> 근거는 전부 실제 코드 `파일:라인` 인용. 추측 없음.
> 관련 규범: `AGENTS.md` §3(레이어 경계) · §4(콘센트) · §7 골든플로우 #7 · §8-6(3중 검증 게이트)

---

## 0. 한 줄 요약

**조사 중 CRITICAL 결함 2건이 나왔다. 개선안보다 이게 먼저다.**

1. 🔴 **상품 상세 블록 에디터의 저장이 구조적으로 항상 실패한다.** 관리자가 상세페이지를 아무리 만들어도 DB에 한 글자도 안 들어간다. (§2-1)
2. 🔴 **상품 등록 폼이 자기 안내문을 따르면 400이 난다.** "상세페이지 에디터를 사용하려면 비워두세요"라고 써놓고, 비우면 등록이 실패한다. (§2-2)

구조 관점에서는, 카탈로그의 축이 **브랜드 → 상품 → 상세** 인데 **관리자 화면이 그 축을 어디서도 이어주지 않는다.**
대시보드는 브랜드를 모르고(지표 0개), 브랜드 폼은 6필드만 열려 있고, 상품 폼은 공개 화면이 렌더하는 필드 대부분을 편집할 수 없다.

---

## 1. 현재 실태

### 1-1. 대시보드가 보여주는 것 — `src/app/admin/page.tsx`

| 영역 | 내용 | 근거 |
|---|---|---|
| `SummaryStrip` 8칸 | 전체 상품 / 노출 / 추천 / 베스트 / 품절 / 가격 미등록 / 이미지 미등록 / 상세 미작성 | `page.tsx:160-171` |
| 카드 1 | 조치 필요 상품 5건 | `page.tsx:175-230` |
| 카드 2 | 최근 주문 5건 | `page.tsx:233-270` |
| 카드 3 | 보험 분석 신청 5건 | `page.tsx:273-313` |
| 카드 4 | 가입 승인 대기 5건 | `page.tsx:316-355` |

**차트 0개. 브랜드 지표 0개.** 매출/GMV·기간 필터·추이 그래프·미답변 문의 카운트 — 코드상 전혀 없다(`recharts`가 스택에 있으나 대시보드 import 0건).

데이터 경로:
```
/admin (client)
 ├─ getAdminDashboardSummary()  → GET /api/admin/dashboard → orders + insurance + members
 └─ getAdminProducts()          → 전체 상품 배열을 받아 브라우저에서 forEach 집계 (page.tsx:67-103)
```
`src/lib/brands/repo.ts:104` `listAllBrandsForAdmin()`은 존재하는데 **대시보드 호출 0건.**

### 1-2. 관리자 UI 3세대 혼재

| 세대 | 페이지 |
|---|---|
| ① `admin-new/*` (dad 신규) | dashboard, products, categories, brands, orders, members, insurance, qna |
| ② 레거시 `admin/AdminResourcePage` | inquiries, reviews, concerns, notices, kits, partners |
| ③ 레거시 `admin/AdminUi` | survey, survey-results, settings |

→ 사이드바를 옮겨다닐 때 **테이블·필터·버튼 스타일이 페이지마다 바뀐다.** 골든플로우 #7 체감 품질을 가장 크게 깎는 요인.

---

## 2. 🔴 CRITICAL — 지금 당장 고쳐야 할 것

### 2-1. 상세 블록 에디터 저장이 **항상 400으로 실패**

**증상**: `/admin/products/[id]/editor`에서 텍스트·이미지 블록을 아무리 배치하고 저장해도 화면에 `invalid-input`만 뜨고 **DB에 절대 저장되지 않는다.**

**근본원인**: `src/lib/products/validate.ts:79-272`의 `validateProductFields`는 **화이트리스트** 방식인데 **`detailBlocks` 분기가 없다.**

```
ProductDetailEditor.tsx:78  updateProduct(id, { detailBlocks: validBlocks })
   → PATCH /api/admin/products/[id]
      → validateProductFields(body, false)   ← detailBlocks 분기 없음 → out = {}
      → route.ts:26-29  Object.keys(fields).length === 0  →  400 invalid-input
```

`src/lib` 전체에서 `detailBlocks` 언급은 **읽기 경로 `repo.ts:63` 단 한 곳뿐**이다. repo의 `splitProductInput`(`repo.ts:103-119`)은 detail jsonb에 넣을 수 있게 설계돼 있으나 **validate 게이트를 못 넘어 도달 불가.**

**파급**: 관리자 목록의 "상세 미작성" 배지(`admin/products/page.tsx:126-138`)와 필터(`:237`)는 **영원히 해제되지 않는다.** 현재 DB에 있는 78장 상세 슬라이스는 전부 시드(SQL)로 들어간 것이고, 관리자가 화면에서 만든 게 아니다.

**수정**: `validate.ts`에 `detailBlocks` 분기 추가(`type:'text'|'image'` 판별 + `content`/`src` 문자열 검증 + 배열 상한). **레인 = mim(`be/*`), 계약 변경 아님**(타입은 이미 `ProductDetailBlock`으로 존재).

### 2-2. 상품 등록 폼이 **자기 안내문을 따르면 실패**

**증상**: 신규 상품 등록 시 `400 invalid-input`. 에러 문구도 원문 `invalid-input`이 그대로 노출된다(`ProductForm.tsx:85`).

**근본원인**: 클라이언트 검증은 `name/brandId/category/price` 4개만 본다(`ProductForm.tsx:57-60`). 그런데 서버는 생성 시 `lifestyleCategory`(`validate.ts:136-139`)·`image`(`:163-166`)·`description`(`:187-190`)을 **길이 ≥ 1로 강제**한다. 폼 초기값은 셋 다 `''`(`:39,42,45`).

특히 `description` textarea의 placeholder가 **"상세페이지 에디터를 사용하려면 비워두세요"**(`ProductForm.tsx:219`)인데, **그 안내를 따르면 등록이 400으로 죽는다.**

**수정**: 클라이언트 필수 검증을 서버 계약(6필드)과 일치시키고, 에러 메시지를 사람 말로 매핑(`invalid-input` → "필수 항목이 비어 있습니다: 라이프스타일 분류, 대표 이미지, 설명"). placeholder 문구도 정정. **레인 = dad(표현) + mim(검증 정합).**

---

## 3. 브랜드관 — 관리자가 편집할 수 없는 것들

`BrandForm`이 편집하는 필드는 **6개뿐**(`BrandForm.tsx:25-34`): `name, logo, description, philosophy, auditGrade, officialUrl, isRecommended`.

| # | 봉인된 필드 | 근거 | 영향 |
|---|---|---|---|
| **B1** | **`isVisible`** — 숨김/노출 토글이 **어디에도 없다.** 생성 시 `isVisible: true` 강제(`validate.ts:129-131`) | `BrandForm.tsx:25-34` | 브랜드를 내리려면 **SQL을 직접 쳐야 한다** |
| **B2** | **목록에 노출 상태 컬럼이 없다** (컬럼 = 로고/브랜드정보/검증등급/등록상품/관리) | `admin/brands/page.tsx:77-160` | `listAllBrandsForAdmin`이 숨김 브랜드까지 가져오는데 **관리자가 숨김/노출을 구분할 수 없다** (b4 캣코드가 숨김인데 목록에선 똑같이 보임) |
| **B3** | **`displayOrder` 완전 데드** — 편집 UI 없음 + `repo.ts:88` 정렬이 `created_at desc` 고정 | `repo.ts:82-88` | 브랜드 진열 순서를 못 바꾼다 |
| **B4** | **`auditReport`**(검증 리포트 8필드) — 공개 `/brands/[id]`·PDP에 **렌더되는데** 입력란이 없다 | `BrandForm` 전체 | 브랜드관의 **핵심 콘텐츠**를 SQL로만 채울 수 있다 |
| **B5** | `auditPoints`·`representativeProductIds`·`relatedConcernSlugs`가 생성 시 **`[]` 하드코딩** | `BrandForm.tsx:59-61` | 대표상품·연관고민 연결 UI 부재 → 브랜드 상세가 빈 채로 생성됨 |
| **B6** | `isNew`·`sourceUrls` 편집 UI 없음 | 동일 | 부수 |

> ⭐ **API·validate·repo는 전 필드를 이미 지원한다**(`validate.ts:59-145`가 전 필드 검증). **폼만 6필드를 노출해 나머지를 봉인**하고 있다. 백엔드 공사 없이 **폼만 열면 되는 항목이 대부분**이다.

부수 갭: 브랜드 **상세 페이지 `/admin/brands/[id]`가 없다**(모달 폼이 전부) · 삭제가 native `confirm()`(`page.tsx:59`) · 에러가 native `alert()`(`:37,66`) · 페이지네이션 없음(`BRANDS_LIST_CAP=500`).

---

## 4. 상품상세 — 공개 화면은 렌더하는데 관리자가 못 채우는 필드

이게 이 문서에서 가장 중요한 표다. **공개 PDP가 그리는 필드 대부분을 관리자가 편집할 수 없다.**

| 필드 | 공개 렌더 위치 | 관리자 편집 수단 |
|---|---|---|
| **`detailBlocks`** | `shop/[id]/page.tsx:58-78` | 에디터는 있으나 **저장 400 실패**(§2-1) → 실질 불가 |
| **`images`** (갤러리) | `ProductDetailClient.tsx:23,115-131` | **UI 전무.** `usage:'gallery'`는 `ImageUploader.tsx:11`에 타입만 있고 호출처 0곳 |
| **`options`** (옵션명·옵션가·옵션재고) | `ProductDetailClient.tsx:52,189-211` | **UI 전무** (validate에 검증 로직만 존재) |
| `ingredients` / `howToUse` | `page.tsx:107,112` | UI 전무 |
| `recommendedFor` / `caution` | `page.tsx:44-45,119-120` | UI 전무 |
| `shippingFee` | `ProductDetailClient.tsx:177-180` | UI 전무 |
| `isMembersOnlyPrice` ("판매가 회원공개") | `ProductDetailClient.tsx:158` | UI 전무 |
| `rating` / `reviewCount` | `ProductDetailClient.tsx:151-152`, `ProductCard.tsx:176-178` | UI 전무 + **실제 리뷰와 동기화하는 코드도 없음** |
| `concernTags` | `ProductCard.tsx:181-193`, 관련상품 매칭 `page.tsx:38` | UI 전무 |
| `shippingNotice` | `ProductPurchaseInfo.tsx:10` | API는 허용, 폼 UI 없음 |
| **`sellerName`·`deliveryEstimate`·`returnNotice`** | `ProductPurchaseInfo.tsx:10-11,31` | 🔴 **이중 단절**: validate 화이트리스트에 없고 `rowToProduct`(`repo.ts:43-82`)가 **DB에서 되읽지도 않는다** → **영원히 `undefined`, 항상 fallback 기본문구만 표시** |

관리자 상품 폼이 실제로 편집하는 건 **14개**(`ProductForm.tsx:139-311`): name·brandId(select)·category·petType·lifestyleCategory·summary·description·price·salePrice·stock·isVisible·isRecommended·isBest·image(대표 1장).

### 4-1. 상세 에디터의 다른 갭

- 드래그 핸들 `GripVertical`이 **시각 장식일 뿐 DnD 미구현** — 코드 주석에 "(시각적 효과만)"(`ProductDetailEditor.tsx:145-148`). 순서 변경은 ▲▼ 버튼만.
- 텍스트 블록을 `dangerouslySetInnerHTML`로 렌더(`:229`)하는데 **공개 PDP는 `whitespace-pre-line` 평문**(`shop/[id]/page.tsx:58-78`) → **미리보기와 실제 화면이 다르다.**
- `src/app/admin/products/[id]/editor/page.tsx:6` — `params`를 await하지 않는 **구형 시그니처**(Next 16에서 `params`는 Promise. PDP `page.tsx:26`은 올바르게 await함).

### 4-2. 진열 관리 — 순서를 못 바꾼다

`ProductDisplayManager`는 `isBest`/`isRecommended`/`isVisible` **불리언 3개만** 토글한다(`:63-71`). **정렬 순서 개념이 없고**(`GripVertical`을 import만 하고 미사용, `:5`), 실제 목록 정렬은 `created_at desc` 고정(`repo.ts:139`). 저장은 상품별 `updateProduct` **순차 루프**(`:81-84`, 코드 주석도 "bulk update API 권장").
그리고 **이 페이지는 사이드바에서 도달 불가**(`AdminSidebar.tsx:37-61`에 링크 없음).

### 4-3. 브랜드 ↔ 상품 연결이 화면에서 끊긴다

- PDP 상단 브랜드명은 **링크가 아니다**(`ProductDetailClient.tsx:146`, 단순 `<div>`). 브랜드로 가는 유일한 링크는 페이지 한참 아래 "브랜드 이야기 더 보기"(`page.tsx:140-145`).
- **PDP에 브랜드 로고가 없다** — `Brand.logo`는 PDP 어디에도 렌더되지 않음.
- `ProductCard`도 브랜드가 **링크 아닌 12px 회색 평문**(`common/ProductCard.tsx:38,152`). `brandName`이 비면 **원시 `brandId`(`brand_uuid…`)가 그대로 노출**된다.
- `brandName`은 저장 시 id→name **스냅샷**(`ProductForm.tsx:66`) → **브랜드명을 바꾸면 기존 상품의 brandName이 stale**해진다(`repo.ts:70`이 detail jsonb에서 읽음).

### 4-4. 상품 생성 경로가 두 개다

파트너 폼(`BrandProductsClient.tsx:81-139`)은 **`name`+`price` 2개만** 받고 나머지를 하드코딩해 넣는다(`image:'/images/icon-product.svg'`, `description:'설명이 없습니다.'`, `category:'미분류'`, `stock:100` — `:105-126`). 관리자 폼과 **완전히 별개의 두 번째 생성 경로**이고, 여기로 만든 상품은 카탈로그 품질 기준을 통과하지 못한다.

---

## 5. 파트너(입점업체) 온보딩이 UI에서 끊김

```
members.managed_brand_ids[]  →  brands.id  →  products.brand_id
```
**서버는 이미 완성돼 있다** — `requireBrandScoped.ts:30-33`이 매 요청 DB 재확인(role=partner + status=active + managedBrandIds 포함). **끊긴 건 화면이다.**

| # | 결함 | 근거 |
|---|---|---|
| **P1** | 대시보드 "가입 승인 대기" 카드가 파트너를 **표시만** 하고, 승인해도 **브랜드를 배정할 화면이 없다** | `admin/page.tsx:316-355` |
| **P2** | `managed_brand_ids` 부여 UI 부재 → 파트너 권한 부여가 **SQL 수작업**(`MemberRoleStatusPanel`은 role/status만) | `SESSION.md:120` |
| **P3** | admin 문의 라우트에 파트너 브랜드 스코프 검증 **미구현**(코드에 `TODO(RBAC)` 명시) | `api/admin/inquiries/route.ts:9-11`, `[id]/answer/route.ts:11` |

---

## 6. 개선안 — 브랜드를 1축으로 세운 대시보드

### 6-1. 설계 원칙

1. **브랜드가 최상위 축이다.** 모든 지표는 "전체" 또는 "브랜드별"로 볼 수 있어야 한다.
2. **집계는 서버에서.** 클라이언트 forEach(`page.tsx:67-103`)와 전량 조회(`api/admin/dashboard/route.ts`)를 서버 집계로 대체.
3. **화면은 콘센트에만 꽂는다**(§4). 대시보드 확장은 `AdminDashboardSummary` **가산**(optional 필드)으로만 — 기존 호출부 무변경.
4. **모든 지표는 클릭하면 그 목록으로 간다.** `SummaryStrip`이 이미 그렇게 동작한다(`page.tsx:137-140`) — 이 패턴을 전면 적용.

### 6-2. 새 대시보드 레이아웃

```
┌─────────────────────────────────────────────────────────────────────┐
│ 대시보드                        [기간: 오늘|7일|30일] [브랜드: 전체 ▾]  │ ← ① 전역 필터(신규)
├─────────────────────────────────────────────────────────────────────┤
│ ② 오늘의 처리 대기 — 클릭 = 해당 목록으로 이동                          │
│  ┌─────────┬──────────┬─────────┬─────────┬──────────┐             │
│  │ 신규주문 │ 미답변문의 │ 승인대기 │ 보험상담 │ 품절임박  │             │
│  │   3     │    7     │    2    │    5    │    4     │             │
│  └─────────┴──────────┴─────────┴─────────┴──────────┘             │
├─────────────────────────────────────────────────────────────────────┤
│ ③ 브랜드관 현황 (신규 — 이 문서의 핵심)              [브랜드 관리 →]  │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 브랜드  상태   상품(노출/전체)  미완성  주문30일  미답변문의        │ │
│  │ ────────────────────────────────────────────────────────────  │ │
│  │ 🟢 b1  노출     12 / 14        2      ₩1.2M    1              │ │
│  │ 🟢 b2  노출      8 /  8        0      ₩840K    3              │ │
│  │ ⚫ b4  숨김      0 /  2        2         -      0              │ │ ← B2 해결
│  │ 🟡 b6  노출      3 /  9        6      ₩120K    0              │ │ ← 미완성 경고
│  └───────────────────────────────────────────────────────────────┘ │
│   · 행 클릭 → /admin/brands/[id] (브랜드 상세, 신규)                  │
│   · '미완성' = 가격·이미지·상세 중 하나라도 빈 상품 수 → 클릭 시 필터 목록 │
├────────────────────────────────┬────────────────────────────────────┤
│ ④ 최근 주문 5건 (기존 유지)      │ ⑤ 조치 필요 상품 5건 (기존 유지)     │
├────────────────────────────────┼────────────────────────────────────┤
│ ⑥ 가입 승인 대기 (개편)          │ ⑦ 보험 분석 신청 5건 (기존 유지)     │
│   [승인] → 브랜드 배정 모달       │                                    │
└────────────────────────────────┴────────────────────────────────────┘
```

### 6-3. ③ 브랜드관 현황 — 새 테이블 없이 계산 가능

| 컬럼 | 소스 | 계산 |
|---|---|---|
| 브랜드/로고/이름 | `brands/repo.ts:104` `listAllBrandsForAdmin()` | 그대로 |
| **상태(노출/숨김)** | 같은 함수(`is_visible`) | **B2 해결** |
| 상품(노출/전체) | `products/repo.ts:145` `listProductsByBrand()` | brand_id 그룹 카운트 |
| **미완성 상품 수** | 동일 | `price==null \|\| !image \|\| !detailBlocks?.length` — 지금 클라이언트가 세는 로직(`page.tsx:67-103`)을 **브랜드별로 쪼갠 것** |
| 주문 금액(기간) | `orders/repo.ts:173` `listAllOrders()` | `order.items[].productId → product.brandId` 조인 |
| **미답변 문의** | `inquiries/repo.ts:78` `listInquiriesByBrandIds()` | **파트너용으로 이미 만들어둔 브랜드별 함수를 그대로 재사용** |

### 6-4. 브랜드 폼 개방 (B1·B3·B4·B5·B6)

**API·validate·repo가 이미 전부 받는다 — 폼만 열면 된다.**

| 추가 | 컨트롤 |
|---|---|
| `isVisible` | 토글 스위치 + **목록 인라인 토글** |
| `displayOrder` | 목록 드래그 정렬 + `repo.ts:88` 정렬을 `display_order asc, created_at desc`로 (**계약 변경 아님, 정렬만**) |
| `auditPoints` | 문자열 배열 에디터 |
| `auditReport` | 접이식 섹션(reportNo/auditedAt/status/headline/summaryTitle/summary/selectionReason/process[]) |
| `representativeProductIds` | 상품 멀티셀렉트(**해당 브랜드 상품으로 한정**) |
| `relatedConcernSlugs` | 고민 멀티셀렉트 |
| `isNew`·`sourceUrls` | 토글 / URL 배열 |

→ 필드가 늘어 모달이 터지므로 **`/admin/brands/[id]` 전용 상세 페이지 신설**(상품 `/admin/products/[id]`와 같은 패턴).

### 6-5. 상품 폼 개방 (§4 표 해소)

| 추가 | 컨트롤 | 비고 |
|---|---|---|
| **`images`** (갤러리) | 멀티 `ImageUploader` `usage:'gallery'` | 타입은 이미 있음(`ImageUploader.tsx:11`) |
| **`options`** | 옵션 행 에디터(옵션명·추가금·재고) | validate 로직 이미 존재 |
| `ingredients`·`howToUse`·`recommendedFor`·`caution` | textarea 4종 (접이식 "상품 정보" 섹션) | |
| `shippingFee`·`shippingNotice`·`deliveryEstimate`·`returnNotice`·`sellerName` | 배송/판매자 섹션 | **`sellerName`·`deliveryEstimate`·`returnNotice`는 `rowToProduct` 되읽기부터 고쳐야 함**(§4 이중 단절) |
| `isMembersOnlyPrice` | 체크박스 | |
| `concernTags` | 고민 멀티셀렉트 | 관련상품 매칭에 쓰임 |
| `rating`/`reviewCount` | **입력 UI 만들지 말 것** — 실제 리뷰에서 파생시켜야 함(별도 이슈) | |

### 6-6. 브랜드 ↔ 상품 링크 복구 (표현 = dad 레인)

- PDP 상단 브랜드명 → **`/brands/[id]` 링크 + 브랜드 로고 표시**
- `ProductCard` 브랜드명 → 링크화, **`brandName` 없으면 `brandId` 노출 금지**(빈 값 처리)
- `brandName` stale 문제 → PDP·카드에서 **`brand.name`을 조인해 쓰거나**, 브랜드명 변경 시 상품 detail 일괄 갱신

### 6-7. 파트너 온보딩 완결 (P1·P2·P3)

```
대시보드 "가입 승인 대기" [승인] 클릭
  └─ 모달: 역할 확인(partner) + 브랜드 멀티셀렉트
       └─ PATCH /api/admin/members/[id] { status:'active', managedBrandIds:['b2'] }
            └─ requireBrandScoped 통과 → 파트너가 자기 브랜드 상품 CRUD 가능
```
`/admin/members/[id]` `MemberRoleStatusPanel`에도 동일한 브랜드 멀티셀렉트 추가. `TODO(RBAC)` 3곳 해소.

### 6-8. 정리 항목

| # | 항목 | 근거 |
|---|---|---|
| D1 | **상태 배지 규칙 단일화** — 지금 카드마다 다르다: 주문 `status.includes('완료')`(한글 자유문자열) / 보험 `.includes('대기')\|\|.includes('접수')` / 회원 영문 enum 맵 | `page.tsx:261`, `:301-302`, `:143-149` |
| D2 | **미배선 컴포넌트 5종 배선** — `ConfirmDialog`(native `confirm()`/`alert()` 전량 교체) · `BulkActionBar`(일괄 상태변경) · `FilterDrawer`(모바일 필터) · `EmptyState` · `PageActions`. **dad가 이미 만들어 놨고 import 0건** | `admin-new/common/*` |
| D3 | **메뉴 SSOT** — 17개 메뉴가 `AdminSidebar.tsx:37-61`·`AdminMobileNav.tsx:19-41` **2곳에 중복 하드코딩**. 2026-07-14 메뉴 4종 유실 사고의 구조적 원인 → `adminNav.ts` 상수로 통합 | 동일 |
| D4 | `/admin/products/display` **사이드바 도달 불가** → 상품 하위 메뉴로 노출 | `AdminSidebar.tsx:37-61` |
| D5 | `page.tsx:362` **중복 import + 미사용 심볼**(`LucideBadgeCheck`, 파일 맨 끝) | `page.tsx:6` vs `:362` |
| D6 | 에러 문구가 사용자에게 리터럴 `'network-error'`/`'invalid-input'`로 노출 | `storage.ts:949-965`, `ProductForm.tsx:85` |
| D7 | **3세대 UI 통일** — 레거시 `AdminResourcePage`(6페이지)·`AdminUi`(3페이지)를 `admin-new`로 이관 | §1-2 |

---

## 7. 실행 단계

담당 레인은 `AGENTS.md` §0-2 Decision Flow 기준.

| Phase | 내용 | 브랜치 | 레인 |
|---|---|---|---|
| **P0. 🔴 결함 수정 (최우선)** | §2-1 `validate.ts`에 `detailBlocks` 분기 추가 · §2-2 폼 필수검증 서버 계약과 일치 + 에러 문구 한글화 · `sellerName`·`deliveryEstimate`·`returnNotice` `rowToProduct` 되읽기 복구 | `fix/product-detail-save` | mim |
| **P1. 계약 가산** | `AdminDashboardSummary`에 `brandStats?: AdminDashboardBrandStat[]` **가산** + `/api/admin/dashboard` 서버 집계(브랜드별 상품/미완성/주문/미답변) + 콘센트 시그니처 유지 | `contract/admin-dashboard-brand-stats` | mim (확정) |
| **P2. 브랜드 폼 개방** | `BrandForm` 7필드 추가 · `/admin/brands/[id]` 상세 페이지 · 목록 노출상태 컬럼+인라인 토글 · displayOrder 정렬 | `fe/design-brand-form` + `be/brand-order` | dad(표현) + mim(배선) |
| **P3. 상품 폼 개방** | `images`·`options`·상품정보 4종·배송 5종·`concernTags` (§6-5) · 상세 에디터 DnD·미리보기 렌더 정합 | `fe/design-product-form` | dad(표현) + mim(배선) |
| **P4. 파트너 온보딩** | 승인 모달 브랜드 멀티셀렉트 · `MemberRoleStatusPanel` 확장 · `TODO(RBAC)` 3곳 | `be/partner-onboarding` | mim |
| **P5. 브랜드↔상품 링크 + 정리** | PDP·카드 브랜드 링크·로고 · 상태배지 단일화 · 미배선 5종 · 메뉴 SSOT · 3세대 UI 통일 | `fe/design-admin-cleanup` | dad |
| **P6. 모바일 반응형** | M1~M4 (§10-2). **PC 무손상 = 데스크톱 베이스라인 불변으로 증명** | `fe/design-mobile-*` | dad |

**각 Phase는 §8-6 3중 게이트**(opus 리뷰 + codex 리뷰 + Playwright 프리뷰 골든#7) 통과 후 머지.
**P2·P3·P5는 표현 변경이므로 `visual` 베이스라인 갱신을 같은 PR에 포함**(§8-1 4항).

---

## 8. 선행 조건

이 개선안 이전에, **PR #48로 교체된 admin 19페이지가 프리뷰 실화면에서 구동된 적이 없다.** CI(verify·visual)만 통과했다.
관리자 콘솔은 클라이언트 주 사용 surface(§7 골든플로우 #7)이므로, 손대기 전에 **현재 것이 실제로 눌리는지** 먼저 확인해야 한다:

- 사이드바 17개 메뉴 전부 도달
- 주문 `승인중` 배지 · 자동 상태 select
- 상품 재고 입력 · 삭제 안내
- **이미지 업로드(`catalog-assets` 버킷 실업로드)** — 아직 실화면 검증 안 됨
- **§2-1·§2-2 재현** — 상세 에디터 저장 400 / 신규 상품 등록 400

---

## 9. UX 방향 — 관리자 콘솔은 쇼룸이 아니라 작업대다

> `frontend-design-direction` 스킬 적용. 이 섹션은 §6의 "무엇을 넣나"에 대한 **"어떻게 보이고 어떻게 만져지나"** 를 정한다.

### 9-1. 톤 결정 — 공개 화면의 미학을 관리자에 이식하지 않는다

공개 화면은 Quiet Luxury다: 넓은 여백, fade-up 등장, 에디토리얼 카피(§6). **관리자는 그 반대여야 한다.**
클라이언트는 이 화면을 매일 열어 "오늘 처리할 게 뭐지"를 30초 안에 파악하려 한다. 감상하려는 게 아니다.
운영 도구는 **조밀하고, 조용하고, 스캔 가능**해야 한다 — 랜딩페이지 구성을 매일 쓰는 도구에 강요하지 않는다.

**팔레트·폰트는 브랜드를 따르되(어스톤 `#1A1D1B`/`#F4F2EC`, Pretendard), 톤만 바꾼다: 조용한 럭셔리 → 조용한 효율.**

| 축 | 결정 | 근거 |
|---|---|---|
| **밀도** | 공개 화면의 1/2 여백. 테이블 행 48px, 카드 padding 16px | 상품 22개·브랜드 9개가 한 화면에 들어와야 스캔이 성립 |
| **색** | 어스톤은 배경/텍스트에만. **색은 상태(status)에만 쓴다** | 지금 배지 색 규칙이 카드마다 다름(`page.tsx:261` vs `:301-302` vs `:143-149`) → 색이 정보를 못 준다 |
| **타이포** | 숫자 `tabular-nums`, 라벨 13px, 값 14px. **`font-editorial`(Playfair) 금지** | 장식 폰트는 스캔 방해 + §6상 한글 렌더 깨짐 |
| **모션** | 상태 전이(저장·삭제·승인)에만. **fade-up/wipe 등장 애니메이션 제거** | 매일 여는 화면에서 등장 애니메이션은 매일 겪는 지연 |

### 9-2. 관통하는 디자인 아이디어 — **"미완성 게이지"**

이 프로젝트의 진짜 통증: **DB가 화면의 진실 소스인데, 값이 비면 화면이 조용히 빈다.**
가격 `null` → `0원` / 상세 블록 없음 → 폴백 박스 / 브랜드 로고 없음 → placeholder.
클라이언트는 **뭐가 비었는지 모른 채 "왜 화면이 이래?"** 를 겪는다.

→ 관리자 전 화면에서 **모든 개체(브랜드·상품)가 완성도를 항상 달고 다닌다.**

```
🟢 완성          가격·이미지·상세·옵션 다 채워짐
🟡 미완성 3/6    ← 클릭 시 비어 있는 필드로 바로 점프
⚫ 숨김           isVisible = false
```

동일 배지가 **브랜드 목록 · 상품 목록 · 대시보드 · 상세 페이지**에서 같은 의미로 나온다.
이것이 "내 브랜드관이 지금 손님에게 어떻게 보이나"를 관리자가 아는 **유일한 수단**이다.

### 9-3. 화면별 방향

**대시보드 = "오늘 할 일" 큐.**
지금은 최근 5건 목록 4개 — "무슨 일이 있었나"(과거)이지 "뭘 해야 하나"(행동)가 아니다.
최상단을 **처리 대기 5칸**(신규주문·미답변문의·승인대기·보험상담·품절임박)으로 바꾸고 각 칸이 해당 목록으로 직행(§6-2 ②).
그 아래 **브랜드관 현황 표**(§6-3) — 이 커머스의 실제 구조(브랜드 → 상품 → 상세)를 화면에 처음으로 드러낸다.

**브랜드 상세 = 브랜드가 페이지의 주인.**
`/admin/brands/[id]` 신설 시 **좌측에 공개 화면 라이브 프리뷰**를 붙인다 — 검증 리포트를 채우면 우측에서 실제 브랜드관이 즉시 반영.
새 발명이 아니라 **기존 컨벤션의 확장**이다: `/admin/settings`가 이미 `HomeClient` 라이브 프리뷰를 쓰고 있다(`admin/settings/page.tsx:8,10`).

**상품 폼 = 3단 아코디언.**
지금 14필드가 평면인데 §6-5를 반영하면 30필드가 넘는다. 한 화면에 다 펼치면 클라이언트가 도망간다.

| 섹션 | 필드 | 기본 |
|---|---|---|
| ① 판매 정보 | 이름·브랜드·카테고리·가격·할인가·재고·노출/추천/베스트 | **항상 열림** |
| ② 콘텐츠 | 대표이미지·갤러리·옵션·상세 블록·성분·사용법·추천대상·주의사항 | 접힘 (헤더에 `3/8 완성`) |
| ③ 배송·판매자 | 배송비·배송안내·배송예정·반품안내·판매자명 | 접힘 |

각 섹션 헤더가 §9-2의 미완성 게이지를 단다.

**파트너 온보딩 = 승인과 배정이 한 동작.**
대시보드 "가입 승인 대기"에서 **[승인] → 브랜드 멀티셀렉트 모달**이 뜨고, **브랜드를 고르지 않으면 승인이 완료되지 않는다.**
배정 없는 파트너는 아무것도 못 하는 유령 계정이므로 애초에 만들 수 없게 막는다(§5 P1·P2).

### 9-4. 인터랙션 규칙

현재 실태: 브랜드 삭제 = native `confirm()`(`admin/brands/page.tsx:59`) · 에러 = native `alert()`(`:37,66`) · 저장 실패 시 `invalid-input` 원문 노출(`ProductForm.tsx:85`).
**그런데 dad가 `ConfirmDialog`를 이미 만들어놨고 import가 0건이다**(같이 노는 것: `BulkActionBar`·`FilterDrawer`·`EmptyState`·`PageActions`).

| # | 규칙 |
|---|---|
| I1 | **파괴적 동작은 `ConfirmDialog`로만.** native `confirm()`/`alert()` 전면 금지 |
| I2 | **에러는 사람 말로.** `invalid-input` → "라이프스타일 분류와 대표 이미지를 채워주세요" / `network-error` → "저장하지 못했습니다. 다시 시도해 주세요" |
| I3 | **저장은 낙관적 업데이트 + 실패 시 롤백 토스트.** 현재는 저장 후 전체 리로드 |
| I4 | **목록 편집은 인라인.** 노출 토글·재고 수정은 모달 없이 그 행에서 |

### 9-5. 하지 말 것 (안티패턴)

- 공개 화면의 **fade-up/wipe 등장 애니메이션을 관리자에 이식**하지 않는다.
- **카드 안에 카드**를 넣지 않는다.
- 관리자에 **히어로 섹션·브랜드 카피**를 넣지 않는다.
- **`rating`/`reviewCount` 입력란을 만들지 않는다** — 실제 리뷰에서 파생돼야 할 값이다(현재 타입엔 있으나 동기화 코드가 없어 죽어 있음, §4 표).
- 단일 색 계열로 화면을 덮지 않는다 — 상태 색이 묻힌다.

---

## 10. 모바일 반응형 — "PC는 그대로, 모바일만"이 가능한가

### 10-1. 사실: 모바일 대응은 "전무"가 아니라 "대부분 되어 있다"

| 항목 | 실태 | 근거 |
|---|---|---|
| 관리자 네비 | 데스크톱 사이드바 ↔ **모바일 오프캔버스 드로어** 이미 분기 | `AdminSidebar.tsx:124` `hidden md:flex` / `AdminMobileNav.tsx:124` `md:hidden` / 햄버거 `AdminHeader.tsx:66` |
| 관리자 목록 | 주문·회원·보험·문의 4종이 **데스크톱 테이블 ↔ 모바일 카드** 전환 | `OrderListPage.tsx:166` `hidden md:block` / `:171` `md:hidden` (Member·Insurance·Qna 동일) |
| 공개 화면 | 헤더 햄버거 + 오프캔버스 + `MobileAccordion` | `Header.tsx:90,218,225-229,374` |
| 반응형 클래스 | 공개 컴포넌트 **533개**, `src/app/**` **350개**, admin-new **67개** | 실측 |
| CSS | `globals.css` 미디어쿼리 **29개** (mobile-first). 컨테이너 쿼리 0건 | `globals.css` |
| **CI 게이트** | **390×844 모바일 스냅샷 7장이 이미 찍히고 베이스라인 커밋됨** | `visual.spec.ts:13-16` · `visual.spec.ts-snapshots/*-mobile-chromium-linux.png` |

### 10-2. 실제 구멍 4곳 (좁다)

| # | 구멍 | 근거 |
|---|---|---|
| M1 | **admin 상품목록에만 모바일 카드가 없다** → 가로 스크롤 테이블. 다른 4개 목록엔 다 있음 | `app/admin/products/page.tsx` (`ProductMobileCard` 부재) |
| M2 | **`BrandForm.tsx:99` `grid grid-cols-3` 반응형 프리픽스 0** → 모바일에서 3열 찌그러짐 | 동일 |
| M3 | **`FilterDrawer`(모바일 필터 시트) 미연결** — dad가 만들었으나 import 0건 | `admin-new/common/FilterDrawer.tsx` |
| M4 | 모달 일부 반응형 프리픽스 0 | `InquiryFormModal.tsx` · `ReviewFormModal.tsx` · `mypage/PasswordChangeSection.tsx` |

> 넓은 테이블은 **전부 `overflow-x-auto`로 감싸져 있다**(`DataTable.tsx:45` 등, `src/app/admin` 내 미감싼 `<table>` 0건) — 최악은 아니다.

### 10-3. 구조적 답: 파일 분리는 불가능, PC 무손상은 가능

**"모바일 전용 파일 트리를 따로 만들어 나중에 이식"은 이 구조에선 성립하지 않는다.**
전환이 전부 Tailwind 프리픽스 기반 CSS라, 모바일을 고치려면 **반드시 같은 컴포넌트의 같은 `className` 문자열**을 편집하게 된다.

**그러나 "PC 무손상 + 모바일만 변경"은 확실히 가능하다.** Tailwind는 mobile-first이므로:

```
grid-cols-3          →   grid-cols-1 md:grid-cols-3
(모바일에서 3열 찌그러짐)    (모바일 1열 / ≥768px 렌더링은 바이트 단위 동일)
```

base 클래스를 모바일 값으로 바꾸고 **`md:`에 기존 PC 값을 고정**하면 데스크톱은 변하지 않는다.
그리고 **그 "PC 불변"을 사람이 눈으로 확인할 필요가 없다** — `visual.spec.ts`의 **데스크톱 베이스라인 7장이 CI에서 자동 검증**한다.
**모바일만 빨간불 + 데스크톱 초록불 = "PC는 안 건드렸다"는 기계 증명.**

### 10-4. 작업 단위

- 레인 = **dad 표현 레인**, 브랜치 = `fe/design-mobile-*` (모바일 전용 PR로 분리하면 경계가 CI 스냅샷으로 증명됨)
- 순서: **M1(상품목록 MobileCard) → M2(BrandForm 그리드) → M3(FilterDrawer 배선) → M4(모달)**
- PR에 **모바일 베이스라인 갱신 포함**(§8-1 4항). 데스크톱 베이스라인이 함께 바뀌면 그건 **PC를 건드렸다는 신호** — 리뷰에서 반려한다.

---

## 11. ⭐ 관리자 ↔ 공개 페이지 동기화 — 전수 매트릭스

> **요구사항**: "관리자 페이지가 이미 만든 모든 공개 페이지와 데이터 바인딩·CRUD가 동기화되어야 한다."
> 전 공개 라우트 × 데이터 출처 × 관리자 CRUD를 전수 조사한 결과 **동기화 안 된 항목 10건**이 나왔다.

### 11-1. 매트릭스 (동기화 = 관리자에서 고치면 공개 화면이 실제로 바뀌는가)

| 데이터 | 공개 렌더 소스 | 관리자 화면 | 관리자가 읽는 소스 | 쓰기 API | DB 테이블 | 동기화 |
|---|---|---|---|---|---|---|
| products | DB | `/admin/products` 외 3 | DB | ✅ | `products` | ✅ |
| brands | DB | `/admin/brands` | DB | ✅ | `brands` | ✅ |
| orders | DB | `/admin/orders` | DB | ✅ | `orders` | ✅ |
| members | DB | `/admin/members` | DB | ✅ | `members` | ✅ |
| inquiries | DB | `/admin/inquiries` | DB | ✅ | `product_inquiries` | ✅ |
| categorySettings | DB | `/admin/categories` | DB | ✅ | `category_settings` | ✅ |
| survey | DB | `/admin/survey` | DB | ✅ | `survey_config` | ✅ |
| insurance 신청 | DB | `/admin/insurance` | DB | ✅ | `insurance_applications` | ✅ |
| **product_reviews**(사용자 후기) | 상품상세만 | ❌ **없음** | — | 라우트만 존재·**화면 미연결** | `product_reviews` | 🔴 **부분 N** |
| **reviews**(에디토리얼 시드) | `/reviews`·홈·브랜드·고민 | `/admin/reviews` | 🔴 **정적 `@/data/reviews`** | ❌ | ❌ | 🔴 **N** |
| **concerns** | `/concerns`·`/shop`·`/signup`·브랜드 | `/admin/concerns` | 🔴 **정적 `@/data/concerns`** | ❌ | ❌ | 🔴 **N** |
| **notices** | `/notices`·홈 | `/admin/notices` | 🔴 **정적 `@/data/notices`** | ❌ | ❌ | 🔴 **N** |
| **homeContent** | 🔴 **어떤 공개 페이지도 안 읽음** | `/admin/settings` | DB | ✅ | `site_settings` | 🔴 **N (죽은 CMS)** |
| **qna_config** | 🔴 공개는 정적 시드만 | `/admin/qna` | DB | ✅ | `qna_config` | 🔴 **N** |
| **kits_config** | 🔴 `/landing/care-kit` 하드코딩 | `/admin/kits` | DB | ✅ | `kits_config` | 🔴 **N** |
| **partners_config** | 🔴 공개 소비처 0건 | `/admin/partners` | DB | ✅ | `partners_config` | 🔴 **N** |
| **experts** | `/experts` 하드코딩 | ❌ **없음** | — | ❌ | ❌ | 🔴 **N** |
| **insurance 상품·보험사** | 페이지 내 상수 | ❌ **없음** | — | ❌ | ❌ | 🔴 **N** |
| **shopFilters** | `/shop`·Header 하드코딩 | ❌ 없음 | — | ❌ | ❌ | 🔴 **N (카테고리 축 이중화)** |
| cart / wishlist | localStorage | — | — | — | ❌ | 로컬 전용 |

### 11-2. 세 가지 고장 유형

**🔴 유형 A — 관리자가 정적 mock을 렌더한다. 편집해도 아무 일도 안 일어난다.**

`/admin/concerns` · `/admin/notices` · `/admin/reviews` 세 화면이 `@/data/*`를 rows로 그린다.
`AdminResourcePage`에 `onSave`/`onDeleteRow`가 **미전달**이라 삭제조차 컴포넌트 내부 `deletedIds` Set(비영속)에만 반영된다 — **새로고침하면 되살아난다.** DB 테이블도 쓰기 API도 없다.

- `admin/concerns/page.tsx:2` · `admin/notices/page.tsx:2` · `admin/reviews/page.tsx:2`
- `AdminResourcePage.tsx:26-32,57` (비영속 삭제)

> **특히 reviews가 이중으로 깨져 있다.** 관리자 후기 관리에 **사용자가 실제로 쓴 리뷰(`product_reviews`)가 한 건도 안 뜬다** — 정적 시드만 뜬다. 공개 `/reviews` 목록도 DB를 안 읽어서 **사용자 후기는 상품상세에서만 보인다.** 숨김 API(`PATCH /api/admin/reviews/[id]`)는 만들어져 있는데 **호출하는 UI가 없다.**

**🔴 유형 B — 관리자→DB 저장은 되는데, 공개 화면이 그 소스를 안 본다.**

테이블도 있고 쓰기 API도 있다. **배선만 없다.** 가장 싸게 고칠 수 있는 그룹이다.

| 데이터 | 증상 |
|---|---|
| **homeContent** | **가장 심각.** `/admin/settings`가 `site_settings`에 저장하고 `SiteSettingsProvider`가 하이드레이트까지 하는데, **공개 홈 `HomeClient.tsx`가 `useSiteSettings`를 호출하지 않는다**(소비처 grep 결과 `admin/settings/page.tsx:27` 단 1곳). 히어로·섹션 문구가 전부 JSX 하드코딩 → **클라이언트가 홈 문구를 고치고 저장해도 화면이 안 바뀐다.** |
| **kits_config** | `/landing/care-kit`이 `kits`를 전혀 안 읽는다. 공개 GET 라우트(`/api/kits`)조차 없다. |
| **partners_config** | 공개 소비처 0건. |
| **qna_config** | 공개 상품상세 Q&A는 정적 시드 + DB 문의를 merge하고, `qna_config`는 공개 어디서도 안 읽힌다. |

**🔴 유형 C — 관리자 화면 자체가 없다.**

`experts`(전문가 — 페이지 안에 하드코딩, `src/data/experts.ts`조차 없음) · `insurance 상품·보험사`(신청서만 DB, 카탈로그는 미모델링) · `shopFilters`(카테고리 축이 `category_settings`와 **병존** → drift 위험).

### 11-3. ⭐ 근본 원인 — AGENTS.md §4-6의 예외 조항이 낡았다

현재 lint 규칙(`no-restricted-imports`)은 **`@/data/products`·`@/data/brands`만** 컴포넌트 직접 import를 막고, `concerns`·`notices`·`reviews`·`homeContent`·`shopFilters`는 **명시적 예외**다. 근거는 AGENTS.md §4-6의 이 문장이다:

> "**API 라우트가 없는 정적 콘텐츠**는 관리자가 실시간 변경하지 않아 drift 위험이 없으므로 규칙에서 제외한다."

**이 전제가 지금은 거짓이다.** `/admin/concerns`·`/admin/notices`·`/admin/reviews` 화면이 실제로 존재하고, 클라이언트는 그 화면에서 "편집했다"고 믿는다.
**드리프트 위험이 없는 게 아니라, 드리프트가 이미 최대치다** — 관리자와 공개가 같은 정적 파일을 보되 관리자의 편집은 아무 데도 저장되지 않는다.

→ **DB화가 끝나는 즉시 예외를 제거하고 `@/data/*` 컴포넌트 직접 import를 전면 금지**한다. §4-6의 원칙("약속이 아니라 기계가 막는다") 그대로.

### 11-4. 실행 — 싼 것부터

| 그룹 | 대상 | 작업 | 비용 |
|---|---|---|---|
| **G1. 배선만** (유형 B) | homeContent · kits · partners · qna | 공개 페이지가 **이미 있는 DB config**를 읽게 배선. 테이블·API 신규 없음. homeContent는 `HomeClient`가 `useSiteSettings()`를 소비하도록 + 하드코딩 문구를 settings 값으로 교체 | **낮음 — 효과 최대** |
| **G2. DB화** (유형 A) | concerns · notices · reviews(에디토리얼) | 테이블 3개 신설 + repo + `/api/admin/*` CRUD + 관리자 화면을 `AdminResourcePage`(mock) → `admin-new` DB 화면으로 재작성 | 중 |
| **G2-b. 리뷰 통합** | product_reviews | `/admin/reviews`가 **DB 사용자 리뷰**를 렌더 + 기존 숨김 API 연결. 공개 `/reviews`도 DB를 읽게 | 중 |
| **G3. 신규 모델링** (유형 C) | experts · insurance 카탈로그 | 테이블 + 관리자 화면 신설 | 중~높음 |
| **G4. 카테고리 축 단일화** | shopFilters | `@/data/shopFilters` 제거 → `category_settings` 단일 소스 | 중 |
| **G5. 게이트 + 청소** | eslint · dead code | §11-3 예외 제거(전면 금지) + dead mock 4종 삭제(`products`·`brands`·`orders`·`insuranceApplications` — `src/` 어디서도 import 0건) | 낮음 |

**순서**: G1(배선) → G5 dead code 청소 → G2 → G2-b → G4 → G3.
**G1을 먼저 하는 이유**: 테이블도 API도 이미 있어서 **배선 한 줄이 곧 기능**이다. 특히 홈 CMS는 클라이언트가 매일 쓰는 화면인데 지금 **저장 버튼이 거짓말을 하고 있다.**

---

## 12. UI UX Pro Max 스킬 피드백 반영

> 스킬 설치: `npx ui-ux-pro-max-cli init --ai claude` → `.claude/skills/ui-ux-pro-max/`
> 조회: `python -X utf8 .claude/skills/ui-ux-pro-max/scripts/search.py "<쿼리>" --design-system|--domain ux`

### 12-1. ❌ 채택하지 않은 것 — 팔레트·타이포

스킬이 "ecommerce admin dashboard back office CRUD"에 대해 생성한 설계 시스템은 다음을 추천했다:

| 항목 | 스킬 추천 | 판정 |
|---|---|---|
| Style | **Dark Mode (OLED)** — Light 미지원, Dark 전용 | ❌ **기각** |
| Colors | `#020617` 배경 / `#16A34A` 액센트 / `#DC2626` destructive | ❌ **기각** |
| Typography | **Fira Code** / Fira Sans (Google Fonts CDN) | ❌ **기각** |

**기각 사유**: AGENTS.md §6 도메인 규칙 위반이다. 이 프로젝트는 **어스톤/모노톤 팔레트**(`#1A1D1B`·`#F4F2EC`)와 **Pretendard**(한글)로 이미 확정된 디자인 시스템이 있고, "쨍한 원색 금지"가 명시돼 있다. `#16A34A`/`#DC2626`은 정확히 그 금지 대상이며, Fira Code는 한글 렌더가 깨진다.

> 이는 스킬 자체의 원칙과도 일치하는 판단이다 — **기존 디자인 시스템이 있으면 그것이 우선**한다. 스킬의 산업 규칙은 "디자인 시스템이 없을 때" 출발점을 주는 도구다.

### 12-2. ✅ 채택한 것 — 패턴·상태전략·UX 규칙

**패턴: "Real-Time / Operations"** (스킬이 이 도메인에 매칭한 것)
- Color Strategy: *"Dark or neutral. **Status colors (green/amber/red). Data-dense but scannable.**"*
- → **§9-1의 결정과 정확히 일치**: 어스톤은 중립 배경, **색은 상태에만**, 데이터 조밀하되 스캔 가능.
- → 다만 상태 3색은 원색이 아니라 **어스톤 계열로 톤다운**해 쓴다(러스트/앰버/모스). 정보 기능은 유지, 브랜드는 안 깬다.

**UX 가이드라인 조회 결과가 우리가 이미 찾은 결함을 정확히 지목한다:**

| 스킬 가이드라인 | Severity | 우리 결함과의 대응 |
|---|---|---|
| **Bulk Actions** — "Editing one by one is tedious. Allow multi-select and bulk edit. Checkbox column + Action bar" | Low | **D2** — `BulkActionBar`가 만들어져 있는데 **import 0건**. 진열 관리가 상품별 순차 루프(코드 주석도 "bulk update API 권장")로 저장하는 것과 정확히 같은 지적 |
| **Inline Validation** — "Validate on blur. **Don't: Submit-only validation**" | Medium | 🔴 **§2-2 그 자체.** 상품 폼이 제출 시점에야 서버 400을 맞는다. blur 검증이면 "라이프스타일 분류가 비었습니다"를 입력 중에 알았다 |
| **Error Messages** — "Use `aria-live` or `role=alert`. **Don't: Visual-only**" | — | **I2** 보강 — 에러 한글화에 더해 `role="alert"` 필수 |
| **Empty States** — "Show helpful message and action. **Don't: Blank empty screens**" | Medium | **D2** — `EmptyState` 컴포넌트 미배선 |
| **Color Only** — "Don't convey information by color alone. **Use icons/text in addition**" | **High** | 🔴 **§9-2 "미완성 게이지" 설계 수정**: 🟢🟡⚫ 색 점만으로는 안 된다 → **아이콘 + 텍스트 라벨 병기**(`🟡 미완성 3/6`처럼 숫자를 반드시 함께). 색맹 사용자에게 "숨김"과 "노출"이 구분돼야 한다 |
| **Table Handling** — "horizontal scroll **or card layout**" | — | **M1** — admin 상품목록만 모바일 카드가 없다 |
| **Active State** — "Highlight active nav item" | — | 사이드바 `isActive`가 `startsWith`라 `/admin/products`가 `/admin/products/display`에서도 활성. 정확한 매칭 필요 |

### 12-3. ✅ 배포 전 체크리스트 (스킬 산출 → 프로젝트 게이트로 편입)

관리자 관련 PR의 **Definition of Done(§8-5)에 추가**한다:

- [ ] **이모지를 아이콘으로 쓰지 않는다** — SVG(`lucide-react`, 이미 스택에 있음)
- [ ] 클릭 가능한 모든 요소에 `cursor-pointer`
- [ ] hover 전환 150–300ms
- [ ] **텍스트 명도비 4.5:1 이상** (어스톤 팔레트에서 `#797C74` 계열 회색이 위험)
- [ ] **키보드 포커스 상태 가시화** (`:focus-visible`)
- [ ] `prefers-reduced-motion` 준수
- [ ] **반응형 375 / 768 / 1024 / 1440px** — §10의 CI 스냅샷(390·1280)에 **375px 추가 검토**

> ⚠️ **"미완성 게이지"에 이모지(🟢🟡⚫)를 쓰면 첫 항목 위반이다.** 이 문서의 도해는 설명용이고, 구현은 `lucide-react` 아이콘 + 텍스트 라벨로 한다.

### 12-4. 관리자를 "관리하기 쉽게" — 스킬 피드백을 §11 바인딩과 합친 결론

동기화(§11)가 끝나도 **화면이 안 쉬우면 클라이언트는 여전히 못 쓴다.** 둘을 한 축으로 묶으면:

| 문제 | 바인딩 관점(§11) | UX 관점(§12) |
|---|---|---|
| 홈 문구 수정 | 저장해도 공개가 안 읽음 → **G1 배선** | 저장 후 **"반영됐습니다" 토스트 + 공개 화면 미리보기 링크** — 지금은 성공/실패 피드백 자체가 없다 |
| 고민·공지·후기 | mock 렌더, 삭제가 비영속 → **G2 DB화** | DB화하면서 `AdminResourcePage` → `admin-new`로 교체 = **EmptyState·ConfirmDialog·BulkActionBar 동시 배선** |
| 상품 등록 | — | **blur 검증** + 필수 필드를 서버 계약과 일치 → 400 소멸 |
| 목록 일괄 처리 | — | **체크박스 컬럼 + BulkActionBar** (노출/숨김·삭제·카테고리 이동) |
| 상태 파악 | 미완성 게이지 | **색 + 아이콘 + 숫자** 3중 표기 (색만 금지 — High) |

**한 줄 결론**: §11의 G2(DB화)를 할 때 **관리자 화면을 `admin-new`로 재작성하는 김에** §12의 UX 규칙(EmptyState·ConfirmDialog·BulkActionBar·blur 검증·aria-live)을 **같은 PR에서 함께** 넣는다. 따로 하면 같은 파일을 두 번 만진다.

---

## 0-1. 진행 현황 (2026-07-15 갱신)

| Step | 상태 | PR |
|---|---|---|
| **S1 상품 저장 결함** | ✅ **머지** | [#50](https://github.com/mim1012/baekjo-obj/pull/50) |
| **S3 청소 (메뉴 SSOT)** | ✅ **머지** | [#51](https://github.com/mim1012/baekjo-obj/pull/51) |
| **S2 홈 CMS 배선** | 🔴 **보류 — 제품 결정 필요**(아래 §13-6) | — |
| S4~S8 | 대기 | — |

### ⚠️ 이 문서의 정정 사항 (실작업에서 드러난 오류)

1. **"dead mock 4종 삭제"는 틀렸다.** `src/data/products.ts`·`brands.ts`는 import가 0건이지만 **재시드의 정본**이다 — AGENTS.md 데이터 오너십 표 + 마이그레이션 `0004b`·`0014`~`0018`이 "정본 `src/data/*.ts` 기준"이라 주석에 명시 + `eslint.config.mjs`의 `no-restricted-imports` 대상 + `generate_placeholders.mjs`가 읽는다. **삭제 가능한 것은 `orders.ts`·`insuranceApplications.ts`·`users.ts` 3개뿐**(#51에서 처리).
2. **"S2는 배선 한 줄"도 틀렸다.** §13-6 참조.

### 🔴 S1에서 드러난 것 — CI가 초록인데 화면이 죽어 있었다

`/admin/products/[id]`·`/[id]/editor`가 **프로덕션에서 404**였다. 서버 컴포넌트가 클라이언트용 콘센트 `getAdminProducts()`(상대경로 fetch)를 호출 → 서버 런타임에 origin이 없어 throw → `catch { return [] }`가 **에러를 삼켜** `notFound()`. 즉 S1이 고친 상세 저장 로직은 **도달할 수 없는 죽은 코드**였다.
`verify`·`visual`·`payments` 전부 초록이었다 — **프리뷰에서 실제로 눌러보지 않았으면 "고쳤다"고 보고하고 끝났을 사안.** §8-6 게이트3(프리뷰 실구동)이 유일하게 잡았다.

---

## 13. ⭐ 개편 설계 — 지금 구조에서 무엇이 어떻게 바뀌는가

> §7(P0~P6)과 §11-4(G1~G5)가 **번호 체계가 둘**이라 실행이 안 보였다. 여기서 **하나의 로드맵**으로 합친다.
> 이 섹션이 §7·§11-4를 **대체**한다(앞 섹션들은 근거·분석으로 유지).

### 13-1. 세 개의 축이 한 화면에서 만난다

지금 관리자가 못 쓰이는 이유는 **하나가 아니라 셋이고, 셋이 같은 파일에서 만난다.**

| 축 | 증상 | 해당 섹션 |
|---|---|---|
| **① 저장이 안 된다** | 상세 에디터 400 · 상품 등록 400 · 고민/공지/후기 비영속 | §2 · §11 유형A |
| **② 저장해도 공개가 안 본다** | 홈 CMS · kits · partners · qna | §11 유형B |
| **③ 저장돼도 쓰기 어렵다** | mock UI 3세대 혼재 · 일괄처리 없음 · 에러가 개발자 문자열 | §1-2 · §12 |

**셋을 따로 고치면 같은 파일을 세 번 만진다.** 예컨대 `/admin/reviews`는 ①(비영속) + ②(DB 리뷰 미표시) + ③(레거시 UI)에 전부 걸린다.
→ **개편 단위를 "결함"이 아니라 "화면"으로 잡는다.** 한 화면을 열면 그 화면의 ①②③을 한 번에 끝낸다.

### 13-2. 구조 변화 — Before / After

**(a) 라우트**

| | 지금 | 개편 후 |
|---|---|---|
| 사이드바 메뉴 | 17개 (2파일 중복 하드코딩) | 17개 + 진열관리 노출 → **`adminNav.ts` 단일 상수** |
| 브랜드 | `/admin/brands` 모달 폼 6필드 | **`/admin/brands/[id]` 상세 페이지 신설** (전 필드 + 공개 라이브 프리뷰) |
| 진열 관리 | `/admin/products/display` — **사이드바 도달 불가** | 상품 하위 메뉴로 노출 |
| 신규 | — | `/admin/experts` · `/admin/insurance-products` (§11 유형C) |

**(b) 컴포넌트 세대 — 3세대 → 1세대**

```
지금                                          개편 후
─────────────────────────────────────────    ─────────────────────────────
admin-new/**        8페이지  ← dad 정본  ──▶  admin-new/**  전 페이지
admin/AdminResourcePage  6페이지 (mock)  ──▶  삭제
admin/AdminUi            3페이지        ──▶  삭제
admin-new/common/*  미배선 5종:               전부 배선:
  BulkActionBar · ConfirmDialog                체크박스+일괄처리 · confirm 대체
  EmptyState · FilterDrawer · PageActions      빈 상태 · 모바일 필터 · 헤더 액션
```

**(c) 데이터 흐름 — `@/data/*` 정적 mock의 최후**

| 파일 | 지금 | 개편 후 |
|---|---|---|
| `src/data/products.ts` · `brands.ts` · `orders.ts` · `insuranceApplications.ts` | **import 0건 (dead)** | **삭제** |
| `src/data/concerns.ts` · `notices.ts` · `reviews.ts` | 공개+관리자 양쪽이 직접 import | **DB 테이블로 이관 → 삭제** |
| `src/data/shopFilters.ts` | `/shop`·Header 하드코딩 (카테고리 축 이중화) | `category_settings` 단일화 → **삭제** |
| `src/data/homeContent.ts` | 타입·기본값 (공개가 안 읽음) | **기본값 전용으로 유지** (`site_settings`가 진실) |
| `src/data/qna.ts` · `survey.ts` | config 기본값 조립용 | 유지 |
| `src/data/users.ts` | 레거시 localStorage 병합 | **삭제 검토** (members DB가 정본) |

→ 끝나면 **eslint `no-restricted-imports`에서 예외 조항을 제거**하고 `@/data/*` 컴포넌트 직접 import를 **전면 금지**한다(§11-3).

**(d) 신규 마이그레이션**

현재 `0031`까지. 추가될 것:

| # | 테이블 | 용도 |
|---|---|---|
| `0032` | `concerns` | 고민 (공개 4곳 + 관리자) |
| `0033` | `notices` | 공지 (공개 2곳 + 홈) |
| `0034` | `editorial_reviews` | 에디토리얼 후기 시드 (사용자 후기 `product_reviews`와 **분리 유지** — 성격이 다름) |
| `0035` | `experts` | 전문가 |
| `0036` | `insurance_products` | 보험 상품·보험사 카탈로그 |

**(e) 계약(types) 가산** — 전부 **가산적**(optional 추가), 기존 시그니처 불변:

- `AdminDashboardSummary.brandStats?: AdminDashboardBrandStat[]` (§6-3)
- `Concern`·`Notice`·`EditorialReview`·`Expert`·`InsuranceProduct` 신규 인터페이스
- `Product`에 `completeness?: { filled: number; total: number }` — 서버 파생값(§9-2 미완성 게이지)

### 13-3. 통합 로드맵 — 화면 단위 8스텝

| Step | 화면/영역 | ① 저장 | ② 바인딩 | ③ UX | 브랜치 | 레인 |
|---|---|---|---|---|---|---|
| **S1** 🔴 | **상품 저장 결함** | `validate.ts`에 `detailBlocks` 분기 · 폼 필수검증 서버 계약 일치 · `rowToProduct` 되읽기 복구 | — | 에러 한글화 + `role="alert"` · **blur 검증** | `fix/product-save` | mim |
| **S2** | **홈 CMS + config 배선** | — | `HomeClient`가 `useSiteSettings()` 소비 · `/landing/care-kit`↔`kits` · `partners` · `qna` | 저장 토스트 + 공개 미리보기 링크 | `be/wire-site-config` | mim |
| **S3** | **청소** | — | dead mock 4종 삭제 | `page.tsx:362` 중복 import · **`adminNav.ts` SSOT** · 진열관리 메뉴 노출 | `chore/admin-cleanup` | mim |
| **S4** | **대시보드** | — | `brandStats` 계약 가산 + 서버 집계 | "오늘 할 일" 큐 · **브랜드관 현황 표** · 상태배지 단일화 | `contract/admin-dashboard` | mim |
| **S5** | **브랜드** | — | — | `/admin/brands/[id]` 신설 · 7필드 개방 · 노출 토글 · displayOrder · **라이브 프리뷰** | `fe/design-brand-form` + `be/brand-order` | dad+mim |
| **S6** | **상품 폼** | — | — | 갤러리·옵션·상품정보·배송 개방 · 3단 아코디언 · 상세 에디터 DnD·미리보기 정합 | `fe/design-product-form` | dad+mim |
| **S7** | **고민·공지·후기** | `0032`~`0034` + repo + CRUD API | 공개 4곳 소스 교체 · 공개 `/reviews`가 DB를 읽게 | **`AdminResourcePage` → `admin-new` 재작성** = EmptyState·ConfirmDialog·**BulkActionBar** 동시 배선 | `be/content-db` + `fe/design-admin-content` | mim+dad |
| **S8** | **파트너·전문가·보험** | `0035`·`0036` | shopFilters → categorySettings 단일화 | 승인=브랜드 배정 모달 · `TODO(RBAC)` 3곳 · 신규 관리자 2화면 | `be/partner-onboarding` · `be/experts-insurance` | mim |

**마지막**: eslint 예외 제거 + `AdminUi`/`AdminResourcePage` 삭제 + §12 체크리스트를 §8-5 DoD에 편입.

### 13-4. 순서를 이렇게 잡은 이유

**S1이 먼저인 이유** — 지금 클라이언트가 **상품을 등록조차 못 한다.** 다른 모든 개선은 상품이 등록된다는 전제 위에 있다.

**S2가 두 번째인 이유** — **테이블도 API도 이미 있다. 배선 한 줄이 곧 기능이다.** 투입 대비 효과가 가장 크고, 홈 CMS는 지금 **저장 버튼이 거짓말을 하고 있다.**

**S3(청소)를 앞으로 뺀 이유** — 뒤 스텝들이 전부 사이드바·컴포넌트를 만진다. 메뉴 SSOT를 먼저 세우지 않으면 **S5~S8이 각자 2파일씩 중복 수정**하고, 2026-07-14의 메뉴 4종 유실 사고가 재발한다.

**S7이 늦은 이유** — 가장 크다(테이블 3개 + API + 화면 재작성 + 공개 4곳 교체). 앞 스텝에서 `admin-new` 패턴과 `adminNav` SSOT가 확립돼 있어야 **한 번에** 끝난다.

### 13-5. 각 스텝의 공통 게이트

- **§8-6 3중 검증**(opus + codex + Playwright 프리뷰 골든#7) — 전 스텝 필수
- **S5·S6·S7은 표현 변경** → `visual` 베이스라인 갱신을 **같은 PR에** 포함(§8-1 4항)
- **S7은 콘텐츠 변경이기도 함**(DB가 화면의 진실 소스) → 베이스라인 갱신 필수
- **계약 변경(S4)은 단독 머지**(§0-2 ②)
- **§12 배포 전 체크리스트**를 각 PR의 DoD로

---

## 13-6. 🔴 S2(홈 CMS 배선) 보류 — 결정이 필요한 것

조사 결과 **S2는 "배선"이 아니라 "재설계"다.** 그대로 진행하면 홈 카피가 통째로 바뀐다.

### 왜 막혔나

**`HomeSettings` 스키마가 현재 `HomeClient`가 아니라 이전 세대 홈 디자인용이다.**

| settings에 있는데 화면에 자리가 없음 | 화면에 있는데 settings에 필드가 없음 |
|---|---|
| `intro.videoSrc`(영상 인트로) · `b2b`(배너) · `curation`의 프로세스 보드 9필드 · `insurance`의 3스텝 6필드 + disclaimer · `audit.descriptionTitle/signatureText/bannerText` · `trustBoard.eyebrow/title` · `bestProducts.eyebrow/description` | **히어로 섹션 전체**(eyebrow·h1·설명·버튼2·신뢰문구·이미지·배지) · **빠른 쇼핑 섹션 전체**(quickLinks 8개) · 모든 이미지 경로 · 큐레이션 카드의 icon/href/img · Audit 아이콘의 desc |

**세 가지 함정:**
1. **기본값 문자열에 JSX가 박혀 있다.** `audit.title`이 `'100개 중<br /><span className="font-editorial italic ...">5</span>개만 선택합니다.'`. 마크업을 안 바꾸고 텍스트만 주입하려면 `dangerouslySetInnerHTML`이 필요한데, 그건 **#50에서 CI로 금지한 싱크**(`tests/products/no-html-sink.spec.ts`)다. 게다가 `className`은 HTML에서 안 먹어 "5" 강조 스타일이 깨진다.
2. **솔루션 카드 3장이 map이 아니라 복붙된 JSX 3벌**이다(`object-[48%_center]`/`[58%]`/`[62%]`로 미묘하게 다름). `howToStart.steps`로 배선하려면 map으로 바꿔야 하고 = **마크업 구조 변경**(dad 정본 위반).
3. **`defaultHomeSettings`조차 현재 화면 문구와 다르다.** 예: `audit.badge` 기본값 `BAEKJO AUDIT` vs 화면 `백조 Audit` / `trustBoard.reviewsTitle` 기본값 `먼저 함께해 본 이들의 이야기` vs 화면 `반려가족 후기` / `howToStart.steps[1].linkHref` 기본값 `/concerns` vs 화면 `/diagnosis`. **DB를 안 건드리고 배선만 해도 홈이 바뀐다.**

### 부수 발견 — `/admin/settings`의 "실시간 편집 반영됨" 배지는 거짓이다

프리뷰 모달이 `SiteSettingsContext.Provider`로 draft를 주입하는데 **`HomeClient`가 `useSiteSettings`를 호출하지 않아** 아무 효과가 없다(소비처 grep = `admin/settings/page.tsx` 단 1곳).
→ **좋은 소식**: `HomeClient`가 그 훅을 부르는 **순간** 공개 홈(provider fetch)과 관리자 프리뷰(context override)가 **동시에** 살아난다. 배선 지점이 두 곳이 아니라 한 곳이다.

### 🔴 결정해야 할 것

> **"어느 쪽이 정본인가 — dad가 하드코딩한 현재 홈 카피 vs `HomeSettings` 스키마?"**

| 선택지 | 작업 | 결과 |
|---|---|---|
| **A. 화면이 정본** | `defaultHomeSettings`를 **현재 화면 문구로 맞추고**, 화면에 자리 없는 필드는 스키마에서 제거, 히어로/빠른쇼핑 필드를 **신설**. 그 후 배선 | 화면 무변경 + CMS가 실제로 동작. **권장** |
| **B. 스키마가 정본** | 홈을 스키마에 맞춰 재설계(영상 인트로·프로세스 보드·B2B 배너 부활) | 홈 카피·구조가 통째로 바뀜 = dad 디자인 결정 필요 |
| **C. 부분 배선** | 구조가 맞는 필드만 배선(`bestProducts`·`trustBoard` 등), 나머지는 하드코딩 유지 | CMS가 반쪽 — 클라이언트가 "왜 이건 안 바뀌지?"를 겪는다 |

**A를 권장한다.** 화면은 이미 dad·클라이언트가 합의한 결과물이고, 스키마는 죽은 설계다. 다만 `defaultHomeSettings` 수정 + 스키마 정리는 **계약 변경**이라 `contract/*` 브랜치 + 양쪽 인지가 필요하다.

### 나머지 config 3종 (S2의 다른 절반 — 이건 진행 가능)

| 데이터 | 상태 | 작업 |
|---|---|---|
| **qna_config** | 공개 GET(`/api/qna`)·콘센트(`getQnaConfig`)가 **이미 있는데 공개 화면이 안 쓴다** | `src/lib/adapters.ts:55`의 정적 `seedQna`를 `getQnaConfig()`로 교체 = **가장 싸고 실효 큼**. 단 상품상세 Q&A 내용이 바뀌어 스냅샷 영향 |
| **kits_config** | 공개 GET 라우트 **없음**. `/landing/care-kit`이 키트 4장을 하드코딩(타입도 `CareKit`과 불일치: `{icon,title,desc,target}` vs `{name,type,target,location,items,...}`) | 배선하면 랜딩이 4카드→2카드로 **눈에 띄게 바뀐다** = 콘텐츠 재설계 동반 |
| **partners_config** | **공개 배선 대상이 아니다** — `Partner` 타입이 내부 CRM 필드(contactPerson·cooperationType·status·isContracted)다. `/landing/care-kit`의 제휴 신청 폼은 **제출 핸들러가 없는 죽은 폼**(`type="button"`, onClick 없음) | 신규 제출 API + 신청 테이블 설계 필요 = S2 범위 밖 |

---

## 14. ⚠️ 시각 회귀 게이트를 신뢰할 수 없다 (2026-07-15 발견)

S3 작업 중 `visual` 게이트에서 **결함 3건**이 드러났다. 셋이 겹치면 **게이트가 있다는 사실 자체가 위험하다** — 있다고 믿고 사람이 안 보게 된다.

1. **임계값이 메뉴 유실을 못 잡는다.** 사이드바 항목을 17→18로 늘렸는데 `visual`이 **초록으로 통과**했다. `maxDiffPixelRatio: 0.01` 아래이기 때문(메뉴 한 줄 ≈ 전체 픽셀의 0.2%). **2026-07-14 메뉴 4종 유실 때 CI가 조용했던 이유가 이것으로 설명된다.**
2. **베이스라인 재생성이 실제 화면과 다른 것을 찍는다.** 브랜치 프리뷰 URL을 명시해 재생성해도 `admin-products` 베이스라인에 **옛 17개 사이드바**가 담긴다. 같은 URL을 브라우저로 실구동하면 **18개가 전부 보이고 전부 열린다**(스크린샷으로 확인). 원인 미규명.
3. **그래서 "변경 없음 — 커밋 생략"으로 조용히 넘어간다.** 의도된 표현 변경이 베이스라인에 반영되지 않은 채 머지되고, 다음 PR은 낡은 기준으로 비교된다.

**부분 해소(#51)**: `/shop` 스냅샷의 만성 flaky는 고쳤다. staging 재고를 `payments-routes` 잡의 합성 구매가 매 실행 깎아(p15 25→22…) 스냅샷이 계속 어긋났고, 상품 수가 바뀌면 `fullPage` 높이까지 변해 마스크가 무력화됐다. `admin-products`가 이미 쓰던 방식(**뷰포트 고정 + 동적 영역 마스크**)을 `/shop`에 적용해 데이터 의존을 끊었다.

**대안 — 픽셀이 아니라 구조를 검사한다.** #51에서 만든 **고아 라우트 가드**(`tests/admin/admin-nav.spec.ts`)가 `src/app/admin/**/page.tsx`를 스캔해 **메뉴에 없는 라우트를 CI에서 잡는다**. 픽셀 비교보다 훨씬 확실하게 같은 사고를 막는다. 이 방향을 확대할지 결정 필요.

---

## 부록 A. 파일 인덱스

| 대상 | 경로 |
|---|---|
| 대시보드 화면 | `src/app/admin/page.tsx` |
| 대시보드 API | `src/app/api/admin/dashboard/route.ts` |
| 대시보드 콘센트 | `src/lib/storage.ts:949-965` |
| 대시보드 타입 | `src/types/index.ts:459-481` |
| 브랜드 타입 | `src/types/index.ts:65-96` |
| 브랜드 repo | `src/lib/brands/repo.ts` |
| 브랜드 관리 화면 / 폼 | `src/app/admin/brands/page.tsx` · `src/components/admin-new/brands/BrandForm.tsx` |
| 상품 타입 | `src/types/index.ts:6-49` |
| 상품 검증 (🔴 detailBlocks 누락) | `src/lib/products/validate.ts:79-272` |
| 상품 repo | `src/lib/products/repo.ts` |
| 상품 폼 / 상세 에디터 / 진열 | `src/components/admin-new/products/{ProductForm,ProductDetailEditor,ProductDisplayManager}.tsx` |
| 공개 PDP | `src/app/shop/[id]/page.tsx` · `src/components/shop/{ProductDetailClient,ProductTabsClient}.tsx` |
| 상품 카드 | `src/components/common/ProductCard.tsx` |
| 파트너 인가 / API | `src/lib/admin/requireBrandScoped.ts` · `src/app/api/partner/products/route.ts` |
| 사이드바 / 모바일 네비 | `src/components/admin-new/layout/{AdminSidebar,AdminMobileNav}.tsx` |
| 미배선 컴포넌트 | `src/components/admin-new/common/{BulkActionBar,ConfirmDialog,EmptyState,FilterDrawer,PageActions}.tsx` |
