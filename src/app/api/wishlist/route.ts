import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requireActiveMember } from '@/lib/members/requireActiveMember';
import {
  listWishlistProductIds,
  removeWishlistProduct,
  toggleWishlistProduct,
} from '@/lib/wishlist/repo';
import { logServerError } from '@/lib/logServerError';

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
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const productIds = await listWishlistProductIds(session.user.memberId);
    return NextResponse.json({ productIds }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/wishlist] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
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
