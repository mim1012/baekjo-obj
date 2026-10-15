# 카카오 알림톡(솔라피) 운영 가이드

주문 이벤트가 실제로 일어났을 때 고객에게 카카오 알림톡을 보낸다. 발송은 솔라피(Solapi) REST API
(`POST /messages/v4/send`, `type: "ATA"`, 대체문자 발송 안 함)를 쓴다. 템플릿 문구는 카카오 승인본이라
코드에서 바꾸지 않는다. 변수 이름·ID는 `src/lib/notifications/alimtalkMessages.ts`가 보관한다.

## 코드 구성

| 파일 | 역할 |
| --- | --- |
| `src/lib/notifications/alimtalkMessages.ts` | 템플릿 레지스트리, `buildAlimtalkMessage`, 주문 → 발송 목록(`resolveAlimtalkMessages`) 순수 함수 |
| `src/lib/notifications/alimtalk.ts` | 솔라피 클라이언트 `sendAlimtalk`(HMAC 인증, 안전 스위치, transport 주입) — `server-only` |
| `src/lib/notifications/alimtalkNotify.ts` | `notifyAlimtalkAfter(trigger)` — Next `after()`로 응답 이후 실행, 실패는 로그만 — `server-only` |
| `scripts/solapi-alimtalk-test.mjs` | 템플릿별 수동 발송 확인 스크립트 |

## 이벤트 → 템플릿 → 발송 지점

모든 지점은 "이번 호출이 실제로 상태를 바꿨다"는 신호가 있을 때만 알림을 예약한다(멱등 재호출·경합 패배에는 보내지 않음).

| 이벤트 | 템플릿 | 발송 지점 | 중복 방지 신호 |
| --- | --- | --- | --- |
| 주문결제완료(카드) | 주문결제완료 | `applyPaymentAction`(`src/lib/payments/execute.ts`) — confirm·return·webhook·reconcile 공통 | `setOrderPaid`가 1행 반환 |
| 주문결제완료(무통장) | 주문결제완료 | 관리자 `PATCH /api/admin/orders/[id]` | `applyOrderUpdates` → `paymentConfirmed`(입금대기→결제완료 CAS 1행) |
| 주문제작상품 안내 | 주문제작상품안내 | 결제완료 알림 직후, 주문에 `made_to_order` 동의 기록이 있을 때 그 상품명으로 | 결제완료와 동일 |
| 배송출발 | 배송출발 | 관리자 `PATCH /api/admin/orders/[id]/shipments/[brandId]` | `decideShipmentNotification`: 상태가 배송중으로 새로 바뀜 + 운송장 있음, 또는 이미 배송중인데 송장이 없다가 이번에 처음 등록됨 |
| 배송완료 | 배송완료 | 위와 동일 | 상태가 배송완료로 새로 바뀜 |
| 구매확정 | 구매확정 | 고객 `POST /api/orders/[id]/shipments/[brandId]/confirm` | `confirmShipmentIfDelivered`가 true |
| 주문취소접수 | 주문취소접수 | 고객 `POST /api/orders/[id]/cancel-request`, `POST /api/orders/[id]/action-requests` | CAS 1행 / 요청 생성 RPC 성공 |
| 주문취소완료 | 주문취소완료 | 관리자 환불 확정 `POST /api/admin/orders/[id]/refunds`(실제 환불된 금액·상품) **만** | 이번 요청이 환불을 SUCCEEDED로 확정함(이미 SUCCEEDED인 재요청은 조기 반환) |
| 교환접수·반품접수 | 교환접수·반품접수 | 고객 `POST /api/orders/requests` | INSERT 성공(열린 요청 중복은 23505로 실패) |
| 교환처리완료·반품처리완료 | 교환처리완료·반품처리완료 | 관리자 `PATCH /api/admin/order-requests/[id]` | 직전 상태가 `completed`가 아니었다가 `completed`로 바뀜 |

상품명은 첫 상품 + 상품이 더 있으면 ` 외 N건`(브랜드·판매자 단위 이벤트는 해당 상품만, 취소·환불은 요청 상품만).
결제금액·취소금액은 `39,000` 형식(템플릿이 `원`을 붙임). 택배사는 `CARRIER_LABELS`의 한글 라벨.

**주문취소완료는 돈이 실제로 돌아간 경우에만** 보낸다. 결제완료 건의 상품별 취소 `complete`는 SUCCEEDED 환불 행이 선행돼야 하므로
환불 확정에서 이미 알렸고(중복 방지), 미결제(결제대기·입금대기) 취소는 고객이 결제한 적이 없어 환불 문구가 맞지 않아 보내지 않는다.
따라서 관리자 `PATCH /api/admin/orders/[id]`의 전체 취소·`action-requests` complete는 알림톡을 보내지 않는다.
(`PATCH`의 `paymentStatus=환불완료`는 `validate()`가 400으로 거절해 도달할 수 없다 — 테스트로 고정.)

## 안전 스위치(환경변수)

| 변수 | 의미 |
| --- | --- |
| `ALIMTALK_ENABLED` | 정확히 `"true"`일 때만 발송. 아니면 `[alimtalk] skipped (disabled)` 로그 후 종료(기본 OFF) |
| `SOLAPI_API_KEY` / `SOLAPI_API_SECRET` / `SOLAPI_PF_ID` | 하나라도 없으면 로그 후 건너뜀(예외 없음) |
| `ALIMTALK_TEST_RECIPIENT` | (선택) 설정하면 모든 메시지를 고객 번호 대신 이 번호로만 발송하고 리다이렉트를 로그로 남김 |

