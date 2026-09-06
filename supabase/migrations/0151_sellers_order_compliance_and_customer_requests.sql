-- 판매자 실체, 상품-판매자 연결, 주문 동의 스냅샷, 교환/반품 요청, 마케팅 수신 상태.
-- 모든 테이블은 서버(service role) 전용이며 RLS 정책을 열지 않는다.

create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  legal_name text not null,
  representative_name text not null,
  business_registration_number text not null,
  mail_order_registration_number text not null,
  business_address text not null,
  phone text not null,
  email text,
  return_address text,
  status text not null default 'draft'
    check (status in ('draft', 'verified', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sellers enable row level security;

alter table public.products
  add column if not exists seller_id uuid references public.sellers(id) on delete restrict;

create index if not exists products_seller_id_idx on public.products (seller_id)
  where seller_id is not null;

alter table public.orders
  add column if not exists seller_groups jsonb not null default '[]'::jsonb,
  add column if not exists consent_records jsonb not null default '[]'::jsonb;

comment on column public.orders.seller_groups is
  '주문 시점 실제 판매자, 판매자별 상품/금액, 배송·반품 조건 스냅샷.';
comment on column public.orders.consent_records is
  '주문약관, 판매자별 제3자 제공, 주문제작 별도 동의의 버전·내용 해시·동의 시각 증적.';

-- 주문 후 판매자 또는 동의 전문을 소급 변경하지 못하게 DB에서 봉인한다.
create or replace function public.prevent_order_compliance_snapshot_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.seller_groups is distinct from old.seller_groups
     or new.consent_records is distinct from old.consent_records then
    raise exception 'ORDER_COMPLIANCE_SNAPSHOT_IMMUTABLE';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_compliance_snapshot_immutable on public.orders;
create trigger orders_compliance_snapshot_immutable
before update of seller_groups, consent_records on public.orders
for each row execute function public.prevent_order_compliance_snapshot_update();

create table if not exists public.customer_service_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  seller_key text not null,
  request_type text not null check (request_type in ('exchange', 'return')),
  reason text not null,
  status text not null default 'received'
    check (status in ('received', 'reviewing', 'approved', 'rejected', 'completed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_service_requests_member_idx
  on public.customer_service_requests (member_id, created_at desc);
create index if not exists customer_service_requests_order_idx
  on public.customer_service_requests (order_id, created_at desc);
create unique index if not exists customer_service_requests_open_uniq
  on public.customer_service_requests (order_id, member_id, seller_key, request_type)
  where status in ('received', 'reviewing', 'approved');

alter table public.customer_service_requests enable row level security;

create table if not exists public.member_marketing_preferences (
  member_id uuid primary key references public.members(id) on delete cascade,
  email_enabled boolean not null default false,
  sms_enabled boolean not null default false,
  policy_version text not null default 'marketing-2026-09-06',
  updated_at timestamptz not null default now()
);

alter table public.member_marketing_preferences enable row level security;

create table if not exists public.member_marketing_preference_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  email_enabled boolean not null,
  sms_enabled boolean not null,
  policy_version text not null,
  changed_at timestamptz not null default now()
);

create index if not exists member_marketing_preference_events_member_idx
  on public.member_marketing_preference_events (member_id, changed_at desc);

alter table public.member_marketing_preference_events enable row level security;

revoke all on public.sellers from anon, authenticated;
revoke all on public.customer_service_requests from anon, authenticated;
revoke all on public.member_marketing_preferences from anon, authenticated;
revoke all on public.member_marketing_preference_events from anon, authenticated;
