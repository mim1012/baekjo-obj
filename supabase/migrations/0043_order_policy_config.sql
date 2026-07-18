-- 0043_order_policy_config.sql — 주문 정책(무통장입금 예약 TTL) 싱글턴 테이블
-- 접근 경로: 서버(secret key)만. 클라이언트 직접 접근 없음 → RLS on + 정책 없음.
-- 주문 정책 config({ bankTransferTtlHours: number })를 한 행(id='default')에 jsonb 로 통째로 담는다.
-- 관리자 주문 정책 화면(/admin/order-policy)이 저장하면 POST /api/orders 가 주문 생성 시
-- resolveBankTransferTtlMs 로 같은 행을 읽어 무통장입금 재고 선점 만료 시각을 정한다.
-- seed 행은 필요 없다 — repo 가 upsert(id='default') 로 없으면 만들고 있으면 덮는다. 행이 없거나
-- 값이 깨졌거나 테이블 조회 자체가 실패해도 주문 생성은 기본 72시간으로 폴백한다
-- (config 장애가 주문 생성 실패로 번지면 안 된다 — orderPolicy/repo.ts 주석 참고).

create table public.order_policy_config (
  id text primary key default 'default',
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.order_policy_config enable row level security;
