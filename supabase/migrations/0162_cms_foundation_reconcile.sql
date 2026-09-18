create table if not exists public.cms_pages (
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

create table if not exists public.cms_page_versions (
  id uuid primary key default gen_random_uuid(),
  page_key text not null references public.cms_pages(page_key) on delete cascade,
  revision bigint not null check (revision > 0),
  content jsonb not null,
  published_by uuid references public.members(id) on delete set null,
  published_at timestamptz not null default now(),
  unique (page_key, revision)
);

alter table public.cms_pages add column if not exists route text;
alter table public.cms_pages add column if not exists title text;
alter table public.cms_pages add column if not exists draft_content jsonb not null default '{}'::jsonb;
alter table public.cms_pages add column if not exists published_content jsonb;
alter table public.cms_pages add column if not exists draft_revision bigint not null default 1;
alter table public.cms_pages add column if not exists published_revision bigint;
alter table public.cms_pages add column if not exists updated_by uuid references public.members(id) on delete set null;
alter table public.cms_pages add column if not exists published_by uuid references public.members(id) on delete set null;
alter table public.cms_pages add column if not exists created_at timestamptz not null default now();
alter table public.cms_pages add column if not exists updated_at timestamptz not null default now();
alter table public.cms_pages add column if not exists published_at timestamptz;

alter table public.cms_page_versions add column if not exists page_key text references public.cms_pages(page_key) on delete cascade;
alter table public.cms_page_versions add column if not exists revision bigint;
alter table public.cms_page_versions add column if not exists content jsonb not null default '{}'::jsonb;
alter table public.cms_page_versions add column if not exists published_by uuid references public.members(id) on delete set null;
alter table public.cms_page_versions add column if not exists published_at timestamptz not null default now();

create unique index if not exists cms_pages_route_key on public.cms_pages(route);
create unique index if not exists cms_page_versions_page_revision_key on public.cms_page_versions(page_key, revision);
create index if not exists cms_page_versions_page_published_idx
  on public.cms_page_versions(page_key, published_at desc);

alter table public.cms_pages enable row level security;
alter table public.cms_page_versions enable row level security;

revoke all on table public.cms_pages from anon, authenticated, public;
revoke all on table public.cms_page_versions from anon, authenticated, public;

with registered_pages(page_key, route, title) as (
  values
    ('home', '/', '홈 화면'),
    ('site-shell', '/_site-shell', '사이트 공통 영역'),
    ('audit', '/audit', 'Audit 소개'),
    ('b2b', '/b2b', 'B2B 소개'),
    ('brands', '/brands', '브랜드 목록'),
    ('care-kit', '/landing/care-kit', '케어키트 소개'),
    ('concerns', '/concerns', '케어 가이드 목록'),
    ('experts', '/experts', '전문가 칼럼'),
    ('insurance-landing', '/landing/insurance', '펫보험 랜딩'),
    ('notices', '/notices', '공지 목록'),
    ('privacy', '/privacy', '개인정보처리방침'),
    ('refund-policy', '/refund-policy', '배송·교환·환불 안내'),
    ('reviews', '/reviews', '후기 목록'),
    ('shop', '/shop', '상품 목록'),
    ('terms', '/terms', '이용약관')
),
inserted_pages as (
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
  select
    registered_pages.page_key,
    registered_pages.route,
    registered_pages.title,
    '{}'::jsonb,
    '{}'::jsonb,
    1,
    1,
    now()
  from registered_pages
  on conflict (page_key) do nothing
  returning page_key, published_content, published_at
)
insert into public.cms_page_versions (page_key, revision, content, published_at)
select page_key, 1, coalesce(published_content, '{}'::jsonb), coalesce(published_at, now())
from inserted_pages
on conflict (page_key, revision) do nothing;

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
  v_existing_version public.cms_page_versions%rowtype;
  v_published_content jsonb;
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

  v_published_content := coalesce(v_page.draft_content, '{}'::jsonb) || jsonb_build_object('__managedVersion', 1);

  if v_page.published_revision = v_page.draft_revision
     and v_page.published_content = v_published_content then
    return query select v_page.published_revision, coalesce(v_page.published_at, v_page.updated_at, now());
    return;
  end if;

  insert into public.cms_page_versions (page_key, revision, content, published_by, published_at)
  values (p_page_key, v_page.draft_revision, v_published_content, p_actor, v_published_at)
  on conflict (page_key, revision) do nothing;

  select * into v_existing_version
  from public.cms_page_versions
  where page_key = p_page_key
    and revision = v_page.draft_revision;

  if not found then
    raise exception 'cms-version-missing' using errcode = 'P0002';
  end if;

  if v_existing_version.content <> v_published_content then
    raise exception 'cms-revision-conflict' using errcode = '40001';
  end if;

  update public.cms_pages
  set published_content = v_existing_version.content,
      published_revision = v_existing_version.revision,
      published_by = p_actor,
      published_at = v_existing_version.published_at,
      updated_at = v_published_at
  where page_key = p_page_key;

  return query select v_existing_version.revision, v_existing_version.published_at;
end;
$$;

revoke all on function public.publish_cms_page(text, bigint, uuid) from public;
grant execute on function public.publish_cms_page(text, bigint, uuid) to service_role;
