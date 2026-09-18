-- Server-side pagination for GET /api/admin/members (PR5 U2, selective port of PR#326's
-- 0153_admin_member_pagination.sql). Search/role/status match src/lib/members/listQuery.ts's
-- whitelist (which itself mirrors MemberFilters.tsx's <select> option values — the withdrawn status
-- has no filter option there, so it is intentionally not accepted here either; unfiltered listing
-- still includes withdrawn rows). Search text is always a bound literal via strpos(lower(...)), never
-- interpolated SQL/PostgREST syntax.
--
-- Deviates from PR#326's original body: that version built each row with to_jsonb(r), which put
-- password_hash straight into the RPC's jsonb payload — safe today only because
-- src/lib/members/repo.ts's listMemberPage() happens to discard it via toUser() before the
-- response reaches the client, a single missed call away from a leak. This function whitelists
-- exactly the columns src/lib/members/repo.ts's SELECT_COLUMNS exposes elsewhere (plus
-- session_version, added by 0172, which is applied before this migration numerically) and never
-- selects password_hash into the returned jsonb at all.
--
-- Conflict SQLSTATE is PT409, never 40001 (PostgREST retries 40001 transparently and would hang
-- 30s+ instead of returning immediately — wiki: PostgREST-RPC-40001충돌-30초무응답-PT409), matching
-- the 0165/0166 convention. This particular raise is a validation failure rather than a
-- concurrency conflict, but the SQLSTATE stays PT409 for consistency; the caller
-- (src/app/api/admin/members/route.ts) maps it to HTTP 400, not 409.
create or replace function public.list_admin_member_page(
  p_page integer default 1,
  p_page_size integer default 20,
  p_search text default '',
  p_role text default '',
  p_status text default ''
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_page is null or p_page not between 1 and 1000000
     or p_page_size is null or p_page_size not between 1 and 100
     or p_search is null or length(p_search) > 200
     or p_role is null or p_role not in ('', 'user', 'admin', 'b2b', 'insurance', 'partner')
     or p_status is null or p_status not in ('', 'active', 'inactive', 'pending', 'rejected') then
    raise exception 'INVALID_MEMBER_QUERY' using errcode = 'PT409';
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
      'users', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'email', r.email,
            'name', r.name,
            'phone', r.phone,
            'provider', r.provider,
            'provider_id', r.provider_id,
            'pet_type', r.pet_type,
            'breed', r.breed,
            'main_concern', r.main_concern,
            'role', r.role,
            'status', r.status,
            'profile_image', r.profile_image,
            'email_verified', r.email_verified,
            'created_at', r.created_at,
            'company_name', r.company_name,
            'business_number', r.business_number,
            'reject_reason', r.reject_reason,
            'signup_data', r.signup_data,
            'managed_brand_ids', r.managed_brand_ids,
            'must_change_password', r.must_change_password,
            'session_version', r.session_version
          )
          order by r.created_at desc, r.id desc
        )
        from page_rows r
      ), '[]'::jsonb),
      'total', paging.total,
      'page', paging.page,
      'pageSize', p_page_size,
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
