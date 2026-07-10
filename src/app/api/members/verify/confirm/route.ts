import { NextResponse } from 'next/server';
import { markEmailVerified } from '@/lib/members/repo';
import { consumeMemberToken } from '@/lib/members/tokens';
import { logServerError } from '@/lib/logServerError';

interface VerifyConfirmBody {
  token?: unknown;
}

/** POST /api/members/verify/confirm — 이메일 인증 링크의 토큰을 소비해 인증 완료 처리한다. */
export async function POST(request: Request) {
  let body: VerifyConfirmBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const { token } = body;
  if (typeof token !== 'string' || token.length < 1) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const memberId = await consumeMemberToken(token, 'verify');
    if (!memberId) {
      return NextResponse.json({ error: 'invalid-token' }, { status: 400 });
    }

    await markEmailVerified(memberId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[POST /api/members/verify/confirm] 인증 확정 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
