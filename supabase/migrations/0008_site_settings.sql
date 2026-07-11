-- 0008_site_settings.sql — 홈 CMS(사이트 설정) 싱글턴 테이블 (Supabase SQL Editor에서 1회 실행)
-- 접근 경로: 서버(secret key)만. 클라이언트 직접 접근 없음 → RLS on + 정책 없음.
-- 사이트 전체 홈 콘텐츠(HomeSettings)를 한 행(id='home')에 jsonb 로 통째로 담는다. 관리자 CMS 가
-- 저장하면 공개 스토어프론트가 GET /api/settings 로 같은 행을 읽어 화면에 반영한다(§4 drift 방지 —
-- 예전엔 localStorage 라 편집자 브라우저에서만 바뀌고 방문자는 defaultHomeSettings 만 봤다).
-- seed 행은 필요 없다 — repo 가 upsert(id='home') 로 없으면 만들고 있으면 덮는다. 행이 없으면
-- GET 라우트가 defaultHomeSettings 로 폴백하므로 사이트는 항상 콘텐츠가 있다.

create table public.site_settings (
  id text primary key default 'home',
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
