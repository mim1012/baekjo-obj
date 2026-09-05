-- Deploy before the authentication code. Existing JWTs without a version must sign in again.
alter table public.members add column session_version integer not null default 0;

create or replace function public.bump_member_session_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.password_hash is distinct from old.password_hash then
    new.session_version := old.session_version + 1;
  end if;
  return new;
end;
$$;
create trigger members_password_session_version
before update of password_hash on public.members
for each row execute function public.bump_member_session_version();
revoke all on function public.bump_member_session_version() from public, anon, authenticated;
