-- 0006_member_roles_approval.sql — 파트너/B2B/보험 회원 + 승인 워크플로우
-- Supabase에 가산적으로 적용(Management API 또는 SQL Editor 1회 실행). 기존 회원/데이터 보존.
--
-- 배경: 기존 members는 role in (user, admin) / status in (active, inactive)만 허용.
-- 기획(dad) 방향의 관리자 회원 화면(일반/파트너/B2B/보험 탭 + 승인/반려)을 실 DB로 구현하기 위해
-- role·status를 확장하고, 사업자/설계사 가입이 제출하는 정보를 담을 컬럼을 가산한다.

begin;

-- role: +b2b, +insurance, +partner
alter table public.members drop constraint if exists members_role_check;
alter table public.members add constraint members_role_check
  check (role in ('user', 'admin', 'b2b', 'insurance', 'partner'));

-- status: +pending(승인대기), +rejected(반려)
alter table public.members drop constraint if exists members_status_check;
alter table public.members add constraint members_status_check
  check (status in ('active', 'inactive', 'pending', 'rejected'));

-- 승인 워크플로우 / 사업자·설계사 가입용 가산 컬럼
alter table public.members add column if not exists company_name text;      -- 업체명/법인명
alter table public.members add column if not exists business_number text;   -- 사업자등록번호
alter table public.members add column if not exists reject_reason text;      -- 반려 사유(status=rejected일 때)
alter table public.members add column if not exists signup_data jsonb not null default '{}'::jsonb; -- 역할별 가입 폼 원본(설계사 등록번호·첨부목록 등)

commit;
