# 결제 dead-letter 수동 정산 runbook

> 대상: `orders.reclaim_dead = true`로 표시된 주문 — '승인중' 상태기계(§ AGENTS.md, 웹훅
> 웨이브 W1)에서 자동 정산(reconcile-confirming cron)이 5회 재시도 후 포기한 건.
> 자동 알림 연동(admin 대시보드/메일)은 이 runbook의 범위 밖 — 후속 웨이브 항목이다.
> 현재는 이 문서의 절차를 **사람이 직접 수행**해야 한다.
> '결제대기' 주문이 reclaim-stock cron에서 5회 연속 복원 실패로 dead-letter 처리된 경우도
> 동일한 절차(②~④)를 따른다 — 로그 검색어의 라우트 이름(`reclaim-stock`)만 다르고, SQL
> 조회·정산·리셋 정책은 동일하다(단, ③(b)는 `cancel_confirming_and_restore` 대신 0024
> `cancel_order_reservation_and_restore`를 쓴다 — '결제대기' 전용이므로).

## ① dead-letter가 발생하는 조건

`GET /api/cron/reconcile-confirming`이 '승인중' 고아 주문(claim된 뒤 만료된 건)을 순회하며
`queryTossPayment`로 재조회할 때, 아래 세 경우 중 하나가 5회(`MAX_RECLAIM_ATTEMPTS`) 연속
발생하면 `markReclaimDead`가 호출돼 `reclaim_dead=true`로 표시된다. 표시된 주문은 이후
`listOrphanedConfirmingOrders`/`listExpiredPendingOrders` 양쪽에서 제외되어 cron이 더 이상
자동으로 건드리지 않는다 — 즉 사람이 개입하지 않으면 영구히 '승인중'으로 남는다.

1. **신원 불일치** — 토스 조회 응답의 `orderId`/`paymentKey`가 우리가 물어본 주문과 다름
   (극히 드묾, 위조/오배선 의심).
2. **금액 불일치(DONE인데 금액이 다름)** — 토스는 결제를 DONE으로 보고하는데
   `totalAmount !== order.totalPrice + order.deliveryFee` (데이터 오염 의심).
3. **5회 연속 불명** — 네트워크·타임아웃·토스 5xx가 5번 연속 발생(토스 쪽 장애 또는
   `payment_key` 자체가 없는 이상 상태 포함).
4. **★재무 예외 — 권위 DONE인데 주문이 이미 종결(환불 필요, R4 최종 라운드 추가)** —
   `confirmPayment.ts`(`applyAuthoritativeAction`)가 confirm/return/reconcile 어느 경로에서든
   토스 권위 조회로 `status==='DONE'`+금액일치를 확인했는데, 그 시점 우리 DB의 주문이 이미
   `결제취소`/`환불완료` 등으로 종결돼 있으면 **즉시(재시도 카운트 없이) 1회 만에**
   `markReclaimDead`가 호출된다. 이건 "판단을 못 내렸다"가 아니라 **"돈은 실제로 받았는데
   주문은 취소된 것으로 기록돼 있다"**는 뜻이라, 다른 세 조건(재시도 후 dead-letter)과 달리
   **가장 시급하게 사람이 봐야 하는 케이스**다 — 방치하면 고객 돈을 받고 물건도 안 보내고
   환불도 안 한 상태로 남는다. `reclaim-stock` cron도 동일한 이유(만료된 '결제대기' 주문을
   취소하기 전 확인했더니 DONE인데 금액이 안 맞는 경우)로 같은 방식으로 dead-letter 표시한다.

## ①-a 이 케이스와 나머지 세 케이스의 결정적 차이

1~3번은 "판정을 못 내려서" 5회 재시도 뒤 포기하는 것이라, ③(b) 미결제 취소 경로로 정산될
확률이 높다. **4번은 반대다 — 판정은 이미 확실히 끝났다(돈을 받았다).** 그런데도 우리 DB
상태와 상충하므로 자동으로 확정하지 않고 사람에게 넘기는 것뿐이다. 그래서 로그 검색 시
`★재무 예외`가 붙은 라인은 3번(단순 재시도 소진)과 구분해서 **최우선 처리**한다.

## ② 확인 방법

**SQL — dead-letter 목록 조회** (Supabase SQL Editor 또는 service role 접속):

```sql
select id, payment_key, total_price, delivery_fee, reclaim_attempts, last_reclaim_error,
       expires_at, created_at
from orders
where reclaim_dead = true
order by created_at asc;
```

**Vercel 로그** — `logServerError`가 아래 패턴으로 시끄럽게 남긴다(대시보드 검색어):

- `[GET /api/cron/reconcile-confirming] dead-letter 처리 orderId=<id> attempts=<n>` (①1~3)
- `[GET /api/cron/reclaim-stock] dead-letter 처리 orderId=<id> attempts=<n>` (①1~3, 결제대기 만료건)
- 직전 실패 사유 라인(신원 불일치/금액 불일치/네트워크 등)은 같은 orderId로 바로 위에 있다.
- `★재무 예외`가 붙은 라인(①4) — 가장 먼저 검색해서 처리한다:
  - `[confirmPayment] ★재무 예외 — 권위 DONE인데 주문이 이미 종결(...) orderId=<id>` —
    confirm/return/reconcile 어느 경로든 DONE을 확인한 즉시(재시도 카운트 없이 1회 만에)
    `markReclaimDead`가 호출된다.
  - `[GET /api/cron/reclaim-stock] ★재무 예외 — DONE인데 금액 불일치 orderId=<id>` — 만료된
    '결제대기' 주문을 취소하기 직전 확인 단계에서 발생. 이건 재시도 카운트(5회)를 거쳐
    dead-letter로 이어진다(신원 불일치·불명과 같은 경로) — 5번째 반복 전이라면 아직
    `reclaim_dead=true`가 아닐 수 있으니, 재시도 카운트와 무관하게 이 로그 라인 자체를
    보는 즉시 사람이 확인한다.

