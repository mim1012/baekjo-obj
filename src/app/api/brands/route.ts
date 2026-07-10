import { NextResponse } from 'next/server';
import { listBrands } from '@/lib/brands/repo';
import { logServerError } from '@/lib/logServerError';

/** GET /api/brands — 공개 브랜드 목록. 기본은 공개 노출(is_visible=true) 브랜드만 반환한다. */
export async function GET() {
  try {
    const brands = await listBrands(true);
    return NextResponse.json({ brands }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/brands] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
