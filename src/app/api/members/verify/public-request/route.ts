import { NextResponse, type NextRequest } from 'next/server';
import { findMemberByEmail } from '@/lib/members/repo';
import { createMemberToken, countRecentTokens, TOKEN_THROTTLE_LIMIT, TOKEN_THROTTLE_WINDOW_MINUTES } from '@/lib/members/tokens';
import { sendMail } from '@/lib/email/mailer';
import { verificationEmail } from '@/lib/email/templates';
import { getBaseUrl } from '@/lib/email/base-url';
import { logServerError } from '@/lib/logServerError';
import { checkAuthRateLimit, requestRateLimitKey } from '@/lib/security/authRateLimit';

interface PublicVerificationRequestBody { email?: unknown }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: PublicVerificationRequestBody;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: true }, { status: 200 }); }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (email && EMAIL_PATTERN.test(email) && checkAuthRateLimit('signup', requestRateLimitKey(request))) {
    try {
      const member = await findMemberByEmail(email);
      if (member && member.provider === 'email' && !member.emailVerified) {
        const recentCount = await countRecentTokens(member.id, 'verify', TOKEN_THROTTLE_WINDOW_MINUTES);
        if (recentCount < TOKEN_THROTTLE_LIMIT) {
          const token = await createMemberToken(member.id, 'verify');
          const link = `${getBaseUrl(request)}/verify-email?token=${token}`;
          const { subject, html } = verificationEmail(link);
          await sendMail({ to: member.email, subject, html });
        }
      }
    } catch (error) { logServerError('[POST /api/members/verify/public-request] 인증 메일 발송 실패', error); }
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
