import { NextResponse } from 'next/server';
import { updateMemberPassword } from '@/lib/members/repo';
import { hashPassword } from '@/lib/members/password';
import { consumeMemberToken } from '@/lib/members/tokens';
import { logServerError } from '@/lib/logServerError';

interface PasswordResetConfirmBody {
  token?: unknown;
  newPassword?: unknown;
}

/** POST /api/members/password-reset/confirm — 재설정 토큰을 소비하고 새 비밀번호로 교체한다. */
export async function POST(request: Request) {
  let body: PasswordResetConfirmBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const { token, newPassword } = body;
  if (typeof token !== 'string' || token.length < 1) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  // bcrypt는 72바이트까지만 본다 — 회원가입/비밀번호 변경 검증과 동일한 기준.
  if (
    typeof newPassword !== 'string' ||
    newPassword.length < 6 ||
    Buffer.byteLength(newPassword, 'utf8') > 72
  ) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const memberId = await consumeMemberToken(token, 'reset');
    if (!memberId) {
      return NextResponse.json({ error: 'invalid-token' }, { status: 400 });
    }

    const passwordHash = await hashPassword(newPassword);
    await updateMemberPassword(memberId, passwordHash);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[POST /api/members/password-reset/confirm] 재설정 확정 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
