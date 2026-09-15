-- 0072's create_order_refund_request() returns the existing row whenever the idempotency key
-- is already used, without checking that the replay targets the same order or carries the same
-- payload (items/include_delivery_fee). A caller that reuses a key from a different order (or a
-- different item selection on the same order) silently gets back an unrelated refund record
-- instead of an error, which the route layer cannot detect. This supersedes 0072's definition
-- (create or replace, same signature) and only replaces the existing-key branch: it now raises a
-- PT409 conflict for order-id or payload mismatches. PT409 is used (not a plain application error
-- or 40001) because PostgREST retries SQLSTATE 40001 (serialization_failure) transparently, so
-- calls through /rest/v1/rpc/... (supabase-js) would hang 30s+ instead of returning a 409 for what
-- is an application-level conflict, not a transient serialization failure (see
-- [[PostgREST-RPC-40001충돌-30초무응답-PT409]]).
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
  v_existing_key_items jsonb;
  v_request_key_items jsonb;
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
    if v_existing.order_id <> p_order_id or v_existing.include_delivery_fee <> p_include_delivery_fee then
      raise exception 'REFUND_IDEMPOTENCY_KEY_CONFLICT' using errcode = 'PT409';
    end if;

    select coalesce(
             jsonb_agg(
               jsonb_build_object(
                 'lineIndex', (line->>'lineIndex')::integer,
                 'productId', line->>'productId',
                 'quantity', (line->>'quantity')::integer
               )
               order by (line->>'lineIndex')::integer
             ),
             '[]'::jsonb
           )
      into v_existing_key_items
      from jsonb_array_elements(v_existing.items) line;

    select coalesce(
             jsonb_agg(
               jsonb_build_object(
                 'lineIndex', (line->>'lineIndex')::integer,
                 'productId', line->>'productId',
                 'quantity', (line->>'quantity')::integer
               )
               order by (line->>'lineIndex')::integer
             ),
             '[]'::jsonb
           )
      into v_request_key_items
      from jsonb_array_elements(p_items) line;

    if v_existing_key_items is distinct from v_request_key_items then
      raise exception 'REFUND_IDEMPOTENCY_KEY_CONFLICT' using errcode = 'PT409';
    end if;

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

revoke execute on function public.create_order_refund_request(uuid, text, jsonb, boolean, integer, text, uuid)
  from public, anon, authenticated;
grant execute on function public.create_order_refund_request(uuid, text, jsonb, boolean, integer, text, uuid)
  to service_role;
