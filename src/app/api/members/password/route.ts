import { NextResponse } from 'next/server';
import { requireActiveMember } from '@/lib/members/requireActiveMember';
import { updateMemberPassword } from '@/lib/members/repo';
import { hashPassword, verifyPassword } from '@/lib/members/password';
import { logServerError } from '@/lib/logServerError';

interface ChangePasswordBody {
  currentPassword?: unknown;
  newPassword?: unknown;
}

/** PATCH /api/members/password — 로그인한 본인의 비밀번호 변경. */
export async function PATCH(request: Request) {
  const activeMember = await requireActiveMember();
  if (!activeMember.ok) {
    return activeMember.response;
  }

  let body: ChangePasswordBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const { currentPassword, newPassword } = body;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const member = activeMember.member;

    if (!member.passwordHash) {
      return NextResponse.json({ error: 'social-account' }, { status: 400 });
    }

    // bcrypt는 72바이트까지만 본다 — 회원가입 검증과 동일한 기준(signup route.ts §validate).
    if (newPassword.length < 6 || Buffer.byteLength(newPassword, 'utf8') > 72) {
      return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
    }

    const isCurrentValid = await verifyPassword(currentPassword, member.passwordHash);
    if (!isCurrentValid) {
      return NextResponse.json({ error: 'invalid-current' }, { status: 400 });
    }

    const passwordHash = await hashPassword(newPassword);
    await updateMemberPassword(member.id, passwordHash);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[PATCH /api/members/password] 비밀번호 변경 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
