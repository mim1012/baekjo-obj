# 무통장 입금계좌 설정 및 주문 완료 노출 구현계획

> **Worker note:** 아래 작업을 순서대로 실행한다. 각 작업은 독립 검증 가능한 단위이며, 완료된 작업의 검증 결과를 확인한 뒤 다음 작업으로 진행한다.

**Goal:** 관리자가 은행명·계좌번호·예금주를 관리자 페이지에서 설정하고, 무통장입금 주문 고객이 주문 완료 화면에서 해당 입금 정보를 확인하도록 한다.

**Architecture:** 기존 `order_policy_config` 싱글턴 설정과 `/admin/order-policy` 관리자 API를 확장한다. 계좌 정보는 주문 생성 시 서버가 설정값을 읽어 주문 row에 스냅샷으로 저장하고, 주문 응답에 포함한다. 따라서 관리자가 이후 계좌를 변경해도 이미 생성된 주문의 입금 안내는 주문 당시 정보와 일치한다. 고객 화면은 현재의 sessionStorage 주문 스냅샷을 사용하므로 별도 공개 설정 API나 주문번호 기반 공개 조회를 추가하지 않는다.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase/Postgres JSONB, Playwright.

**Work Scope:**
- **In scope:** 관리자 계좌 설정 UI/API/정규화, 설정 저장 스키마 확장, 주문 생성 시 계좌 스냅샷, 주문 완료 화면의 무통장입금 안내, 기존 회원·게스트 주문 경로 및 E2E 검증.
- **Out of scope:** 복수 계좌/브랜드별 계좌, 가상계좌 발급·자동 입금대사, 고객의 입금자명 입력, 계좌번호 변경 이력 화면, 계좌를 별도 공개 endpoint로 제공하는 기능.

**Assumptions:** 단일 사업자 입금 계좌를 사용한다. 필드는 `bankName`, `accountNumber`, `accountHolder` 세 가지 문자열이며, 세 값이 모두 유효할 때만 무통장 주문에 스냅샷한다. 설정이 비어 있으면 주문 생성은 막지 않고 주문 완료 화면에 “입금 계좌가 아직 등록되지 않았습니다. 관리자에게 문의해 주세요.”를 표시해 운영 장애를 숨기지 않는다.

**Verification Strategy:**
- **Level:** e2e + integration/unit + build/lint
- **Command:** `npx playwright test tests/golden/member-order-journey.spec.ts tests/golden/admin-crud-order-policy.spec.ts --project=products --project=admin`
- **What it validates:** 관리자가 계좌 정보를 저장하고, 고객이 무통장 주문을 생성한 뒤 주문 완료 화면에서 은행명·계좌번호·예금주를 보는 흐름, 설정 변경 후 기존 주문 스냅샷 불변, 잘못된 입력 거부 및 권한 보호.

---

## 파일 구조 매핑

- **Create:** `supabase/migrations/0102_bank_transfer_account_snapshot.sql` — 설정 JSONB의 계좌 필드와 주문 row의 주문시점 스냅샷 컬럼을 지원하는 가산 migration.
- **Modify:** `src/lib/orderPolicy/config.ts` — 설정 타입, 기본값, 입력 정규화 및 계좌 유효성 규칙.
- **Modify:** `src/lib/orderPolicy/repo.ts` — 계좌 설정을 포함한 조회/저장과 주문 생성용 스냅샷 조회 함수.
- **Modify:** `src/app/api/admin/order-policy/route.ts` — 관리자 GET/PUT payload 검증 및 정규화.
- **Modify:** `src/lib/storage.ts` — 관리자 설정 client helper와 주문 응답 타입 파싱 계약.
- **Modify:** `src/types/index.ts` — `BankTransferAccount` 및 `Order.bankTransferAccount` nullable 필드.
- **Modify:** `src/lib/orders/repo.ts` — `bank_transfer_account` select/insert/row mapping.
- **Modify:** `src/app/api/orders/route.ts` — 무통장입금일 때만 설정 스냅샷을 주입해 주문에 저장.
- **Modify:** `src/app/admin/order-policy/page.tsx` — 은행명·계좌번호·예금주 입력/저장/오류 UI.
- **Modify:** `src/app/order-complete/page.tsx` — 무통장입금 주문의 입금 안내 카드.
- **Modify:** `tests/products/order-policy-config.spec.ts` — 설정 정규화 단위 테스트.
- **Modify:** `tests/golden/admin-crud-order-policy.spec.ts` — 관리자 계좌 CRUD 및 잘못된 payload E2E.
- **Modify:** `tests/golden/member-order-journey.spec.ts` — 고객 주문 완료 화면 노출 E2E.
- **Modify:** `tests/golden/all-pages-smoke.spec.ts` — 계좌 미설정/기본 주문 완료 smoke 계약이 깨지지 않는지 확인.

## 작업 분해

### Task 1: 설정 및 주문 스냅샷 데이터 계약 확정

