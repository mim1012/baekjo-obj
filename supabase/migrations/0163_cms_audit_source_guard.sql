create or replace function public.publish_audit_cms_from_source(
  p_expected_revision bigint,
  p_expected_source_value jsonb,
  p_expected_source_updated_at timestamptz,
  p_actor uuid
)
returns table (
  published_revision bigint,
  published_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.site_settings%rowtype;
  v_page public.cms_pages%rowtype;
begin
  if p_expected_revision is null or p_expected_revision <= 0
     or p_expected_source_value is null
     or jsonb_typeof(p_expected_source_value) <> 'object'
     or p_expected_source_updated_at is null or p_actor is null then
    raise exception 'invalid-audit-import-input' using errcode = '22023';
  end if;

  select * into v_source
  from public.site_settings
  where id = 'page-texts'
  for update;

  if not found
     or v_source.value is distinct from p_expected_source_value
     or v_source.updated_at is distinct from p_expected_source_updated_at then
    raise exception 'audit-source-conflict' using errcode = '40001';
  end if;

  select * into v_page
  from public.cms_pages
  where page_key = 'audit'
  for update;

  if not found or v_page.draft_revision is distinct from p_expected_revision then
    raise exception 'cms-revision-conflict' using errcode = '40001';
  end if;

  if v_page.published_content -> '__managedVersion' = '1'::jsonb then
    raise exception 'audit-already-managed' using errcode = '40001';
  end if;

  return query
  select result.published_revision, result.published_at
  from public.publish_cms_page('audit', p_expected_revision, p_actor) as result;
end;
$$;

revoke all on function public.publish_audit_cms_from_source(bigint, jsonb, timestamptz, uuid)
  from public, anon, authenticated;
grant execute on function public.publish_audit_cms_from_source(bigint, jsonb, timestamptz, uuid)
  to service_role;
