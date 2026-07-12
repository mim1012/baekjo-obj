-- 0022: orders 테이블에 결제·택배 컬럼 신설 (가산 — 기존 컬럼 무변경, nullable)
-- carrier: 관리자가 입력하는 택배사 코드(조회 링크용, API 연동 없음).
-- payment_key/paid_at: 토스 결제 승인 결과 기록(웹훅 없이 confirm 라우트가 채움).
-- expires_at: 카드결제 PENDING 주문의 재고 선점 만료 시각(무통장입금은 null — 만료 복원 대상 아님).

alter table public.orders
  add column if not exists carrier text,
  add column if not exists payment_key text,
  add column if not exists paid_at timestamptz,
  add column if not exists expires_at timestamptz;

-- 만료 복원 cron(listExpiredPendingOrders)이 payment_status='결제대기' and expires_at<now() 로
-- 스캔하므로 인덱스를 건다. expires_at이 null인 무통장입금 행은 인덱스에서 자연히 제외된다.
create index if not exists orders_expires_at_idx on public.orders (expires_at)
  where expires_at is not null;

-- 이중 승인 기록을 DB 레벨에서도 차단한다(애플리케이션의 setOrderPaid WHERE 조건부 전이가
-- 1차 방어, 이 유니크 인덱스가 2차 방어). 같은 payment_key가 두 주문에 기록되는 경우는
-- 정상 흐름에서 절대 발생하지 않으므로(토스 paymentKey는 결제 1건당 1개) 위반은 곧 버그다.
create unique index if not exists orders_payment_key_uniq on public.orders (payment_key)
  where payment_key is not null;
