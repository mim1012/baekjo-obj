-- 0009_category_settings.sql — 상품/라이프스타일 카테고리·브랜드필터 싱글턴 테이블 (Supabase SQL Editor에서 1회 실행)
-- 접근 경로: 서버(secret key)만. 클라이언트 직접 접근 없음 → RLS on + 정책 없음.
-- 카테고리 설정(CategorySettings: productCategories/lifestyleCategories/brandFilters)을 한 행(id='default')에
-- jsonb 로 통째로 담는다. 관리자 상품관리 화면이 저장하면 공개 스토어프론트(shop·brands)가
-- GET /api/category-settings 로 같은 행을 읽어 필터를 렌더한다(§4 drift 방지 — 예전엔 localStorage 라
-- 편집자 브라우저에서만 바뀌고 방문자는 defaultCategorySettings 만 봤다).
-- seed 행은 필요 없다 — repo 가 upsert(id='default') 로 없으면 만들고 있으면 덮는다. 행이 없으면
-- GET 라우트가 defaultCategorySettings 로 폴백하므로 화면엔 항상 카테고리가 있다.

create table public.category_settings (
  id text primary key default 'default',
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.category_settings enable row level security;
