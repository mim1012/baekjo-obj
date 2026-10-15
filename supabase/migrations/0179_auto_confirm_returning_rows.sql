-- 0179: 자동 구매확정 크론이 알림톡을 보낼 수 있도록 "확정된 행"을 돌려주는 RPC 추가
-- 0044의 auto_confirm_paid_delivered_shipments는 전이된 행 "수"만 반환해 크론이 어느 주문·브랜드를
-- 확정했는지 알 수 없었다. 구매확정 알림톡(주문번호·브랜드별 상품명 필요)을 보내려면 행 식별자가 필요하다.
-- 선택·갱신 로직은 0044와 동일(결제완료 + 배송완료 + cutoff 경과)하고 UPDATE ... RETURNING으로 행을 돌려준다.
-- 기존 count 함수는 건드리지 않는다 — 코드가 마이그레이션보다 먼저 배포돼도 크론이 폴백으로 동작한다.
--
-- 호출: rpc('auto_confirm_paid_delivered_shipments_rows', { p_cutoff: <iso>, p_confirmed_at: <iso> })
-- 반환: 이번 호출이 '구매확정'으로 전이시킨 (order_id, brand_id, confirmed_at) 행들.
--       조건부 UPDATE라 이미 확정된 행은 WHERE에 안 걸려 자연 제외(멱등) — 알림 중복 발송도 방지된다.

create or replace function public.auto_confirm_paid_delivered_shipments_rows(
  p_cutoff timestamptz,
  p_confirmed_at timestamptz
)
returns table (order_id uuid, brand_id text, confirmed_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.shipments s
     set delivery_status = '구매확정',
         confirmed_at = p_confirmed_at
    from public.orders o
   where o.id = s.order_id
     and o.payment_status = '결제완료'
     and s.delivery_status = '배송완료'
     and s.delivered_at is not null
     and s.delivered_at < p_cutoff
  returning s.order_id, s.brand_id, s.confirmed_at;
end;
$$;

-- 0044와 동일한 잠금 쌍 — 크론(service-role) 전용.
revoke execute on function public.auto_confirm_paid_delivered_shipments_rows(timestamptz, timestamptz) from public, anon;
grant execute on function public.auto_confirm_paid_delivered_shipments_rows(timestamptz, timestamptz) to service_role;