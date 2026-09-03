create or replace function public.withdraw_member(p_member_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_member_id uuid;
begin
  update public.members
  set status = 'withdrawn',
      name = '(탈퇴회원)',
      phone = '',
      email = 'withdrawn-' || p_member_id::text || '@deleted.baekjo',
      profile_image = null,
      signup_data = '{}'::jsonb,
      password_hash = null,
      provider_id = null,
      company_name = null,
      business_number = null
  where id = p_member_id
    and status = 'active'
  returning id into updated_member_id;

  if updated_member_id is null then
    return false;
  end if;

  delete from public.member_tokens
  where member_id = p_member_id;

  return true;
end;
$$;

revoke all on function public.withdraw_member(uuid) from public;
grant execute on function public.withdraw_member(uuid) to service_role;
