create table public.order_action_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  member_id uuid not null references public.members(id) on delete restrict,
  request_type text not null check (request_type in ('CANCEL', 'REFUND')),
  brand_id text not null,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  requested_amount integer not null check (requested_amount > 0),
  reason text not null check (length(trim(reason)) between 1 and 200),
  status text not null default 'REQUESTED' check (status in ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index order_action_requests_order_idx on public.order_action_requests (order_id, created_at desc);
create index order_action_requests_pending_idx on public.order_action_requests (status, created_at desc)
  where status = 'REQUESTED';
create unique index order_action_requests_active_brand_idx
  on public.order_action_requests (order_id, brand_id, request_type)
  where status in ('REQUESTED', 'APPROVED');

alter table public.order_action_requests enable row level security;

