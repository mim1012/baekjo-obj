-- 회원 세션 무효화용 버전 컬럼 + 트리거. 비밀번호/role 변경, 정지·탈퇴·반려로의 상태 전이가
-- 일어나면 값을 올려, 그 순간부터 이전 값을 담은 기존 JWT를 전부 무효로 만든다
-- (src/lib/members/sessionVersion.ts isCurrentSession, src/lib/auth.ts jwt 콜백 재검증).
--
-- 재활성(→active)은 올리지 않는다 — 관리자가 정지를 풀어줘도 다른 기기의 이미 유효한 세션까지
-- 강제로 끊을 이유는 없기 때문(의도적 비대칭). withdraw_member(0159)는 password_hash와 status를
-- 같은 UPDATE에서 함께 바꾸므로 이 트리거로 이미 커버된다 — 별도 처리 불필요.
--
-- 배포 순서: 이 마이그레이션을 코드보다 먼저 적용한다. 다만 코드(src/lib/members/repo.ts
-- findMemberByEmailWithSessionVersion/findMemberByIdWithSessionVersion)는 컬럼이 아직 없어도
-- 42703(undefined_column)을 잡아 레거시 컬럼만으로 재조회하는 과도기 폴백을 갖고 있으므로,
-- 실제로는 어느 순서로 배포되어도 로그인이 500으로 죽지 않는다.
--
-- 이 트리거는 애플리케이션 레벨 충돌을 던지지 않는다(단순 카운터 증가) — 충돌 SQLSTATE
-- 분기 자체가 없다.
alter table public.members
  add column if not exists session_version integer not null default 0;

create or replace function public.bump_member_session_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.password_hash is distinct from old.password_hash then
    new.session_version := old.session_version + 1;
  elsif new.role is distinct from old.role then
    new.session_version := old.session_version + 1;
  elsif new.status is distinct from old.status
    and new.status in ('inactive', 'withdrawn', 'rejected') then
    new.session_version := old.session_version + 1;
  end if;
  return new;
end;
$$;

-- 이전에 다른 이름으로 만들어졌을 수 있는 트리거를 모두 정리해 멱등 재적용을 보장한다.
drop trigger if exists members_password_session_version on public.members;
drop trigger if exists members_session_version_bump on public.members;

create trigger members_session_version_bump
before update of password_hash, status, role on public.members
for each row execute function public.bump_member_session_version();

revoke execute on function public.bump_member_session_version()
  from public, anon, authenticated;
