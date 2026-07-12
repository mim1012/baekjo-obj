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

## ② 확인 방법

**SQL — dead-letter 목록 조회** (Supabase SQL Editor 또는 service role 접속):

```sql
select id, payment_key, total_price, delivery_fee, reclaim_attempts, last_reclaim_error,
       expires_at, created_at
from orders
where reclaim_dead = true
order by created_at asc;
```

**Vercel 로그** — `logServerError`가 아래 두 패턴으로 시끄럽게 남긴다(대시보드 검색어):

- `[GET /api/cron/reconcile-confirming] dead-letter 처리 orderId=<id> attempts=<n>`
- 직전 실패 사유 라인(신원 불일치/금액 불일치/네트워크 등)은 같은 orderId로 바로 위에 있다.

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
