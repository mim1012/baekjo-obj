import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findMemberByEmail, findMemberById, toUser } from '@/lib/members/repo';
import { logServerError } from '@/lib/logServerError';

/** GET /api/members/me — 로그인한 본인 회원 정보 조회. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'no-session' }, { status: 401 });
  }

  try {
    const memberId = session.user.memberId;
    const member = memberId
      ? await findMemberById(memberId)
      : session.user.email
        ? await findMemberByEmail(session.user.email)
        : null;

    if (!member) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }

    // role은 DB 원본이 아니라 세션 기준으로 덮어쓴다. 소셜 로그인이 이메일 일치로 기존
    // admin 레코드에 그대로 붙는 경우(upsertSocialMember ②)에도 세션 role(항상 'user')이
    // 우선하도록 해, 클라이언트가 실제로는 admin이 아닌데 admin으로 캐시되는 걸 막는다.
    const user = { ...toUser(member), role: session.user.role ?? 'user' };
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/members/me] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
