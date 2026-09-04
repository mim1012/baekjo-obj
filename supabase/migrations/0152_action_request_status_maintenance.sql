-- 0151의 상품별 취소 전이/완료 RPC가 order_action_request_items(아이템)만 갱신하고 부모
-- order_action_requests.status 컬럼은 그대로 두는 버그를 고친다. 그 컬럼은 "브랜드당 활성 요청
-- 1개" unique 인덱스(order_action_requests_active_brand_idx, WHERE status in ('REQUESTED',
-- 'APPROVED'))의 판정 기준이라, 반려/완료 후에도 부모 status가 'REQUESTED'로 고정되면 같은
-- 브랜드로의 재요청이 23505로 영구 차단된다(반려 후 재요청·부분완료 후 잔여수량 요청 불가).
-- 해결: 아이템 상태가 바뀔 때마다 부모 status를 아이템에서 파생(deriveRequestStatus와 동일 규칙)해
-- 갱신한다. 그러면 REJECTED/COMPLETED 요청은 활성 집합에서 빠져 인덱스가 재요청을 허용한다.
-- 0151은 이미 적용됐으므로 함수만 CREATE OR REPLACE 하는 가산 마이그레이션으로 배포한다.

-- 요청(request) 레벨 상태를 아이템 상태들에서 파생한다(src/lib/orders/actionRequests.ts의
-- deriveRequestStatus와 동일 규칙): 전량 REJECTED→REJECTED, 비-REJECTED가 전부 COMPLETED→
-- COMPLETED, 하나라도 APPROVED→APPROVED, 아니면 REQUESTED가 있으면 REQUESTED, 그 외 APPROVED.
create or replace function public.derive_action_request_status(p_request_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when count(*) filter (where status <> 'REJECTED') = 0 then 'REJECTED'
    when count(*) filter (where status not in ('REJECTED', 'COMPLETED')) = 0 then 'COMPLETED'
    when count(*) filter (where status = 'APPROVED') > 0 then 'APPROVED'
    when count(*) filter (where status = 'REQUESTED') > 0 then 'REQUESTED'
    else 'APPROVED'
  end
  from public.order_action_request_items
  where request_id = p_request_id;
$$;

-- 관리자 승인/반려 — 0151 본문 + 부모 status 파생 갱신(부모 status를 활성/해소로 정확히 반영).
create or replace function public.transition_action_request(
  p_request_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.order_action_requests%rowtype;
  v_updated integer;
  v_completed_exists boolean;
  v_approved_or_completed_exists boolean;
  v_all_rejected boolean;
begin
  if p_action not in ('APPROVE', 'REJECT') then
    raise exception 'ACTION_INVALID_ACTION';
  end if;

  select * into v_request
    from public.order_action_requests
   where id = p_request_id
   for update;
  if not found then
    raise exception 'ACTION_REQUEST_NOT_FOUND';
  end if;

  if p_action = 'APPROVE' then
    update public.order_action_request_items
       set status = 'APPROVED', updated_at = now()
     where request_id = p_request_id and status = 'REQUESTED';
    get diagnostics v_updated = row_count;
    if v_updated = 0 then
      select exists (
        select 1 from public.order_action_request_items
         where request_id = p_request_id and status in ('APPROVED', 'COMPLETED')
      ) into v_approved_or_completed_exists;
      if not v_approved_or_completed_exists then
        raise exception 'ACTION_INVALID_TRANSITION';
      end if;
    end if;
  else
    update public.order_action_request_items
       set status = 'REJECTED', updated_at = now()
     where request_id = p_request_id and status in ('REQUESTED', 'APPROVED');
    get diagnostics v_updated = row_count;
    if v_updated = 0 then
      select not exists (
        select 1 from public.order_action_request_items
         where request_id = p_request_id and status <> 'REJECTED'
      ) into v_all_rejected;
      select exists (
        select 1 from public.order_action_request_items
         where request_id = p_request_id and status = 'COMPLETED'
      ) into v_completed_exists;
      if v_completed_exists or not v_all_rejected then
        raise exception 'ACTION_INVALID_TRANSITION';
      end if;
    end if;
  end if;

  -- 부모 status를 아이템에서 파생해 갱신 — 활성(REQUESTED/APPROVED) unique 인덱스가 해소된 요청을
  -- 정확히 놓아주도록.
  update public.order_action_requests
     set status = public.derive_action_request_status(p_request_id), updated_at = now()
   where id = p_request_id;

  perform public.recompute_order_cancel_status(v_request.order_id);

  select * into v_request from public.order_action_requests where id = p_request_id;
  return to_jsonb(v_request) || jsonb_build_object(
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', i.id,
        'lineIndex', i.line_index,
        'productId', i.product_id,
        'productName', i.product_name,
        'quantity', i.quantity,
        'unitPrice', i.unit_price,
        'amount', i.amount,
        'optionName', i.option_name,
        'status', i.status
      ) order by i.line_index), '[]'::jsonb)
      from public.order_action_request_items i
      where i.request_id = p_request_id
    )
  );
end;
$$;

