import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createOrderWithReservation,
  InsufficientPointsError,
  PointsExceedOrderTotalError,
  PointsIneligibleError,
  type InsertOrderInput,
} from '@/lib/orders/repo';
import { listProductsByIds } from '@/lib/products/repo';
import { logServerError } from '@/lib/logServerError';
import type { OrderItem, Product } from '@/types';

// 거대 페이로드 방어(공개·게스트 허용 엔드포인트라 상한이 필수 — App Router 는 기본 본문 크기 제한이 없다).
const MAX_ITEMS = 100;
const MAX_QUANTITY = 999;
const MAX_NAME = 100;
const MAX_PHONE = 40;
const MAX_ADDRESS = 500;
const MAX_PAYMENT_METHOD = 40;
const MAX_PRODUCT_ID = 100;
const MAX_PRODUCT_NAME = 200;
const MAX_OPTION_NAME = 200;
const MAX_TRACKING = 100;
const MAX_MEMO = 1000;
const MAX_POINTS_TO_USE = 10_000_000;

// 배송비 정책은 프론트 checkout(page.tsx)과 동일해야 저장 총액이 어긋나지 않는다(§4 drift 방지).
const FREE_SHIPPING_THRESHOLD = 50000;
const SHIPPING_FEE = 3000;

// 카드결제(토스) PENDING 주문의 재고 선점 유효시간. claimOrderForConfirmation의
// CLAIM_EXTENSION_MS(orders/repo.ts)와 동일한 폭 — 승인 착수 시 "처음부터 다시 10분"으로 통일한다.
const PENDING_RESERVATION_MS = 10 * 60 * 1000;

function isStr(v: unknown, min: number, max: number): v is string {
  return typeof v === 'string' && v.length >= min && v.length <= max;
}

/** DB 상품(products 테이블)에서 실제 판매가를 찾는다.
 *  checkout/page.tsx의 getCheckoutItems()와 동일한 규칙(salePrice 우선, 없으면 price)을 서버에서도 그대로 따라
 *  화면과 결제 금액이 어긋나지 않게 한다. 가격이 아직 정해지지 않은 상품(price: null)은 구매 불가로 취급한다
 *  (프론트 hasUnpricedItems 가드와 동일 정책).
 */
function resolveCatalogPrice(product: Product): number | null {
  if (product.price === null || product.price === undefined) return null;
  return product.salePrice || product.price || 0;
}

/** 요청 본문에서 안전하게 다룰 필드만 뽑는다. id/createdAt/memberId·price 등은 무시(mass-assignment·가격 위조 차단). */
function validateItemShape(
  raw: unknown,
): Pick<OrderItem, 'productId' | 'quantity' | 'optionName'> | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  if (!isStr(item.productId, 1, MAX_PRODUCT_ID)) return null;
  if (
    typeof item.quantity !== 'number' ||
    !Number.isInteger(item.quantity) ||
    item.quantity <= 0 ||
    item.quantity > MAX_QUANTITY
  )
    return null;
  if (item.optionName !== undefined && !isStr(item.optionName, 0, MAX_OPTION_NAME)) return null;
  return {
    productId: item.productId,
    quantity: item.quantity,
    ...(typeof item.optionName === 'string' ? { optionName: item.optionName } : {}),
  };
}

/**
 * 신뢰 가능한 입력 필드만 검증해서 뽑고, 신뢰 민감 필드는 본문을 신뢰하지 않고 서버가 결정한다.
 * - orderStatus/paymentStatus/deliveryStatus: 서버 고정(결제완료·배송완료 위조 차단).
 * - productName/price: 클라이언트 값은 무시하고 productMap(호출부가 DB에서 미리 조회)에서
 *   productId로 조회한 실제 값으로 덮어쓴다(상품명 위장·가격 조작 차단). DB에 없는(비노출 포함)
 *   productId나 가격 미확정 상품이 하나라도 섞이면 주문 전체를 400으로 거부한다.
 * - totalPrice/deliveryFee: 조회 가격 × 수량으로 재계산(0원 위조 차단). 본문 값은 무시한다.
 */
