create table if not exists public.brand_aliases (
  brand_id text not null references public.brands(id) on delete cascade,
  alias text not null,
  normalized_alias text primary key,
  created_at timestamptz not null default now()
);

alter table public.brand_aliases enable row level security;

insert into public.brand_aliases (brand_id, alias, normalized_alias)
select aliases.brand_id, aliases.alias, aliases.normalized_alias
  from (values
    ('b1', '페네핏', '페네핏'),
    ('b1', 'PENEFIT', 'penefit'),
    ('b1', '페네핏 (PENEFIT)', '페네핏penefit'),
    ('b2', '오미프로', '오미프로'),
    ('b2', 'OMIPRO', 'omipro'),
    ('b2', '오미프로 (OMIPRO)', '오미프로omipro'),
    ('b3', '노블독', '노블독'),
    ('b3', 'NobleDog', 'nobledog'),
    ('b3', '노블독 (NobleDog)', '노블독nobledog'),
    ('b4', '캣코드', '캣코드'),
    ('b4', 'Catcode', 'catcode'),
    ('b4', '캣코드 (Catcode)', '캣코드catcode'),
    ('b5', '알로밍', '알로밍'),
    ('b5', 'ALLOMING', 'alloming'),
    ('b5', '알로밍 (ALLOMING)', '알로밍alloming'),
    ('b6', 're펫', 're펫'),
    ('b6', 'RePet', 'repet'),
    ('b6', '리펫', '리펫'),
    ('b7', '메종슈슈', '메종슈슈'),
    ('b7', 'Maison Chouchou', 'maisonchouchou'),
    ('b7', '메종슈슈 (Maison Chouchou)', '메종슈슈maisonchouchou'),
    ('b8', '챠콜스토리', '챠콜스토리'),
    ('b8', 'Charcoal Story', 'charcoalstory'),
    ('b8', '챠콜스토리 (Charcoal Story)', '챠콜스토리charcoalstory'),
    ('b9', '써니 사이드업', '써니사이드업'),
    ('b9', 'Sunny Side Up', 'sunnysideup'),
    ('b9', '써니사이드업', '써니사이드업'),
    ('b9', '써니 사이드업 (Sunny Side Up)', '써니사이드업sunnysideup')
  ) as aliases(brand_id, alias, normalized_alias)
 where exists (select 1 from public.brands where brands.id = aliases.brand_id)
on conflict (normalized_alias) do update
set brand_id = excluded.brand_id,
    alias = excluded.alias;

create or replace function public.approve_partner_member(
  p_member_id uuid,
  p_expected_status text,
  p_normalized_brand_alias text
)
returns setof public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_brand_id text;
begin
  select brand_id
    into matched_brand_id
    from public.brand_aliases
   where normalized_alias = nullif(p_normalized_brand_alias, '')
   limit 1;

  return query
  update public.members
     set status = 'active',
         reject_reason = null,
         managed_brand_ids = case
           when matched_brand_id is null then managed_brand_ids
           else array(
             select distinct managed_brand_id
               from unnest(coalesce(managed_brand_ids, ARRAY[]::text[]) || array[matched_brand_id]) as item(managed_brand_id)
           )
         end
   where id = p_member_id
     and role = 'partner'
     and status = p_expected_status
  returning public.members.*;
end;
$$;

revoke all on function public.approve_partner_member(uuid, text, text) from public, anon, authenticated;
grant execute on function public.approve_partner_member(uuid, text, text) to service_role;
