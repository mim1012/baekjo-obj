-- 0044: 자동 구매확정 크론에 결제 게이트 (미결제 주문 자동확정 차단)
-- #127이 고객/관리자 확정 라우트에 앱 레이어 가드(decideShipmentConfirm → 'blocked-unpaid')를 넣었지만,
-- 크론(auto-confirm-shipments)의 set-based UPDATE는 orders.payment_status를 보지 않았다 —
-- 미결제(입금대기·결제대기) 주문도 관리자가 배송완료로 바꾸면 7일 뒤 자동 '구매확정'됐다(#127 opus 관찰).
-- 정산 도입 전 필수 봉합: shipments UPDATE에 orders 조인을 붙여 결제완료 주문의 송장만 확정한다.
-- supabase-js는 UPDATE ... FROM 조인을 표현할 수 없어 RPC로 원자화한다(0021·0031과 같은 사상).
--
-- 호출: rpc('auto_confirm_paid_delivered_shipments', { p_cutoff: <iso>, p_confirmed_at: <iso> })
-- 반환: 전이된 행 수. 조건부 UPDATE라 고객이 먼저 확정한 행(구매확정)은 WHERE에 안 걸려 자연 제외(멱등),
--       크론·고객 버튼 동시 실행도 이중 확정이 안 생긴다(기존 autoConfirmDeliveredBefore와 동일 사상).

create or replace function public.auto_confirm_paid_delivered_shipments(
  p_cutoff timestamptz,
  p_confirmed_at timestamptz
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.shipments s
     set delivery_status = '구매확정',
         confirmed_at = p_confirmed_at
    from public.orders o
   where o.id = s.order_id
     and o.payment_status = '결제완료'
     and s.delivery_status = '배송완료'
     and s.delivered_at is not null
     and s.delivered_at < p_cutoff;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- security definer 함수는 기본으로 PUBLIC에 execute가 열려 PostgREST /rpc로 anon 호출이 가능해진다 —
-- 크론(service-role) 전용으로 잠근다(0021·0031과 동일한 잠금 쌍).
revoke execute on function public.auto_confirm_paid_delivered_shipments(timestamptz, timestamptz) from public, anon;
grant execute on function public.auto_confirm_paid_delivered_shipments(timestamptz, timestamptz) to service_role;
