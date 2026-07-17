-- 0036_points_ledger.sql — 회원 적립금 원장 + 주문 생성 시 원자 차감
-- 원칙: points_ledger가 진실이고 members.points_balance는 읽기용 캐시다.
-- 모든 변경은 service_role 전용 RPC 안에서만 수행한다.

begin;

alter table public.members
  add column if not exists points_balance int not null default 0;

alter table public.members
  drop constraint if exists members_points_balance_nonnegative;

alter table public.members
  add constraint members_points_balance_nonnegative check (points_balance >= 0);

alter table public.orders
  add column if not exists used_points int not null default 0,
  add column if not exists payable_amount int not null default 0;

update public.orders
   set used_points = coalesce(used_points, 0),
       payable_amount = case
         when coalesce(payable_amount, 0) > 0 then payable_amount
         else coalesce(total_price, 0) + coalesce(delivery_fee, 0)
       end;

alter table public.orders
  drop constraint if exists orders_used_points_nonnegative;

alter table public.orders
  add constraint orders_used_points_nonnegative check (used_points >= 0);

alter table public.orders
  drop constraint if exists orders_payable_amount_nonnegative;

alter table public.orders
  add constraint orders_payable_amount_nonnegative check (payable_amount >= 0);

create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  type text not null check (type in ('spend', 'restore', 'earn', 'adjust')),
  amount int not null check (amount <> 0),
  balance_after int not null check (balance_after >= 0),
  idempotency_key text not null unique,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists points_ledger_member_created_idx
  on public.points_ledger (member_id, created_at desc);

create index if not exists points_ledger_order_idx
  on public.points_ledger (order_id);

alter table public.points_ledger enable row level security;

