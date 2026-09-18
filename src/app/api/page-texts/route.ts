import { NextResponse } from 'next/server';
import { defaultPageTextSettings } from '@/data/pageTextContent';
import { getCachedPageTextSettings, PUBLIC_READ_CACHE_CONTROL } from '@/lib/public-read-cache';
import { logServerError } from '@/lib/logServerError';

/** GET /api/page-texts — 공개 페이지 문구. 장애 시 기본 문구로 항상 200 응답한다. */
export async function GET() {
  let settings = defaultPageTextSettings;
  try {
    const saved = await getCachedPageTextSettings();
    if (saved) settings = saved;
  } catch (error) {
    logServerError('[GET /api/page-texts] 조회 실패 — 기본 문구로 폴백', error);
  }

  return NextResponse.json(
    { settings },
    { status: 200, headers: { 'Cache-Control': PUBLIC_READ_CACHE_CONTROL } },
  );
}
