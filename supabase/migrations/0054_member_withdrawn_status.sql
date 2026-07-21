-- 회원 탈퇴(소프트 탈퇴) 지원: status CHECK 제약에 'withdrawn' 추가.
-- 0006_member_roles_approval.sql이 만든 제약(active/inactive/pending/rejected)을 가산 확장한다.
-- 탈퇴 처리 자체(익명화 UPDATE)는 members/repo.ts의 withdrawMember()가 애플리케이션에서 수행하며,
-- 이 마이그레이션은 그 값을 DB가 거부하지 않도록 제약만 넓힌다.
alter table public.members drop constraint if exists members_status_check;
alter table public.members add constraint members_status_check
  check (status in ('active', 'inactive', 'pending', 'rejected', 'withdrawn'));
