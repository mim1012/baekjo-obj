-- 교환·반품 요청 처리 순서를 DB에서도 강제해 완료 후 재개방이나 단계 건너뛰기를 막는다.
create or replace function public.guard_customer_service_request_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status and not (
    (old.status = 'received' and new.status = 'reviewing')
    or (old.status = 'reviewing' and new.status in ('approved', 'rejected'))
    or (old.status in ('approved', 'rejected') and new.status = 'completed')
  ) then
    raise exception 'INVALID_CUSTOMER_REQUEST_STATUS_TRANSITION';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_customer_service_request_status_transition
  on public.customer_service_requests;
create trigger trg_guard_customer_service_request_status_transition
before update of status on public.customer_service_requests
for each row execute function public.guard_customer_service_request_status_transition();

revoke execute on function public.guard_customer_service_request_status_transition()
  from public, anon, authenticated;
