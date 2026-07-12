import { NextResponse } from 'next/server';
import { defaultHomeSettings, type HomeSettings } from '@/data/homeContent';
import { getSiteSettings } from '@/lib/settings/repo';
import { logServerError } from '@/lib/logServerError';

/**
 * GET /api/settings — 공개 홈 CMS 설정 조회(스토어프론트가 읽는다).
 * 저장된 행이 있으면 그 값을, 없거나 조회에 실패하면 defaultHomeSettings 로 폴백한다.
 * 공개 스토어프론트라 절대 500 을 내지 않는다 — 무슨 일이 있어도 화면엔 콘텐츠가 있어야 한다.
 */
export async function GET() {
  let settings: HomeSettings = defaultHomeSettings;
  try {
    const saved = await getSiteSettings();
    if (saved) settings = saved;
  } catch (error) {
    logServerError('[GET /api/settings] 조회 실패 — defaultHomeSettings 로 폴백', error);
  }
  return NextResponse.json({ settings }, { status: 200 });
}
