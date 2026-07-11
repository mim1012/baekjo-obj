import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { findMemberById } from '@/lib/members/repo';
import { saveSurveyConfig } from '@/lib/survey/repo';
import type { SurveyConfig } from '@/lib/survey/config';
import { logServerError } from '@/lib/logServerError';

/**
 * 본문이 SurveyConfig 모양인지 최소 검증한다. 값은 관리자만 저장하는 신뢰 입력이지만,
 * 통째로 jsonb 로 들어가므로 questions·rules 가 모두 배열로 존재하는지만 확인해
 * 깨진 페이로드가 저장돼 진단 화면이 조용히 깨지는 것을 막는다(§4).
 *
 * questions·rules 는 각각 최소 1개 이상이어야 한다. rules가 비면 공개 GET이 빈 배열을
 * 반환해 getSurveyResult(answers, [])가 항상 undefined를 반환하고, 결과 화면이 "분석 중..."
 * 로딩에서 영원히 멈춘다(Golden Flow #1 붕괴). questions가 비면 진단 자체가 성립하지 않는다.
 */
function isSurveyConfig(body: unknown): body is SurveyConfig {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    Array.isArray(b.questions) &&
    b.questions.length >= 1 &&
    Array.isArray(b.rules) &&
    b.rules.length >= 1
  );
}

/**
 * PUT /api/admin/survey — 관리자 설문 config 저장.
 * proxy.ts가 /api/admin/* 을 이미 가드하지만 JWT의 role은 로그인 시점 스냅샷이라, DB에서
 * 강등/비활성화돼도 세션 만료 전까지 admin 권한이 남는다. 매 요청마다 DB에서 재조회해
 * 실제로 admin이고 active인지 다시 확인한다(admin/category-settings와 동일 방어).
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
  if (!isSurveyConfig(body)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const requester = session.user.memberId ? await findMemberById(session.user.memberId) : null;
    if (!requester || requester.role !== 'admin' || requester.status === 'inactive') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    await saveSurveyConfig(body);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[PUT /api/admin/survey] 저장 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
