import { NextResponse } from 'next/server';
import { defaultShowcaseReviewsConfig, type ShowcaseReviewsConfig } from '@/lib/reviews/showcaseConfig';
import { getShowcaseReviewsConfig } from '@/lib/reviews/repo';
import { logServerError } from '@/lib/logServerError';

/**
 * GET /api/showcase-reviews — 공개 전시 후기 config 조회(클라이언트 화면이 storage 콘센트로 읽는다).
 * 저장된 행이 있으면 그 값을, 없거나 조회에 실패하면 defaultShowcaseReviewsConfig 로 폴백한다.
 * 공개 화면이라 절대 500 을 내지 않는다 — 무슨 일이 있어도 후기 목록이 있어야 한다(notices 패턴).
 */
export async function GET() {
  let config: ShowcaseReviewsConfig = defaultShowcaseReviewsConfig;
  try {
    const saved = await getShowcaseReviewsConfig();
    if (saved) config = saved;
  } catch (error) {
    logServerError('[GET /api/showcase-reviews] 조회 실패 — defaultShowcaseReviewsConfig 로 폴백', error);
  }
  return NextResponse.json({ items: config.items }, { status: 200 });
}
