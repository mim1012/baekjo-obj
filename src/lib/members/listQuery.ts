// GET /api/admin/members 쿼리 파싱+검증. MemberFilters.tsx select option value와 화이트리스트를
// 맞춘다 — 'withdrawn'은 그 select에 필터 옵션이 없어 여기서도 받지 않는다(무필터 목록에는 여전히
// 노출된다). 검증 실패는 라우트가 400으로 접는다. DB 쪽 0173(list_admin_member_page)도 같은
// 화이트리스트를 이중으로 강제한다(방어적 중복 — 여기서 이미 걸러진 값만 RPC로 넘어간다).
export interface MemberListQuery {
  page: number;
  pageSize: number;
  search: string;
  role: string;
  status: string;
}

const ROLE_WHITELIST = ['', 'user', 'admin', 'b2b', 'insurance', 'partner'];
const STATUS_WHITELIST = ['', 'active', 'inactive', 'pending', 'rejected'];

export function parseMemberListQuery(params: URLSearchParams): MemberListQuery {
  const page = Number(params.get('page') ?? 1);
  const pageSize = Number(params.get('pageSize') ?? 20);
  const search = (params.get('search') ?? '').trim();
  const role = params.get('role') ?? '';
  const status = params.get('status') ?? '';
  if (
    !Number.isSafeInteger(page) || page < 1 || page > 1_000_000 ||
    !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100 ||
    search.length > 200 ||
    !ROLE_WHITELIST.includes(role) ||
    !STATUS_WHITELIST.includes(status)
  ) {
    throw new Error('invalid-member-query');
  }
  return { page, pageSize, search, role, status };
}
