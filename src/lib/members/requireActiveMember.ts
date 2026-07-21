// 회원 전용 write 라우트 공용 인증 재검증. requireAdmin.ts와 동일한 이유로 존재한다 —
// JWT의 status는 로그인 시점 스냅샷이라, 로그인 이후 관리자가 정지(inactive)하거나 본인이
// 탈퇴(withdrawn)해도 세션이 만료되기 전까지는 그대로 남아 있다. 매 요청마다 DB에서
// 재조회해 실제로 status==='active'인지 다시 확인한다(requireAdmin.ts 패턴 미러).
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findMemberById, type MemberRecord } from '@/lib/members/repo';

export type RequireActiveMemberResult =
  | { ok: true; memberId: string; member: MemberRecord }
  | { ok: false; response: NextResponse };

export async function requireActiveMember(): Promise<RequireActiveMemberResult> {
  const session = await auth();
  if (!session?.user?.memberId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    };
  }

  const member = await findMemberById(session.user.memberId);
  if (!member || member.status !== 'active') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'forbidden' }, { status: 403 }),
    };
  }

  return { ok: true, memberId: member.id, member };
}
