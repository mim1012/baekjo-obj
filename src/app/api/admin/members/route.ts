import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findMemberById, listMembers, toUser } from '@/lib/members/repo';
import { logServerError } from '@/lib/logServerError';

/**
 * GET /api/admin/members — 관리자 회원 목록.
 * proxy.ts가 /api/admin/* 을 이미 가드하지만 JWT의 role은 로그인 시점 스냅샷이라, DB에서
 * 강등되거나 비활성화돼도 세션이 만료되기 전까지는 그대로 admin 권한을 들고 있다. 그래서
 * 매 요청마다 DB에서 최신 상태를 재조회해 실제로도 admin이고 active인지 다시 확인한다.
 */
export async function GET() {
  console.log('[API] /api/admin/members called');
  const session = await auth();
  if (!session?.user || !['admin', 'SUPER_ADMIN'].includes(session.user.role || '')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const requester = session.user.memberId ? await findMemberById(session.user.memberId) : null;
    if (!requester || !['admin', 'SUPER_ADMIN'].includes(requester.role) || requester.status === 'inactive') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const members = await listMembers();
    return NextResponse.json({ users: members.map(toUser) }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/admin/members] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