reconcile cron 응답 JSON(`checked/confirmed/restored/skipped/dead/deadOrderIds`)에도
`deadOrderIds`로 이번 회차에 새로 표시된 주문 ID가 노출된다 — 수동 모니터링 시 이 필드만
봐도 즉시 확인 가능.

## ③ 정산 절차

1. **토스 상점관리자**(https://developers.tosspayments.com 또는 상점 대시보드)에서
   `payment_key`로 실제 결제 상태를 눈으로 직접 확인한다(cron이 이미 5번 조회했지만, 사람이
   최종 확인 없이는 돈이 걸린 판단을 내리지 않는다 — 이중 확인 원칙).

2. **(a) 실결제가 확인된 경우** — 토스 상점관리자에 DONE으로 찍혀 있고 금액도 일치하면,
   `setOrderPaid`와 동일한 효과를 SQL로 직접 적용한다:

   ```sql
   update orders
      set payment_status = '결제완료',
          order_status = '결제완료',
          paid_at = now()
    where id = '<order-id>'
      and payment_status = '승인중';
   -- 영향 행 수가 0이면 이미 다른 경로로 처리된 것 — 재확인 후 중단.
   ```

3. **(b) 미결제가 확인된 경우** — 토스 상점관리자에 결제 기록이 없거나 CANCELED/EXPIRED/
   ABORTED면, 0026 RPC로 재고를 복원하며 취소 처리한다(cancel/reconcile과 동일 트랜잭션
   경로 — 수동 UPDATE로 취소만 하면 재고 복원이 누락된다):

   ```sql
   select cancel_confirming_and_restore('<order-id>');
   -- true = 취소+복원 수행, false = 이미 '승인중'이 아니라 no-op(재확인 필요).
   ```

4. **(c) ★재무 예외(①4) — 실결제 확인 + 우리 DB는 이미 종결된 경우** — 토스 상점관리자에
   DONE·금액일치로 찍혀 있는데, `orders` 테이블의 해당 주문이 이미 `결제취소`/`환불완료`거나
   (confirm/return/reconcile 케이스) 또는 재고 회수 직전에 걸린 만료 '결제대기'건인데 금액이
   안 맞는 경우(reclaim-stock 케이스)다. **주문을 자동으로 `결제완료`로 되돌리지 않는다** —
   이미 취소/재고 재배정 등 후속 업무 프로세스가 진행됐을 수 있어, 상태를 뒤집는 것 자체가
   또 다른 사고를 만들 수 있다. 대신:
   - 실제로 돈을 받았는데 물건을 보내야 하는 상황이면(주문이 실수로 취소된 경우) — 담당자
     확인 후 (a)와 동일한 SQL로 수동 확정하고, 어떤 근거로 되돌렸는지 이 이력을 별도로 남긴다.
   - 물건을 보낼 수 없는 상황(실제로 이미 취소·품절 등)이면 — **토스 상점관리자에서 해당
     `payment_key`로 결제취소/환불을 실행**한다(고객에게 돈을 돌려준다). `orders` 테이블은
     `결제취소`로 이미 맞는 상태이므로 추가 UPDATE는 불필요 — 토스 쪽 환불 처리만 하면 된다.
   - 둘 중 어느 쪽인지 애매하면 고객에게 직접 연락해 확인한 뒤 처리한다 — 자동화가 없는
     이유가 바로 이 판단(발송 여부)이 사람만 할 수 있어서다.

## ④ 처리 후 `reclaim_dead` 리셋 여부

**리셋하지 않는다 — 유지한다.** `reclaim_dead=true`는 "자동 처리에 실패해 사람이 개입했다"는
이력이다. ②·③을 거쳐 주문 상태(`결제완료`/`결제취소`)가 이미 정산됐으므로 cron이 다시 건드릴
필요가 없고(어차피 `listOrphanedConfirmingOrders`는 `payment_status='승인중'`도 함께 걸므로
정산 후엔 자동으로 제외됨), 플래그를 지우면 "이 주문이 자동화를 벗어나 수동 개입이 있었다"는
감사 흔적이 사라진다. 분쟁 대응(§ AGENTS.md 8-6 유사 원칙)을 위해 유지한다.

## ⑤ 후속 웨이브 항목(현재 범위 밖)

- dead-letter 발생 시 admin 대시보드에 실시간 카운트/목록 표시.
- dead-letter 발생 시 운영 메일/슬랙 알림 자동 발송.
- 위 두 항목은 이 runbook이 다루는 "사람이 SQL/Vercel 로그로 직접 확인·처리"하는 현재
  절차를 자동화하는 후속 작업이며, 이번 웹훅 웨이브(W1)의 스코프에는 포함되지 않는다.
