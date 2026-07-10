import { NextResponse } from 'next/server';
import { getProductById } from '@/lib/products/repo';
import { logServerError } from '@/lib/logServerError';

/**
 * GET /api/products/[id] — 단건 상품 조회(공개).
 * DB id는 uuid가 아니라 text라 형식 오류로 500이 새 나갈 일이 없다 — 없으면 그냥 404.
 * 비노출(isVisible: false) 상품도 이 경로에서는 그대로 보여준다(상세 링크를 아는 경우까지
 * 막지는 않음 — 목록 노출 여부만 listProducts의 visibleOnly가 통제).
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const product = await getProductById(id);
    if (!product) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/products/[id]] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
