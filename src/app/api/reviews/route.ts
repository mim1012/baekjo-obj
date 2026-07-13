import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { buildReviewTargetKey } from '@/lib/storage';
import { getOrderById } from '@/lib/orders/repo';
import { getProductById } from '@/lib/products/repo';
import { insertReview, DuplicateReviewError, type InsertReviewInput } from '@/lib/reviews/repo';
import { logServerError } from '@/lib/logServerError';

const MAX_ORDER_ID = 100;
const MAX_OPTION_NAME = 200;
const MAX_TITLE = 200;
const MAX_CONTENT = 2000;

function isStr(v: unknown, min: number, max: number): v is string {
  return typeof v === 'string' && v.length >= min && v.length <= max;
}

interface ValidatedBody {
  orderId: string;
  orderItemId?: string;
  productId: string;
  optionName?: string;
  rating: number;
  title?: string;
  content: string;
}

/** 신뢰 가능한 입력만 뽑는다. brandId는 본문을 신뢰하지 않고 productId로 조회한 실제 브랜드로
 *  덮어쓴다(§4 — 상품문의/구매평이 엉뚱한 브랜드에 배정되면 파트너 답변 인가가 깨진다). */
function validate(body: unknown): ValidatedBody | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;

  if (!isStr(b.orderId, 1, MAX_ORDER_ID)) return null;
  if (!isStr(b.productId, 1, MAX_ORDER_ID)) return null;
  if (b.orderItemId !== undefined && !isStr(b.orderItemId, 0, MAX_ORDER_ID)) return null;
  if (b.optionName !== undefined && !isStr(b.optionName, 0, MAX_OPTION_NAME)) return null;
  if (typeof b.rating !== 'number' || !Number.isInteger(b.rating) || b.rating < 1 || b.rating > 5) return null;
  if (b.title !== undefined && !isStr(b.title, 0, MAX_TITLE)) return null;
  if (!isStr(b.content, 1, MAX_CONTENT)) return null;

  return {
    orderId: b.orderId,
    productId: b.productId,
    ...(typeof b.orderItemId === 'string' ? { orderItemId: b.orderItemId } : {}),
    ...(typeof b.optionName === 'string' ? { optionName: b.optionName } : {}),
    rating: b.rating,
    ...(typeof b.title === 'string' ? { title: b.title } : {}),
    content: b.content,
  };
}

/**
 * POST /api/reviews — 구매평 작성(세션 필요).
 * 주문 소유권을 서버에서 재검증(getOrderById + memberId 일치)한 뒤에만 작성을 허용한다
 * (§보안 — 남의 orderId로 구매평을 붙이는 경로 차단). reviewTargetKey는 서버가 계산해
 * 중복 작성을 unique 제약으로 막는다.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.memberId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const validated = validate(body);
  if (!validated) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const order = await getOrderById(validated.orderId);
    if (!order || order.memberId !== session.user.memberId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const product = await getProductById(validated.productId, { includeHidden: true });
    if (!product) {
      return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
    }

    const reviewTargetKey = buildReviewTargetKey(validated.orderId, validated.productId, validated.optionName);

    const input: InsertReviewInput = {
      orderId: validated.orderId,
      orderItemId: validated.orderItemId,
      reviewTargetKey,
      productId: validated.productId,
      brandId: product.brandId,
      rating: validated.rating,
      title: validated.title,
      content: validated.content,
    };

    const review = await insertReview(session.user.memberId, input);
    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateReviewError) {
      return NextResponse.json({ error: 'duplicate-review' }, { status: 409 });
    }
    logServerError('[POST /api/reviews] 작성 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
