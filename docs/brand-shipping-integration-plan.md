# 브랜드별 배송사 연동 계획

> 작성 2026-07-16 · 대상: `/mypage` 주문내역 상품별 배송조회 모달 + `/admin` 상품별 운송장 수기 할당
> 근거 자료: 사용자 제공 브랜드 7종 배송정책 텍스트 + `챠콜스토리 배송정책.pdf`
> 선행 작업: PR #81 `b4001e2 feat(orders): 택배사 선택 + 고객 배송조회 링크`

---

## 1. 목표 (한 줄)

주문 1건에 여러 브랜드 상품이 섞여도 **브랜드마다 다른 택배사로 따로 발송**되는 현실을 화면에 그대로 반영한다.
관리자는 상품(브랜드 묶음)별로 운송장을 수기 입력하고, 고객은 마이페이지 주문내역에서 **상품별 배송조회 버튼 → 모달**로 그 상품의 배송 단계·택배사 조회·브랜드 배송정책을 본다.

---

## 2. 현재 상태 (파일 확인 결과)

| 항목 | 현재 | 목표와의 간극 |
|---|---|---|
| 운송장·택배사 저장 단위 | **주문 1건당 1개** (`Order.carrier`, `Order.trackingNumber` — `src/types/index.ts:192-215`) | **상품(브랜드) 단위**여야 함 → 계약 변경 |
| `OrderItem` 필드 | `productId, productName, optionName?, quantity, price` (`src/types/index.ts:217-223`) — 브랜드·배송 필드 **없음** | `brandId` 스냅샷 + 배송 묶음 연결 필요 |
| 배송 단계 | `deliveryStatus`(자유 text). 서버 하드코딩 `['배송전','배송준비','배송중','배송완료']` (`src/app/api/admin/orders/[id]/route.ts:23`)가 `OrderStatusPanel.tsx:95-98` 옵션과 **중복 정의(드리프트)** | 요구 6단계(상품준비→상품발송→배송준비→배송중→배송완료→구매확정)와 불일치. 단일 소스로 통합 필요 |
| 고객 배송조회 | 모달 아님. 주문 카드 헤더에 **딥링크 1개** (`src/app/mypage/components/OrdersSection.tsx:74-104`) | 상품별 버튼 + 모달로 교체 |
| 택배사 화이트리스트 | `cj, hanjin, lotte, post, logen` (`src/lib/carriers.ts:8`) — 딥링크 URL 5종 2026-07-16 실측 검증 완료 | **파스토·로지플렉스·GS Postbox 미등록** (§4) |
| 브랜드 배송정책 | `Brand` 타입에 배송 필드 **0개** (`src/types/index.ts:65-85`). 사이트 단일 폴백 `DEFAULT_COMMERCE_POLICY`(`src/data/company.ts:45-58`, 3,000원/5만원↑무료 — 주석에 "확정 전 placeholder" 명시) | 브랜드별 정책 7종이 서로 다름 → 브랜드 필드로 승격 |
| 배송추적 API | **없음**. `SWEET_TRACKER_CODES`(`src/lib/carriers.ts:31-37`)만 미사용 상태로 export | §6 참조 — 무료 플랜은 실서비스 불가 |
| `orders.items` 저장 형태 | **jsonb 컬럼** (`supabase/migrations/0003_orders.sql:11`) | 배송 묶음을 별도 테이블로 뺄지 결정 필요 (§5-2) |

---

## 3. 브랜드별 배송정책 수집 현황