- **운영 밖 fail-closed**: `VERCEL_ENV !== 'production'`(로컬은 `VERCEL_ENV`가 없음)이고 `ALIMTALK_TEST_RECIPIENT`가 없으면
  `[alimtalk] skipped (non-production without ALIMTALK_TEST_RECIPIENT)` 로그 후 건너뛴다.
- 솔라피 응답: HTTP 2xx여도 본문 `statusCode`가 문자열이고 `"2000"`이 아니면 실패(코드·메시지 로그), `failedMessageList`가 있어도 실패. 성공 시 `messageId`를 로그한다.
- 전화번호는 숫자만 남겨 `01X` 10~11자리가 아니면 건너뛴다(`+82` 접두는 `0`으로 변환).
- 로그에는 전화번호를 `010****5678`로만 남기고 시크릿·인증 헤더는 남기지 않는다.
- 알림은 `after()`로 응답 이후에 실행되고 모든 예외를 삼킨다 — 결제·배송·취소 응답을 늦추거나 깨뜨리지 않는다.

## 로컬에서 시험하기

0. 로컬/Preview는 `ALIMTALK_TEST_RECIPIENT` 없이는 발송되지 않는다(fail-closed).
1. `.env.local`에 `ALIMTALK_ENABLED=true`, `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_PF_ID`를 넣고
   **반드시** `ALIMTALK_TEST_RECIPIENT=<내 번호>`도 넣는다(없으면 staging 주문의 고객 번호로 실제 발송된다).
2. 로컬/staging 서버에서 주문 이벤트(입금확인, 송장 등록 등)를 일으키면 테스트 번호로만 도착한다.
3. 템플릿 단위 확인은 스크립트로:
   ```powershell
   node --env-file=.env.solapi.local scripts/solapi-alimtalk-test.mjs list
   node --env-file=.env.solapi.local scripts/solapi-alimtalk-test.mjs send orderPaid 01012345678        # 드라이런(본문만 출력)
   node --env-file=.env.solapi.local scripts/solapi-alimtalk-test.mjs send orderPaid 01012345678 --yes  # 실제 발송
   ```
4. 단위 스펙은 네트워크 없이: `npx playwright test --project=notifications`.

## 배포(Vercel) 환경변수

Production/Preview에 `ALIMTALK_ENABLED`, `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_PF_ID`를 등록한다.
처음에는 `ALIMTALK_ENABLED`를 비워 두고 배포 → Preview/staging에서 `ALIMTALK_TEST_RECIPIENT`로 확인 →
Production에서만 `ALIMTALK_ENABLED=true`(그리고 `ALIMTALK_TEST_RECIPIENT`는 비움). Preview에는
`ALIMTALK_TEST_RECIPIENT`를 항상 설정해 고객에게 오발송되지 않게 한다. 솔라피 잔액이 부족하면 발송이
실패(로그만 남음)하므로 잔액을 주기적으로 확인한다.

## 자동 구매확정 크론 연결 (0179)

7일 자동 구매확정 크론(`/api/cron/auto-confirm-shipments`)도 확정한 송장마다 구매확정 알림톡을 보낸다.

- 마이그레이션 `0179_auto_confirm_returning_rows.sql`이 `auto_confirm_paid_delivered_shipments_rows(p_cutoff, p_confirmed_at)`
  를 추가한다. 선택·갱신 로직과 권한(service_role 전용)은 0044의 count 함수와 같고, `UPDATE ... RETURNING`으로
  확정된 `(order_id, brand_id, confirmed_at)` 행을 돌려준다. 기존 count 함수는 그대로 남는다.
- 크론은 행마다 `purchaseConfirmed`를 예약한다(상품명은 해당 브랜드 상품만, 구매확정일은 `confirmed_at`의 KST 날짜).
  한 건의 실패는 다른 건과 크론 응답에 영향을 주지 않는다. 응답은 `{ ok, confirmed, notified }`.
- **운영 반영 순서: 0179를 운영 DB에 코드 배포 전 또는 함께 적용한다.** 미적용 상태로 코드가 먼저 나가도
  크론은 PGRST202/42883을 감지해 기존 count 함수로 폴백하므로 확정은 정상 수행되지만, 그 실행분은
  알림톡이 발송되지 않고(경고 로그 `0179 RPC 미적용`) 이후 재발송 수단도 없다.
## 범위 밖(이번 단계에서 보내지 않는 것)

- 스마트택배(SweetTracker) 자동 배송완료 전이 — 현재 배송완료는 관리자 송장 PATCH로만 바뀐다.
- 주문 단위 레거시 송장 경로(`orders.carrier`/`tracking_number` 직접 수정) — 업체별 송장 경로만 연결했다.
- 미결제 만료·고아 정리(`reclaim-stock` 크론)·결제 거절 복원 — 고객이 취소한 것이 아니므로 취소완료를 보내지 않는다.
- 미결제 취소(관리자 전체 취소 RPC)·상품별 `complete` — 환불이 아니므로 보내지 않는다(위 설명).

## 알려진 한계

- 발송 이력을 DB에 남기지 않는다(마이그레이션 없음). 응답 후 실행 중 서버리스 함수가 중단되면 그 건은 유실될 수 있다.
- 송장 상태를 배송중에서 되돌렸다가 다시 배송중으로 올리면 배송출발이 다시 발송된다(이전 상태 비교만 함).
- 아웃박스가 없다 — 발송 실패·유실 건은 재시도되지 않는다.
- 교환·반품 처리완료와 송장 PATCH는 DB 쓰기가 CAS가 아니라 "직전 상태 읽기" 비교라, 같은 요청이 정확히 동시에
  두 번 들어오면(더블클릭 등) 드물게 중복될 수 있다. 부분환불도 complete RPC가 동시 재호출에 기존 성공 행을 돌려주므로 마찬가지다.
