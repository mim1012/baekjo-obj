import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listOrdersByMember } from '@/lib/orders/repo';
import { logServerError } from '@/lib/logServerError';

/** GET /api/orders/mine — 로그인한 본인 주문 목록. 세션 없으면 401. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'no-session' }, { status: 401 });
  }

  const memberId = session.user.memberId;
  if (!memberId) {
    // 회원 식별자가 없는 세션(정상 경로에선 발생 안 함)은 노출할 주문이 없다.
    return NextResponse.json({ orders: [] }, { status: 200 });
  }

  try {
    // 전부 본인 주문이므로 member_id 동봉이 타인 PII 노출이 아니다(클라이언트는 Order 필드만 사용).
    const orders = await listOrdersByMember(memberId);
    return NextResponse.json({ orders }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/orders/mine] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
