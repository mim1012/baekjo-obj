-- 0021: 주문 생성 시 원자적 조건부 재고 차감 (오버셀 방지)
-- 패턴: 락 없이 UPDATE ... WHERE stock >= qty 의 조건부 갱신 + FOUND 검증.
-- WHERE 절이 커밋된 값에 재평가되므로(ReadCommitted) 동시 주문의 패자는 0행 매치 → 예외 → 전체 롤백.
-- (재사용 출처: _wiki [[원자적-조건부-감소]] — dorami deductPointsTx 패턴)
--
-- 호출: rpc('decrement_stock_for_order', { p_items: [{ "productId": "p15", "quantity": 2 }, ...] })
-- 실패: 어느 한 상품이라도 재고 부족(또는 stock null/미존재)이면
--       'INSUFFICIENT_STOCK:<productId>' 예외를 던지고 함수 트랜잭션 전체가 롤백된다.

create or replace function public.decrement_stock_for_order(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
begin
  -- 같은 상품이 여러 항목으로 오면 합산하고, 상품 id 오름차순으로 갱신해
  -- 동시 주문 간 락 획득 순서를 고정한다(데드락 방지).
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
       set stock = stock - item.qty
     where id = item.product_id
       and stock >= item.qty; -- stock null 이면 매치 실패 → 재고 부족과 동일 취급

    if not found then
      raise exception 'INSUFFICIENT_STOCK:%', item.product_id;
    end if;
  end loop;
end;
$$;

-- PostgREST rpc 노출 권한: 서버 라우트가 service role 로 호출하므로 anon 권한은 주지 않는다.
revoke execute on function public.decrement_stock_for_order(jsonb) from public, anon;
grant execute on function public.decrement_stock_for_order(jsonb) to service_role;
