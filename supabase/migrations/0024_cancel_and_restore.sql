-- 0024: 재고 선점 취소 + 복원을 단일 트랜잭션으로 묶는 RPC (codex CRITICAL 정정 2026-07-12)
-- 문제: cancelOrderReservation(취소 UPDATE)과 restoreStockForOrder(복원 RPC)를 애플리케이션
-- 레이어에서 "취소 먼저 → 승자만 복원" 2단계 호출로 순서를 지켜 이중복원을 막으려 했으나,
-- 두 호출 사이에 크래시가 나면(취소는 커밋됐는데 복원 전에 죽음) 재고가 영구 유실된다.
-- 해결: 취소와 복원을 이 함수 하나의 트랜잭션으로 묶는다 — 함수가 예외 없이 끝나야
-- 커밋되므로 "취소는 됐는데 복원은 안 됨" 상태가 원천적으로 존재할 수 없다.
--
-- 호출: rpc('cancel_order_reservation_and_restore', { p_order_id: '<uuid>' })
-- 반환: true = 이번 호출이 취소·복원을 수행(선점 주문이었음), false = 이미 처리된 주문
--       (결제완료로 확정됐거나 이미 취소됨)이라 no-op — 호출부는 둘 다 성공(200)으로 취급한다.

create or replace function public.cancel_order_reservation_and_restore(p_order_id uuid)
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
     and payment_status = '결제대기'
  returning items into v_items;

  if not found then
    return false;
  end if;

  perform public.restore_stock_for_order(v_items);
  return true;
end;
$$;

-- PostgREST rpc 노출 권한: cancel 라우트·만료 cron이 service role 로만 호출한다.
revoke execute on function public.cancel_order_reservation_and_restore(uuid) from public, anon;
grant execute on function public.cancel_order_reservation_and_restore(uuid) to service_role;
