import { NextResponse, type NextRequest } from 'next/server';
import { listProducts } from '@/lib/products/repo';
import { logServerError } from '@/lib/logServerError';

/**
 * GET /api/products — 공개 상품 목록. categorySlug/brandId/petType 쿼리로 필터링하며,
 * 기본은 공개 노출(is_visible=true) 상품만 반환한다(비노출 상품은 admin 전용 목록에서만 보임).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const categorySlug = searchParams.get('categorySlug') ?? undefined;
  const brandId = searchParams.get('brandId') ?? undefined;
  const petType = searchParams.get('petType') ?? undefined;

  try {
    const products = await listProducts({ categorySlug, brandId, petType, visibleOnly: true });
    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/products] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