**Dependencies:** None. 이 작업은 이후 모든 작업의 인터페이스를 만든다.

**Files:** `supabase/migrations/0102_bank_transfer_account_snapshot.sql`, `src/types/index.ts`, `src/lib/orderPolicy/config.ts`

- [ ] `BankTransferAccount`를 `{ bankName: string; accountNumber: string; accountHolder: string }`로 정의하고 `Order.bankTransferAccount?: BankTransferAccount`를 추가한다.
- [ ] `OrderPolicyConfig`에 `bankTransferAccount: BankTransferAccount | null`을 추가하고 기본값은 `null`로 둔다.
- [ ] 은행명·예금주는 공백 제거 후 1~50자, 계좌번호는 공백 제거 후 숫자·하이픈만 허용하는 정규화 함수를 만든다. 세 필드 중 하나라도 비어 있거나 형식이 깨지면 `null`로 접는다.
- [ ] `order_policy_config.value`의 기존 JSON을 보존하면서 누락된 계좌 필드는 `null`로 읽도록 한다.
- [ ] `orders`에 `bank_transfer_account jsonb` nullable 컬럼을 추가하고, `jsonb_typeof`가 object인 경우에만 저장되는 CHECK 제약을 둔다.
- [ ] migration은 기존 주문을 변경하지 않고, 기존 무통장 주문의 스냅샷은 `null`로 남긴다.
- [ ] 검증: `npx vitest`는 사용하지 않으므로 기존 프로젝트 방식에 맞춰 `npx playwright test tests/products/order-policy-config.spec.ts`를 실행하고, 정규화 테스트가 통과해야 한다.

### Task 2: 서버 설정 저장과 주문 생성 스냅샷 연결

**Dependencies:** Task 1 완료.

**Files:** `src/lib/orderPolicy/repo.ts`, `src/app/api/admin/order-policy/route.ts`, `src/lib/storage.ts`, `src/lib/orders/repo.ts`, `src/app/api/orders/route.ts`

- [ ] `getOrderPolicyConfig`/`saveOrderPolicyConfig`가 확장된 config를 그대로 정규화해 읽고 upsert한다.
- [ ] `GET /api/admin/order-policy`와 `PUT /api/admin/order-policy`가 `requireAdmin`을 유지하고, 계좌 필드가 포함된 payload만 저장한다. 계좌 필드가 명시적으로 `null`이면 계좌 삭제로 처리한다.
- [ ] `InsertOrderInput`과 `OrderRow`에 nullable `bankTransferAccount`를 추가하고, `SELECT_COLUMNS`, insert mapping, `rowToRecord`를 일치시킨다.
- [ ] 무통장입금 주문 생성 시 서버가 `getOrderPolicyConfig()`를 조회해 `bankTransferAccount`를 주문에 주입한다. 카드 주문은 계좌 설정을 읽거나 저장하지 않는다.
- [ ] 설정 조회 실패 시 계좌 스냅샷은 `null`로 두되 주문 생성 자체는 기존 정책대로 진행하고 서버 로그를 남긴다.
- [ ] `storage.ts`의 관리자 설정 parser가 계좌 필드 타입을 검증하고, `createOrder`가 반환한 스냅샷을 그대로 sessionStorage에 저장하도록 한다.
- [ ] 검증: 관리자 API에 비관리자 GET/PUT를 호출했을 때 거부되고, 정상 payload는 저장 후 같은 값으로 read-back 되어야 한다. 계좌 필드 누락/비문자열 payload는 400이어야 한다.

### Task 3: 관리자 설정 화면 구현

**Dependencies:** Task 2 완료.

**Files:** `src/app/admin/order-policy/page.tsx`

- [ ] 기존 자동취소 설정 카드 안에 “무통장 입금계좌” 섹션을 추가한다.
- [ ] `은행명`, `계좌번호`, `예금주` 세 입력을 로드된 서버값으로 초기화하고, 로딩·조회실패 중에는 기존 게이팅대로 입력과 저장을 막는다.
- [ ] 저장 payload에 자동취소 설정과 계좌 설정을 함께 보내 기존 값을 덮어쓰지 않게 한다. 세 입력이 모두 비어 있으면 계좌 삭제(null)로 저장한다.
- [ ] 일부만 입력된 경우 “은행명·계좌번호·예금주를 모두 입력하거나 모두 비워 주세요.”를 표시하고 요청하지 않는다.
- [ ] 저장 성공 후 서버 정규화 결과를 화면에 반영하고, 저장 실패/조회 실패를 `aria-live` 피드백으로 알린다.
- [ ] 화면에 “새 주문부터 적용되며 이미 생성된 주문의 안내 계좌는 주문 당시 정보가 유지된다”는 설명을 표시한다.
- [ ] 검증: 관리자 브라우저에서 입력 → 저장 → 새로고침 → 값 유지, 계좌 삭제, 일부 입력 차단을 확인한다.

