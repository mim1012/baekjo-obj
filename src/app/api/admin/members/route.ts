import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { InvalidMemberQueryError, listMemberPage } from '@/lib/members/repo';
import { parseMemberListQuery } from '@/lib/members/listQuery';
import { logServerError } from '@/lib/logServerError';

/**
 * GET /api/admin/members — 관리자 회원 목록(서버 페이지네이션, 검색·역할·상태 필터).
 * proxy.ts가 /api/admin/* 을 이미 가드하지만 JWT의 role은 로그인 시점 스냅샷이라, DB에서
 * 강등되거나 비활성화돼도 세션이 만료되기 전까지는 그대로 admin 권한을 들고 있다. 그래서
 * requireAdmin()이 매 요청마다 DB에서 최신 상태를 재조회해 실제로도 admin이고 active인지 다시 확인한다.
 */
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let query;
  try {
    query = parseMemberListQuery(new URL(request.url).searchParams);
  } catch {
    return NextResponse.json({ error: 'invalid-member-query' }, { status: 400 });
  }

  try {
    const page = await listMemberPage(query);
    return NextResponse.json(page, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    // parseMemberListQuery가 이미 같은 화이트리스트로 걸러낸 뒤라 정상 동작에서는 이 분기에
    // 오지 않는다 — DB 쪽 0173 이중 방어가 걸렸을 때만 나오며, 여전히 "잘못된 요청" 취지라 400.
    if (error instanceof InvalidMemberQueryError) {
      return NextResponse.json({ error: 'invalid-member-query' }, { status: 400 });
    }
    logServerError('[GET /api/admin/members] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
