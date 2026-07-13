-- 0028: cancel_confirming_and_restore에 payment_key 바인딩 추가(codex HIGH 지적 방어)
-- 0026(cancel_confirming_and_restore(uuid))은 WHERE payment_status='승인중'만 보고 payment_key는
-- 보지 않았다 — 그래서 라우트가 어떤 paymentKey로 취소를 결정했든, orderId만 넘기면 그 시점에
-- '승인중'인 주문이면 무조건 복원됐다. decide.ts의 PaymentAction.restoreConfirming이 판단 시점의
-- paymentKey를 증거로 싣도록 바뀌었으므로, 실행기가 그 증거를 실제로 검증에 쓸 수 있어야 한다.
--
-- 0026은 그대로 남긴다(과거 히스토리 보존, 다른 호출부 없음을 이 리팩터로 확인). 신규 오버로드를
-- 추가하고 repo.ts는 이 2-인자 버전만 호출한다.
--
-- 호출: rpc('cancel_confirming_and_restore', { p_order_id: '<uuid>', p_payment_key: '<key>' })
-- 반환: true = 이번 호출이 '승인중'+해당 payment_key 일치 주문을 취소·복원 수행, false = 이미
--       처리됐거나 승인중이 아니거나 payment_key가 다름(경합 중 다른 paymentKey로 재시도가
--       이미 그 사이 새 claim을 발급한 경우를 잘못 취소하지 않는다) — no-op.

create or replace function public.cancel_confirming_and_restore(p_order_id uuid, p_payment_key text)
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
     and payment_key = p_payment_key
  returning items into v_items;

  if not found then
    return false;
  end if;

  perform public.restore_stock_for_order(v_items);
  return true;
end;
$$;

revoke execute on function public.cancel_confirming_and_restore(uuid, text) from public, anon;
grant execute on function public.cancel_confirming_and_restore(uuid, text) to service_role;