| id | 브랜드 | 택배사 | 배송비 | 평균 출고 | 정책 확보 |
|---|---|---|---|---|---|
| b1 | 페네핏 | **파스토**(팔레트파우더) / **로지플렉스**(그 외) | 3,000원 (도서산간 동일) | 1일 이내 (13시 이전 당일) | ✅ 전체 |
| b2 | 오미프로 | 우체국 | 4,000 / 도서산간 +5,000 / 제주 +4,000 | 발주 후 2일 이내 | ✅ 전체 |
| b3 | 노블독 | 롯데택배 | **3,000원** (반품 편도 3,000원 / 최초배송비 무료였으면 6,000원 · 교환 6,000원) | 평균 1~2일 (공휴일은 다음날로부터 1~2일) | ✅ 전체 |
| b5 | 알로밍 | CJ대한통운 | 3,000원 | 12시 이전 당일 / 이후 익일 | ✅ 전체 |
| b6 | re펫 | 우체국 | 무료 | 제작 시작 후 60일 이내 | ⚠️ A/S 안내 미확정 (추가 공유 예정) |
| b7 | 메종슈슈 | **GS Postbox** | 5만원↑ 무료 / 미만 3,500원 | 1~4일(일반) / 3~5일(재고) / 최대 10영업일(핸드메이드) | ✅ 전체 (교환·반품 주소 포함) |
| b8 | 챠콜스토리 | 로젠택배 | 무료 (상품가 포함) | 평일 14시 이전 당일 | ⚠️ **교환·환불/AS/고객센터 미수집** (PDF 3항목뿐) |
| b9 | 써니 사이드업 | CJ대한통운 | 3,000원 공통 | 13시 이전 당일 | ✅ 전체 |

> **알로밍 출고 문구 주의:** 제공 텍스트에 "(대표님 발주업무에 걸리는 시간과 연계하여 고려하셔서 노출시키셔야 할것같습니다~)"라는 **내부 메모가 섞여 있음.** 그대로 노출 금지 — 고객 노출 문구는 확정 후 입력.

### 3-1. 수집 완료 정책 원문 (P4 시드 원천 — `BrandShippingPolicy` 매핑)

#### b3 노블독 (2026-07-16 수집)

| 필드 | 값 |
|---|---|
| `carrierLabel` | 롯데택배 |
| `defaultCarrier` | `lotte` (기존 화이트리스트에 이미 존재 — **추가 실측 불필요**) |
| `shippingFee` | **3,000** (2026-07-16 사용자 확정: "노블독 배송비는 3천원") |
| `shippingFeeLabel` | "배송비 3,000원" |
| `dispatchEstimate` | 평균 1~2일 (공휴일은 다음날로부터 1~2일 소요) |
| `returnPolicy` | 단순변심: 상품 수령 후 7일 이내(구매자 반품배송비 부담) / 표시·광고와 상이하거나 계약 내용과 다르게 이행: 상품 수령 후 3개월 이내 또는 그 사실을 안 날로부터 30일 이내(판매자 반송배송비 부담). 둘 중 하나라도 경과 시 반품·교환 불가 |
| `returnExclusions` | ① 반품요청기간이 지난 경우 ② 구매자의 책임 있는 사유로 상품 등이 멸실·훼손된 경우 ③ 구매자의 책임 있는 사유로 포장이 훼손되어 상품가치가 현저히 상실된 경우 ④ 구매자의 사용 또는 일부 소비로 상품가치가 현저히 감소한 경우 ⑤ 시간의 경과에 의하여 재판매가 곤란한 경우 |
| 반품·교환 배송비 | 반품 편도 3,000원(최초배송비 무료인 경우 6,000원 부과) / 교환 6,000원 |
| `supportHours` | 10~17시 운영 |
| `supportContact` | 010-3784-6922 |
| `returnAddress` | 미수집 |

> ⚠️ **`BrandShippingPolicy` 타입 갭 발견:** 노블독은 **반품/교환 배송비**를 별도로 명시하는데(반품 3,000·교환 6,000, 최초 무료 시 6,000), §5-1 타입에는 이를 담을 필드가 없다(`shippingFee`는 주문 배송비). 반품·교환비는 브랜드마다 다를 수 있으므로 P2 계약에서 **`returnShippingFee?` / `exchangeShippingFee?` 가산**을 검토해야 한다. 안 그러면 이 값이 `returnPolicy` 산문에만 묻혀 계산·표시에 못 쓴다.

#### b8 챠콜스토리 (2026-07-16 배송가이드 이미지 수집 — 출고기간은 미확정)

