import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requireActiveMember } from '@/lib/members/requireActiveMember';
import {
  listWishlistProductIds,
  removeWishlistProduct,
  toggleWishlistProduct,
} from '@/lib/wishlist/repo';
import { logServerError } from '@/lib/logServerError';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

interface WishlistBody {
  productId?: unknown;
}

function parseProductId(body: WishlistBody): string | null {
  return typeof body.productId === 'string' && body.productId.trim().length > 0
    ? body.productId.trim()
    : null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.memberId) {
    // 공개 상품 카드가 첫 렌더에서 찜 상태를 동기화한다. 익명 사용자의 읽기는 자연스러운
    // 빈 목록이므로 200으로 돌려 브라우저 콘솔·Network에 불필요한 401을 만들지 않는다.
    // 쓰기(POST/DELETE)는 아래 requireActiveMember 가 계속 401로 차단한다.
    return NextResponse.json({ productIds: [] }, { status: 200, headers: NO_STORE_HEADERS });
  }

  try {
    const productIds = await listWishlistProductIds(session.user.memberId);
    return NextResponse.json({ productIds }, { status: 200, headers: NO_STORE_HEADERS });
  } catch (error) {
    logServerError('[GET /api/wishlist] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

export async function POST(request: Request) {
  const activeMember = await requireActiveMember();
  if (!activeMember.ok) {
    return activeMember.response;
  }

  let body: WishlistBody;
  try {
    body = (await request.json()) as WishlistBody;
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const productId = parseProductId(body);
  if (!productId) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const wishlisted = await toggleWishlistProduct(activeMember.memberId, productId);
    return NextResponse.json({ wishlisted }, { status: 200 });
  } catch (error) {
    logServerError('[POST /api/wishlist] 토글 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const activeMember = await requireActiveMember();
  if (!activeMember.ok) {
    return activeMember.response;
  }

  let body: WishlistBody;
  try {
    body = (await request.json()) as WishlistBody;
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const productId = parseProductId(body);
  if (!productId) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const wishlisted = await removeWishlistProduct(activeMember.memberId, productId);
    return NextResponse.json({ wishlisted }, { status: 200 });
  } catch (error) {
    logServerError('[DELETE /api/wishlist] 제거 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
