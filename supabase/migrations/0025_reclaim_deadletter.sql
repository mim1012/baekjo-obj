-- 0025: '승인중' 고아 대사(reconcile)·만료 재시도 추적용 dead-letter 컬럼 (웹훅 웨이브 W1)
-- reclaim_attempts/last_reclaim_error = 재시도 진단(U6 reconcile, U7 reclaim-stock cron 공용).
-- reclaim_dead = 최대 재시도(MAX_RECLAIM_ATTEMPTS) 초과 시 true로 표시해 다음 회차 cron이
-- 같은 실패건을 무한 반복 조회하지 않게 배제한다(listExpiredPendingOrders/listOrphanedConfirmingOrders
-- 둘 다 이 플래그로 필터).

alter table public.orders
  add column if not exists reclaim_attempts int not null default 0,
  add column if not exists last_reclaim_error text,
  add column if not exists reclaim_dead boolean not null default false;
