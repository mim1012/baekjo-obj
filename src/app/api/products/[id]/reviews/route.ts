import { NextResponse } from 'next/server';
import { listPublishedReviewsByProduct } from '@/lib/reviews/repo';
import { logServerError } from '@/lib/logServerError';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

/** GET /api/products/[id]/reviews — 공개 조회. 노출(published) 구매평만 반환한다. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const reviews = await listPublishedReviewsByProduct(id);
    return NextResponse.json({ reviews }, { status: 200, headers: NO_STORE_HEADERS });
  } catch (error) {
    logServerError('[GET /api/products/[id]/reviews] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
