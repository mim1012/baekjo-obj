import { NextResponse } from 'next/server';
import { getNoticesConfigWithFallback } from '@/lib/notices/repo';

/**
 * GET /api/notices — 공개 공지 config 조회(클라이언트 화면이 storage 콘센트로 읽는다).
 * 저장된 행이 있으면 그 값을, 없거나 조회에 실패하면 빈 목록으로 응답한다.
 * 공개 화면이라 절대 500 을 내지 않고 명시적인 빈 상태를 렌더하게 한다.
 */
export async function GET() {
  const config = await getNoticesConfigWithFallback();
  return NextResponse.json({ items: config.items }, { status: 200 });
}