| 필드 | 값 |
|---|---|
| `carrierLabel` | 로젠택배 (기존 PDF 근거) |
| `defaultCarrier` | `logen` (기존 화이트리스트에 존재 — **추가 실측 불필요**) |
| `shippingFee` | 0 (무료 — 상품가 포함, 기존 PDF 근거) |
| `shippingFeeLabel` | "무료배송 (상품가 포함)" |
| `dispatchEstimate` | ⚠️ **상충 — 확정 필요(§8-3)**. PDF: "평일 14시 이전 당일 출고" / 배송가이드 이미지: "모든 주문은 결제 완료 후 1-3일 이내에 발송됩니다. 배송은 일반적으로 2-5일 소요되며, 지역에 따라 다소 차이가 있을 수 있습니다." |
| `returnPolicy` | 상품 수령 후 7일 이내에 교환 및 반품 요청 가능. 파손에 대한 교환·반품 시 포장 상태가 원래와 동일해야 함. 교환·반품을 원할 경우 고객센터로 문의. 단, 고객 변심으로 인한 교환·반품 시 배송비는 고객 부담 |
| `returnExclusions` | ⚠️ 별도 명시 없음(이미지엔 "포장 상태 동일" 조건만) — 표준 문구 적용 여부 확인 필요 |
| `supportHours` | 10:00~17:00 (점심 12:00~13:00, 주말·공휴일 휴무) |
| `supportContact` | 1544-6845 |
| `returnAddress` | 미수집 |

---

## 4. 택배사 화이트리스트 확장 — 최대 리스크

현재 딥링크가 가능한 5종 외에 **3종이 새로 필요**하고, 성격이 각각 다르다.

- **GS Postbox** (b7): GS네트웍스 편의점택배. 조회 URL·스마트택배 `t_code` **실측 필요**. 기존 5종처럼 실 HTTP 요청으로 검증한 뒤 `carriers.ts`에 추가한다(추측 값 커밋 금지 — 기존 주석의 "값 변경 금지" 규칙).
- **파스토(Fassto) / 로지플렉스** (b1): 이 둘은 **택배사가 아니라 3PL 풀필먼트 사업자**다. 고객이 받는 운송장은 그들이 계약한 택배사(CJ 등) 번호로 나갈 가능성이 높다. → **페네핏에 "실제 운송장이 어느 택배사 것인지" 확인이 선행돼야 한다.** 확인 전에는 `carriers.ts`에 넣지 않는다.
  - 실제 운송장이 CJ라면: 브랜드 정책 표기는 "파스토/로지플렉스", 운송장 조회는 `cj` — **표기와 조회를 분리**해야 한다. 그래서 §5-1 설계는 `BrandShippingPolicy.carrierLabel`(표시용 문자열)과 `Shipment.carrier`(조회용 코드)를 처음부터 별도 필드로 둔다.

---

## 5. 설계

### 5-1. 계약 변경 (`contract/*` 브랜치, 확정 = mim — AGENTS.md §0-2 ②)

```ts
// src/lib/shipment-steps.ts (신규 — 단일 진실 소스, carriers.ts와 같은 패턴)
export const SHIPMENT_STEPS = [
  '상품준비', '상품발송', '배송준비', '배송중', '배송완료', '구매확정',
] as const;
export type ShipmentStep = (typeof SHIPMENT_STEPS)[number];
export function isShipmentStep(v: string): v is ShipmentStep { /* ... */ }

// src/types/index.ts — 가산적 변경만
export interface OrderItem {
  productId: string; productName: string; optionName?: string;
  quantity: number; price: number;
  brandId?: string;      // 주문 시점 스냅샷 (상품이 나중에 브랜드를 옮겨도 주문 이력은 불변)
  shipmentId?: string;   // 이 상품이 속한 배송 묶음
}

export interface Shipment {
  id: string;
  orderId: string;
  brandId: string;
  carrier?: CarrierCode;        // 조회용 코드 (딥링크/API)
  trackingNumber?: string;
  step: ShipmentStep;           // 기본 '상품준비'
  shippedAt?: string; deliveredAt?: string; confirmedAt?: string;
}

export interface Brand {
  /* 기존 필드 전부 유지 */
  shipping?: BrandShippingPolicy;   // optional 가산
}

export interface BrandShippingPolicy {
  carrierLabel: string;         // 고객 노출 문구 ("파스토(팔레트파우더)/로지플렉스")
  defaultCarrier?: CarrierCode; // 실제 운송장 택배사 (조회용, §4)
  shippingFee: number;
  freeShippingThreshold?: number;                 // b7 = 50000
  extraFees?: { region: string; fee: number }[];  // b2 = [{제주,4000},{도서산간,5000}]
  shippingFeeLabel: string;     // "무료배송 (상품가 포함)"
  dispatchEstimate: string;
  returnPolicy: string;
  returnExclusions: string;
  asNotice?: string;
  supportHours: string;
  supportContact: string;
  returnAddress?: string;       // b7만 확보
}
```

