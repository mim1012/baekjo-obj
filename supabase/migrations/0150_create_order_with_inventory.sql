-- 주문 insert와 재고 차감을 한 트랜잭션으로 묶는다.
-- 애플리케이션의 "insert 후 실패 시 delete" 보상 방식에서 생기던 유령 주문/선점 창을 제거한다.

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

  -- 0021 함수가 상품별 수량을 합산하고 product.stock을 조건부 차감한다.
  -- 이 저장소의 재고 정본은 옵션 JSON이 아닌 products.stock 한 곳이다.
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

  return to_jsonb(v_order);
end;
$$;

revoke execute on function public.create_order_with_inventory(
  uuid, text, text, text, jsonb, int, int, jsonb, text, jsonb, text, text, text,
  text, text, timestamptz, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.create_order_with_inventory(
  uuid, text, text, text, jsonb, int, int, jsonb, text, jsonb, text, text, text,
  text, text, timestamptz, jsonb, jsonb
) to service_role;
