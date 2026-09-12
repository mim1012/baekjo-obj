import { NextResponse, type NextRequest } from 'next/server';
import { listCachedPublicBrands, PUBLIC_READ_CACHE_CONTROL } from '@/lib/public-read-cache';
import {
  isMissingSupabaseEnvironmentError,
  logServerError,
} from '@/lib/logServerError';
import type { Brand } from '@/types';

type PublicBrandNavSummary = Pick<Brand, 'id' | 'name' | 'slug' | 'isVisible'>;

function toPublicBrandNavSummary(brand: Brand): PublicBrandNavSummary {
  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    isVisible: brand.isVisible,
  };
}

/** GET /api/brands — 공개 브랜드 목록. 기본은 공개 노출(is_visible=true) 브랜드만 반환한다. */
export async function GET(request: NextRequest) {
  try {
    const brands = await listCachedPublicBrands();
    const responseBrands =
      request.nextUrl.searchParams.get('view') === 'nav' ? brands.map(toPublicBrandNavSummary) : brands;
    return NextResponse.json(
      { brands: responseBrands },
      { status: 200, headers: { 'Cache-Control': PUBLIC_READ_CACHE_CONTROL } },
    );
  } catch (error) {
    logServerError('[GET /api/brands] 조회 실패', error);
    // DB 환경파일이 없는 로컬 UI 개발에서는 헤더 브랜드 메뉴를 빈 상태로 유지한다.
    // production의 설정 누락이나 실제 조회 장애는 아래 500을 유지해 감시 대상에서 숨기지 않는다.
    if (process.env.NODE_ENV === 'development' && isMissingSupabaseEnvironmentError(error)) {
      return NextResponse.json({ brands: [] }, { status: 200 });
    }
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
