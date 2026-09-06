create or replace function public.set_member_marketing_preferences(
  p_member_id uuid,
  p_email_enabled boolean,
  p_sms_enabled boolean,
  p_policy_version text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.member_marketing_preferences%rowtype;
begin
  insert into public.member_marketing_preferences (
    member_id, email_enabled, sms_enabled, policy_version, updated_at
  ) values (
    p_member_id, p_email_enabled, p_sms_enabled, p_policy_version, now()
  )
  on conflict (member_id) do update
    set email_enabled = excluded.email_enabled,
        sms_enabled = excluded.sms_enabled,
        policy_version = excluded.policy_version,
        updated_at = excluded.updated_at
  returning * into v_row;

  insert into public.member_marketing_preference_events (
    member_id, email_enabled, sms_enabled, policy_version
  ) values (
    p_member_id, p_email_enabled, p_sms_enabled, p_policy_version
  );

  return to_jsonb(v_row);
end;
$$;

revoke execute on function public.set_member_marketing_preferences(uuid, boolean, boolean, text)
  from public, anon, authenticated;
grant execute on function public.set_member_marketing_preferences(uuid, boolean, boolean, text)
  to service_role;
