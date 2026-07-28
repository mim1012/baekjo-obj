import { NextResponse, after, type NextRequest } from 'next/server';
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
import { createRateLimiter, clientIpKey } from '@/lib/rateLimit';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 회원 단위 DB 스로틀(countRecentTokens)만으로는 "가입 안 된 이메일"로 무한 요청해 매번
// findMemberByEmail 조회를 유발하는 경로를 막지 못한다 — 이건 그걸 IP 단위로 보완한다.
// IP당 시간당 5건이면 정상적인 재설정 요청(비밀번호를 잊고 여러 번 시도)은 막지 않는다.
const rateLimiter = createRateLimiter(3_600_000, 5);

interface PasswordResetRequestBody {
  email?: unknown;
}

/**
 * POST /api/members/password-reset/request — 비밀번호 재설정 메일 발송.
 * 이메일 열거(존재 여부 노출) 방지를 위해 회원 존재 여부와 무관하게 항상 200 { ok: true }를
 * 즉시 반환한다. 조회·토큰 발급·메일 발송은 after()로 응답 이후에 실행하므로, 회원 존재
 * 여부에 따라 응답 시간이 달라지는 타이밍 채널도 함께 막는다.
 *
 * ⚠️ after()를 쓰는 이유: Vercel 서버리스는 응답 전송 후 함수를 얼려 순수 fire-and-forget
 * (`void (async...)()`)이 완료 전에 중단될 수 있다(로컬 장수 서버에선 안 드러남). after()는
 * 응답 후 작업을 런타임이 보장 실행한다.
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

  // 한도 초과라도 429를 주면 "이 IP가 스로틀됨"이 노출되는 건 문제 아니지만, 그보다 더 중요한
  // 건 이 라우트 전체의 설계 축인 이메일 열거 방지다 — 응답 형태가 요청마다 달라지면 안 되므로
  // 여기서도 기존과 동일하게 200 { ok: true }를 반환하고, after() 등록만 건너뛰어 발송을 생략한다.
  if (!rateLimiter.check(clientIpKey(request))) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const baseUrl = getBaseUrl(request);
  after(async () => {
    try {
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
    } catch (error: unknown) {
      logServerError('[POST /api/members/password-reset/request] 재설정 메일 발송 실패', error);
    }
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
