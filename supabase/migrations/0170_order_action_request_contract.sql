-- Item-level cancel/refund contract for public.order_action_request_items (reconciled in 0169).
-- Ports feature/item-cancel-status's 0151_order_action_request_items.sql /
-- 0152_action_request_status_maintenance.sql function bodies (derive_action_request_status,
-- recompute_order_cancel_status, create_order_action_request, transition_action_request,
-- complete_action_request_and_restore) with `create or replace` against the SAME signatures the
-- old semantics already occupy on staging, and layers in this history's contract on top:
--   * recompute_order_cancel_status gains a delivery-fee cap ('부분취소완료' instead of '취소완료'
--     while a paid order's delivery fee has no SUCCEEDED include-delivery-fee refund yet) and a
--     full-reject revert to '주문접수' (only from '취소요청'/'부분취소' — never touches orders this
--     pipeline never put into one of those two states).
--   * create_order_action_request re-validates remaining quantity per line itself instead of
--     trusting the caller (line qty − non-REJECTED item qty across ANY request type − SUCCEEDED
--     refund qty), locking orders → order_action_requests → order_action_request_items.
--   * transition_action_request additionally locks the parent order (order_action_requests →
--     orders → order_action_request_items) so a REJECT that frees up remaining quantity serializes
--     against a concurrent create's remaining-quantity check.
--   * complete_action_request_and_restore locks orders FOR UPDATE before the request row (the
--     opposite order from transition, chosen deliberately: the caller already knows the order id
--     is stable and wants the settlement-proof reads below serialized against payment-status
--     changes first) and never calls restore_stock_for_order directly — a whole-remaining-order
--     unpaid completion delegates to 0031's cancel_order_reservation_and_restore, and a paid
--     completion only ever proceeds once 0072's refund ledger already proves the quantity settled.
-- All application-level conflicts raise errcode 'PT409' (never the serialization_failure class
-- PostgREST retries transparently for 30s+ before giving up — see the PostgREST-RPC conflict/
-- no-response wiki concept for this project); not-found raises 'P0002'; malformed input raises
-- '22023'. security definer, search_path pinned, execute revoked from public/anon/authenticated
-- and granted only to service_role, matching every prior RPC in this file family.

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

create or replace function public.recompute_order_cancel_status(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_total_ordered integer;
  v_completed_qty integer;
  v_approved_qty integer;
  v_requested_qty integer;
  v_new_status text;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    return;
  end if;

  select coalesce(sum((e->>'quantity')::int), 0)
    into v_total_ordered
    from jsonb_array_elements(v_order.items) e
   where (e->>'quantity') ~ '^[0-9]+$';

  select
    coalesce(sum(quantity) filter (where status = 'COMPLETED'), 0),
    coalesce(sum(quantity) filter (where status = 'APPROVED'), 0),
    coalesce(sum(quantity) filter (where status = 'REQUESTED'), 0)
    into v_completed_qty, v_approved_qty, v_requested_qty
    from public.order_action_request_items
   where order_id = p_order_id;

  if v_requested_qty + v_approved_qty + v_completed_qty = 0 then
    -- 활성(REQUESTED/APPROVED/COMPLETED) 아이템이 하나도 없다 — 전량 REJECTED이거나 이 주문에
    -- 상품별 취소 이력이 아예 없다는 뜻. 현재 order_status가 이 파이프라인이 올려둔 값
    -- ('취소요청'·'부분취소')일 때만 '주문접수'로 되돌린다 — 다른 경로가 만든 상태는 손대지 않는다.
    if v_order.order_status in ('취소요청', '부분취소') then
      update public.orders set order_status = '주문접수' where id = p_order_id;
    end if;
    return;
  end if;

  if v_total_ordered > 0 and v_completed_qty >= v_total_ordered then
    -- 배송비 상한: 결제완료 + 배송비 > 0인 주문은, 배송비를 포함한 SUCCEEDED 환불이 아직 없으면
    -- 전량 아이템 완료라도 '취소완료'로 올리지 않고 '부분취소완료'에서 멈춘다. '취소완료'는
    -- 0156의 판매자 접수 종료 cascade를 발동시키므로, 배송비가 아직 미정산인데 그 라벨을 붙이면
    -- "다 끝났다"로 잘못 읽힌다. 이후 배송비 환불이 SUCCEEDED로 들어오면 재호출 시 '취소완료'로
    -- 올라간다(아래 UPDATE의 다운그레이드 가드는 '취소완료'로의 승격은 항상 허용한다).
    if v_order.payment_status = '결제완료' and v_order.delivery_fee > 0 and not exists (
      select 1 from public.order_refunds r
       where r.order_id = p_order_id
         and r.status = 'SUCCEEDED'
         and r.include_delivery_fee
    ) then
      v_new_status := '부분취소완료';
    else
      v_new_status := '취소완료';
    end if;
  elsif v_completed_qty > 0 then
    v_new_status := '부분취소완료';
  elsif v_approved_qty > 0 then
    v_new_status := '부분취소';
  elsif v_requested_qty > 0 then
    v_new_status := '취소요청';
  else
    v_new_status := '주문접수';
  end if;

  -- 이미 '취소완료'로 확정된 주문(전체취소 RPC 등 다른 경로)은 낮은 값으로 되돌리지 않는다.
  update public.orders
     set order_status = v_new_status
   where id = p_order_id
     and (order_status <> '취소완료' or v_new_status = '취소완료');
end;
$$;

create or replace function public.create_order_action_request(
  p_order_id uuid,
  p_member_id uuid,
  p_request_type text,
  p_brand_id text,
  p_items jsonb,
  p_requested_amount integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_request public.order_action_requests%rowtype;
  v_item jsonb;
  v_line_index integer;
  v_quantity integer;
  v_order_quantity integer;
  v_active_qty integer;
  v_completed_qty integer;
  v_refunded_qty integer;
  v_remaining integer;
begin
  select * into v_order
    from public.orders
   where id = p_order_id
   for update;
  if not found then
    raise exception 'ACTION_ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- 이 주문에 대한 기존 요청 행을 전부 선점한다 — 동시에 들어오는 REJECT(transition)나 다른
  -- create 호출이 같은 라인의 잔여 수량을 서로 다른 스냅샷으로 계산하지 못하게 직렬화한다.
  perform 1
    from public.order_action_requests
   where order_id = p_order_id
   for update;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'ACTION_INVALID_ITEMS' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if v_item->>'lineIndex' is null or v_item->>'quantity' is null then
      raise exception 'ACTION_INVALID_ITEM' using errcode = '22023';
    end if;
    v_line_index := (v_item->>'lineIndex')::integer;
    v_quantity := (v_item->>'quantity')::integer;
    if v_line_index < 0 or v_line_index >= jsonb_array_length(v_order.items) or v_quantity <= 0 then
      raise exception 'ACTION_INVALID_ITEM' using errcode = '22023';
    end if;

    v_order_quantity := ((v_order.items -> v_line_index) ->> 'quantity')::integer;

    -- 잔여 수량 = 라인 주문수량 − (요청 타입 무관) REQUESTED/APPROVED(활성) 아이템 합
    --   − max(COMPLETED 아이템 합, SUCCEEDED 환불 수량).
    -- 결제완료 경로에서 아이템이 COMPLETED가 되려면 같은 라인을 덮는 SUCCEEDED 환불이 먼저 있어야
    -- 한다(complete_action_request_and_restore의 정산 게이트, 아래) — 즉 정산된 수량은
    -- COMPLETED와 환불 양쪽에 동시에 잡힌다. 둘을 그냥 더해 빼면(active_qty에 COMPLETED를 포함한
    -- 채 refunded_qty까지 또 빼면) 이중 차감으로 잔여수량이 과소 계산된다 — max()로 겹침을
    -- 제거한다. APPROVED→REJECTED가 허용되므로(환불이 이미 난 승인건을 반려해도) refunded_qty는
    -- 아이템 status와 무관하게 order_refunds 원장에서 독립적으로 집계해, 반려 후에도 환불분이
    -- 계속 잔여에서 빠지게 한다(과다취소 방지).
    select coalesce(sum(i.quantity) filter (where i.status in ('REQUESTED', 'APPROVED')), 0),
           coalesce(sum(i.quantity) filter (where i.status = 'COMPLETED'), 0)
      into v_active_qty, v_completed_qty
      from public.order_action_request_items i
     where i.order_id = p_order_id
       and i.line_index = v_line_index;

    select coalesce(sum((line->>'quantity')::integer), 0) into v_refunded_qty
      from public.order_refunds r
      cross join lateral jsonb_array_elements(r.items) line
     where r.order_id = p_order_id
       and r.status = 'SUCCEEDED'
       and (line->>'lineIndex')::integer = v_line_index;

    v_remaining := v_order_quantity - v_active_qty - greatest(v_completed_qty, v_refunded_qty);
    if v_quantity > v_remaining then
      raise exception 'ACTION_QUANTITY_EXCEEDS_REMAINING' using errcode = 'PT409';
    end if;
  end loop;

  begin
    insert into public.order_action_requests
      (order_id, member_id, request_type, brand_id, items, requested_amount, reason)
    values
      (p_order_id, p_member_id, p_request_type, p_brand_id, p_items, p_requested_amount, p_reason)
    returning * into v_request;
  exception when unique_violation then
    raise exception 'ACTION_REQUEST_ALREADY_EXISTS' using errcode = 'PT409';
  end;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    insert into public.order_action_request_items
      (request_id, order_id, line_index, product_id, product_name, quantity, unit_price, amount, option_name, status)
    values
      (v_request.id, p_order_id,
       (v_item->>'lineIndex')::int,
       v_item->>'productId',
       coalesce(v_item->>'productName', ''),
       (v_item->>'quantity')::int,
       coalesce((v_item->>'unitPrice')::int, 0),
       coalesce((v_item->>'amount')::int, 0),
       v_item->>'optionName',
       'REQUESTED');
  end loop;

  perform public.recompute_order_cancel_status(p_order_id);

  select * into v_request from public.order_action_requests where id = v_request.id;
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
      where i.request_id = v_request.id
    )
  );
end;
$$;

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
  v_order_id uuid;
  v_request public.order_action_requests%rowtype;
  v_order public.orders%rowtype;
  v_updated integer;
  v_approved_or_completed_exists boolean;
  v_all_rejected boolean;
  v_completed_exists boolean;
begin
  if p_action not in ('APPROVE', 'REJECT') then
    raise exception 'ACTION_INVALID_ACTION' using errcode = '22023';
  end if;

  -- order_id만 잠금 없이 먼저 읽어 orders를 order_action_requests보다 먼저 잠글 수 있게 한다
  -- (create_order_action_request/complete_action_request_and_restore와 동일한 orders-먼저 잠금
  -- 순서 — 반대 순서였던 이전 버전은 create·complete와 ABBA 데드락을 낼 수 있었다).
  select order_id into v_order_id
    from public.order_action_requests
   where id = p_request_id;
  if not found then
    raise exception 'ACTION_REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- 주문 행을 먼저 선점한다 — REJECT로 잔여 수량이 풀리는 순간과 create_order_action_request의
  -- 잔여수량 재검증이 같은 트랜잭션 직렬화 순서를 타게 한다.
  select * into v_order
    from public.orders
   where id = v_order_id
   for update;
  if not found then
    raise exception 'ACTION_REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into v_request
    from public.order_action_requests
   where id = p_request_id
   for update;
  if not found then
    raise exception 'ACTION_REQUEST_NOT_FOUND' using errcode = 'P0002';
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
        raise exception 'ACTION_INVALID_TRANSITION' using errcode = 'PT409';
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
        raise exception 'ACTION_INVALID_TRANSITION' using errcode = 'PT409';
      end if;
    end if;
  end if;

  -- 부모 status를 아이템에서 파생해 갱신 — 활성(REQUESTED/APPROVED) unique 인덱스가 해소된
  -- 요청을 정확히 놓아주도록(0152와 동일 계약).
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

create or replace function public.complete_action_request_and_restore(
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order public.orders%rowtype;
  v_request public.order_action_requests%rowtype;
  v_approved_count integer;
  v_all_completed boolean;
  v_total_ordered integer;
  v_approved_qty integer;
  v_item record;
  v_completed_after integer;
  v_refunded_qty integer;
begin
  -- order_id만 잠금 없이 먼저 읽어 orders를 order_action_requests보다 먼저 잠글 수 있게 한다
  -- (create_order_action_request와 동일한 orders-먼저 잠금 순서 — 데드락 회피).
  select order_id into v_order_id
    from public.order_action_requests
   where id = p_request_id;
  if not found then
    raise exception 'ACTION_REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into v_order
    from public.orders
   where id = v_order_id
   for update;
  if not found then
    raise exception 'ACTION_REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into v_request
    from public.order_action_requests
   where id = p_request_id
   for update;
  if not found then
    raise exception 'ACTION_REQUEST_NOT_FOUND' using errcode = 'P0002';
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
    raise exception 'ACTION_INVALID_TRANSITION' using errcode = 'PT409';
  end if;

  if v_order.payment_status in ('결제대기', '입금대기') then
    -- 미결제 부분완료는 지원하지 않는다. 승인분이 주문 전체 잔여 수량과 정확히 같을 때만
    -- 0031(cancel_order_reservation_and_restore)에 전체 취소·복원을 위임한다 — 이 함수는
    -- restore_stock_for_order를 절대 직접 호출하지 않는다(그 책임은 항상 0031/0072가 진다).
    select coalesce(sum((e->>'quantity')::int), 0) into v_total_ordered
      from jsonb_array_elements(v_order.items) e
     where (e->>'quantity') ~ '^[0-9]+$';

    select coalesce(sum(quantity), 0) into v_approved_qty
      from public.order_action_request_items
     where request_id = p_request_id and status = 'APPROVED';

    if v_total_ordered = 0 or v_approved_qty <> v_total_ordered then
      raise exception 'ACTION_UNPAID_PARTIAL_NOT_SUPPORTED' using errcode = 'PT409';
    end if;

    perform public.cancel_order_reservation_and_restore(v_order_id);
  elsif v_order.payment_status = '결제완료' then
    if v_order.payment_key is null then
      raise exception 'ACTION_MANUAL_REFUND_REQUIRED' using errcode = 'PT409';
    end if;
    for v_item in
      select line_index, quantity
        from public.order_action_request_items
       where request_id = p_request_id and status = 'APPROVED'
    loop
      select coalesce(sum(quantity), 0) into v_completed_after
        from public.order_action_request_items
       where order_id = v_order_id
         and line_index = v_item.line_index
         and status = 'COMPLETED';
      v_completed_after := v_completed_after + v_item.quantity;

      select coalesce(sum((line->>'quantity')::integer), 0) into v_refunded_qty
        from public.order_refunds r
        cross join lateral jsonb_array_elements(r.items) line
       where r.order_id = v_order_id
         and r.status = 'SUCCEEDED'
         and (line->>'lineIndex')::integer = v_item.line_index;

      if v_completed_after > v_refunded_qty then
        raise exception 'ACTION_REFUND_NOT_SETTLED' using errcode = 'PT409';
      end if;
    end loop;
  elsif v_order.payment_status = '환불완료' then
    null;
  elsif v_order.payment_status = '결제취소' then
    -- 0031 경로(paid_at is null)로 취소된 주문은 이미 전액 복원됐으므로 증빙 인정. 그렇지 않고
    -- 결제 후 취소된 주문이라면 SUCCEEDED 환불 원장이 있어야만 증빙 인정한다.
    if v_order.paid_at is not null and not exists (
      select 1 from public.order_refunds r
       where r.order_id = v_order_id and r.status = 'SUCCEEDED'
    ) then
      raise exception 'ACTION_REFUND_NOT_SETTLED' using errcode = 'PT409';
    end if;
  else
    raise exception 'ACTION_INVALID_TRANSITION' using errcode = 'PT409';
  end if;

  update public.order_action_request_items
     set status = 'COMPLETED', updated_at = now()
   where request_id = p_request_id and status = 'APPROVED';

  update public.order_action_requests
     set status = public.derive_action_request_status(p_request_id), updated_at = now()
   where id = p_request_id;

  perform public.recompute_order_cancel_status(v_order_id);

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

revoke execute on function public.derive_action_request_status(uuid) from public, anon, authenticated;
grant execute on function public.derive_action_request_status(uuid) to service_role;
revoke execute on function public.recompute_order_cancel_status(uuid) from public, anon, authenticated;
grant execute on function public.recompute_order_cancel_status(uuid) to service_role;
revoke execute on function public.create_order_action_request(uuid, uuid, text, text, jsonb, integer, text) from public, anon, authenticated;
grant execute on function public.create_order_action_request(uuid, uuid, text, text, jsonb, integer, text) to service_role;
revoke execute on function public.transition_action_request(uuid, text) from public, anon, authenticated;
grant execute on function public.transition_action_request(uuid, text) to service_role;
revoke execute on function public.complete_action_request_and_restore(uuid) from public, anon, authenticated;
grant execute on function public.complete_action_request_and_restore(uuid) to service_role;
