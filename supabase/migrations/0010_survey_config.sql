-- 0010_survey_config.sql — 맞춤 진단 설문 설정(문항 + 결과 매핑 룰) 싱글턴 테이블 (Supabase SQL Editor에서 1회 실행)
-- 접근 경로: 서버(secret key)만. 클라이언트 직접 접근 없음 → RLS on + 정책 없음.
-- 진단 설문 config({ questions: SurveyQuestion[], rules: SurveyResultRule[] })를 한 행(id='default')에
-- jsonb 로 통째로 담는다. 관리자 맞춤진단관리 화면이 저장하면 공개 진단 화면(/diagnosis)이
-- GET /api/survey 로 같은 행을 읽어 문항·룰을 렌더한다(§4 drift 방지 — 예전엔 정적 @/data/survey 라
-- 관리자가 편집해도 방문자는 항상 정적 데이터만 봤다).
-- seed 행은 필요 없다 — repo 가 upsert(id='default') 로 없으면 만들고 있으면 덮는다. 행이 없으면
-- GET 라우트가 defaultSurveyConfig 로 폴백하므로 진단 화면엔 항상 문항이 있다(Golden Flow #1).

create table public.survey_config (
  id text primary key default 'default',
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.survey_config enable row level security;
