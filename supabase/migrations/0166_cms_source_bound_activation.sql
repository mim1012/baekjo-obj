-- Additive only. 0162-0165 remain applied and immutable; nothing here rewrites existing rows.
--
-- Generalizes publish_audit_cms_from_source (0164, re-raised with PT409 in 0165) so any CMS page
-- whose activation is bound to one or more site_settings source rows can bootstrap the same way,
-- instead of only the single hardcoded 'page-texts' row that the audit-only RPC locks. The caller
-- (src/lib/cms/importPublished.ts publishCmsPageFromSource) supplies p_expected_sources as a jsonb
-- object keyed by site_settings.id, each value shaped { "value": <jsonb>, "updated_at": <ISO8601> } —
-- one entry per id in that page's source mapper (src/lib/cms/source/registry.ts siteSettingIds).
--
-- Conflict SQLSTATE is always PT409, never 40001: PostgREST treats 40001 (serialization_failure)
-- as retryable and transparently retries it, so application-level conflicts (stale source, stale
-- revision, already managed, stale server-derived content) would hang for 30s+ instead of returning
-- immediately (wiki: PostgREST-RPC-40001충돌-30초무응답-PT409).
create or replace function public.publish_cms_page_from_source(
  p_page_key text,
  p_expected_revision bigint,
  p_expected_sources jsonb,
  p_actor uuid,
  p_expected_content jsonb
)
returns table (published_revision bigint, published_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_source public.site_settings%rowtype;
  v_page public.cms_pages%rowtype;
  v_existing_version public.cms_page_versions%rowtype;
  v_published_content jsonb;
  v_published_at timestamptz := now();
begin
  if p_page_key is null or length(p_page_key) = 0
     or p_expected_revision is null or p_expected_revision <= 0
     or p_expected_sources is null or jsonb_typeof(p_expected_sources) <> 'object'
     or p_actor is null
     or p_expected_content is null or jsonb_typeof(p_expected_content) <> 'object' then
    raise exception 'invalid-cms-source-import-input' using errcode = '22023';
  end if;

  -- Lock every declared source row before touching cms_pages, in a deterministic (sorted) order
  -- so two concurrent activations of pages that share overlapping source ids can't deadlock.
  for r in select key, value from jsonb_each(p_expected_sources) order by key loop
    select * into v_source
    from public.site_settings
    where id = r.key
    for update;

    if not found
       or v_source.value is distinct from (r.value -> 'value')
       or v_source.updated_at is distinct from (r.value ->> 'updated_at')::timestamptz then
      raise exception 'cms-source-conflict' using errcode = 'PT409';
    end if;
  end loop;

  select * into v_page
  from public.cms_pages
  where page_key = p_page_key
  for update;

  if not found then
    raise exception 'cms-page-not-found' using errcode = 'P0002';
  end if;

  if v_page.draft_revision is distinct from p_expected_revision then
    raise exception 'cms-revision-conflict' using errcode = 'PT409';
  end if;

  if v_page.published_content -> '__managedVersion' = '1'::jsonb then
    raise exception 'cms-already-managed' using errcode = 'PT409';
  end if;

  -- The server derives this content with the page's current source mapper; HTTP clients cannot
  -- supply it directly (src/app/api/admin/settings/pages/[pageKey]/import/route.ts never trusts
  -- client-sent content).
  if v_page.draft_content is distinct from p_expected_content then
    raise exception 'cms-content-conflict' using errcode = 'PT409';
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
    raise exception 'cms-revision-conflict' using errcode = 'PT409';
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

revoke all on function public.publish_cms_page_from_source(text, bigint, jsonb, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.publish_cms_page_from_source(text, bigint, jsonb, uuid, jsonb)
  to service_role;
