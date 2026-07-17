-- 0042_notices_config.sql — 공지사항(notices) 싱글턴 테이블 (Supabase SQL Editor / CI가 1회 실행)
-- 접근 경로: 서버(secret key)만. 클라이언트 직접 접근 없음 → RLS on + 정책 없음.
-- 공지 config({ items: Notice[] })를 한 행(id='default')에 jsonb 로 통째로 담는다.
-- 관리자 공지 관리 화면(/admin/notices)이 저장하면 공개 공지 목록(/notices·/notices/[id])과
-- 홈 소식 4건이 같은 행을 읽어 렌더한다(§4 drift 방지 — 예전엔 정적 src/data/notices.ts 라
-- 관리자 화면이 readOnly 목업이었다).
-- seed 행은 필요 없다 — repo 가 upsert(id='default') 로 없으면 만들고 있으면 덮는다. 행이 없으면
-- 라우트가 defaultNoticesConfig 로 폴백하므로 화면엔 항상 공지 목록이 있다. 공개 소비자가 있어
-- 공개 GET(/api/notices)도 둔다(kits/partners 와 다른 점 — survey/qna/concerns 와 같음).

create table public.notices_config (
  id text primary key default 'default',
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.notices_config enable row level security;
