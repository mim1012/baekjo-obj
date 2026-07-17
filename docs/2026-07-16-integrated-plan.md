# 백조오브제 — 통합 실행 계획 (2026-07-16 야간)

> main = `a6abb6e` · 담당 mim1012 · 작성 2026-07-16
>
> 오늘 19시 이후 문서 3개를 **통합**하고, 야간에 추가된 요구사항을 **코드 실조사 근거(`file:line`)와 함께** 합친 상위 계획서.
>
> | 흡수 문서 | 역할 | 관계 |
> |---|---|---|
> | `brand-shipping-integration-plan.md` (21:12) | 브랜드별 배송사 연동(P0~P7·D-1~D-4) | §6에서 참조. **관리자 편집 요구로 P4 승격**(§4-3) |
> | `client-key-issuance-guide.md` (21:03) | 키 발급(네이버·카카오·도메인·토스) | §11로 요약 |
> | `2026-07-16-main-changes-manual-qa.md` (20:13) | 오늘 main 반영 + 수동 QA | §1로 요약 |
>
> ⚠️ 모든 "현재 상태"는 추측이 아니라 **2026-07-16 코드 실조사 결과**다.

---

## 0. 한 장 요약

| 구분 | 결론 |
|---|---|
| **토스 심사** | 코드는 전부 해소. **실판매가 확정 1건**에만 막힘(§9-1). 99,000원은 임시값 |
| **🔴 즉시** | ① "최대 5% 적립" **허위 표시**(뒷단 0) ② p9 브랜드 없이 판매 중(PR #85) ③ 무통장인데 **입금 계좌 안내 없음** |
| **되돌리기 아님** | 찜하기는 오늘 `63b15be`가 **의도적으로 제거**. 복구 = localStorage 재도입이 아니라 **DB 신설** |
| **오해였던 것** | `/selection`은 **존재한 적 없는 라우트**(라벨만 "셀렉션", 실경로 `/shop`) · "브랜드 둘러보기"는 **사라지지 않음**(브랜드 상세에 생존) |
| **최대 신규** | 적립금 원장(§5-3) · 찜하기 DB(§7) · 약관 CMS(§4-2) |
| **구조 위험** | 주문상태 셀렉트가 **JSX 리터럴 3곳 중복** → `'구매확정'` 추가 시 컴파일러가 누락 못 잡음(§5-1) |

---

## 1. 오늘 main 반영분

| PR | 머지 | 내용 |
|---|---|---|
| #82 | `a6abb6e` | 토스 대응: 푸터 배송·환불/사업자정보 링크, `/refund-policy` 신설, checkout 주문전 확인, **토스 테스트키 등록** |
| #81 | `b4001e2` | 택배사 선택 + 배송조회 링크, `src/lib/carriers.ts` |
| #80 | `a3ba66b` | 상품 상세 배송/교환 **기본 문구 폴백** |
| #78 | `b9215ba` | `/admin/orders` **인라인 상태 변경** |
| #77 | `4cf3ed5` | 관리자 P0 UX, 금액 수정, 비노출 전역 차단, **하트/찜 UI 제거** |
| #76 | `b8b5bfd` | 진단 추천 9개 가격/재고 + 미가격 차단(`0033`) |
| #74·#73·#72 | — | 파트너/케어키트 편집, 콘텐츠 바인딩 잠금 |

**진행 중**: PR #85 `be/fix-catcode-orphan`(§2-2).

---

## 2. 🔴 즉시 조치 (P0)

### 2-1. "최대 5% 적립" 허위 표시 — 가장 시급

- **현재**: `src/components/shop/ProductDetailClient.tsx:193-195`가 모든 상품 상세에 `적립금 / 최대 5% 적립`을 **하드코딩 출력**.
- **문제**: 적립금은 **타입·DB·API·지급로직·잔액 UI가 전부 없다**. **뒷단이 0인 거짓 문구.**
- **왜 심각**: 찜하기를 "localStorage라 동기화 안 되니 고객이 '저장됐다'고 기대할 수 없다"는 이유로 지운 게 오늘이다(`admin-account-ux-investigation-plan.md:42`). **같은 기준이 적립금에 적용돼야 하는데 누락됐다.** 표시광고법 + 토스 심사 리스크.
- **조치**: ⭐ **문구 즉시 제거**(`fe/behavior-remove-fake-points`, 5분) 또는 §5-3 구현까지 보류 후 동시 오픈. **심사 전이면 제거가 정답.**

### 2-2. 캣코드 고아 상품 — PR #85 (opus 리뷰 finding 6건, 머지 전 수정 필요)

- **배경**: '캣코드(b4)'는 **실재하지 않는 브랜드**(사용자 확정 — 브랜드는 페네핏·오미프로·노블독·알로밍·RE:펫·메종슈슈·챠콜스토리·써니사이드업 **8종이 전부**). 과거 admin에서 삭제 → FK `on delete set null`(`0004:17`) → p9·p10·p11이 `brand_id` NULL 고아.
- **PR #76이 만든 피해**: `0033`이 진단 추천 9개에 가격을 주면서 **p9가 브랜드 없이 99,000원 판매 상태**(이미지도 플레이스홀더 SVG).
- **PR #85 조치**: p9·p10·p11 → **알로밍(b5)** 이관 + `is_visible=false`, 정본 `brands.ts`에서 b4 제거(재시드 부활 차단), 마이그레이션 `0034`.

**🔴 opus 적대적 리뷰 — 머지 전 필수 4건:**

| # | 심각도 | 내용 |
|---|---|---|
| **F1** | **HIGH** | **`brandName`이 컬럼이 아니라 `detail` jsonb 안에 산다**(`0018:29`, `repo.ts:78`, `splitProductInput.ts` 맵에 없음). 0034가 `brand_id`만 바꿔 **DB엔 '캣코드'가 그대로 남는다** → §4 drift. `update products set detail = jsonb_set(detail,'{brandName}','"알로밍"') where id in ('p9','p10','p11');` 추가 필요. 실피해: 0033 노출기간에 p9를 주문한 고객의 주문내역(`includeHidden`)에 '캣코드' 계속 표시 |
| **F2** | MEDIUM | **b4 참조 4곳 생존** — `survey.ts:121`(r5 `brandIds:['b4','b5']`), `concerns.ts:82`(skin)·`:191`(stress)·`:302`(grooming). `survey/config.ts:4,15`가 살아있는 폴백 경로. 크래시는 없고 `result/page.tsx:77` 필터에서 **조용히 사라짐** = §4가 막으려던 그것 |
| **F5** | MEDIUM | **`/concerns/stress`가 통째로 빈다** — `concerns.ts:190` `recommendedProductIds:['p9','p10','p11']`인데 **셋 다 이 PR이 숨긴다** → `concerns/[slug]/page.tsx:134-136` 필터 결과 0개 → "관련 상품을 준비하고 있어요". 덤으로 리뷰 r6(`reviews.ts:74` `productId:'p11'`)이 `productName` 없이 렌더 |
| **F6** | MEDIUM | **시각 베이스라인 미갱신** — 0033 이후 p9가 `/shop`에 노출된 상태로 `e77847f`가 베이스라인 재생성 → **p9 카드가 박혀 있다**. 숨기면 그리드 배치가 바뀌는데 `visual.spec.ts:69-76` mask는 가격·카운트만 가려 **레이아웃 변화는 못 가림** → visual 빨간불 예상. AGENTS §8-1-4 "콘텐츠 변경 PR은 베이스라인 갱신 동봉" |

LOW 2건: F3 `members.managed_brand_ids`(text[])에 'b4' 잔존 가능(무해, 정리 대상) · F4 0034 주석 부정확 + 파일 끝 개행 없음.

**GREEN 확인**: 골든#1 안전(r5의 p12 생존 — `price:99000`·`stock:999`·`is_visible=true`, r1~r4는 p9·p10·p11 무관, **추천 0개 경로 없음**) · 마이그레이션 순서(UPDATE→DELETE)가 FK 위반·재고아화 회피 · b5 `representativeProductIds`에 p9·p10·p11 **안 넣는 게 맞음**(`visibleOnly`라 어차피 안 뜸) · 브랜드 개수 잠그는 스냅샷 테스트 없음 · `tsc --noEmit` 통과.

### 2-3. 무통장입금 — 입금 계좌 안내 부재

- **현재**: `checkout/page.tsx:319`에서 무통장 선택 → `api/orders/route.ts:111-113`이 `paymentStatus='입금대기'` 생성. 그런데 **checkout·order-complete 어디에도 "어느 계좌로 입금하라"가 없다.** `src/data/company.ts`에 **계좌 필드 자체가 없다.**
- **조치**: 계좌(은행·번호·예금주) 확보(§9-1-6) → `company.ts` 또는 §4-2 약관 CMS에 편입 → 노출.

---

## 3. 브랜딩 정정 (dad, 표현 레인)

### 3-1. "백조 Audit" → "백조오브제 Audit"

- **전수 3곳**: `src/components/home/HomeClient.tsx:68`("백조 Audit 검증을 통과한 브랜드만 소개합니다.") · `:158`(주석) · `:162`(`<span>백조 Audit</span>` — **검증 상품 보기 버튼 아래 섹션 라벨**)
- **조사 결과**: `-P "백조(?!오브제)"` 전수 검색 시 **컴포넌트/앱 레이어에 "백조" 단독 표기는 이 3건뿐.** 정정 대상이 이 파일에 국한된다.
- `fe/design-brand-naming` · **계약 무변경**

### 3-2. re펫 → **RE:펫** 전 도메인 정정·바인딩

- **현재 혼재**: `brands.ts:170` `name:'re펫 (RePet)'`(**정본**) · `:180` philosophy `'re펫은 …'` · `products.ts:545,572` `brandName:'re펫'` · `:546,573` 상품명 `'RePet 강아지 …'` · **prod DB**: `b6 re펫 (RePet)`(실조회)
- **작업**: 정본 `brands.ts`·`products.ts` → `RE:펫` 통일 + **마이그레이션으로 DB 동기화**
- ⚠️ **DB가 화면의 진실 소스**(AGENTS §3) — 정본만 고치면 **화면은 안 바뀐다.** 마이그레이션 필수. **§2-2 F1과 같은 함정**: `brandName`은 `detail` jsonb라 `jsonb_set` 필요
- **결정**: 상품명의 `RePet` 영문은 제조사 표기라 유지? 통일?(§9-3)
- `be/brand-rename-repet` · **계약 무변경**(값만)

---

## 4. 관리자 편집 확장

### 4-1. 관리자 헤더 "백조오브제" → 홈 이동

- **현재**: `AdminSidebar.tsx:89` · `AdminMobileNav.tsx:107`에 텍스트만 있고 **링크 아님**
- **작업**: `<Link href="/">` 로 감싼다. **사이드바·모바일 둘 다**
- `fe/behavior-admin-home-link` · **계약 무변경** · 난이도 최소

### 4-2. 약관 4종 관리자 편집

- **현재(조사)**: 전부 **코드 하드코딩**

| 화면 | 출처 |
|---|---|
| `/terms` | `src/app/terms/page.tsx` JSX 조문 + `COMPANY` |
| `/privacy` | 동일 |
| `/refund-policy` | `refund-policy/page.tsx:1` — `COMPANY` + `DEFAULT_COMMERCE_POLICY` |
| 사업자정보(푸터) | `src/data/company.ts:11-35` (SSOT) |
| 기본 배송/환불 | `src/data/company.ts:45-61` |

- **관리자 화면 없음**: `admin/settings/page.tsx:13-21` 탭은 **전부 홈 CMS**(intro/howToStart/audit/curation/brands/bestProducts/insurance/trustBoard/b2b)
- **`site_settings`는 홈 전용**: `0008`이 `id='home'` 싱글턴 + `HomeSettings` jsonb. `api/admin/settings/route.ts:13-31`이 `REQUIRED_SECTIONS` 9키만 통과, **나머지 400 거부**
- **설계(권장)** — **테이블 재사용이라 마이그레이션 불필요**:
  1. `site_settings`에 **`id='legal'` 행 추가**(text PK)
  2. `company.ts` → `LegalSettings` + `defaultLegalSettings`로 승격(`homeContent.ts` 패턴)
  3. `api/admin/settings/route.ts`의 `isHomeSettings()` 게이트를 **`id`별 검증기로 분기**(**계약 변경**)
  4. `/terms`·`/privacy`·`/refund-policy`를 **서버 컴포넌트 DB fetch + default 폴백**으로 전환
  5. `/admin/settings`에 "법정고지" 탭 신설
- ⚠️ ① `company.ts:7-8`의 "정적이라 §4 예외" 주석 **무효화** → AGENTS.md 갱신 동반 ② `terms/page.tsx:14`대로 **약관은 법무 검토 대상** — 임의 편집 허용 자체가 정책 결정(§9-2)
- `contract/legal-settings` → `be/legal-cms` → `fe/design-admin-legal-tab` · **계약 변경 YES**

### 4-3. 🆕 브랜드별 배송·출고·AS 관리자 편집

> 배송 계획 **P4(브랜드 정책 시드)를 "관리자 편집형"으로 승격.** 시드로 박으면 정책이 바뀔 때마다 개발자가 재시드해야 한다.

- **현재**: `Brand` 타입에 배송 필드 **0개**(`types/index.ts:65-85`). 사이트 단일 폴백 `DEFAULT_COMMERCE_POLICY`뿐
- **설계**: 배송 계획 §5-1의 `BrandShippingPolicy`를 `Brand.shipping?`로 **optional 가산** + **관리자 브랜드 상세(`/admin/brands/[id]`)에 편집 폼**. #56·#59가 이미 브랜드 폼/상세를 열어놨으므로 **섹션 추가로 붙는다**
- **편집 필드**: `carrierLabel`(표시) · `defaultCarrier`(조회 코드) · `shippingFee` · `freeShippingThreshold` · `extraFees[]`(지역할증) · `dispatchEstimate`(출고) · `returnPolicy` · `returnExclusions` · **`returnShippingFee`/`exchangeShippingFee`**(신규) · `asNotice`(A/S) · `supportHours` · `supportContact` · `returnAddress`
- 🔴 **타입 갭(노블독에서 발견)**: 노블독은 **반품 3,000 / 교환 6,000 / 최초무료였으면 6,000**처럼 반품·교환비를 별도 금액으로 명시하는데 배송 계획 §5-1 타입에 **담을 필드가 없다**(`shippingFee`는 주문 배송비) → **`returnShippingFee?`/`exchangeShippingFee?` 가산 필수**
- `contract/brand-shipping-policy` → `be/brand-shipping-api` → `fe/behavior-admin-brand-shipping` · **계약 변경 YES**

---

## 5. 주문·정산 규칙

### 5-1. ⚠️ 선행 필수 — 주문상태 상수 SSOT

- **문제**: 주문상태 셀렉트가 **JSX 리터럴 3곳 중복** — `OrderStatusPanel.tsx:60-70` · `OrderFilters.tsx:46-64` · `OrderMobileCard.tsx:25-27`. **`ORDER_STATUSES` 상수를 안 쓴다.** 결제상태(`OrderStatusPanel.tsx:76`)는 `PAYMENT_STATUSES`를 map하는데 주문상태만 하드코딩
- **왜 먼저**: §5-2에서 `'구매확정'` 추가 시 **컴파일러가 누락을 못 잡는다.** #51(관리자 메뉴 17개 중복)과 **같은 drift 패턴**이고 그때 실버그가 났다
- `refactor/order-status-ssot` · **단독 머지**

### 5-2. 구매확정 + 확정 후 환불 불가 + 자동확정 7일

- **현재(조사)**: **구매확정 개념이 코드에 없다.** `ORDER_STATUSES`(`types/index.ts:236-244`) = `['주문접수','결제완료','배송준비','배송중','배송완료','취소요청','취소완료','환불완료']`. `confirmedAt` 없음. **자동확정 크론 없음**(`api/cron/` = reclaim-stock·reconcile-confirming 2개, 둘 다 결제/재고용)
  - ⚠️ **혼동 주의**: 코드의 "confirm"은 전부 **토스 결제 승인**이지 고객 구매확정이 아님
- **환불신청도 반쪽**: 고객 신청 **UI·API 없음**. `'취소요청'`은 상태값만 있고 **관리자만 세팅 가능**(오프라인 접수 후 대신 찍는 구조). 실제 환급은 **토스 콘솔 수동**(`api/admin/orders/[id]/route.ts:84,102` "환불은 별도 절차")
- **구현**:
  1. `ORDER_STATUSES`에 `'구매확정'`(§5-1 선행 후)
  2. `Order.confirmedAt` 가산 + 마이그레이션(nullable, `0022` 패턴)
  3. 고객 **구매확정 버튼**(마이페이지) — `배송완료`일 때만 활성
  4. **구매확정 후 환불신청 차단** — 서버 상태 전이 검증
  5. **자동구매확정 크론** — `배송완료 + 7일` 스캔 → `구매확정` + `vercel.json` crons (⚠️ **분단위는 Vercel Pro 필요**, 일단위면 Hobby 가능)
  6. 확정 시 **적립금 자동 적립 훅**(§5-3)
- `contract/order-confirm` → `be/order-confirm-cron` → `fe/behavior-purchase-confirm` · **계약 변경 YES(대규모)**

### 5-3. 적립금 원장 — 최대 신규 작업

- **현재**: **아무것도 없다**(타입·DB·API·UI). 그런데 §2-1처럼 **문구만 표시 중**
- **설계** — 잔액 컬럼이 아니라 **원장(ledger)**:
  ```sql
  create table public.point_transactions (
    id uuid primary key default gen_random_uuid(),
    member_id uuid not null references public.members(id) on delete cascade,
    order_id uuid references public.orders(id),
    amount int not null,              -- 적립 +, 사용/회수 -
    reason text not null,             -- 'purchase_confirm' | 'use' | 'refund_clawback' | 'admin_adjust'
    balance_after int not null,       -- 감사용 스냅샷
    created_at timestamptz not null default now()
  );
  ```
  - 잔액 = 원장 합계(또는 `balance_after` 캐시). **[[정산-포인트-원장]] 위키 패턴 재사용**(dorami·medical-ERP·adpang 선례)
  - **적립 시점 = 구매확정**(요구). **환불 시 회수(clawback) 필수** — 안 하면 확정→적립→환불 무한 적립
  - 동시성: **[[원자적-조건부-감소]]** 패턴
- **결정**: 적립률(5%?)·사용 단위·유효기간·최소 사용액(§9-4)
- `contract/points-ledger` → `be/points-api` → `fe/behavior-mypage-points` · **계약 변경 YES**

---

## 6. 배송 (기존 계획 흡수)

### 6-1. 브랜드별 배송사 — 원본 유효, 2건 갱신

원본 P0~P7·D-1~D-4를 따른다. 오늘 변경: ① **P4 → §4-3 관리자 편집형 승격** ② **캣코드 행 삭제**(브랜드 8종).

| id | 브랜드 | 택배사 | 주문 배송비 | 출고 | 상태 |
|---|---|---|---|---|---|
| b1 | 페네핏 | 파스토/로지플렉스 | 3,000 | 1일 이내 | ⚠️ **실제 운송장 택배사 확인**(3PL) |
| b2 | 오미프로 | 우체국 | 4,000(+제주4,000/도서5,000) | 2일 이내 | ✅ |
| b3 | 노블독 | **롯데택배** | **3,000** | 1~2일 | ✅ **전 항목 완료(오늘)** |
| b5 | 알로밍 | CJ대한통운 | 3,000 | 12시 이전 당일 | ⚠️ 출고 문구에 내부메모 혼입 |
| b6 | RE:펫 | 우체국 | 무료 | 제작 후 60일 | ⚠️ A/S 미확정 |
| b7 | 메종슈슈 | GS Postbox | 5만↑무료/3,500 | 1~10영업일 | ⚠️ **조회 URL 실측 필요** |
| b8 | 챠콜스토리 | 로젠택배 | 무료(상품가 포함) | ⚠️ **상충** | ⚠️ **확정 필요**(§9-1-2) |
| b9 | 써니사이드업 | CJ대한통운 | 3,000 | 13시 이전 당일 | ✅ |

- **화이트리스트**(`carriers.ts:8`) = `cj, hanjin, lotte, post, logen` → **롯데·로젠·우체국·CJ 즉시 사용 가능.** **GS Postbox만 실측 필요**
- **스마트택배 API는 범위 제외** — FREE 100건/월은 실서비스 불가(STARTER ₩50,000=1,000건 / BASIC ₩80,000=5,000건, **폴링 전용·웹훅 없음**). **수기 운송장 + 택배사 딥링크 = 0원**으로 완성. 자동 갱신 필요 시 유료 전환

### 6-2. 배송지 UX 고도화

- **현재**: `Order.address: string` **단일 자유텍스트**(`types/index.ts:196`, `0003:10`). checkout은 **input 한 칸**(`checkout/page.tsx:306-307`). **우편번호 API 없음. 주소록·기본배송지 없음.** `User.address`는 있는데 **checkout이 프리필 안 해** 매번 재입력
- **단계**:
  1. ⭐ **기본배송지 프리필** — `checkout/page.tsx:83` `address:''`를 회원 `User.address`로 초기화. **계약 무변경**
  2. **우편번호 검색**(Daum) + **가산 컬럼** `postcode`/`address_detail` nullable(`0022` 패턴). `address` 유지 → 기존 주문 무회귀
  3. 주소록(다중)은 신규 테이블 — P2
- `fe/behavior-checkout-prefill` → `contract/address-structured` → `be/address-api`

### 6-3. 무통장입금 관리자 반영 — **가성비 최대**

- **현재**: 서버는 이미 준비됨. `api/admin/orders/[id]/route.ts:22` 화이트리스트 = `PAYMENT_STATUSES.filter(s => s !== '승인중')` → **`입금대기 → 결제완료` 전이 이미 허용**
- **없는 것**: 전용 **입금확인 원클릭**, **입금대기 KPI**(`OrderListPage.tsx:160`은 `'결제완료'`만 셈), **`paidAt` 자동 기록**(무통장 수동 확정 시 누락 → 정산 시점 정보 없음), **고객용 계좌 안내**(§2-3)
- **조치**: ①입금확인 버튼 + ②KPI = **계약 무변경 순수 프론트**. ③`paidAt ??= now()` 서버 소폭
- `fe/behavior-admin-deposit-confirm` + `be/paid-at-backfill`

---

## 7. 찜하기 — "복구"가 아니라 "재설계"

- **현재**: **전부 없음.** 타입·DB·API·UI 0. `mypage/components/WishlistSection.tsx`는 **`export {};` 빈 껍데기**. 단 `src/lib/storage.ts:34-55`에 `WISHLIST_KEY`·`getWishlist()`·`toggleWishlist()`·`isWishlisted()`가 **호출자 0인 죽은 코드로 잔존**
- **제거 경위**: `63b15be`(오늘). 근거 = `admin-account-ux-investigation-plan.md:42` *"localStorage에만 저장 → 계정/DB/관리자와 동기화 안 됨 → 고객이 '저장됐다'고 기대할 수 없으므로 제거"*, `:50` *"향후 재오픈 시 **로그인 회원 DB 동기화까지 포함해 별도 기능으로 재설계**"*. localStorage 마이그레이션은 **명시적으로 안 하기로 결정**
- 👉 **요구하신 "복구"는 revert가 아니라 그때 예고된 재설계를 지금 하는 것**
- **설계**:
  1. `00XX_wishlists.sql` — `(member_id, product_id)` **복합 PK** + `created_at` + RLS(서버 secret 전용, `0003` 패턴)
  2. `types/index.ts` — `WishlistItem`
  3. `src/lib/wishlist/repo.ts`(`orders/repo.ts` 패턴)
  4. `/api/wishlist` GET/POST/DELETE — **세션 인증 필수**
  5. UI 복원: `ProductCard` 하트 · `ProductDetailClient` 찜 · `WishlistSection`(빈 파일 채우기) · 마이페이지 찜 리스트
  6. 🔴 **`storage.ts:34-55` 삭제** — localStorage 경로가 남으면 §4 drift 재발(그게 제거 사유)
  - **장바구니 유지**(요구 명시)
- **결정**: 비로그인 찜 허용?(§9-5)
- `contract/wishlist` → `be/wishlist-api` → `fe/behavior-wishlist-ui` · **계약 변경 YES**

---

## 8. 라우팅 잔건

### 8-1. `/selection` 404 → `/shop` 리다이렉트 (신규)

- **조사 결론**: `src/app/selection`은 **git 전 이력에서 추가·삭제된 적 없음**(`--diff-filter=D` 0건). 앱 내 `/selection` 링크 **0건** → **클릭으로는 도달 불가.** 라벨이 "셀렉션"이고 실경로가 `/shop`이라(`Header.tsx:97,105`·`Footer.tsx:8`·`HomeClient.tsx:109`) URL 유추 시 404
- **조치**: 유추 가능한 URL이니 **리다이렉트 신규 추가** — `next.config` `redirects()` 또는 `app/selection/page.tsx`(`redirect('/shop')`). `fe/behavior-selection-redirect` · 5분

### 8-2. "브랜드 둘러보기" — 조치 불필요

- **조사 결론**: **사라지지 않았다.** `app/brands/[id]/page.tsx:46`에 생존(브랜드 상세 뒤로가기). `/brands` 라우트·진입점 정상(`HomeClient.tsx:32` "브랜드관", `Header.tsx:23` "브랜드", `Header.tsx:110` "브랜드로 둘러보기", `Footer.tsx:7`). 07-12 `601f349`에서 일시 유실 → **같은 날 `b7e895e`가 복원**, HEAD까지 유지
- **다만** 이 문구는 **홈에 있던 적이 없다**(홈 라벨 = "브랜드관"). 홈에 CTA를 원하면 **신규 요청**(`fe/design-home-brand-cta`)

---

## 9. 🔴 결정·확인 필요

### 9-1. 클라이언트(대표님)

| # | 항목 | 막는 것 |
|---|---|---|
| 1 | **상품별 실제 판매가** — 99,000원 임시값. 전부 같은 가격이면 "판매 의사 없음"으로 반려 가능 | **토스 심사(유일 병목)** |
| 2 | **챠콜스토리 출고기간 상충** — PDF "평일 14시 이전 당일" vs 이미지 "결제 완료 후 1-3일 발송" | §6-1 b8 |
| 3 | **페네핏 실제 운송장 택배사** — 파스토·로지플렉스는 3PL. 고객이 조회할 운송장은 그들이 계약한 택배사(CJ 등) 것 | §6-1 b1 · **최대 리스크** |
| 4 | **RE:펫 A/S 안내** | §6-1 b6 |
| 5 | **알로밍 출고 문구** — 내부메모 제거한 고객 노출 문구 | §6-1 b5 |
| 6 | **무통장 입금 계좌**(은행·번호·예금주) | §2-3 |
| 7 | **p9·p10·p11 실제 제품명·사진** — 이름에 폐기 브랜드 "캣코드"가 박혀 있고 이미지는 플레이스홀더 | §2-2 재노출 |

### 9-2. 정책 (mim/기획)
- **약관 관리자 편집 허용 여부** — 약관은 법무 검토 대상(`terms/page.tsx:14`). **사업자정보·배송/환불만 편집 허용, 약관 조문은 코드 유지**하는 절충 가능
- **적립금** — §2-1 문구를 지울지, §5-3을 구현할지

### 9-3. 표기
- **RE:펫 상품명의 `RePet` 영문** — 제조사 표기라 유지? 통일?

### 9-4. 적립금 정책
- 적립률(5%?) · 사용 단위 · 유효기간 · 최소 사용액 · 환불 시 회수 규칙

### 9-5. 찜하기
- **비로그인 찜 허용 여부** — 허용하면 localStorage가 다시 필요해져 제거 사유 재발. **로그인 필수 권장**

### 9-6. 배송 원본 D-1~D-4
- D-1 묶음 단위(⭐브랜드별) · D-2 구매확정 주체(⭐수동+7일 자동 — **§5-2로 확정**) · D-3 `orderStatus` vs `step`(⭐묶음이 진실) · **D-4 브랜드별 배송비 실제 청구** — ⚠️ 현재 단일 3,000원인데 브랜드마다 무료/3,000/3,500/4,000+할증. **표시와 청구가 어긋나면 전자상거래법 이슈** → 별도 스코프 즉시 후속

---

## 10. 실행 순서

```
[P0 — 오늘/내일]
 ├─ §2-1 "최대 5% 적립" 제거          fe/behavior-remove-fake-points    (5분, 단독)
 ├─ §2-2 PR #85 + opus finding 4건    be/fix-catcode-orphan             (진행 중)
 │     F1 jsonb_set brandName / F2 b4 참조 4곳 / F6 베이스라인 / F5 concerns
 └─ §6-3 무통장 입금확인 + KPI        fe/behavior-admin-deposit-confirm (계약무변경·가성비 최대)

[P1 — 저비용 즉효]
 ├─ §4-1 관리자 헤더 → 홈             fe/behavior-admin-home-link
 ├─ §8-1 /selection → /shop           fe/behavior-selection-redirect
 ├─ §3-1 "백조오브제 Audit"           fe/design-brand-naming
 ├─ §3-2 RE:펫 통일 (정본+DB)         be/brand-rename-repet
 └─ §6-2-1 기본배송지 프리필          fe/behavior-checkout-prefill

[P2 — 선행 리팩터]
 └─ §5-1 주문상태 SSOT ⚠️단독 머지    refactor/order-status-ssot
        └─→ §5-2 구매확정 + 자동확정 7일   contract/order-confirm → be/… → fe/…
                  └─→ §5-3 적립금 원장     contract/points-ledger → be/… → fe/…

[P2 — 병렬]
 ├─ §7 찜하기 재설계                  contract/wishlist → be/… → fe/…
 ├─ §4-2 약관 CMS                     contract/legal-settings → be/… → fe/…
 └─ §4-3 브랜드 배송정책 관리자 편집  contract/brand-shipping-policy → be/… → fe/…
        └─ (P1 GS Postbox 실측 선행)

[P3 — 배송 본체]
 └─ contract/shipment-per-brand → be/order-shipments → fe/admin-shipments → fe/mypage-tracking-modal
```

**규칙**: `contract/*`·`refactor/order-status-ssot`는 **단독 머지**(§0-2) · 모든 PR **§8-6 삼중 게이트**(opus + codex + Playwright 프리뷰) · 화면 바뀌면 **visual 베이스라인 동봉**(§8-4-4) · **정본만 고치면 화면 안 바뀐다**(DB 마이그레이션 동반, §3-2·§2-2 F1이 실제 사례)

---

## 11. 토스 심사

- **코드 전부 해소**: 가격표시 ✅(#76) · 사업자정보 ✅(#58·#82) · 약관/개인정보 ✅ · 교환환불 ✅(#82 `/refund-policy`) · 결제화면 ✅(테스트키·위젯 렌더 확인)
- **유일 병목 = 실판매가 확정**(§9-1-1). 현재 99,000원 임시값 + 대표님이 직접 입력하신 것으로 보이는 **2건(125,000원=p6 / 99,000원=p14)** 확인 필요
- **대표님**: 도메인 → 네이버·카카오 키 → 토스 심사(서류 4종: 사업자등록증·통신판매업신고증·신분증·**사업자명의 통장사본**)
- **개발자(심사 후)**: 라이브키 교체 10분 + 웹훅 등록 + 실카드 소액 결제·취소 실측
