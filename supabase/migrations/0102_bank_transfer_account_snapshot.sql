alter table public.orders
  add column if not exists bank_transfer_account jsonb;

comment on column public.orders.bank_transfer_account is
  '무통장 주문 생성 시점의 입금계좌 스냅샷. 관리자 계좌 변경 후에도 기존 주문 안내를 보존한다.';

insert into public.order_policy_config (id, value, updated_at)
values (
  'default',
  '{"bankTransferAutoCancelEnabled": false, "bankTransferTtlHours": 72, "bankTransferAccount": {"bankName": "카카오뱅크", "accountNumber": "3333360077573", "accountHolder": "백조 오브제(Baekjo objet)"}}'::jsonb,
  now()
)
on conflict (id) do update
set value = order_policy_config.value || jsonb_build_object(
  'bankTransferAccount',
  coalesce(order_policy_config.value->'bankTransferAccount', excluded.value->'bankTransferAccount')
),
updated_at = now();