**기존 `Order.carrier` / `Order.trackingNumber`는 삭제하지 않는다.** 이미 주문 데이터가 있고, 삭제하면 모든 호출부가 깨진다(AGENTS.md §4 콘센트 규칙 4 — 가산적으로). 신규 `Shipment`가 진실 소스가 되고 기존 두 필드는 **레거시 단일배송 폴백**으로 남긴다(§7 P3에서 shipment 1건으로 백필 승격).

덤으로, 지금 두 곳에 흩어진 `DELIVERY_STATUSES` 하드코딩(§2)을 `shipment-steps.ts`로 흡수해 드리프트를 제거한다.

### 5-2. 저장소 — `order_shipments` 테이블 신설 (권장)

`supabase/migrations/00XX_order_shipments.sql` (gen 스크립트로 기계 생성 — 수기 SQL 금지, AGENTS.md §3)

```sql
create table public.order_shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  brand_id text not null,
  carrier text,
  tracking_number text,
  step text not null default '상품준비',
  shipped_at timestamptz, delivered_at timestamptz, confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (order_id, brand_id)
);
create index order_shipments_order_id_idx on public.order_shipments (order_id);
alter table public.order_shipments enable row level security;  -- 서버 secret key 전용, 정책 없음(0003 패턴)
```

**jsonb 안에 넣지 않는 이유:** `orders.items`는 jsonb라 상품 1건의 운송장 수정 = 배열 전체 read-modify-write. 관리자 2명이 같은 주문의 다른 상품을 동시에 저장하면 **조용히 덮어써진다(lost update).** 별도 테이블이면 행 단위 갱신이라 구조적으로 불가능하다. `unique(order_id, brand_id)`가 브랜드 묶음 중복도 막는다.

`OrderItem.brandId`는 jsonb에 그대로 넣는다(주문 시점 스냅샷이라 불변, 경합 없음).

### 5-3. 관리자 (`/admin/orders/[id]`)

`OrderStatusPanel.tsx`의 주문 단위 택배사/운송장 select+input을 **브랜드 묶음 카드 목록**으로 교체:

```
[페네핏]  팔레트파우더 프리미엄 x1 · 케어세럼 x2
  택배사 [CJ대한통운 ▾]  운송장 [__________]  단계 [배송중 ▾]    [저장]

[알로밍]  캣타워 L x1
  택배사 [CJ대한통운 ▾]  운송장 [__________]  단계 [상품준비 ▾]  [저장]
```

- 브랜드 묶음은 주문 생성 시 `items[].brandId`로 **자동 생성**(같은 브랜드 = 1묶음). 관리자는 운송장을 3번이 아니라 1번만 입력한다.
- 택배사 기본값은 `Brand.shipping.defaultCarrier`로 **자동 선택**(수정 가능). 수기 입력 부담을 줄이는 핵심.
- 저장 = `PATCH /api/admin/orders/[id]/shipments/[shipmentId]` — `carrier`는 `isCarrierCode`, `step`은 `isShipmentStep`으로 화이트리스트 검증(기존 `src/app/api/admin/orders/[id]/route.ts:57-63` 패턴 그대로).
- 주문 단위 `orderStatus`는 유지하되 **묶음에서 파생**시킨다(§9 D-3).

### 5-4. 고객 모달 (`/mypage` 주문내역)

```
주문 #A1B2  2026-07-16
─────────────────────────────
페네핏 팔레트파우더 프리미엄        [배송조회]
  └ 옵션: 200g / 1개
알로밍 캣타워 L                     [배송조회]
  └ 옵션: 라지 / 1개
```

상품별 `[배송조회]` 클릭 → 모달:

