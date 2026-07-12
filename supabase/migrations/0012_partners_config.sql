-- 0012_partners_config.sql — B2B 제휴처 목록 싱글턴 테이블 (Supabase SQL Editor / CI가 1회 실행)
-- 접근 경로: 서버(secret key)만. 클라이언트 직접 접근 없음 → RLS on + 정책 없음.
-- 제휴처 config({ items: Partner[] })를 한 행(id='default')에 jsonb 로 통째로 담는다.
-- 관리자 B2B제휴관리 화면이 저장하면 GET /api/admin/partners 로 같은 행을 읽어 렌더한다
-- (§4 drift 방지 — 예전엔 page.tsx 인라인 mockPartners 라 관리자가 편집해도 저장되지 않았다).
-- seed 행은 필요 없다 — repo 가 upsert(id='default') 로 없으면 만들고 있으면 덮는다. 행이 없으면
-- 라우트가 defaultPartnersConfig 로 폴백하므로 화면엔 항상 제휴처가 있다. 공개 소비자는 없다(관리자 전용).

create table public.partners_config (
  id text primary key default 'default',
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.partners_config enable row level security;
