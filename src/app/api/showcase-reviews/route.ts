import { NextResponse } from 'next/server';
import { getShowcaseReviewsConfigWithFallback } from '@/lib/reviews/repo';

/**
 * GET /api/showcase-reviews — 공개 전시 후기 config 조회(클라이언트 화면이 storage 콘센트로 읽는다).
 * 저장된 행이 있으면 그 값을, 없거나 조회에 실패하면 defaultShowcaseReviewsConfig 로 폴백한다.
 * 공개 화면이라 절대 500 을 내지 않는다 — 무슨 일이 있어도 후기 목록이 있어야 한다(notices 패턴).
 */
export async function GET() {
  const config = await getShowcaseReviewsConfigWithFallback();
  return NextResponse.json({ items: config.items }, { status: 200 });
}
