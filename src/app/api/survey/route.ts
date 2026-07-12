import { NextResponse } from 'next/server';
import { defaultSurveyConfig, type SurveyConfig } from '@/lib/survey/config';
import { getSurveyConfig } from '@/lib/survey/repo';
import { logServerError } from '@/lib/logServerError';

/**
 * GET /api/survey — 공개 설문 config 조회(진단 화면 /diagnosis·/diagnosis/result 가 읽는다).
 * 저장된 행이 있으면 그 값을, 없거나 조회에 실패하면 defaultSurveyConfig 로 폴백한다.
 * 공개 화면(Golden Flow #1)이라 절대 500 을 내지 않는다 — 무슨 일이 있어도 문항·룰이 있어야 한다.
 */
export async function GET() {
  let config: SurveyConfig = defaultSurveyConfig;
  try {
    const saved = await getSurveyConfig();
    if (saved) config = saved;
  } catch (error) {
    logServerError('[GET /api/survey] 조회 실패 — defaultSurveyConfig 로 폴백', error);
  }
  return NextResponse.json({ questions: config.questions, rules: config.rules }, { status: 200 });
}
