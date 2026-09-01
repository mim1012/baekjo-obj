-- 0149: 관리자 '페이지 관리'에서 다루는 공통·소개·서비스·정책 화면 등록.
-- 실제 기본 문구는 애플리케이션의 구조화 정의와 병합되므로 빈 JSON으로 시작해도
-- 기존 공개 화면이 그대로 유지된다. draft/published 분리는 0148의 공통 규칙을 따른다.

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
  ('site-shell', '/_site-shell', '사이트 공통 영역', '{}'::jsonb, '{}'::jsonb, 1, 1, now()),
  ('audit', '/audit', 'Audit 소개', '{}'::jsonb, '{}'::jsonb, 1, 1, now()),
  ('b2b', '/b2b', 'B2B 소개', '{}'::jsonb, '{}'::jsonb, 1, 1, now()),
  ('experts', '/experts', '전문가 칼럼', '{}'::jsonb, '{}'::jsonb, 1, 1, now()),
  ('care-kit', '/landing/care-kit', '케어키트 소개', '{}'::jsonb, '{}'::jsonb, 1, 1, now()),
  ('insurance-landing', '/landing/insurance', '펫보험 랜딩', '{}'::jsonb, '{}'::jsonb, 1, 1, now()),
  ('terms', '/terms', '이용약관', '{}'::jsonb, '{}'::jsonb, 1, 1, now()),
  ('privacy', '/privacy', '개인정보처리방침', '{}'::jsonb, '{}'::jsonb, 1, 1, now()),
  ('refund-policy', '/refund-policy', '배송·교환·환불 안내', '{}'::jsonb, '{}'::jsonb, 1, 1, now())
on conflict (page_key) do nothing;

insert into public.cms_page_versions (page_key, revision, content, published_at)
select page_key, 1, published_content, coalesce(published_at, now())
from public.cms_pages
where page_key in (
  'site-shell',
  'audit',
  'b2b',
  'experts',
  'care-kit',
  'insurance-landing',
  'terms',
  'privacy',
  'refund-policy'
)
and published_content is not null
on conflict (page_key, revision) do nothing;
