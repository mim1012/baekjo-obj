-- 0148: 구조화 CMS 공통 기반 — 페이지별 draft/published 분리 + 게시 이력.
-- 접근은 서버 secret key 전용이다(RLS on, 정책 없음).

create table public.cms_pages (
  page_key text primary key check (page_key ~ '^[a-z0-9][a-z0-9-]*$'),
  route text not null unique check (route like '/%'),
  title text not null,
  draft_content jsonb not null default '{}'::jsonb,
  published_content jsonb,
  draft_revision bigint not null default 1 check (draft_revision > 0),
  published_revision bigint check (published_revision is null or published_revision > 0),
  updated_by uuid references public.members(id) on delete set null,
  published_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table public.cms_page_versions (
  id uuid primary key default gen_random_uuid(),
  page_key text not null references public.cms_pages(page_key) on delete cascade,
  revision bigint not null check (revision > 0),
  content jsonb not null,
  published_by uuid references public.members(id) on delete set null,
  published_at timestamptz not null default now(),
  unique (page_key, revision)
);

create index cms_page_versions_page_published_idx
  on public.cms_page_versions(page_key, published_at desc);

alter table public.cms_pages enable row level security;
alter table public.cms_page_versions enable row level security;

-- 기존 홈 공개본을 최초 draft/published로 안전하게 이관한다.
insert into public.cms_pages (
  page_key,
  route,
  title,
  draft_content,
  published_content,
  draft_revision,
  published_revision,
  updated_at,
  published_at
)
select
  'home',
  '/',
  '홈 화면',
  coalesce(value, '{}'::jsonb),
  coalesce(value, '{}'::jsonb),
  1,
  1,
  updated_at,
  updated_at
from public.site_settings
where id = 'home'
on conflict (page_key) do nothing;

insert into public.cms_pages (
  page_key,
  route,
  title,
  draft_content,
  published_content,
  draft_revision,
  published_revision,
  published_at
)
values ('home', '/', '홈 화면', '{}'::jsonb, '{}'::jsonb, 1, 1, now())
on conflict (page_key) do nothing;

insert into public.cms_page_versions (page_key, revision, content, published_at)
select page_key, 1, published_content, coalesce(published_at, now())
from public.cms_pages
where page_key = 'home' and published_content is not null
on conflict (page_key, revision) do nothing;

-- draft를 published로 복사하고 게시 이력을 남기는 원자적 함수.
create or replace function public.publish_cms_page(
  p_page_key text,
  p_expected_revision bigint,
  p_actor uuid
)
returns table (
  published_revision bigint,
  published_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_page public.cms_pages%rowtype;
  v_published_at timestamptz := now();
begin
  select * into v_page
  from public.cms_pages
  where page_key = p_page_key
  for update;

  if not found then
    raise exception 'cms-page-not-found' using errcode = 'P0002';
  end if;

  if v_page.draft_revision <> p_expected_revision then
    raise exception 'cms-revision-conflict' using errcode = '40001';
  end if;

  insert into public.cms_page_versions (page_key, revision, content, published_by, published_at)
  values (p_page_key, v_page.draft_revision, v_page.draft_content, p_actor, v_published_at)
  on conflict (page_key, revision) do update
    set content = excluded.content,
        published_by = excluded.published_by,
        published_at = excluded.published_at;

  update public.cms_pages
  set published_content = v_page.draft_content,
      published_revision = v_page.draft_revision,
      published_by = p_actor,
      published_at = v_published_at,
      updated_at = v_published_at
  where page_key = p_page_key;

  return query select v_page.draft_revision, v_published_at;
end;
$$;

revoke all on function public.publish_cms_page(text, bigint, uuid) from public;
grant execute on function public.publish_cms_page(text, bigint, uuid) to service_role;
