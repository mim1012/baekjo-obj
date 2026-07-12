import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listInsuranceApplicationsByMember } from '@/lib/insurance/repo';
import { logServerError } from '@/lib/logServerError';

/** GET /api/insurance/mine — 로그인한 본인 보험 분석 신청 목록. 세션 없으면 401. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'no-session' }, { status: 401 });
  }

  const memberId = session.user.memberId;
  if (!memberId) {
    // 회원 식별자가 없는 세션(정상 경로에선 발생 안 함)은 노출할 신청이 없다.
    return NextResponse.json({ applications: [] }, { status: 200 });
  }

  try {
    const applications = await listInsuranceApplicationsByMember(memberId);
    return NextResponse.json({ applications }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/insurance/mine] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
