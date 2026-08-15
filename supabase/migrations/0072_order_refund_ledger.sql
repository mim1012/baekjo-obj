create table public.order_refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  idempotency_key text not null unique,
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  include_delivery_fee boolean not null default false,
  requested_amount integer not null check (requested_amount > 0),
  approved_amount integer check (approved_amount is null or approved_amount > 0),
  status text not null default 'PROCESSING' check (status in ('PROCESSING', 'SUCCEEDED', 'FAILED', 'UNKNOWN')),
  reason text not null,
  payment_key text,
  provider_balance_before integer check (provider_balance_before is null or provider_balance_before >= 0),
  provider_balance_after integer check (provider_balance_after is null or provider_balance_after >= 0),
  provider_status text,
  transaction_key text,
  error_message text,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index order_refunds_order_id_idx on public.order_refunds (order_id, created_at desc);
create index order_refunds_active_order_idx on public.order_refunds (order_id)
  where status in ('PROCESSING', 'UNKNOWN');

alter table public.order_refunds enable row level security;

create or replace function public.restore_stock_for_order(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  v_updated integer;
begin
  for item in
    select value->>'productId' as product_id,
           sum((value->>'quantity')::int) as qty
    from jsonb_array_elements(p_items)
    group by 1
    order by 1
  loop
    if item.qty is null or item.qty <= 0 then
      raise exception 'INVALID_QUANTITY:%', item.product_id;
    end if;

    update public.products
       set stock = stock + item.qty
     where id = item.product_id;

    get diagnostics v_updated = row_count;
    if v_updated = 0 then
      raise exception 'PRODUCT_NOT_FOUND:%', item.product_id;
    end if;
  end loop;
end;
$$;

create or replace function public.create_order_refund_request(
  p_order_id uuid,
  p_idempotency_key text,
  p_items jsonb,
  p_include_delivery_fee boolean,
  p_provider_balance_before integer,
  p_reason text,
  p_created_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_existing public.order_refunds%rowtype;
  v_refund public.order_refunds%rowtype;
  v_item jsonb;
  v_source jsonb;
  v_seen integer[] := '{}';
  v_line integer;
  v_product_id text;
  v_quantity integer;
  v_order_quantity integer;
  v_refunded_quantity integer;
  v_unit_price integer;
  v_line_amount integer;
  v_requested_amount integer := 0;
  v_normalized_items jsonb := '[]'::jsonb;
  v_index integer;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 or length(p_idempotency_key) > 300 then
    raise exception 'REFUND_INVALID_IDEMPOTENCY_KEY';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 or length(p_reason) > 200 then
    raise exception 'REFUND_INVALID_REASON';
  end if;
  if p_provider_balance_before is null or p_provider_balance_before < 0 then
    raise exception 'REFUND_INVALID_PROVIDER_BALANCE';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 100 then
    raise exception 'REFUND_INVALID_ITEMS';
  end if;

  select * into v_existing
    from public.order_refunds
   where idempotency_key = p_idempotency_key
   for update;
  if found then
    return to_jsonb(v_existing);
  end if;

  select * into v_order
    from public.orders
   where id = p_order_id
   for update;
  if not found then
    raise exception 'REFUND_ORDER_NOT_FOUND';
  end if;
  if v_order.payment_status <> '결제완료' then
    raise exception 'REFUND_ORDER_NOT_PAID';
  end if;
  if v_order.order_status = '취소완료' then
    raise exception 'REFUND_ORDER_CANCELED';
  end if;
  if v_order.delivery_status in ('배송중', '배송완료') then
    raise exception 'REFUND_AFTER_SHIPMENT_NOT_SUPPORTED';
  end if;
  if exists (
    select 1 from public.order_refunds
     where order_id = p_order_id
       and status in ('PROCESSING', 'UNKNOWN')
  ) then
    raise exception 'REFUND_IN_PROGRESS';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if v_item->>'lineIndex' is null or v_item->>'productId' is null or v_item->>'quantity' is null then
      raise exception 'REFUND_INVALID_ITEM';
    end if;
    v_line := (v_item->>'lineIndex')::integer;
    v_product_id := v_item->>'productId';
    v_quantity := (v_item->>'quantity')::integer;
    if v_line < 0 or v_line >= jsonb_array_length(v_order.items) or v_quantity <= 0 then
      raise exception 'REFUND_INVALID_ITEM';
    end if;
    if v_line = any(v_seen) then
      raise exception 'REFUND_DUPLICATE_ITEM';
    end if;
    v_seen := array_append(v_seen, v_line);
    v_source := v_order.items -> v_line;
    if v_source->>'productId' <> v_product_id then
      raise exception 'REFUND_PRODUCT_MISMATCH';
    end if;
    if v_source->>'quantity' !~ '^[0-9]+$' or v_source->>'price' !~ '^[0-9]+$' then
      raise exception 'REFUND_ORDER_ITEM_INVALID';
    end if;
    v_order_quantity := (v_source->>'quantity')::integer;
    v_unit_price := (v_source->>'price')::integer;
    select coalesce(sum((line->>'quantity')::integer), 0)
      into v_refunded_quantity
      from public.order_refunds r
      cross join lateral jsonb_array_elements(r.items) line
     where r.order_id = p_order_id
       and r.status = 'SUCCEEDED'
       and (line->>'lineIndex')::integer = v_line;
    if v_quantity > v_order_quantity - v_refunded_quantity then
      raise exception 'REFUND_QUANTITY_EXCEEDS_REMAINING';
    end if;
    v_line_amount := v_unit_price * v_quantity;
    if v_line_amount <= 0 then
      raise exception 'REFUND_AMOUNT_INVALID';
    end if;
    v_requested_amount := v_requested_amount + v_line_amount;
    v_normalized_items := v_normalized_items || jsonb_build_array(
      jsonb_build_object(
        'lineIndex', v_line,
        'productId', v_product_id,
        'productName', coalesce(v_source->>'productName', ''),
        'optionId', v_source->>'optionId',
        'optionName', v_source->>'optionName',
        'quantity', v_quantity,
        'unitPrice', v_unit_price,
        'amount', v_line_amount
      )
    );
  end loop;

  if p_include_delivery_fee then
    for v_index in 0..jsonb_array_length(v_order.items) - 1
    loop
      v_source := v_order.items -> v_index;
      v_order_quantity := (v_source->>'quantity')::integer;
      select coalesce(sum((line->>'quantity')::integer), 0)
        into v_refunded_quantity
        from public.order_refunds r
        cross join lateral jsonb_array_elements(r.items) line
       where r.order_id = p_order_id
         and r.status = 'SUCCEEDED'
         and (line->>'lineIndex')::integer = v_index;
      if v_order_quantity - v_refunded_quantity > 0 and not exists (
        select 1 from jsonb_array_elements(p_items) line
         where (line->>'lineIndex')::integer = v_index
           and (line->>'quantity')::integer = v_order_quantity - v_refunded_quantity
      ) then
        raise exception 'REFUND_DELIVERY_FEE_REQUIRES_ALL_ITEMS';
      end if;
    end loop;
    v_requested_amount := v_requested_amount + v_order.delivery_fee;
  end if;

  if v_requested_amount <= 0 or v_requested_amount > p_provider_balance_before then
    raise exception 'REFUND_AMOUNT_EXCEEDS_BALANCE';
  end if;
  if jsonb_array_length(v_normalized_items) = 0 and not p_include_delivery_fee then
    raise exception 'REFUND_ITEMS_REQUIRED';
  end if;

  insert into public.order_refunds (
    order_id,
    idempotency_key,
    items,
    include_delivery_fee,
    requested_amount,
    status,
    reason,
    payment_key,
    provider_balance_before,
    created_by
  ) values (
    p_order_id,
    p_idempotency_key,
    v_normalized_items,
    p_include_delivery_fee,
    v_requested_amount,
    'PROCESSING',
    trim(p_reason),
    v_order.payment_key,
    p_provider_balance_before,
    p_created_by
  ) returning * into v_refund;

  return to_jsonb(v_refund);
end;
$$;

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
  return to_jsonb(v_refund);
end;
$$;

create or replace function public.update_order_refund_exception(
  p_refund_id uuid,
  p_status text,
  p_error_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_refund public.order_refunds%rowtype;
begin
  if p_status not in ('FAILED', 'UNKNOWN') then
    raise exception 'REFUND_INVALID_EXCEPTION_STATUS';
  end if;
  update public.order_refunds
     set status = p_status,
         error_message = left(coalesce(p_error_message, ''), 1000)
   where id = p_refund_id
     and status in ('PROCESSING', 'UNKNOWN')
   returning * into v_refund;
  if not found then
    select * into v_refund from public.order_refunds where id = p_refund_id;
  end if;
  if not found then
    raise exception 'REFUND_NOT_FOUND';
  end if;
  return to_jsonb(v_refund);
end;
$$;

revoke execute on function public.restore_stock_for_order(jsonb) from public, anon;
grant execute on function public.restore_stock_for_order(jsonb) to service_role;
revoke execute on function public.create_order_refund_request(uuid, text, jsonb, boolean, integer, text, uuid) from public, anon;
grant execute on function public.create_order_refund_request(uuid, text, jsonb, boolean, integer, text, uuid) to service_role;
revoke execute on function public.complete_order_refund(uuid, integer, integer, text, text) from public, anon;
grant execute on function public.complete_order_refund(uuid, integer, integer, text, text) to service_role;
revoke execute on function public.update_order_refund_exception(uuid, text, text) from public, anon;
grant execute on function public.update_order_refund_exception(uuid, text, text) to service_role;
