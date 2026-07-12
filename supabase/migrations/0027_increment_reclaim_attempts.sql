-- 0027: 재시도 카운트 원자 증가 RPC (opus MEDIUM#6)
-- 기존 repo.recordReclaimAttempt는 select(조회)→update(증가) 2단계 애플리케이션 레이어
-- 카운트업이라, 같은 주문을 두 cron 실행(reconcile-confirming/reclaim-stock)이나 겹친
-- 실행이 동시에 건드리면 조회 시점이 겹쳐 카운트가 유실될 수 있다(lost update).
-- 이 RPC는 update ... set reclaim_attempts = reclaim_attempts + 1 단일 문으로 원자 증가시키고
-- 갱신된 카운트를 즉시 반환해, 호출부(cron)가 그 값으로 dead-letter 임계치를 정확히 판정한다.
--
-- 호출: rpc('increment_reclaim_attempts', { p_order_id: '<uuid>', p_error: '<text>' })
-- 반환: 갱신된 reclaim_attempts(int). 대상 주문이 없으면 null.

create or replace function public.increment_reclaim_attempts(p_order_id uuid, p_error text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts int;
begin
  update public.orders
     set reclaim_attempts = reclaim_attempts + 1,
         last_reclaim_error = p_error
   where id = p_order_id
  returning reclaim_attempts into v_attempts;

  return v_attempts;
end;
$$;

-- PostgREST rpc 노출 권한: reconcile/reclaim-stock cron이 service role 로만 호출한다.
revoke execute on function public.increment_reclaim_attempts(uuid, text) from public, anon;
grant execute on function public.increment_reclaim_attempts(uuid, text) to service_role;
