-- 0071: 옵션 재고를 상품 전체 재고와 함께 원자적으로 차감·복원한다.
-- 기존 스키마(products.detail->options JSONB, orders.items JSONB)는 변경하지 않는다.
-- optionId가 있는 주문은 해당 옵션 stock도 조건부 차감해 품절 옵션 주문과 동시성 오버셀을 막는다.

create or replace function public.decrement_stock_for_order(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  product_item record;
  option_item record;
  v_stock int;
  v_detail jsonb;
  v_option_index int;
  v_option_stock int;
begin
  for product_item in
    select value->>'productId' as product_id,
           sum((value->>'quantity')::int) as qty
      from jsonb_array_elements(p_items)
     group by 1
     order by 1
  loop
    if product_item.qty is null or product_item.qty <= 0 then
      raise exception 'INVALID_QUANTITY:%', product_item.product_id;
    end if;

    select stock, detail
      into v_stock, v_detail
      from public.products
     where id = product_item.product_id
     for update;

    if not found or v_stock is null or v_stock < product_item.qty then
      raise exception 'INSUFFICIENT_STOCK:%', product_item.product_id;
    end if;

    for option_item in
      select value->>'optionId' as option_id,
             sum((value->>'quantity')::int) as qty
        from jsonb_array_elements(p_items)
       where value->>'productId' = product_item.product_id
         and nullif(value->>'optionId', '') is not null
       group by 1
       order by 1
    loop
      select (entry.ordinality - 1)::int,
             nullif(entry.value->>'stock', '')::int
        into v_option_index, v_option_stock
        from jsonb_array_elements(coalesce(v_detail->'options', '[]'::jsonb)) with ordinality as entry(value, ordinality)
       where entry.value->>'id' = option_item.option_id
       limit 1;

      if not found or v_option_stock is null or v_option_stock < option_item.qty then
        raise exception 'INSUFFICIENT_OPTION_STOCK:%:%', product_item.product_id, option_item.option_id;
      end if;

      v_detail := jsonb_set(
        v_detail,
        array['options', v_option_index::text, 'stock'],
        to_jsonb(v_option_stock - option_item.qty),
        false
      );
    end loop;

    update public.products
       set stock = v_stock - product_item.qty,
           detail = v_detail
     where id = product_item.product_id;
  end loop;
end;
$$;

revoke execute on function public.decrement_stock_for_order(jsonb) from public, anon;
grant execute on function public.decrement_stock_for_order(jsonb) to service_role;

create or replace function public.restore_stock_for_order(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  product_item record;
  option_item record;
  v_stock int;
  v_detail jsonb;
  v_option_index int;
  v_option_stock int;
begin
  for product_item in
    select value->>'productId' as product_id,
           sum((value->>'quantity')::int) as qty
      from jsonb_array_elements(p_items)
     group by 1
     order by 1
  loop
    if product_item.qty is null or product_item.qty <= 0 then
      raise exception 'INVALID_QUANTITY:%', product_item.product_id;
    end if;

    select stock, detail
      into v_stock, v_detail
      from public.products
     where id = product_item.product_id
     for update;

    if not found then
      continue;
    end if;

    for option_item in
      select value->>'optionId' as option_id,
             sum((value->>'quantity')::int) as qty
        from jsonb_array_elements(p_items)
       where value->>'productId' = product_item.product_id
         and nullif(value->>'optionId', '') is not null
       group by 1
       order by 1
    loop
      select (entry.ordinality - 1)::int,
             nullif(entry.value->>'stock', '')::int
        into v_option_index, v_option_stock
        from jsonb_array_elements(coalesce(v_detail->'options', '[]'::jsonb)) with ordinality as entry(value, ordinality)
       where entry.value->>'id' = option_item.option_id
       limit 1;

      -- 주문 후 관리자가 옵션을 삭제한 경우 취소 자체는 막지 않고 상품 전체 재고만 복원한다.
      if found and v_option_stock is not null then
        v_detail := jsonb_set(
          v_detail,
          array['options', v_option_index::text, 'stock'],
          to_jsonb(v_option_stock + option_item.qty),
          false
        );
      end if;
    end loop;

    update public.products
       set stock = stock + product_item.qty,
           detail = v_detail
     where id = product_item.product_id;
  end loop;
end;
$$;

revoke execute on function public.restore_stock_for_order(jsonb) from public, anon;
grant execute on function public.restore_stock_for_order(jsonb) to service_role;
