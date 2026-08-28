import { NextResponse, type NextRequest } from 'next/server';
import { findMemberByEmail } from '@/lib/members/repo';
import { checkAuthRateLimit, requestRateLimitKey } from '@/lib/security/authRateLimit';
import { logServerError } from '@/lib/logServerError';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/members/check-email?email=... — 회원가입 이메일 중복 선체크.
 * 가입 폼에서 이메일 입력 시점(디바운스/블러)에 호출해, 긴 양식을 다 채우고 나서야
 * 중복을 알게 되는 UX 문제를 막는다. 최종 판정은 POST /api/members(·/business)의
 * 409가 담당하며, 이 엔드포인트는 보조 힌트일 뿐이다.
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')?.trim().toLowerCase() ?? '';
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'invalid-email' }, { status: 400 });
  }

  if (!checkAuthRateLimit('email-check', requestRateLimitKey(request))) {
    return NextResponse.json({ error: 'too-many-requests' }, { status: 429 });
  }

  try {
    const member = await findMemberByEmail(email);
    return NextResponse.json({ available: !member }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/members/check-email] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
