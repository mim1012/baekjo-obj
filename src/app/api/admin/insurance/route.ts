import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findMemberById } from '@/lib/members/repo';
import { listInsuranceApplications } from '@/lib/insurance/repo';
import { logServerError } from '@/lib/logServerError';

/**
 * GET /api/admin/insurance — 관리자 전체 보험 분석 신청 목록.
 * proxy.ts가 /api/admin/* 을 이미 가드하지만 JWT의 role은 로그인 시점 스냅샷이라, DB에서
 * 강등/비활성화돼도 세션 만료 전까지 admin 권한이 남는다. 매 요청마다 DB에서 재조회해
 * 실제로 admin이고 active인지 다시 확인한다(admin/orders와 동일 방어).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json(
      { error: session?.user ? 'forbidden' : 'unauthorized' },
      { status: session?.user ? 403 : 401 },
    );
  }

  try {
    const requester = session.user.memberId ? await findMemberById(session.user.memberId) : null;
    if (!requester || requester.role !== 'admin' || requester.status === 'inactive') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const applications = await listInsuranceApplications();
    return NextResponse.json({ applications }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/admin/insurance] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
