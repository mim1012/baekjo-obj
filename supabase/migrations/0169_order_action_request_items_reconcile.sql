-- Reconcile migration. staging already has public.order_action_request_items applied via the old
-- feature/item-cancel-status branch's 0151_order_action_request_items.sql (never merged to this
-- history under that number — 0151 in *this* history is 0151_sellers_order_compliance_and_customer_requests.sql).
-- Every DDL statement below is `if not exists`/`add column if not exists` so it is a no-op against
-- staging's current shape (verified: columns id/request_id/order_id/line_index/product_id/
-- product_name/quantity/unit_price/amount/option_name/status/created_at/updated_at all already
-- present; order_action_request_items_{order,request}_idx already present; 22 requests / 22 items /
-- 0 requests without items). The only *effective* change this migration makes is swapping the
-- active-request unique index from (order_id, brand_id, request_type) to (order_id, brand_id) —
-- 0170's create_order_action_request re-validates remaining quantity per line directly, so a
-- CANCEL and a REFUND request no longer need to be allowed active at the same time for the same
-- brand; collapsing them onto one active slot per (order, brand) is what lets a rejected/completed
-- request's brand be re-requested under either type without a stale duplicate.

create table if not exists public.order_action_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.order_action_requests(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict,
  line_index integer not null check (line_index >= 0),
  product_id text not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0),
  amount integer not null check (amount >= 0),
  option_name text,
  status text not null default 'REQUESTED' check (status in ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.order_action_request_items add column if not exists status text not null default 'REQUESTED';
alter table public.order_action_request_items add column if not exists updated_at timestamptz not null default now();

create index if not exists order_action_request_items_request_idx on public.order_action_request_items (request_id);
create index if not exists order_action_request_items_order_idx on public.order_action_request_items (order_id);

alter table public.order_action_request_items enable row level security;

revoke all on public.order_action_request_items from public, anon, authenticated;

-- Backfill: only requests that currently have zero item rows get item rows derived from their
-- own order_action_requests.items jsonb snapshot (0149's request row shape). On staging this
-- WHERE NOT EXISTS predicate matches 0 rows (22 requests already have 22 items), so this is a
-- no-op there; it exists to make this migration safe to apply to any environment that still has
-- bare 0149-era rows with no item rows at all.
insert into public.order_action_request_items
  (request_id, order_id, line_index, product_id, product_name, quantity, unit_price, amount, option_name, status)
select r.id, r.order_id,
       (elem->>'lineIndex')::int,
       elem->>'productId',
       coalesce(elem->>'productName', ''),
       (elem->>'quantity')::int,
       coalesce((elem->>'unitPrice')::int, 0),
       coalesce((elem->>'amount')::int, 0),
       elem->>'optionName',
       r.status
from public.order_action_requests r
cross join lateral jsonb_array_elements(r.items) elem
where not exists (
  select 1 from public.order_action_request_items i where i.request_id = r.id
);

-- Re-derive every request's advisory status column from its item rows (inline, mirroring 0170's
-- derive_action_request_status body — that function does not exist yet at this migration number).
-- No-op on staging today since every request's items already share one uniform status.
update public.order_action_requests r
   set status = derived.status,
       updated_at = now()
  from (
    select i.request_id,
           case
             when count(*) filter (where i.status <> 'REJECTED') = 0 then 'REJECTED'
             when count(*) filter (where i.status not in ('REJECTED', 'COMPLETED')) = 0 then 'COMPLETED'
             when count(*) filter (where i.status = 'APPROVED') > 0 then 'APPROVED'
             when count(*) filter (where i.status = 'REQUESTED') > 0 then 'REQUESTED'
             else 'APPROVED'
           end as status
      from public.order_action_request_items i
     group by i.request_id
  ) derived
 where derived.request_id = r.id
   and r.status is distinct from derived.status;

-- Pre-check: refuse to proceed if the active-brand unique index cannot be collapsed from
-- (order_id, brand_id, request_type) to (order_id, brand_id) without violating uniqueness —
-- i.e. if any order already has two *different* request_type active requests for the same brand.
do $$
declare
  v_duplicate_count integer;
begin
  select count(*) into v_duplicate_count
    from (
      select order_id, brand_id
        from public.order_action_requests
       where status in ('REQUESTED', 'APPROVED')
       group by order_id, brand_id
      having count(*) > 1
    ) dupes;

  if v_duplicate_count > 0 then
    raise exception
      'order_action_requests has % duplicate active (order_id, brand_id) row group(s); resolve before collapsing the per-request_type unique index',
      v_duplicate_count;
  end if;
end
$$;

drop index if exists order_action_requests_active_brand_idx;
create unique index if not exists order_action_requests_active_brand_uniq
  on public.order_action_requests (order_id, brand_id)
  where status in ('REQUESTED', 'APPROVED');
