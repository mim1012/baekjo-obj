-- Existing 0162/0163 are applied and immutable. No current content is rewritten here.
-- Ordinary publication requires prior activation; only the source-bound Audit RPC bootstraps.
create or replace function public.publish_cms_page(
  p_page_key text,
  p_expected_revision bigint,
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
  v_page public.cms_pages%rowtype;
  v_existing_version public.cms_page_versions%rowtype;
  v_published_content jsonb;
  v_published_at timestamptz := now();
begin
  select * into v_page
  from public.cms_pages
  where page_key = p_page_key
  for update;

  if not found then
    raise exception 'cms-page-not-found' using errcode = 'P0002';
  end if;

  if p_expected_revision is null or p_expected_revision <= 0 or v_page.draft_revision is distinct from p_expected_revision then
    raise exception 'cms-revision-conflict' using errcode = '40001';
  end if;

  if v_page.published_content -> '__managedVersion' is distinct from '1'::jsonb then
    raise exception 'initial-import-required' using errcode = '40001';
  end if;

  v_published_content := coalesce(v_page.draft_content, '{}'::jsonb) || jsonb_build_object('__managedVersion', 1);

  if v_page.published_revision = v_page.draft_revision
     and v_page.published_content = v_published_content then
    return query select v_page.published_revision, coalesce(v_page.published_at, v_page.updated_at, now());
    return;
  end if;

  insert into public.cms_page_versions (page_key, revision, content, published_by, published_at)
  values (p_page_key, v_page.draft_revision, v_published_content, p_actor, v_published_at)
  on conflict (page_key, revision) do nothing;

  select * into v_existing_version
  from public.cms_page_versions
  where page_key = p_page_key
    and revision = v_page.draft_revision;

  if not found then
    raise exception 'cms-version-missing' using errcode = 'P0002';
  end if;

  if v_existing_version.content <> v_published_content then
    raise exception 'cms-revision-conflict' using errcode = '40001';
  end if;

  update public.cms_pages
  set published_content = v_existing_version.content,
      published_revision = v_existing_version.revision,
      published_by = p_actor,
      published_at = v_existing_version.published_at,
      updated_at = v_published_at
  where page_key = p_page_key;

  return query select v_existing_version.revision, v_existing_version.published_at;
end;
$$;

revoke all on function public.publish_cms_page(text, bigint, uuid) from public, anon, authenticated;
grant execute on function public.publish_cms_page(text, bigint, uuid) to service_role;

create or replace function public.publish_audit_cms_from_source(
  p_expected_revision bigint,
  p_expected_source_value jsonb,
  p_expected_source_updated_at timestamptz,
  p_actor uuid,
  p_expected_content jsonb
)
returns table (published_revision bigint, published_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.site_settings%rowtype;
  v_page public.cms_pages%rowtype;
  v_existing_version public.cms_page_versions%rowtype;
  v_published_content jsonb;
  v_published_at timestamptz := now();
begin
  if p_expected_revision is null or p_expected_revision <= 0
     or p_expected_source_value is null
     or jsonb_typeof(p_expected_source_value) <> 'object'
     or p_expected_source_updated_at is null or p_actor is null
     or p_expected_content is null or jsonb_typeof(p_expected_content) <> 'object' then
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

  -- The server derives this content with the current mapper; HTTP clients cannot supply it.
  if v_page.draft_content is distinct from p_expected_content then
    raise exception 'audit-content-conflict' using errcode = '40001';
  end if;

  v_published_content := coalesce(v_page.draft_content, '{}'::jsonb) || jsonb_build_object('__managedVersion', 1);

  if v_page.published_revision = v_page.draft_revision
     and v_page.published_content = v_published_content then
    return query select v_page.published_revision, coalesce(v_page.published_at, v_page.updated_at, now());
    return;
  end if;

  insert into public.cms_page_versions (page_key, revision, content, published_by, published_at)
  values ('audit', v_page.draft_revision, v_published_content, p_actor, v_published_at)
  on conflict (page_key, revision) do nothing;

  select * into v_existing_version
  from public.cms_page_versions
  where page_key = 'audit'
    and revision = v_page.draft_revision;

  if not found then
    raise exception 'cms-version-missing' using errcode = 'P0002';
  end if;

  if v_existing_version.content <> v_published_content then
    raise exception 'cms-revision-conflict' using errcode = '40001';
  end if;

  update public.cms_pages
  set published_content = v_existing_version.content,
      published_revision = v_existing_version.revision,
      published_by = p_actor,
      published_at = v_existing_version.published_at,
      updated_at = v_published_at
  where page_key = 'audit';

  return query select v_existing_version.revision, v_existing_version.published_at;
end;
$$;

revoke all on function public.publish_audit_cms_from_source(bigint, jsonb, timestamptz, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.publish_audit_cms_from_source(bigint, jsonb, timestamptz, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.publish_audit_cms_from_source(bigint, jsonb, timestamptz, uuid, jsonb)
  to service_role;

