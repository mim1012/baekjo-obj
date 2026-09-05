export interface MemberListQuery {
  page: number;
  pageSize: number;
  search: string;
  role: string;
  status: string;
}

export function parseMemberListQuery(params: URLSearchParams): MemberListQuery {
  const page = Number(params.get('page') ?? 1);
  const pageSize = Number(params.get('pageSize') ?? 20);
  const search = (params.get('search') ?? '').trim();
  const role = params.get('role') ?? '';
  const status = params.get('status') ?? '';
  if (!Number.isSafeInteger(page) || page < 1 || page > 1_000_000
    || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100
    || search.length > 200
    || !['', 'user', 'admin', 'b2b', 'insurance', 'partner'].includes(role)
    || !['', 'active', 'inactive', 'pending', 'rejected', 'withdrawn'].includes(status)) {
    throw new Error('invalid-member-query');
  }
  return { page, pageSize, search, role, status };
}
