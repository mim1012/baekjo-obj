-- 결제 상태와 판매자 주문 수락 상태를 분리한다. 결제가 끝나도 판매자별 접수/거절을 독립 추적한다.
create table if not exists public.order_seller_acceptances (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  seller_key text not null,
  seller_id uuid references public.sellers(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  note text,
  updated_at timestamptz not null default now(),
  unique (order_id, seller_key)
);

create index if not exists order_seller_acceptances_order_idx
  on public.order_seller_acceptances (order_id);

alter table public.order_seller_acceptances enable row level security;
revoke all on public.order_seller_acceptances from anon, authenticated;

-- 0152 함수와 같은 시그니처를 유지한 채 판매자별 운영 상태 초기화를 같은 트랜잭션에 포함한다.
create or replace function public.create_order_with_inventory(
  p_member_id uuid,
  p_customer_name text,
  p_phone text,
  p_address text,
  p_items jsonb,
  p_total_price int,
  p_delivery_fee int,
  p_delivery_fee_breakdown jsonb,
  p_payment_method text,
  p_bank_transfer_account jsonb,
  p_order_status text,
  p_payment_status text,
  p_delivery_status text,
  p_tracking_number text,
  p_delivery_memo text,
  p_expires_at timestamptz,
  p_seller_groups jsonb,
  p_consent_records jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_group jsonb;
  v_seller_id uuid;
begin
  if p_member_id is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_typeof(p_seller_groups) <> 'array'
     or jsonb_array_length(p_seller_groups) = 0
     or jsonb_typeof(p_consent_records) <> 'array'
     or jsonb_array_length(p_consent_records) = 0
     or p_total_price < 0
     or p_delivery_fee < 0 then
    raise exception 'INVALID_ORDER_PAYLOAD';
  end if;

  perform public.decrement_stock_for_order(p_items);

  insert into public.orders (
    member_id, customer_name, phone, address, items, total_price, delivery_fee,
    delivery_fee_breakdown, payment_method, bank_transfer_account, order_status,
    payment_status, delivery_status, tracking_number, delivery_memo, expires_at,
    seller_groups, consent_records
  ) values (
    p_member_id, p_customer_name, p_phone, p_address, p_items, p_total_price,
    p_delivery_fee, coalesce(p_delivery_fee_breakdown, '[]'::jsonb), p_payment_method,
    p_bank_transfer_account, p_order_status, p_payment_status, p_delivery_status,
    p_tracking_number, p_delivery_memo, p_expires_at, p_seller_groups, p_consent_records
  ) returning * into v_order;

  for v_group in select value from jsonb_array_elements(p_seller_groups)
  loop
    begin
      v_seller_id := nullif(v_group->'seller'->>'id', '')::uuid;
    exception when invalid_text_representation then
      v_seller_id := null;
    end;
    insert into public.order_seller_acceptances (order_id, seller_key, seller_id)
    values (v_order.id, v_group->>'key', v_seller_id);
  end loop;

  return to_jsonb(v_order);
end;
$$;

-- CREATE OR REPLACE 이후에도 주문 원자 처리 함수는 서버 전용으로 명시적으로 잠근다.
revoke execute on function public.create_order_with_inventory(
  uuid, text, text, text, jsonb, int, int, jsonb, text, jsonb, text, text, text,
  text, text, timestamptz, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.create_order_with_inventory(
  uuid, text, text, text, jsonb, int, int, jsonb, text, jsonb, text, text, text,
  text, text, timestamptz, jsonb, jsonb
) to service_role;
