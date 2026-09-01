-- 0151: 실제 고객 목록 화면 중 고정 문구로 남아 있던 상품·브랜드·후기·공지 화면을
-- 관리자 '전체 화면 관리'의 게시형 편집과 연결한다. 기본 콘텐츠는 애플리케이션 정의와
-- 병합되므로 빈 JSON으로 시작해도 현재 고객 화면은 그대로 유지된다.

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
values
  ('shop', '/shop', '상품 목록 문구', '{}'::jsonb, '{}'::jsonb, 1, 1, now()),
  ('brands', '/brands', '브랜드 목록 문구', '{}'::jsonb, '{}'::jsonb, 1, 1, now()),
  ('reviews', '/reviews', '후기 목록 문구', '{}'::jsonb, '{}'::jsonb, 1, 1, now()),
  ('notices', '/notices', '공지 목록 문구', '{}'::jsonb, '{}'::jsonb, 1, 1, now())
on conflict (page_key) do nothing;

insert into public.cms_page_versions (page_key, revision, content, published_at)
select page_key, 1, published_content, coalesce(published_at, now())
from public.cms_pages
where page_key in ('shop', 'brands', 'reviews', 'notices')
  and published_content is not null
on conflict (page_key, revision) do nothing;
