-- 0050: 관리자 카드 환불을 "돈 먼저, 라벨 나중"으로 고치는 RPC.
-- 문제: 기존 관리자 '환불완료' 전이는 결제상태 라벨만 CAS로 바꾸고(applyOrderUpdates.ts 비취소
-- 경로) Toss 취소 API도 호출하지 않고 재고도 복원하지 않았다 — 고객은 카드값을 못 돌려받는데
-- 관리자 화면엔 "환불완료"만 찍히는 상태.
-- 해결: 0024(cancel_order_reservation_and_restore)와 같은 패턴으로, payment_status 전이와
-- restore_stock_for_order(0023) 호출을 단일 트랜잭션에 묶는다 — 함수가 예외 없이 끝나야 커밋되므로
-- "라벨은 환불완료인데 재고는 그대로"인 부분 상태가 존재할 수 없다. 실제 Toss 결제 취소 호출은
-- 이 RPC보다 앞서(애플리케이션 레이어, applyOrderUpdates.ts) 성공해야만 이 RPC가 호출된다.
--
-- 호출: rpc('refund_paid_order_and_restore', { p_order_id: '<uuid>' })
-- 반환: true = 이번 호출이 환불 전이·재고 복원을 수행(결제완료 주문이었음), false = 이미 처리됐거나
--       '결제완료' 상태가 아니라 매치 없음(no-op) — 호출부가 409로 분기한다.

create or replace function public.refund_paid_order_and_restore(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_items jsonb;
begin
  update public.orders
     set payment_status = '환불완료'
   where id = p_order_id
     and payment_status = '결제완료'
  returning items into v_items;

  if not found then
    return false;
  end if;

  perform public.restore_stock_for_order(v_items);
  return true;
end;
$$;

-- PostgREST rpc 노출 권한: 관리자 환불 라우트가 service role 로만 호출한다.
revoke execute on function public.refund_paid_order_and_restore(uuid) from public, anon;
grant execute on function public.refund_paid_order_and_restore(uuid) to service_role;
