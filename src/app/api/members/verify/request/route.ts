import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { findMemberByEmail, findMemberById } from '@/lib/members/repo';
import {
  createMemberToken,
  countRecentTokens,
  TOKEN_THROTTLE_LIMIT,
  TOKEN_THROTTLE_WINDOW_MINUTES,
} from '@/lib/members/tokens';
import { sendMail } from '@/lib/email/mailer';
import { verificationEmail } from '@/lib/email/templates';
import { getBaseUrl } from '@/lib/email/base-url';
import { logServerError } from '@/lib/logServerError';

/** POST /api/members/verify/request — 로그인한 본인에게 이메일 인증 메일을 보낸다. */
export async function POST(request: NextRequest) {
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

    if (member.emailVerified) {
      return NextResponse.json({ ok: true, already: true }, { status: 200 });
    }

    const recentCount = await countRecentTokens(member.id, 'verify', TOKEN_THROTTLE_WINDOW_MINUTES);
    if (recentCount >= TOKEN_THROTTLE_LIMIT) {
      return NextResponse.json({ error: 'too-many-requests' }, { status: 429 });
    }

    const rawToken = await createMemberToken(member.id, 'verify');
    const link = `${getBaseUrl(request)}/verify-email?token=${rawToken}`;
    const { subject, html } = verificationEmail(link);
    await sendMail({ to: member.email, subject, html });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[POST /api/members/verify/request] 인증 메일 발송 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
