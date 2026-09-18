-- 회원 탈퇴의 개인정보 익명화, 인증 토큰 삭제, 마케팅 철회를 한 트랜잭션으로 처리한다.
-- 어느 한 단계가 실패하면 전체가 롤백되어 반쯤 탈퇴된 계정이 남지 않는다.
create or replace function public.withdraw_member(p_member_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_id uuid;
  v_policy_version constant text := 'account-withdrawal-2026-09-06';
begin
  update public.members
     set status = 'withdrawn',
         name = '(탈퇴회원)',
         phone = '',
         email = ('withdrawn-' || p_member_id::text || '@deleted.baekjo')::citext,
         profile_image = null,
         signup_data = '{}'::jsonb,
         password_hash = null,
         provider_id = null,
         company_name = null,
         business_number = null
   where id = p_member_id
  returning id into v_updated_id;

  if v_updated_id is null then
    return false;
  end if;

  delete from public.member_tokens where member_id = p_member_id;

  insert into public.member_marketing_preferences (
    member_id, email_enabled, sms_enabled, policy_version, updated_at
  ) values (
    p_member_id, false, false, v_policy_version, now()
  )
  on conflict (member_id) do update
    set email_enabled = false,
        sms_enabled = false,
        policy_version = excluded.policy_version,
        updated_at = excluded.updated_at;

  insert into public.member_marketing_preference_events (
    member_id, email_enabled, sms_enabled, policy_version
  ) values (
    p_member_id, false, false, v_policy_version
  );

  return true;
end;
$$;

revoke execute on function public.withdraw_member(uuid)
  from public, anon, authenticated;
grant execute on function public.withdraw_member(uuid)
  to service_role;
