-- 0038_insurance_content_config.sql — 보험 페이지 콘텐츠(동의 전문·FAQ) 싱글턴 테이블
-- 접근 경로: 서버(secret key)만. 클라이언트 직접 접근 없음 → RLS on + 정책 없음.
-- 보험 콘텐츠 config({ consents: ConsentDoc[], faqs: InsuranceFaq[] })를 한 행(id='default')에
-- jsonb 로 통째로 담는다. 관리자 보험 콘텐츠 화면(/admin/insurance-content)이 저장하면
-- 공개 /insurance 가 GET /api/insurance-content 로 같은 행을 읽어 렌더한다
-- (§4 drift 방지 — 예전엔 page.tsx 인라인 faqs 상수 + 전문 없는 '전문 보기' span 이었다).
-- seed 행은 필요 없다 — repo 가 upsert(id='default') 로 없으면 만들고 있으면 덮는다. 행이 없으면
-- 라우트가 defaultInsuranceContentConfig 로 폴백하므로 화면엔 항상 동의 전문·FAQ가 있다.

create table public.insurance_content_config (
  id text primary key default 'default',
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.insurance_content_config enable row level security;
