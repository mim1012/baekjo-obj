// admin API 라우트 공용 인증 재검증. proxy.ts가 /api/admin/* 을 JWT role로 이미 가드하지만,
// JWT의 role은 로그인 시점 스냅샷이라 DB에서 강등/비활성화돼도 세션 만료 전까지 admin 권한이
// 남는다. 매 요청마다 DB에서 재조회해 실제로 admin이고 active인지 다시 확인한다
// (admin/orders, admin/members와 동일 방어 — products/brands 관리자 라우트 공용화).
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findMemberById, type MemberRecord } from '@/lib/members/repo';

export type RequireAdminResult =
  | { ok: true; requester: MemberRecord }
  | { ok: false; response: NextResponse };

export async function requireAdmin(): Promise<RequireAdminResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: session?.user ? 'forbidden' : 'unauthorized' },
        { status: session?.user ? 403 : 401 },
      ),
    };
  }

  const requester = session.user.memberId ? await findMemberById(session.user.memberId) : null;
  if (!requester || requester.role !== 'admin' || requester.status === 'inactive') {
    return { ok: false, response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }

  return { ok: true, requester };
}
