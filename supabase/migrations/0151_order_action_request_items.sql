-- 상품별(수량 단위) 취소·환불 요청의 라인 아이템 상태를 분리 저장한다. 지금까지
-- order_action_requests.status는 요청 전체(브랜드 단위) 하나만 가졌는데, 관리자가 상품/수량
-- 단위로 승인·반려·완료를 다르게 처리해야 하므로(부분취소) 아이템마다 독립된 상태가 필요하다.
-- order_action_requests.status 컬럼은 이후 advisory(호환용)로만 남고, 진실 소스는 이 테이블이다
-- (src/lib/orders/actionRequests.ts의 deriveRequestStatus/aggregateOrderCancelStatus 참고).

create table public.order_action_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.order_action_requests(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict,
  line_index integer not null check (line_index >= 0),
  product_id text not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0),
  amount integer not null check (amount >= 0),
  option_name text,
  status text not null default 'REQUESTED' check (status in ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index order_action_request_items_request_idx on public.order_action_request_items (request_id);
create index order_action_request_items_order_idx on public.order_action_request_items (order_id);
alter table public.order_action_request_items enable row level security;

-- 기존 order_action_requests.items(jsonb)를 아이템 행으로 백필한다. status는 부모 요청의
-- status를 그대로 물려받는다(전량 REQUESTED/APPROVED/REJECTED/COMPLETED 중 하나였으므로
-- 이 시점엔 부모 status = 전체 아이템 status와 동일하다).
insert into public.order_action_request_items
  (request_id, order_id, line_index, product_id, product_name, quantity, unit_price, amount, option_name, status)
select r.id, r.order_id,
       (elem->>'lineIndex')::int,
       elem->>'productId',
       coalesce(elem->>'productName', ''),
       (elem->>'quantity')::int,
       coalesce((elem->>'unitPrice')::int, 0),
       coalesce((elem->>'amount')::int, 0),
       elem->>'optionName',
       r.status
from public.order_action_requests r
cross join lateral jsonb_array_elements(r.items) elem
where not exists (
  select 1 from public.order_action_request_items i where i.request_id = r.id
);

-- 주문 전체의 취소 집계 상태를 계산해 orders.order_status에 기록한다
-- (src/lib/orders/actionRequests.ts의 aggregateOrderCancelStatus와 동일 규칙).
-- 활성(REQUESTED/APPROVED/COMPLETED) 아이템이 하나도 없으면 손대지 않는다(해당 주문에 상품별
-- 취소 이력 자체가 없다는 뜻이라 order_status는 이 함수의 관할이 아니다). 이미 '취소완료'로
-- 확정된 주문(전체취소 RPC 등 다른 경로)은 낮은 값으로 되돌리지 않는다(다운그레이드 금지).
create or replace function public.recompute_order_cancel_status(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_ordered integer;
  v_completed_qty integer;
  v_approved_qty integer;
  v_requested_qty integer;
  v_new_status text;
begin
  select coalesce(sum((e->>'quantity')::int), 0)
    into v_total_ordered
    from jsonb_array_elements((select items from public.orders where id = p_order_id)) e
   where (e->>'quantity') ~ '^[0-9]+$';

  select
    coalesce(sum(quantity) filter (where status = 'COMPLETED'), 0),
    coalesce(sum(quantity) filter (where status = 'APPROVED'), 0),
    coalesce(sum(quantity) filter (where status = 'REQUESTED'), 0)
    into v_completed_qty, v_approved_qty, v_requested_qty
    from public.order_action_request_items
   where order_id = p_order_id;

  if v_requested_qty + v_approved_qty + v_completed_qty = 0 then
    return;
  end if;

  if v_total_ordered > 0 and v_completed_qty >= v_total_ordered then
    v_new_status := '취소완료';
  elsif v_completed_qty > 0 then
    v_new_status := '부분취소완료';
  elsif v_approved_qty > 0 then
    v_new_status := '부분취소';
  elsif v_requested_qty > 0 then
    v_new_status := '취소요청';
  else
    v_new_status := '주문접수';
  end if;

  update public.orders
     set order_status = v_new_status
   where id = p_order_id
     and (order_status <> '취소완료' or v_new_status = '취소완료');
end;
$$;

-- 상품별 취소·환불 요청 생성(회원 API 전용). order_action_requests 삽입 + 아이템 행 삽입을
-- 하나의 트랜잭션으로 묶는다. 멱등 충돌(같은 브랜드/요청타입의 활성 요청 unique index)은
-- 23505로 던져 호출부(repo.ts)가 'action-request-already-exists'로 구분 응답할 수 있게 한다.
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
  v_request public.order_action_requests%rowtype;
  v_item jsonb;
begin
  begin
    insert into public.order_action_requests
      (order_id, member_id, request_type, brand_id, items, requested_amount, reason)
    values
      (p_order_id, p_member_id, p_request_type, p_brand_id, p_items, p_requested_amount, p_reason)
    returning * into v_request;
  exception when unique_violation then
    raise exception 'action-request-already-exists' using errcode = '23505';
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

-- 관리자 승인/반려. 아이템 레벨로 전이하며, 이미 승인/반려된 아이템에 대해 재호출되면 멱등하게
-- 처리한다(중복 클릭 대비). APPROVE/REJECT 모두 완료된(COMPLETED) 아이템은 절대 건드리지 않는다
-- 돈이 움직인 결정을 관리자 재클릭으로 되돌릴 수 없게 한다.
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

-- 관리자 취소완료 처리. 돈 먼저, 라벨 나중 원칙(0072와 동일)을 아이템 단위로 지킨다.
-- 무통장(paymentKey null, 결제완료)은 자동 완료를 거부해 관리자가 실제 환불을 먼저 처리하도록
-- 강제하고, 카드는 기존 부분환불 원장(order_refunds SUCCEEDED)이 해당 수량을 이미 커버했는지
-- 대조해 커버되지 않았으면 완료를 거부한다(환불 없는 재고만 복원되는 사고 방지).
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

revoke execute on function public.recompute_order_cancel_status(uuid) from public, anon;
grant execute on function public.recompute_order_cancel_status(uuid) to service_role;
revoke execute on function public.create_order_action_request(uuid, uuid, text, text, jsonb, integer, text) from public, anon;
grant execute on function public.create_order_action_request(uuid, uuid, text, text, jsonb, integer, text) to service_role;
revoke execute on function public.transition_action_request(uuid, text) from public, anon;
grant execute on function public.transition_action_request(uuid, text) to service_role;
revoke execute on function public.complete_action_request_and_restore(uuid) from public, anon;
grant execute on function public.complete_action_request_and_restore(uuid) to service_role;