1. **6단계 타임라인** — 현재 `step`까지 채워진 진행 바 (상품준비 ● 상품발송 ● 배송준비 ○ 배송중 ○ 배송완료 ○ 구매확정 ○)
2. **택배사 + 운송장번호** — `Brand.shipping.carrierLabel` 표시, 번호 복사 버튼
3. **택배사 조회 링크** — 기존 `buildTrackingUrl(carrier, trackingNumber)` 재사용. `null`이면 링크를 숨기고 번호 텍스트만(현행 폴백 규칙 유지)
4. **브랜드 배송정책** — 배송비/평균 출고/교환·환불/불가 사유/A/S/고객센터 (`Brand.shipping`, 없으면 `DEFAULT_COMMERCE_POLICY` 폴백)
5. **[구매확정]** 버튼 — `step === '배송완료'`일 때만 활성 (§9 D-2)

운송장 미할당(`step === '상품준비'`)이어도 버튼은 **살아 있고**, 모달은 "판매자가 상품을 준비 중입니다" + 브랜드 정책을 보여준다. 버튼을 숨기면 고객이 "조회가 왜 없냐"고 문의한다.

> **dad·mim 경계(AGENTS.md §3):** 모달 마크업·타임라인 디자인·배치 = **dad**. `Shipment` 타입·API·repo·admin 저장 로직 = **mim**. 모달은 `*Client.tsx` 하위 컴포넌트로 만들고 데이터는 콘센트(`storage.ts`) 경유 — 컴포넌트 직접 fetch 금지(§4).

---

## 6. 스마트택배 조회 API — 이번 범위에서 제외 (근거)

모달에 택배사 실시간 **스캔 이력**(집화→간선상차→…)까지 넣으려면 스마트택배 조회 API가 필요하지만:

- 무료 플랜 **100건/월** — 실서비스 불가(주문 100건이면 소진).
- **접수(운송장 발급) API는 계약이 없어 애초에 불가** → 수기 입력이 유일한 경로이고, 이는 사용자 요구("최고관리자가 일일이 수기 할당")와 충돌하지 않는다.
- 6단계 타임라인은 관리자가 입력한 `step`으로 **자체 렌더**하므로 API 없이 완성된다. 택배사 실시간 이력은 딥링크로 위임.

→ 유료 플랜 결제 후 별도 PR에서 `SWEET_TRACKER_CODES`를 소비해 `배송중`/`배송완료` 자동 갱신(폴링)을 붙인다. `carriers.ts:29` 주석이 예고한 "3단계"가 그 지점이다.

---

## 7. 단계별 실행 (의존 순서)

| # | 단계 | 브랜치 | 담당 | 산출물 | 게이트 |
|---|---|---|---|---|---|
| P0 | 정보 확보 (§8) | — | mim→클라이언트 | 노블독·캣코드 정책, 챠콜스토리 교환환불, 페네핏 실제 운송장 택배사, re펫 A/S | 답변 수령 |
| P1 | 택배사 실측 | `be/carrier-gspostbox` | mim | GS Postbox 조회 URL + `t_code` 실 HTTP 검증 → `carriers.ts` 추가 | 실 운송장 조회 성공 스크린샷 |
| P2 | **계약** | `contract/shipment-per-brand` | 제안 누구나 / 확정 mim | `shipment-steps.ts`, `Shipment`, `OrderItem.brandId/shipmentId`, `BrandShippingPolicy` + **모든 호출부 동반 수정** | `contract-change` 라벨 · build green · **단독 머지** |
| P3 | DB + repo | `be/order-shipments` | mim | `00XX_order_shipments.sql`(gen), `src/lib/shipments/repo.ts`, 레거시 `Order.carrier` → shipment 1건 백필 | 기존 주문 조회 무회귀 |
| P4 | 브랜드 정책 시드 | `be/brand-shipping-seed` | mim(시드) | `src/data/brands.ts` 7종 `shipping` + 재시드 마이그레이션 | 정본 파일 ↔ DB 일치 |
| P5 | 관리자 UI | `fe/behavior-admin-shipments` | dad(표현)+mim(배선) | 브랜드 묶음 카드, `PATCH .../shipments/[id]` | 운송장 입력→저장→재조회 |
| P6 | 고객 모달 | `fe/behavior-mypage-tracking-modal` | dad(표현)+mim(배선) | 상품별 버튼 + 6단계 타임라인 모달 | 골든플로우 #2·#6 스모크 |
| P7 | 구매확정 | `fe/behavior-purchase-confirm` | dad | 확정 버튼 + 자동확정 크론(D-2 결정 시) | — |

