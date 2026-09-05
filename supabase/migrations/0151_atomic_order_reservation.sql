-- Apply before deploying the API using reserve_order. No existing orders are rewritten.
create or replace function public.reserve_order(p_member_id uuid, p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  if not exists (select 1 from public.members where id = p_member_id and status = 'active') then
    raise exception 'MEMBER_NOT_ACTIVE';
  end if;
  if jsonb_typeof(p_order->'items') is distinct from 'array' then
    raise exception 'INVALID_ORDER_ITEMS';
  end if;
  if jsonb_array_length(p_order->'items') not between 1 and 100 then
    raise exception 'INVALID_ORDER_ITEMS';
  end if;
  if p_order->>'paymentMethod' is null or p_order->>'paymentMethod' not in ('무통장입금', '카드결제', '신용카드') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;

  -- Failure of either operation rolls back both. Never compensate by deleting an order
  -- after a transport error: the server may already have committed successfully.
  perform public.decrement_stock_for_order(p_order->'items');
  insert into public.orders (
    member_id, customer_name, phone, address, items, total_price, delivery_fee,
    delivery_fee_breakdown, payment_method, bank_transfer_account,
    order_status, payment_status, delivery_status, tracking_number, delivery_memo, expires_at
  ) values (
    p_member_id, p_order->>'customerName', p_order->>'phone', p_order->>'address',
    p_order->'items', (p_order->>'totalPrice')::integer, (p_order->>'deliveryFee')::integer,
    coalesce(p_order->'deliveryFeeBreakdown', '[]'::jsonb), p_order->>'paymentMethod',
    p_order->'bankTransferAccount', '주문접수',
    case when p_order->>'paymentMethod' = '무통장입금' then '입금대기' else '결제대기' end,
    '배송전', p_order->>'trackingNumber', p_order->>'deliveryMemo',
    (p_order->>'expiresAt')::timestamptz
  ) returning * into v_order;
  return to_jsonb(v_order);
end;
$$;
revoke all on function public.reserve_order(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.reserve_order(uuid, jsonb) to service_role;
