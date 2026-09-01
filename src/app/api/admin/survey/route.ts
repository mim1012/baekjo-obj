import { NextResponse, type NextRequest } from 'next/server';
import { getSurveyConfig, saveSurveyConfig } from '@/lib/survey/repo';
import { defaultSurveyConfig, isValidSurveyConfig, resolveSurveyConfig, type SurveyConfig } from '@/lib/survey/config';
import { logServerError } from '@/lib/logServerError';
import { requireAdmin } from '@/lib/admin/requireAdmin';

/**
 * 본문이 실제로 끝까지 실행 가능한 SurveyConfig인지 검증한다. 질문·답·결과 참조와
 * 결과 화면 문구까지 검사해 깨진 jsonb가 저장되는 것을 막는다.
 *
 * questions·rules 는 각각 최소 1개 이상이어야 한다. rules가 비면 공개 GET이 빈 배열을
 * 반환해 getSurveyResult(answers, [])가 항상 undefined를 반환하고, 결과 화면이 "분석 중..."
 * 로딩에서 영원히 멈춘다(Golden Flow #1 붕괴). questions가 비면 진단 자체가 성립하지 않는다.
 */
function isSurveyConfig(body: unknown): body is SurveyConfig {
  return isValidSurveyConfig(body);
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  try {
    const saved = await getSurveyConfig();
    return NextResponse.json(resolveSurveyConfig(saved ?? defaultSurveyConfig), { status: 200 });
  } catch (error) {
    logServerError('[GET /api/admin/survey] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/survey — 관리자 설문 config 저장.
 * proxy.ts가 /api/admin/* 을 이미 가드하지만 JWT의 role은 로그인 시점 스냅샷이라, DB에서
 * 강등/비활성화돼도 세션 만료 전까지 admin 권한이 남는다. 매 요청마다 DB에서 재조회해
 * 실제로 admin이고 active인지 다시 확인한다(admin/category-settings와 동일 방어).
 */
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

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
    await saveSurveyConfig(body);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[PUT /api/admin/survey] 저장 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
