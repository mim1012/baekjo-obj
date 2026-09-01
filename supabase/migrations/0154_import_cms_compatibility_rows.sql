-- 0154: cms_pages 적용 전에 기존 site_settings 호환 저장소에서 편집한 내용을 정식 CMS로 이관한다.
-- 호환 행은 장애 시 되돌릴 수 있도록 삭제하지 않는다. cms_pages가 있으면 애플리케이션은 정식 표만 사용한다.

with compatibility_rows as (
  select
    substring(id from length('cms-page:') + 1) as page_key,
    value,
    updated_at
  from public.site_settings
  where id like 'cms-page:%'
    and value ->> 'kind' = 'cms-page-compatibility-v1'
)
update public.cms_pages as page
set
  draft_content = coalesce(compatibility.value -> 'draftContent', page.draft_content),
  published_content = case
    when compatibility.value ? 'publishedContent'
      then nullif(compatibility.value -> 'publishedContent', 'null'::jsonb)
    else page.published_content
  end,
  draft_revision = case
    when jsonb_typeof(compatibility.value -> 'draftRevision') = 'number'
      then greatest((compatibility.value ->> 'draftRevision')::bigint, 1)
    else page.draft_revision
  end,
  published_revision = case
    when jsonb_typeof(compatibility.value -> 'publishedRevision') = 'number'
      then greatest((compatibility.value ->> 'publishedRevision')::bigint, 1)
    when compatibility.value -> 'publishedRevision' = 'null'::jsonb then null
    else page.published_revision
  end,
  published_at = case
    when jsonb_typeof(compatibility.value -> 'publishedAt') = 'string'
      then (compatibility.value ->> 'publishedAt')::timestamptz
    when compatibility.value -> 'publishedAt' = 'null'::jsonb then null
    else page.published_at
  end,
  updated_at = compatibility.updated_at
from compatibility_rows as compatibility
where page.page_key = compatibility.page_key;

with compatibility_versions as (
  select
    substring(settings.id from length('cms-page:') + 1) as page_key,
    version.value as version
  from public.site_settings as settings
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(settings.value -> 'versions') = 'array' then settings.value -> 'versions'
      else '[]'::jsonb
    end
  ) as version(value)
  where settings.id like 'cms-page:%'
    and settings.value ->> 'kind' = 'cms-page-compatibility-v1'
)
insert into public.cms_page_versions (page_key, revision, content, published_at)
select
  compatibility.page_key,
  (compatibility.version ->> 'revision')::bigint,
  coalesce(compatibility.version -> 'content', '{}'::jsonb),
  (compatibility.version ->> 'publishedAt')::timestamptz
from compatibility_versions as compatibility
join public.cms_pages as page on page.page_key = compatibility.page_key
where jsonb_typeof(compatibility.version -> 'revision') = 'number'
  and jsonb_typeof(compatibility.version -> 'publishedAt') = 'string'
on conflict (page_key, revision) do update
set
  content = excluded.content,
  published_at = excluded.published_at;
