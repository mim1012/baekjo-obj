-- 0080_member_must_change_password.sql
--
-- 배경: 입점업체(파트너) 계정을 운영자가 초기 비밀번호로 발급해 주는 운영 절차가 생겼다
--   (scripts/create-partner-account.mjs 참고). 발급된 임시 비밀번호로 최초 로그인한 파트너에게
--   "비밀번호 변경하기 / 나중에 변경하기" 안내를 띄우기 위한 플래그 컬럼.
--
-- 동작: 계정 발급 SQL이 true로 넣고, 본인이 비밀번호를 변경(또는 재설정)하면
--   updateMemberPassword(src/lib/members/repo.ts)가 false로 되돌린다. 소프트 유도 전용 —
--   로그인 자체를 막지 않는다.
--
-- 멱등: add column if not exists이므로 재실행 무해.

alter table public.members
  add column if not exists must_change_password boolean not null default false;