function validate(body: unknown, productMap: Map<string, Product>): InsertOrderInput | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;

  if (!isStr(b.customerName, 1, MAX_NAME)) return null;
  if (!isStr(b.phone, 1, MAX_PHONE)) return null;
  if (!isStr(b.address, 0, MAX_ADDRESS)) return null;
  if (!isStr(b.paymentMethod, 1, MAX_PAYMENT_METHOD)) return null;
  if (b.trackingNumber !== undefined && !isStr(b.trackingNumber, 0, MAX_TRACKING)) return null;
  if (b.deliveryMemo !== undefined && !isStr(b.deliveryMemo, 0, MAX_MEMO)) return null;

  if (!Array.isArray(b.items) || b.items.length === 0 || b.items.length > MAX_ITEMS) return null;
  const items: OrderItem[] = [];
  for (const raw of b.items) {
    const shape = validateItemShape(raw);
    if (!shape) return null;
    const product = productMap.get(shape.productId);
    if (!product) return null;
    const unitPrice = resolveCatalogPrice(product);
    if (unitPrice === null) return null;
    if (!isStr(product.name, 1, MAX_PRODUCT_NAME)) return null;
    items.push({
      productId: shape.productId,
      productName: product.name,
      quantity: shape.quantity,
      price: unitPrice,
      brandId: product.brandId,
      ...(shape.optionName !== undefined ? { optionName: shape.optionName } : {}),
    });
  }

  const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const deliveryFee = subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_FEE : 0;
  // 실제 '결제완료' 승격은 결제 게이트/웹훅에서만. 생성 시엔 대기 상태로 고정한다.
  const isBankTransfer = b.paymentMethod === '무통장입금';
  const paymentStatus = isBankTransfer ? '입금대기' : '결제대기';
  // 무통장입금은 만료 복원 대상이 아니다(사람이 입금 확인 처리) — expiresAt 없이 생성.
  // 카드결제(토스)만 10분 선점 만료를 부여해 미승인/이탈 시 cron이 재고를 복원할 수 있게 한다.
  const expiresAt = isBankTransfer
    ? undefined
    : new Date(Date.now() + PENDING_RESERVATION_MS).toISOString();

  return {
    customerName: b.customerName,
    phone: b.phone,
    address: b.address,
    items,
    totalPrice: subtotal,
    deliveryFee,
    paymentMethod: b.paymentMethod,
    orderStatus: '주문접수',
    paymentStatus,
    deliveryStatus: '배송준비',
    ...(typeof b.trackingNumber === 'string' ? { trackingNumber: b.trackingNumber } : {}),
    ...(typeof b.deliveryMemo === 'string' ? { deliveryMemo: b.deliveryMemo } : {}),
    ...(expiresAt !== undefined ? { expiresAt } : {}),
  };
}

/** body.items에서 productId 후보만 뽑는다(형식 검증은 validate가 다시 하므로 여기선 대충 걸러도 된다). */
function extractProductIds(body: unknown): string[] {
  if (!body || typeof body !== 'object') return [];
  const items = (body as Record<string, unknown>).items;
  if (!Array.isArray(items)) return [];
  const ids = new Set<string>();
  for (const raw of items) {
    if (raw && typeof raw === 'object' && typeof (raw as Record<string, unknown>).productId === 'string') {
      ids.add((raw as Record<string, unknown>).productId as string);
    }
  }
  return Array.from(ids);
}

function extractPointsToUse(body: unknown): number {
  if (!body || typeof body !== 'object') return 0;
  const value = (body as Record<string, unknown>).pointsToUse;
  if (value === undefined || value === null) return 0;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > MAX_POINTS_TO_USE) {
    return Number.NaN;
  }
  return value;
}

/**
 * POST /api/orders — 주문 생성(공개, 게스트 결제 허용).
 * 세션이 있으면 member_id를 서버가 부여하고, 없으면 게스트(null). id/createdAt/member_id 및
 * 결제·주문·배송 상태와 금액(totalPrice/deliveryFee)은 본문을 신뢰하지 않고 서버가 정한다(mass-assignment·결제 위조 차단).
 * 생성→차감 순서. 차감 실패 시 방금 만든 주문을 삭제(보상)해 유령 주문을 남기지 않는다.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  // MAX_ITEMS 상한을 DB 조회 전에 적용 — 거대 페이로드가 .in() 조회로 새지 않게 한다.
  const productIds = extractProductIds(body).slice(0, MAX_ITEMS);
  const productList = await listProductsByIds(productIds);
  const productMap = new Map(productList.map((product) => [product.id, product]));

  const validated = validate(body, productMap);
  if (!validated) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const session = await auth();
    const memberId = session?.user?.memberId ?? null;
    const pointsToUse = extractPointsToUse(body);
    if (!Number.isInteger(pointsToUse)) {
      return NextResponse.json({ error: 'invalid-points' }, { status: 400 });
    }
    if (pointsToUse > validated.totalPrice + validated.deliveryFee) {
      return NextResponse.json({ error: 'points-exceed-order-total' }, { status: 400 });
    }

    const order = await createOrderWithReservation(validated, memberId, pointsToUse);

    // order는 방금 만든 본인/게스트 주문이므로 member_id 동봉이 타인 PII 노출이 아니다.
    // 클라이언트는 Order 필드만 사용하고 나머지는 무시한다.
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof PointsIneligibleError) {
      return NextResponse.json({ error: 'points-ineligible' }, { status: 403 });
    }
    if (error instanceof InsufficientPointsError) {
      return NextResponse.json({ error: 'insufficient-points' }, { status: 409 });
    }
    if (error instanceof PointsExceedOrderTotalError) {
      return NextResponse.json({ error: 'points-exceed-order-total' }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('INSUFFICIENT_STOCK')) {
      return NextResponse.json({ error: 'out-of-stock' }, { status: 409 });
    }
    logServerError('[POST /api/orders] 주문 생성 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
