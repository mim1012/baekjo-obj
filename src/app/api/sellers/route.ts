import { NextResponse } from 'next/server';
import { listVerifiedSellers } from '@/lib/sellers/repo';
import { logServerError } from '@/lib/logServerError';

const PUBLIC_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300';

/** GET /api/sellers — 고객에게 공개 가능한 검증 완료 판매자 사업자정보 목록. */
export async function GET() {
  try {
    return NextResponse.json(
      { sellers: await listVerifiedSellers() },
      { status: 200, headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } },
    );
  } catch (error) {
    logServerError('[GET /api/sellers] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