### Task 4: 고객 주문 완료 화면에 계좌 안내 노출

**Dependencies:** Task 2 완료. Task 3과 병렬 실행 가능.

**Files:** `src/app/order-complete/page.tsx`

- [ ] `OrderDetailCard`에서 `order.paymentMethod === '무통장입금'`인 경우에만 입금 안내 영역을 렌더링한다.
- [ ] 유효한 스냅샷이 있으면 `은행명`, `계좌번호`, `예금주`, `입금 상태: 입금대기`를 명확히 표시한다.
- [ ] 계좌번호는 text로 표시하고 별도 탈출 처리된 HTML 출력만 사용한다. 클립보드 복사 버튼은 이번 범위에서 추가하지 않는다.
- [ ] 스냅샷이 없으면 계좌를 추측하거나 현재 설정을 브라우저에서 직접 조회하지 않고, 관리자 문의 안내를 표시한다.
- [ ] 카드결제 완료/실패/pending 화면에는 무통장 계좌 안내가 나타나지 않게 한다.
- [ ] 검증: 세션 주문 스냅샷을 사용한 완료 화면에서 세 필드가 나타나고, 카드 주문 및 계좌 미설정 주문에서는 나타나지 않는지 확인한다.

### Task 5: 회귀 및 데이터 무결성 테스트 보강

**Dependencies:** Task 1~4 완료.

**Files:** `tests/products/order-policy-config.spec.ts`, `tests/golden/admin-crud-order-policy.spec.ts`, `tests/golden/member-order-journey.spec.ts`

- [ ] 설정 단위 테스트에 완전한 계좌 정규화, 공백 제거, 일부 필드 누락→null, 잘못된 문자 계좌번호→null, 기존 설정 필드 보존 케이스를 추가한다.
- [ ] 관리자 골든 테스트에서 원래 설정을 read-back으로 보존한 뒤 계좌를 저장하고, GET read-back으로 세 값을 대조하고, 잘못된 payload가 400이며 값이 변하지 않는 것을 검증한다. `afterEach`에서 원래 설정을 복원한다.
- [ ] 회원 주문 여정에서 staging 설정 계좌를 테스트 시작 시 확인하고, 무통장 주문 완료 페이지에서 은행명·계좌번호·예금주를 각각 검증한다. 테스트가 실제 설정을 임의로 덮어쓰지 않도록 계좌 설정 fixture 또는 사전 조건을 사용한다.
- [ ] 주문 생성 후 관리자 설정을 바꿔도 주문 완료 session snapshot의 계좌가 바뀌지 않는 스냅샷 불변 테스트를 추가한다.
- [ ] 기존 smoke 및 카드 결제 테스트에서 계좌 안내가 잘못 노출되지 않는지 확인한다.

### Task 6 (Final): 전체 검증 및 수동 QA

**Dependencies:** Task 1~5 완료. 병렬화하지 않는다.

- [ ] `npm run lint` 실행: 오류 0.
- [ ] `npx tsc --noEmit` 실행: 오류 0.
- [ ] `npx playwright test tests/products/order-policy-config.spec.ts tests/golden/admin-crud-order-policy.spec.ts tests/golden/member-order-journey.spec.ts --project=products --project=admin` 실행: 해당 테스트 PASS.
- [ ] `npx playwright test --project=products --project=admin --project=tracking --project=security` 실행: 기존 회귀 없음.
- [ ] staging에서 실제 관리자 로그인으로 `/admin/order-policy`에 계좌를 설정하고 저장 후 새로고침해 read-back을 확인한다.
- [ ] staging에서 회원 무통장 주문을 생성해 `/order-complete`에서 은행명·계좌번호·예금주를 육안 확인하고, `/mypage?tab=orders` 이동 후 주문 상태가 `입금대기`인지 확인한다.
- [ ] 관리자에서 계좌를 변경한 뒤 기존 주문의 화면 안내가 바뀌지 않는지 확인한다. 테스트 완료 후 staging 설정을 원래 값으로 복원한다.

## 자체 점검

- 요구사항 커버리지: 관리자 설정 UI/API(Task 2~3), 고객 노출(Task 4), 주문 당시 값 보존(Task 1~2·5), 권한/입력 검증(Task 2·5), E2E와 수동 QA(Task 6)로 모두 대응한다.
- 데이터 안전성: 기존 주문을 backfill하지 않고 nullable 스냅샷으로 유지하며, 공개 설정 endpoint를 만들지 않아 계좌 설정의 불필요한 공개 범위를 늘리지 않는다.
- 의존성: Task 1→2→3/4→5→6 순서이며, Task 3과 Task 4만 서로 다른 파일을 수정하므로 병렬 실행 가능하다.
- 회귀 위험: 주문 row select/insert 타입이 함께 바뀌므로 Task 2에서 모든 mapping을 동시 수정하고, 최종 TypeScript와 골든 주문 여정으로 검증한다.
