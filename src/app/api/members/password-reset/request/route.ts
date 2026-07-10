import { NextResponse, type NextRequest } from 'next/server';
import { findMemberByEmail } from '@/lib/members/repo';
import {
  createMemberToken,
  countRecentTokens,
  TOKEN_THROTTLE_LIMIT,
  TOKEN_THROTTLE_WINDOW_MINUTES,
} from '@/lib/members/tokens';
import { sendMail } from '@/lib/email/mailer';
import { passwordResetEmail } from '@/lib/email/templates';
import { getBaseUrl } from '@/lib/email/base-url';
import { logServerError } from '@/lib/logServerError';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PasswordResetRequestBody {
  email?: unknown;
}

/**
 * POST /api/members/password-reset/request — 비밀번호 재설정 메일 발송.
 * 이메일 열거(존재 여부 노출) 방지를 위해 회원 존재 여부와 무관하게 항상 200 { ok: true }를
 * 즉시 반환한다. 조회·토큰 발급·메일 발송을 전부 fire-and-forget으로 비동기화해, 회원 존재
 * 여부에 따라 응답 시간이 달라지는 타이밍 채널도 함께 막는다.
 */
export async function POST(request: NextRequest) {
  let body: PasswordResetRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const { email } = body;
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const baseUrl = getBaseUrl(request);
  void (async () => {
    const member = await findMemberByEmail(email);
    // 소셜 전용 계정(passwordHash 없음)은 재설정할 비밀번호가 없으므로 발송하지 않는다(베타 단순화).
    if (!member || !member.passwordHash) return;

    // 메일 폭탄/SMTP 쿼터 소진 방지. 열거 방지를 위해 응답은 이미 200으로 나간 뒤라 영향 없다.
    const recentCount = await countRecentTokens(member.id, 'reset', TOKEN_THROTTLE_WINDOW_MINUTES);
    if (recentCount >= TOKEN_THROTTLE_LIMIT) return;

    const rawToken = await createMemberToken(member.id, 'reset');
    const link = `${baseUrl}/reset-password?token=${rawToken}`;
    const { subject, html } = passwordResetEmail(link);
    await sendMail({ to: member.email, subject, html });
  })().catch((error: unknown) =>
    logServerError('[POST /api/members/password-reset/request] 재설정 메일 발송 실패', error),
  );

  return NextResponse.json({ ok: true }, { status: 200 });
}
