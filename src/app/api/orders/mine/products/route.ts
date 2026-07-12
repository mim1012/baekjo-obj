import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listOrdersByMember } from '@/lib/orders/repo';
import { listProductsByIds } from '@/lib/products/repo';
import { logServerError } from '@/lib/logServerError';

/**
 * GET /api/orders/mine/products — 본인 과거 주문에 등장한 상품(비노출 포함).
 * 관리자가 상품을 숨겨도 이미 구매한 회원의 마이페이지(주문내역·구매평)에서는
 * 상품명·이미지가 계속 보여야 한다. 인가는 "본인 소유 주문에 등장한 상품"으로
 * 한정하므로(listOrdersByMember 가 이미 member_id 로 필터) 비노출 상품을 일반
 * 공개 목록에 새로 노출하는 것이 아니다. 세션 없으면 401.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'no-session' }, { status: 401 });
  }

  const memberId = session.user.memberId;
  if (!memberId) {
    return NextResponse.json({ products: [] }, { status: 200 });
  }

  try {
    const orders = await listOrdersByMember(memberId);
    const productIds = Array.from(new Set(orders.flatMap((order) => order.items.map((item) => item.productId))));
    const products = await listProductsByIds(productIds, { includeHidden: true });
    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/orders/mine/products] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
