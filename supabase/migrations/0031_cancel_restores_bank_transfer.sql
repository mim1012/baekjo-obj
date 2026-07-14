-- 0031: cancel_order_reservation_and_restore가 무통장입금('입금대기') 주문도 취소·복원하도록 조건 확장
-- 문제: POST /api/orders(src/app/api/orders/route.ts)는 무통장입금 주문을 payment_status='입금대기'로
-- 생성한다(expiresAt 없이). 그런데 0024가 만든 이 함수는 WHERE payment_status='결제대기'만 UPDATE
-- 대상으로 삼아, 무통장입금 주문을 취소하면 0행 매치로 false를 반환한다. 그 결과 cancelViaRpc가
-- 'already-settled'로 오분류하고 /api/payments/cancel 라우트는 그래도 200을 반환한다 — 취소도 안 되고
-- 재고도 영구히 복원되지 않는데 "취소됐습니다"라고 응답하는 결함이다. 재고 회수 cron도 '결제대기'/
-- '승인중'만 스캔하고 무통장입금은 expires_at이 없어 대상이 아니므로 cron도 이 재고를 복원하지 못한다.
-- 해결: 조건절에 '입금대기'를 추가해 무통장입금 주문도 같은 취소·복원 트랜잭션을 타게 한다.
-- 0024가 세운 나머지 계약(취소 상태 세팅, items returning, restore_stock_for_order 단일 트랜잭션 호출,
-- security definer, search_path, service_role 전용 grant)은 그대로 유지한다 — 조건절만 넓힌다.
--
-- 0028(cancel_confirming_and_restore, WHERE payment_status='승인중' AND payment_key=?)과의
-- 상호배타성은 깨지지 않는다 — payment_status는 한 시점에 하나의 값만 가지므로 '결제대기'/'입금대기'
-- 집합과 '승인중'은 여전히 서로소이고, '승인중' 주문은 여전히 0028 전용 keyed 함수로만 취소·복원된다.
--
-- 호출: rpc('cancel_order_reservation_and_restore', { p_order_id: '<uuid>' })
-- 반환: true = 이번 호출이 취소·복원을 수행(결제대기 또는 입금대기 선점 주문이었음),
--       false = 이미 처리된 주문(결제완료로 확정됐거나 이미 취소됐거나 승인중)이라 no-op.

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
     and payment_status in ('결제대기', '입금대기')
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
