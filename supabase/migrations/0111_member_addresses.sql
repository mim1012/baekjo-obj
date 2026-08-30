create table public.member_addresses (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  label text not null,
  recipient_name text not null,
  phone text not null,
  postal_code text not null default '',
  address_line1 text not null,
  address_line2 text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(btrim(label)) > 0),
  check (length(btrim(recipient_name)) > 0),
  check (length(btrim(phone)) > 0),
  check (length(btrim(address_line1)) > 0)
);

create index member_addresses_member_id_idx on public.member_addresses (member_id, created_at desc);

create unique index member_addresses_one_default_idx
  on public.member_addresses (member_id)
  where is_default = true;

alter table public.member_addresses enable row level security;

create or replace function public.set_member_default_address(
  p_member_id uuid,
  p_address_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.member_addresses
  set is_default = false, updated_at = now()
  where member_id = p_member_id;

  update public.member_addresses
  set is_default = true, updated_at = now()
  where id = p_address_id and member_id = p_member_id;

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

create or replace function public.delete_member_address(
  p_member_id uuid,
  p_address_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  was_default boolean;
  deleted_count integer;
begin
  select is_default into was_default
  from public.member_addresses
  where id = p_address_id and member_id = p_member_id;

  delete from public.member_addresses
  where id = p_address_id and member_id = p_member_id;
  get diagnostics deleted_count = row_count;

  if deleted_count = 1 and was_default then
    update public.member_addresses
    set is_default = true, updated_at = now()
    where id = (
      select id
      from public.member_addresses
      where member_id = p_member_id
      order by created_at desc, id desc
      limit 1
    );
  end if;

  return deleted_count = 1;
end;
$$;
