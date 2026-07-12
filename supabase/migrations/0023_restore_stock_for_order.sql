-- 0023: 주문 취소/만료 시 원자적 재고 복원 (0021 decrement_stock_for_order 의 역연산)
-- 패턴: 0021과 동일하게 productId 합산 후 id 오름차순으로 갱신해 락 획득 순서를 고정한다
-- (데드락 방지). 복원은 조건부가 필요 없다 — 항상 성공(재고가 늘어나기만 하므로 실패 케이스 없음).
--
-- 호출: rpc('restore_stock_for_order', { p_items: [{ "productId": "p15", "quantity": 2 }, ...] })
-- 함정: stock 이 null 인 상품(0021의 조건부 차감 대상 밖이었던 레코드)에 대비해
--       coalesce(stock, 0) + qty 로 방어한다 — null + qty 는 null 이 되어 조용히 복원이 유실된다.

create or replace function public.restore_stock_for_order(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
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
       set stock = coalesce(stock, 0) + item.qty
     where id = item.product_id;
  end loop;
end;
$$;

-- PostgREST rpc 노출 권한: 서버 라우트(confirm 실패·cancel·cron)가 service role 로만 호출한다.
revoke execute on function public.restore_stock_for_order(jsonb) from public, anon;
grant execute on function public.restore_stock_for_order(jsonb) to service_role;
