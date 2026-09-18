-- 주문 자체가 취소되거나 전액 환불되면 판매자별 접수 상태도 더 이상 진행 중으로 남지 않게 맞춘다.
-- 부분환불은 orders.payment_status='결제완료'를 유지하므로 이 트리거의 대상이 아니다.
create or replace function public.sync_terminal_order_seller_acceptances()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.order_status = '취소완료'
     or new.payment_status in ('결제취소', '환불완료') then
    update public.order_seller_acceptances
       set status = 'cancelled',
           note = coalesce(note, '주문 취소 또는 전액 환불에 따라 자동 종료'),
           updated_at = now()
     where order_id = new.id
       and status <> 'cancelled';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_terminal_order_seller_acceptances on public.orders;
create trigger trg_sync_terminal_order_seller_acceptances
after update of order_status, payment_status on public.orders
for each row
when (
  new.order_status = '취소완료'
  or new.payment_status in ('결제취소', '환불완료')
)
execute function public.sync_terminal_order_seller_acceptances();

revoke execute on function public.sync_terminal_order_seller_acceptances()
  from public, anon, authenticated;