- **P2는 단독 머지**(AGENTS.md §0-2). P5·P6는 P3·P4 완료 후 **병렬 가능**.
- **완료 게이트(AGENTS.md §8-6 삼중 검증):** opus 적대적 리뷰 + codex 2차 리뷰 + Playwright 프리뷰 실구동.
- P6는 화면이 바뀌므로 **visual 베이스라인 갱신을 같은 PR에 포함**(§8-4-4).

---

## 8. 클라이언트/대표님 확인 필요 (P0 — 막히면 P4가 안 됨)

1. ~~**노블독(b3)**~~ — ✅ **2026-07-16 전 항목 수집 완료**(§3-1). 배송비 3,000원 확정.
2. ~~**캣코드(b4)**~~ — ✅ **항목 소멸.** 캣코드는 **실재하지 않는 브랜드**로 확정(2026-07-16 사용자: "캣코드라는 브랜드명 없는데 … 8개가 끝이야"). 소속 상품 p9·p10·p11 은 **알로밍(b5)** 제품이며 마이그레이션 `0034` 로 이관·노출보류 처리했다. 브랜드는 **8종이 전부**다.
3. **챠콜스토리(b8) — ⚠️ 출고기간 상충, 확인 필요.** 교환·환불/고객센터는 2026-07-16 배송가이드 이미지로 확보했으나(§3-1), **출고기간이 두 근거에서 다르다**: 기존 PDF = "평일 14시 이전 당일 출고" / 배송가이드 이미지 = "결제 완료 후 1-3일 이내 발송, 배송 2-5일 소요". **어느 쪽이 현행인지 확정 필요** — 고객 노출 문구라 틀리면 표시광고 이슈.
4. **페네핏(b1) 실제 운송장 택배사** — 파스토·로지플렉스는 풀필먼트사. 고객이 조회할 운송장이 어느 택배사 것인지(§4).
5. **re펫(b6) A/S 안내** — "이따 한 번 더 공유해주신대요" 상태.
6. **알로밍(b5) 출고 문구 확정** — 내부 메모("대표님 발주업무와 연계…")를 뺀 고객 노출 문구.

---

## 9. 결정 필요 (mim 확정)

- **D-1. 배송 묶음 단위** — ⭐권장: **브랜드별 묶음**(같은 브랜드 = 운송장 1개, 관리자 입력 1회). 대안: 상품별 완전 개별(요구 문구 그대로지만 같은 브랜드 3상품이면 같은 번호를 3번 입력). *묶음이어도 고객 화면은 요구대로 "상품별 버튼"이며, 버튼이 자기 묶음을 연다.*
- **D-2. 구매확정 주체** — ⭐권장: **고객 수동 + 배송완료 후 7일 자동확정 크론**(커머스 관례). 대안: 수동만(미확정 주문 영구 적체) / 자동만(고객 권리 축소).
- **D-3. `orderStatus` vs 묶음 `step` 관계** — ⭐권장: **묶음이 진실, 주문 상태는 파생**(전부 배송완료 → 주문 배송완료 / 하나라도 배송중 → 배송중). 둘을 독립으로 두면 관리자가 양쪽을 따로 고쳐야 해 확실히 어긋난다.
- **D-4. 브랜드별 배송비 계산** — ⚠️ 이번 계획은 **정책 "표시"만** 다룬다. 실제 결제 금액을 브랜드별 묶음 배송비 합산으로 바꾸는 건 checkout·결제금액 검증까지 건드리는 별건이다(현재는 사이트 단일 `DEFAULT_COMMERCE_POLICY` 3,000원). 브랜드마다 무료/3,000/3,500/4,000+지역할증으로 전부 다르므로 **표시 정책과 실제 청구액이 어긋나면 전자상거래법 이슈**가 된다. 별도 스코프로 즉시 후속 진행 권장.
