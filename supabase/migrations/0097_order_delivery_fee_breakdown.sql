alter table public.orders
  add column if not exists delivery_fee_breakdown jsonb not null default '[]'::jsonb;

comment on column public.orders.delivery_fee_breakdown is
  'Order-time snapshot of brand-level delivery fees that sum to delivery_fee.';