-- 관리자 취소완료 — 0151 본문 + 부모 status 파생 갱신.
create or replace function public.complete_action_request_and_restore(
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.order_action_requests%rowtype;
  v_order public.orders%rowtype;
  v_approved_items jsonb;
  v_approved_count integer;
  v_all_completed boolean;
  v_item record;
  v_completed_after integer;
  v_refunded_qty integer;
  v_total_ordered integer;
  v_completed_qty integer;
begin
  select * into v_request
    from public.order_action_requests
   where id = p_request_id
   for update;
  if not found then
    raise exception 'ACTION_REQUEST_NOT_FOUND';
  end if;

  select * into v_order from public.orders where id = v_request.order_id for update;
  if not found then
    raise exception 'ACTION_REQUEST_NOT_FOUND';
  end if;

  select count(*) into v_approved_count
    from public.order_action_request_items
   where request_id = p_request_id and status = 'APPROVED';

  if v_approved_count = 0 then
    select not exists (
      select 1 from public.order_action_request_items
       where request_id = p_request_id and status not in ('REJECTED', 'COMPLETED')
    ) into v_all_completed;
    if v_all_completed then
      select * into v_request from public.order_action_requests where id = p_request_id;
      return to_jsonb(v_request) || jsonb_build_object(
        'items', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', i.id, 'lineIndex', i.line_index, 'productId', i.product_id,
            'productName', i.product_name, 'quantity', i.quantity, 'unitPrice', i.unit_price,
            'amount', i.amount, 'optionName', i.option_name, 'status', i.status
          ) order by i.line_index), '[]'::jsonb)
          from public.order_action_request_items i where i.request_id = p_request_id
        )
      );
    end if;
    raise exception 'ACTION_INVALID_TRANSITION';
  end if;

  if v_order.payment_status in ('결제대기', '입금대기') then
    select coalesce(jsonb_agg(jsonb_build_object('productId', product_id, 'quantity', quantity)), '[]'::jsonb)
      into v_approved_items
      from public.order_action_request_items
     where request_id = p_request_id and status = 'APPROVED';
    perform public.restore_stock_for_order(v_approved_items);
  elsif v_order.payment_status = '결제완료' then
    if v_order.payment_key is null then
      raise exception 'ACTION_MANUAL_REFUND_REQUIRED';
    end if;
    for v_item in
      select line_index, quantity
        from public.order_action_request_items
       where request_id = p_request_id and status = 'APPROVED'
    loop
      select coalesce(sum(quantity), 0) into v_completed_after
        from public.order_action_request_items
       where order_id = v_request.order_id
         and line_index = v_item.line_index
         and status = 'COMPLETED';
      v_completed_after := v_completed_after + v_item.quantity;

      select coalesce(sum((line->>'quantity')::integer), 0) into v_refunded_qty
        from public.order_refunds r
        cross join lateral jsonb_array_elements(r.items) line
       where r.order_id = v_request.order_id
         and r.status = 'SUCCEEDED'
         and (line->>'lineIndex')::integer = v_item.line_index;

      if v_completed_after > v_refunded_qty then
        raise exception 'ACTION_REFUND_NOT_SETTLED';
      end if;
    end loop;
  elsif v_order.payment_status in ('결제취소', '환불완료') then
    null;
  else
    raise exception 'ACTION_INVALID_TRANSITION';
  end if;

  update public.order_action_request_items
     set status = 'COMPLETED', updated_at = now()
   where request_id = p_request_id and status = 'APPROVED';

  -- 부모 status를 아이템에서 파생해 갱신(완료된 요청을 활성 집합에서 제거).
  update public.order_action_requests
     set status = public.derive_action_request_status(p_request_id), updated_at = now()
   where id = p_request_id;

  perform public.recompute_order_cancel_status(v_request.order_id);

  select coalesce(sum((e->>'quantity')::int), 0)
    into v_total_ordered
    from jsonb_array_elements((select items from public.orders where id = v_request.order_id)) e
   where (e->>'quantity') ~ '^[0-9]+$';
  select coalesce(sum(quantity), 0) into v_completed_qty
    from public.order_action_request_items
   where order_id = v_request.order_id and status = 'COMPLETED';

  if v_total_ordered > 0 and v_completed_qty >= v_total_ordered then
    update public.orders
       set payment_status = '결제취소'
     where id = v_request.order_id
       and payment_status in ('결제대기', '입금대기');
  end if;

  select * into v_request from public.order_action_requests where id = p_request_id;
  return to_jsonb(v_request) || jsonb_build_object(
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', i.id, 'lineIndex', i.line_index, 'productId', i.product_id,
        'productName', i.product_name, 'quantity', i.quantity, 'unitPrice', i.unit_price,
        'amount', i.amount, 'optionName', i.option_name, 'status', i.status
      ) order by i.line_index), '[]'::jsonb)
      from public.order_action_request_items i where i.request_id = p_request_id
    )
  );
end;
$$;

revoke execute on function public.derive_action_request_status(uuid) from public, anon;
grant execute on function public.derive_action_request_status(uuid) to service_role;
revoke execute on function public.transition_action_request(uuid, text) from public, anon;
grant execute on function public.transition_action_request(uuid, text) to service_role;
revoke execute on function public.complete_action_request_and_restore(uuid) from public, anon;
grant execute on function public.complete_action_request_and_restore(uuid) to service_role;
