-- Supersedes two prior definitions so the new item-level cancel pipeline (0169/0170) stays
-- consistent with orders that are settled through the older whole-order refund/guard paths.
--
-- public.complete_order_refund (originally 0072_order_refund_ledger.sql): identical body, with one
-- added line — `perform public.recompute_order_cancel_status(v_refund.order_id);` right before the
-- return. Without it, a delivery-fee-inclusive refund settling the last uncapped amount on an
-- otherwise fully item-completed order (0170's delivery-fee cap in recompute_order_cancel_status)
-- would leave order_status stuck at '부분취소완료' forever — nothing else ever calls recompute for
-- a refund that came through this legacy whole-order RPC instead of the new item-level flow.
--
-- public.guard_customer_service_request_insert (originally 0157_compliance_write_guards.sql):
-- identical body, with '부분취소' added to the excluded order_status set. 0170's
-- recompute_order_cancel_status can now put an order into '부분취소' (partial cancel approved but
-- not yet completed) — a customer should not be able to open a new exchange/return request against
-- an order that already has an approved-but-not-yet-settled cancellation in flight, for the same
-- reason '취소요청'/'취소완료' were already excluded.

create or replace function public.complete_order_refund(
  p_refund_id uuid,
  p_approved_amount integer,
  p_provider_balance_after integer,
  p_provider_status text,
  p_transaction_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_refund public.order_refunds%rowtype;
  v_order public.orders%rowtype;
begin
  select * into v_refund
    from public.order_refunds
   where id = p_refund_id
   for update;
  if not found then
    raise exception 'REFUND_NOT_FOUND';
  end if;
  if v_refund.status = 'SUCCEEDED' then
    return to_jsonb(v_refund);
  end if;
  if v_refund.status not in ('PROCESSING', 'UNKNOWN') then
    raise exception 'REFUND_NOT_PROCESSABLE';
  end if;
  if p_approved_amount is null or p_approved_amount <> v_refund.requested_amount then
    raise exception 'REFUND_PROVIDER_AMOUNT_MISMATCH';
  end if;
  if p_provider_balance_after is null or p_provider_balance_after < 0 then
    raise exception 'REFUND_INVALID_PROVIDER_BALANCE';
  end if;

  select * into v_order from public.orders where id = v_refund.order_id for update;
  if not found or v_order.payment_status <> '결제완료' then
    raise exception 'REFUND_ORDER_NOT_PROCESSABLE';
  end if;

  perform public.restore_stock_for_order(v_refund.items);

  update public.orders
     set payment_status = case when p_provider_balance_after = 0 then '환불완료' else '결제완료' end
   where id = v_refund.order_id
     and payment_status = '결제완료';
  if not found then
    raise exception 'REFUND_ORDER_CONFLICT';
  end if;

  update public.order_refunds
     set status = 'SUCCEEDED',
         approved_amount = p_approved_amount,
         provider_balance_after = p_provider_balance_after,
         provider_status = p_provider_status,
         transaction_key = p_transaction_key,
         error_message = null,
         completed_at = now()
   where id = p_refund_id;

  select * into v_refund from public.order_refunds where id = p_refund_id;
  perform public.recompute_order_cancel_status(v_refund.order_id);
  return to_jsonb(v_refund);
end;
$$;

create or replace function public.guard_customer_service_request_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
      from public.orders o
     where o.id = new.order_id
       and o.member_id = new.member_id
       and o.payment_status = '결제완료'
       and o.order_status not in ('취소요청', '부분취소', '취소완료')
       and exists (
         select 1
           from jsonb_array_elements(o.seller_groups) as seller_group
          where seller_group->>'key' = new.seller_key
       )
  ) then
    raise exception 'CUSTOMER_REQUEST_NOT_ALLOWED';
  end if;
  return new;
end;
$$;

revoke execute on function public.complete_order_refund(uuid, integer, integer, text, text) from public, anon, authenticated;
grant execute on function public.complete_order_refund(uuid, integer, integer, text, text) to service_role;
revoke execute on function public.guard_customer_service_request_insert() from public, anon, authenticated;
grant execute on function public.guard_customer_service_request_insert() to service_role;
