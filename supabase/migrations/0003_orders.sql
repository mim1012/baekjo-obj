-- 0003_orders.sql — 주문 테이블 (Supabase SQL Editor에서 1회 실행)
-- 접근 경로: 서버(secret key)만. 클라이언트 직접 접근 없음 → RLS on + 정책 없음.
-- member_id는 게스트 결제를 허용하므로 null 가능. 회원 탈퇴 시 주문 이력은 남기고 소유자만 끊는다.

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete set null,
  customer_name text not null default '',
  phone text not null default '',
  address text not null default '',
  items jsonb not null,
  total_price int not null default 0,
  delivery_fee int not null default 0,
  payment_method text not null default '',
  order_status text not null default '주문접수',
  payment_status text not null default '',
  delivery_status text not null default '',
  tracking_number text,
  delivery_memo text,
  created_at timestamptz not null default now()
);

-- 내 주문 조회(listOrdersByMember)가 member_id로 필터하므로 인덱스를 건다.
create index orders_member_id_idx on public.orders (member_id);

alter table public.orders enable row level security;
