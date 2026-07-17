import { NextResponse } from 'next/server';
import { defaultNoticesConfig, type NoticesConfig } from '@/lib/notices/config';
import { getNoticesConfig } from '@/lib/notices/repo';
import { logServerError } from '@/lib/logServerError';

/**
 * GET /api/notices — 공개 공지 config 조회(클라이언트 화면이 storage 콘센트로 읽는다).
 * 저장된 행이 있으면 그 값을, 없거나 조회에 실패하면 defaultNoticesConfig 로 폴백한다.
 * 공개 화면이라 절대 500 을 내지 않는다 — 무슨 일이 있어도 공지 목록이 있어야 한다(concerns 패턴).
 */
export async function GET() {
  let config: NoticesConfig = defaultNoticesConfig;
  try {
    const saved = await getNoticesConfig();
    if (saved) config = saved;
  } catch (error) {
    logServerError('[GET /api/notices] 조회 실패 — defaultNoticesConfig 로 폴백', error);
  }
  return NextResponse.json({ items: config.items }, { status: 200 });
}
