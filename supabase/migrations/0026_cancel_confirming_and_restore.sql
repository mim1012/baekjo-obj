-- 0026: '승인중' 주문 취소 + 재고 복원 (웹훅 웨이브 W1 — 상태기계 재수술)
-- 0024(cancel_order_reservation_and_restore)와 동일 패턴이되 WHERE payment_status='승인중'.
-- 0024는 WHERE '결제대기' 그대로 둔다 — cancel 라우트·만료 cron은 여전히 '결제대기'만 건드리고
-- '승인중'은 절대 못 건드린다(상태기계 불변식). 이 함수는 reconcile(U6)·webhook(U5)·confirm 거절
-- 경로(U4) 전용이며, 취소 UPDATE와 재고 복원을 단일 트랜잭션으로 묶어 부분 커밋을 막는다(0024와 동일 이유).
--
-- 호출: rpc('cancel_confirming_and_restore', { p_order_id: '<uuid>' })
-- 반환: true = 이번 호출이 '승인중' 주문을 취소·복원(선점 해제) 수행, false = 이미 처리된 주문
--       (결제완료로 확정됐거나 승인중이 아님)이라 no-op — 0024와 상호배타(같은 주문이 둘 다 true를
--       반환할 수 없다. payment_status는 한 시점에 '결제대기' 또는 '승인중' 둘 중 하나만 가능하므로).

create or replace function public.cancel_confirming_and_restore(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_items jsonb;
begin
  update public.orders
     set order_status = '취소완료',
         payment_status = '결제취소'
   where id = p_order_id
     and payment_status = '승인중'
  returning items into v_items;

  if not found then
    return false;
  end if;

  perform public.restore_stock_for_order(v_items);
  return true;
end;
$$;

-- PostgREST rpc 노출 권한: reconcile cron·webhook·confirm 거절 경로가 service role 로만 호출한다.
revoke execute on function public.cancel_confirming_and_restore(uuid) from public, anon;
grant execute on function public.cancel_confirming_and_restore(uuid) to service_role;
