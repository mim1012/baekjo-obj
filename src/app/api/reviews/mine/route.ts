import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listReviewsByMember } from '@/lib/reviews/repo';
import { logServerError } from '@/lib/logServerError';

/** GET /api/reviews/mine — 본인 구매평 전체(hidden 포함, 세션 필요). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.memberId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const reviews = await listReviewsByMember(session.user.memberId);
    return NextResponse.json({ reviews }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/reviews/mine] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
