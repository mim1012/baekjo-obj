// 파트너(brand-scoped) API 라우트 공용 인가. requireAdmin과 같은 이유로 DB 재조회를 매 요청마다
// 한다 — JWT의 role/managedBrandIds는 로그인 시점 스냅샷이라 관리자가 파트너 권한을 회수해도
// 세션 만료 전까지 반영되지 않는다. admin은 모든 브랜드, partner는 managedBrandIds에 포함된
// 브랜드만 통과한다.
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findMemberById, type MemberRecord } from '@/lib/members/repo';

export type RequireBrandScopedResult =
  | { ok: true; requester: MemberRecord }
  | { ok: false; response: NextResponse };

export async function requireBrandScoped(brandId: string): Promise<RequireBrandScopedResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }

  const requester = session.user.memberId ? await findMemberById(session.user.memberId) : null;
  if (!requester || requester.status === 'inactive') {
    return { ok: false, response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }

  if (requester.role === 'admin') {
    return { ok: true, requester };
  }

  // partner는 allowlist로 검사한다 — status가 'pending'/'rejected'(계약 종료 등)여도 managedBrandIds
  // 는 그대로 남아있을 수 있으므로, active가 아니면 managedBrandIds 값과 무관하게 무조건 차단한다.
  const inScope =
    requester.role === 'partner' &&
    requester.status === 'active' &&
    (requester.managedBrandIds?.includes(brandId) ?? false);
  if (!inScope) {
    return { ok: false, response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }

  return { ok: true, requester };
}
