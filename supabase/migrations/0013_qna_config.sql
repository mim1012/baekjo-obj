-- 0013_qna_config.sql — 상품문의(Q&A) 목록 싱글턴 테이블 (Supabase SQL Editor / CI가 1회 실행)
-- 접근 경로: 서버(secret key)만. 클라이언트 직접 접근 없음 → RLS on + 정책 없음.
-- Q&A config({ items: QnA[] })를 한 행(id='default')에 jsonb 로 통째로 담는다. 관리자 Q&A관리
-- 화면이 저장하면 공개 상품상세(/shop/[id])·마이페이지가 GET /api/qna 로 같은 행을 읽어 렌더한다
-- (§4 drift 방지 — 예전엔 정적 @/data/qna 라 관리자가 편집해도 방문자는 항상 정적 데이터만 봤다).
-- seed 행은 필요 없다 — repo 가 upsert(id='default') 로 없으면 만들고 있으면 덮는다. 행이 없으면
-- GET 라우트가 defaultQnaConfig 로 폴백하므로 상품상세 Q&A 탭엔 항상 문의가 있다(Golden Flow #2).

create table public.qna_config (
  id text primary key default 'default',
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.qna_config enable row level security;
