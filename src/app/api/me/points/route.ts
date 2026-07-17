import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findMemberById } from '@/lib/members/repo';
import { getPointsEligibility, listPointTransactionsByMember } from '@/lib/points/repo';
import { logServerError } from '@/lib/logServerError';

/** GET /api/me/points — 내 적립금 잔액/원장. 비회원은 401 대신 ineligible payload를 반환해 checkout이 같은 UX로 처리한다. */
export async function GET() {
  const session = await auth();
  const memberId = session?.user?.memberId;
  if (!memberId) {
    return NextResponse.json(
      { balance: { memberId: '', balance: 0, eligible: false, reason: 'no-session' }, transactions: [] },
      { status: 200 },
    );
  }

  try {
    const member = await findMemberById(memberId);
    const balance = getPointsEligibility(member);
    const transactions = balance.eligible ? await listPointTransactionsByMember(memberId) : [];
    return NextResponse.json({ balance, transactions }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/me/points] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
