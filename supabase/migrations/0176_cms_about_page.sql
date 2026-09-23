-- 회사소개(/about) 화면을 16번째 CMS 관리 페이지로 등록한다.
--
-- 0162_cms_foundation_reconcile.sql의 registered_pages CTE + `on conflict (page_key) do nothing`
-- + cms_page_versions revision 1 삽입 패턴을 그대로 따른다. cms_pages/cms_page_versions 테이블 자체는
-- 0162에서 이미 만들어졌으므로 여기서는 about 한 행만 추가한다 — 재실행해도(CI가 마이그레이션
-- 폴더 전체를 매 push 재실행) 이미 등록된 행은 건드리지 않아 멱등적이다.
--
-- about 원문은 어떤 site_settings 행에도 없다(src/lib/cms/source/about.ts 참고 — 정본 기본값에서
-- 직접 파생).
--
-- published_content는 0162와 동일하게 빈 객체('{}'::jsonb)로 둔다. 이 행은 아직 "관리 중"이
-- 아니다 — repo.ts는 published_content.__managedVersion === 1 일 때만 관리 중으로 보고,
-- 그렇지 않으면 게시본 조회가 null을 반환한다. 따라서 이 마이그레이션만 적용한 직후의 /about은
-- 코드의 defaultContent로 렌더되며(현재 화면과 동일), 관리자가 CMS에서 "현재 값 가져오기"를
-- 눌러 활성화한 뒤부터 게시본이 화면을 결정한다. 데이터 백필은 필요하지 않다.
with registered_pages(page_key, route, title) as (
  values
    ('about', '/about', '회사소개')
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
