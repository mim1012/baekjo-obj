-- Search and counts cover all members. Search text is a bound literal, never PostgREST syntax.
create or replace function public.list_admin_member_page(
  p_page integer default 1, p_page_size integer default 20,
  p_search text default '', p_role text default '', p_status text default ''
)
returns jsonb
language plpgsql stable
security definer
set search_path = public
as $$
begin
  if p_page is null or p_page not between 1 and 1000000
     or p_page_size is null or p_page_size not between 1 and 100
     or p_search is null or length(p_search) > 200
     or p_role is null or p_role not in ('', 'user', 'admin', 'b2b', 'insurance', 'partner')
     or p_status is null or p_status not in ('', 'active', 'inactive', 'pending', 'rejected', 'withdrawn') then
    raise exception 'INVALID_MEMBER_QUERY';
  end if;
  return (
    with filtered as (
      select * from public.members m
       where (p_role = '' or m.role = p_role)
         and (p_status = '' or m.status = p_status)
         and (p_search = ''
           or strpos(lower(coalesce(m.name, '')), lower(p_search)) > 0
           or strpos(lower(coalesce(m.email, '')), lower(p_search)) > 0
           or strpos(coalesce(m.phone, ''), p_search) > 0
           or strpos(lower(coalesce(m.company_name, '')), lower(p_search)) > 0)
    ), counts as (
      select count(*) as total from filtered
    ), paging as (
      select total, least(p_page::bigint, greatest(1::bigint, (total + p_page_size - 1) / p_page_size)) as page
      from counts
    ), page_rows as (
      select * from filtered order by created_at desc, id desc
      limit p_page_size offset (select (page - 1) * p_page_size from paging)
    )
    select jsonb_build_object(
      'users', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc, r.id desc) from page_rows r), '[]'::jsonb),
      'total', paging.total, 'page', paging.page, 'pageSize', p_page_size,
      'summary', (select jsonb_build_object(
        'total', count(*),
        'recent', count(*) filter (where created_at > now() - interval '7 days'),
        'pending', count(*) filter (where status = 'pending'),
        'partners', count(*) filter (where role in ('partner', 'b2b'))
      ) from public.members)
    ) from paging
  );
end;
$$;
revoke all on function public.list_admin_member_page(integer, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.list_admin_member_page(integer, integer, text, text, text) to service_role;
