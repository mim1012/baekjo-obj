import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listInquiriesByMember } from '@/lib/inquiries/repo';
import { logServerError } from '@/lib/logServerError';

/** GET /api/inquiries/mine — 본인 문의 전체(세션 필요, redaction 없이 전체 반환). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.memberId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const inquiries = await listInquiriesByMember(session.user.memberId);
    return NextResponse.json({ inquiries }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/inquiries/mine] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
