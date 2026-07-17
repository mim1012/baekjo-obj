import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { findMemberById } from '@/lib/members/repo';
import { saveSiteSettings } from '@/lib/settings/repo';
import { normalizeHomeSettings } from '@/data/homeContent';
import { logServerError } from '@/lib/logServerError';

/**
 * 본문이 HomeSettings 모양인지 최소 검증한다. 값은 관리자만 저장하는 신뢰 입력이지만,
 * 통째로 jsonb 로 들어가므로 최상위 섹션 키가 모두 객체로 존재하는지만 확인해
 * 깨진 페이로드가 저장돼 화면이 조용히 깨지는 것을 막는다(§4). 통과한 본문은 저장 직전
 * normalizeHomeSettings 로 현재 스키마 모양으로 정규화해 저장한다(부분 입력도 안전하게 채움).
 */
const REQUIRED_SECTIONS = [
  'hero',
  'quickShop',
  'bestProducts',
  'curation',
  'audit',
  'solutions',
  'insuranceBanner',
  'trustBoard',
] as const;

function hasAllSections(body: unknown): body is Record<string, unknown> {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return REQUIRED_SECTIONS.every(
    (key) => b[key] !== null && typeof b[key] === 'object',
  );
}

/**
 * PUT /api/admin/settings — 관리자 홈 CMS 설정 저장.
 * proxy.ts가 /api/admin/* 을 이미 가드하지만 JWT의 role은 로그인 시점 스냅샷이라, DB에서
 * 강등/비활성화돼도 세션 만료 전까지 admin 권한이 남는다. 매 요청마다 DB에서 재조회해
 * 실제로 admin이고 active인지 다시 확인한다(admin/orders·admin/insurance와 동일 방어).
 */
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json(
      { error: session?.user ? 'forbidden' : 'unauthorized' },
      { status: session?.user ? 403 : 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  if (!hasAllSections(body)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const requester = session.user.memberId ? await findMemberById(session.user.memberId) : null;
    if (!requester || requester.role !== 'admin' || requester.status === 'inactive') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    await saveSiteSettings(normalizeHomeSettings(body));
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[PUT /api/admin/settings] 저장 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
