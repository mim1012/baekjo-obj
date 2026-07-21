import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { listAllProductReviews } from '@/lib/reviews/repo';
import { logServerError } from '@/lib/logServerError';

/**
 * GET /api/admin/reviews — 구매평(product_reviews) moderation 목록. published+hidden 전체를
 * 상품명과 함께 반환한다. 전시 후기(showcase_reviews_config, /api/admin/showcase-reviews)와는
 * 별개 도메인이다 — 이 라우트는 실제 구매평 CRUD만 다룬다.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const reviews = await listAllProductReviews();
    return NextResponse.json({ reviews }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/admin/reviews] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
