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
