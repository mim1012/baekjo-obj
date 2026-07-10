import { NextResponse } from 'next/server';
import { getBrandById } from '@/lib/brands/repo';
import { logServerError } from '@/lib/logServerError';

/**
 * GET /api/brands/[id] — 단건 브랜드 조회(공개).
 * DB id는 uuid가 아니라 text라 형식 오류로 500이 새 나갈 일이 없다 — 없으면 그냥 404.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const brand = await getBrandById(id);
    if (!brand) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    return NextResponse.json({ brand }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/brands/[id]] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
