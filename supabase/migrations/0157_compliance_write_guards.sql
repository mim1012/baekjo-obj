-- 고객 요청은 주문 소유자·실제 판매자·결제 상태를 DB에서도 다시 확인한다.
-- API의 선행 검사 직후 주문이 취소되는 경합에서도 잘못된 교환·반품 접수가 생기지 않는다.
create or replace function public.guard_customer_service_request_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
      from public.orders o
     where o.id = new.order_id
       and o.member_id = new.member_id
       and o.payment_status = '결제완료'
       and o.order_status not in ('취소요청', '취소완료')
       and exists (
         select 1
           from jsonb_array_elements(o.seller_groups) as seller_group
          where seller_group->>'key' = new.seller_key
       )
  ) then
    raise exception 'CUSTOMER_REQUEST_NOT_ALLOWED';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_customer_service_request_insert
  on public.customer_service_requests;
create trigger trg_guard_customer_service_request_insert
before insert on public.customer_service_requests
for each row execute function public.guard_customer_service_request_insert();

-- 취소·전액 환불된 주문은 판매자 접수 상태를 다시 대기/수락/거절로 열 수 없다.
create or replace function public.guard_terminal_order_seller_acceptance()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status <> 'cancelled' and exists (
    select 1
      from public.orders o
     where o.id = new.order_id
       and (
         o.order_status = '취소완료'
         or o.payment_status in ('결제취소', '환불완료')
       )
  ) then
    raise exception 'TERMINAL_ORDER_ACCEPTANCE_LOCKED';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_terminal_order_seller_acceptance
  on public.order_seller_acceptances;
create trigger trg_guard_terminal_order_seller_acceptance
before insert or update on public.order_seller_acceptances
for each row execute function public.guard_terminal_order_seller_acceptance();

revoke execute on function public.guard_customer_service_request_insert()
  from public, anon, authenticated;
revoke execute on function public.guard_terminal_order_seller_acceptance()
  from public, anon, authenticated;
