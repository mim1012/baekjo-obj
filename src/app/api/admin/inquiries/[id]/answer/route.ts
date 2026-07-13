import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { findMemberById } from '@/lib/members/repo';
import { answerInquiry } from '@/lib/inquiries/repo';
import { logServerError } from '@/lib/logServerError';

const MAX_ANSWER = 2000;

/**
 * POST /api/admin/inquiries/[id]/answer — 관리자/브랜드 담당자 답변 작성.
 * TODO(RBAC): partner의 브랜드 스코프 검증은 managedBrandIds가 members에 저장된 뒤 추가한다
 * (GET /api/admin/inquiries와 동일 사유) — 그 전까지 partner는 403으로 막는다(잘못된 브랜드
 * 문의에 답변하는 사고 방지, admin/inquiries/page.tsx의 안전 폴백과 동일 기준).
 * answeredBy는 본문을 신뢰하지 않고 세션의 실제 이름으로 서버가 정한다(위장 방지).
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json(
      { error: session?.user ? 'forbidden' : 'unauthorized' },
      { status: session?.user ? 403 : 401 },
    );
  }

  const requester = session.user.memberId ? await findMemberById(session.user.memberId) : null;
  if (!requester || requester.role !== 'admin' || requester.status === 'inactive') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  const answer = (body as Record<string, unknown> | null)?.answer;
  if (typeof answer !== 'string' || answer.length < 1 || answer.length > MAX_ANSWER) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const inquiry = await answerInquiry(id, answer, requester.name);
    if (!inquiry) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    return NextResponse.json({ inquiry }, { status: 200 });
  } catch (error) {
    logServerError('[POST /api/admin/inquiries/[id]/answer] 답변 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
