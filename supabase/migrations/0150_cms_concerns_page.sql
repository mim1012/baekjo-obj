-- 0150: 케어 가이드 목록 화면을 페이지 관리에 추가한다.
-- 고민 카드와 상세 내용은 기존 concerns config가 관리하고, 이 행은 목록 화면의
-- 첫 화면·추가 케어 안내·보험 배너·FAQ처럼 화면 공통 문구만 관리한다.

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
values (
  'concerns',
  '/concerns',
  '케어 가이드 목록',
  '{}'::jsonb,
  '{}'::jsonb,
  1,
  1,
  now()
)
on conflict (page_key) do nothing;

insert into public.cms_page_versions (page_key, revision, content, published_at)
select page_key, 1, published_content, coalesce(published_at, now())
from public.cms_pages
where page_key = 'concerns'
  and published_content is not null
on conflict (page_key, revision) do nothing;