create or replace function public.create_order_with_points(
  p_member_id uuid,
  p_customer_name text,
  p_phone text,
  p_address text,
  p_items jsonb,
  p_total_price int,
  p_delivery_fee int,
  p_payment_method text,
  p_order_status text,
  p_payment_status text,
  p_delivery_status text,
  p_tracking_number text default null,
  p_delivery_memo text default null,
  p_expires_at timestamptz default null,
  p_points_to_use int default 0
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points int := greatest(coalesce(p_points_to_use, 0), 0);
  v_gross_amount int := coalesce(p_total_price, 0) + coalesce(p_delivery_fee, 0);
  v_payable_amount int := 0;
  v_member record;
  v_balance_after int;
  v_order public.orders;
begin
  if p_total_price is null or p_total_price < 0 or p_delivery_fee is null or p_delivery_fee < 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if v_points > v_gross_amount then
    raise exception 'POINTS_EXCEED_ORDER_TOTAL';
  end if;

  if v_points > 0 then
    if p_member_id is null then
      raise exception 'POINTS_INELIGIBLE';
    end if;

    select id, role, status, points_balance
      into v_member
      from public.members
     where id = p_member_id
     for update;

    if not found or v_member.role <> 'user' or v_member.status <> 'active' then
      raise exception 'POINTS_INELIGIBLE';
    end if;

    if v_member.points_balance < v_points then
      raise exception 'INSUFFICIENT_POINTS';
    end if;
  end if;

  v_payable_amount := v_gross_amount - v_points;

  insert into public.orders (
    member_id,
    customer_name,
    phone,
    address,
    items,
    total_price,
    delivery_fee,
    used_points,
    payable_amount,
    payment_method,
    order_status,
    payment_status,
    delivery_status,
    tracking_number,
    delivery_memo,
    expires_at,
    paid_at
  ) values (
    p_member_id,
    p_customer_name,
    p_phone,
    p_address,
    p_items,
    p_total_price,
    p_delivery_fee,
    v_points,
    v_payable_amount,
    p_payment_method,
    case when v_payable_amount = 0 then '결제완료' else p_order_status end,
    case when v_payable_amount = 0 then '결제완료' else p_payment_status end,
    p_delivery_status,
    nullif(p_tracking_number, ''),
    p_delivery_memo,
    case when v_payable_amount = 0 then null else p_expires_at end,
    case when v_payable_amount = 0 then now() else null end
  ) returning * into v_order;

  perform public.decrement_stock_for_order(p_items);

  if v_points > 0 then
    update public.members
       set points_balance = points_balance - v_points
     where id = p_member_id
     returning points_balance into v_balance_after;

    insert into public.points_ledger (
      member_id,
      order_id,
      type,
      amount,
      balance_after,
      idempotency_key,
      reason,
      metadata
    ) values (
      p_member_id,
      v_order.id,
      'spend',
      -v_points,
      v_balance_after,
      'order:' || v_order.id::text || ':points:spend',
      'order_create',
      jsonb_build_object('grossAmount', v_gross_amount, 'payableAmount', v_payable_amount)
    );
  end if;

  return v_order;
end;
$$;

revoke execute on function public.create_order_with_points(uuid, text, text, text, jsonb, int, int, text, text, text, text, text, text, timestamptz, int) from public, anon;
grant execute on function public.create_order_with_points(uuid, text, text, text, jsonb, int, int, text, text, text, text, text, text, timestamptz, int) to service_role;

create or replace function public.restore_points_for_order(
  p_order_id uuid,
  p_reason text default 'terminal_restore',
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_balance_after int;
begin
  select id, member_id, used_points
    into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found or v_order.member_id is null or coalesce(v_order.used_points, 0) <= 0 then
    return false;
  end if;

  if exists (
    select 1
      from public.points_ledger
     where order_id = p_order_id
       and type = 'restore'
       and idempotency_key = 'order:' || p_order_id::text || ':points:restore'
  ) then
    return false;
  end if;

  update public.members
     set points_balance = points_balance + v_order.used_points
   where id = v_order.member_id
   returning points_balance into v_balance_after;

  insert into public.points_ledger (
    member_id,
    order_id,
    type,
    amount,
    balance_after,
    idempotency_key,
    reason,
    metadata
  ) values (
    v_order.member_id,
    p_order_id,
    'restore',
    v_order.used_points,
    v_balance_after,
    'order:' || p_order_id::text || ':points:restore',
    p_reason,
    p_metadata
  );

  return true;
end;
$$;

revoke execute on function public.restore_points_for_order(uuid, text, jsonb) from public, anon;
grant execute on function public.restore_points_for_order(uuid, text, jsonb) to service_role;

create or replace function public.cancel_order_reservation_and_restore(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_items jsonb;
begin
  update public.orders
     set order_status = '취소완료',
         payment_status = '결제취소'
   where id = p_order_id
     and payment_status in ('결제대기', '입금대기')
  returning items into v_items;

  if not found then
    return false;
  end if;

  perform public.restore_stock_for_order(v_items);
  perform public.restore_points_for_order(
    p_order_id,
    'order_cancel',
    jsonb_build_object('terminalStatus', '결제취소', 'source', 'cancel_order_reservation_and_restore')
  );
  return true;
end;
$$;

revoke execute on function public.cancel_order_reservation_and_restore(uuid) from public, anon;
grant execute on function public.cancel_order_reservation_and_restore(uuid) to service_role;

create or replace function public.cancel_confirming_and_restore(p_order_id uuid, p_payment_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_items jsonb;
begin
  update public.orders
     set order_status = '취소완료',
         payment_status = '결제취소'
   where id = p_order_id
     and payment_status = '승인중'
     and payment_key = p_payment_key
  returning items into v_items;

  if not found then
    return false;
  end if;

  perform public.restore_stock_for_order(v_items);
  perform public.restore_points_for_order(
    p_order_id,
    'order_cancel',
    jsonb_build_object('terminalStatus', '결제취소', 'source', 'cancel_confirming_and_restore')
  );
  return true;
end;
$$;

revoke execute on function public.cancel_confirming_and_restore(uuid, text) from public, anon;
grant execute on function public.cancel_confirming_and_restore(uuid, text) to service_role;
commit;
