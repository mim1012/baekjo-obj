import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import {
  insertOrder,
  deleteOrderById,
  decrementStockForOrder,
  type InsertOrderInput,
} from '@/lib/orders/repo';
import { listProductsByIds } from '@/lib/products/repo';
import { logServerError } from '@/lib/logServerError';
import { resolveOrderItem, type OrderItemShape } from '@/lib/orders/resolveOrderItem';
import { reservationExpiryIso, BANK_TRANSFER_METHOD } from '@/lib/orders/reservationExpiry';
import { resolveBankTransferTtlMs } from '@/lib/orderPolicy/repo';
import { checkOrderRateLimit, orderRateLimitKey } from '@/lib/orders/rateLimit';
import type { OrderItem, Product } from '@/types';

// 거대 페이로드 방어(공개·게스트 허용 엔드포인트라 상한이 필수 — App Router 는 기본 본문 크기 제한이 없다).
const MAX_ITEMS = 100;
const MAX_QUANTITY = 999;
const MAX_NAME = 100;
const MAX_PHONE = 40;
const MAX_ADDRESS = 500;
const MAX_PAYMENT_METHOD = 40;
const MAX_PRODUCT_ID = 100;
const MAX_OPTION_ID = 100;
const MAX_TRACKING = 100;
const MAX_MEMO = 1000;

// 배송비 정책은 프론트 checkout(page.tsx)과 동일해야 저장 총액이 어긋나지 않는다(§4 drift 방지).
const FREE_SHIPPING_THRESHOLD = 50000;
const SHIPPING_FEE = 3000;

function isStr(v: unknown, min: number, max: number): v is string {
  return typeof v === 'string' && v.length >= min && v.length <= max;
}

/**
 * 요청 본문에서 안전하게 다룰 필드만 뽑는다. id/createdAt/memberId·price·optionName 등은 무시한다
 * (mass-assignment·가격 위조·옵션명 위장 차단). optionName은 서버가 optionId로 카탈로그에서 파생하므로
 * 클라이언트 값을 아예 읽지 않는다(resolveOrderItem 참고).
 */
function validateItemShape(raw: unknown): OrderItemShape | null {
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
  if (item.optionId !== undefined && !isStr(item.optionId, 1, MAX_OPTION_ID)) return null;
  return {
    productId: item.productId,
    quantity: item.quantity,
    ...(typeof item.optionId === 'string' ? { optionId: item.optionId } : {}),
  };
}

/**
 * 신뢰 가능한 입력 필드만 검증해서 뽑고, 신뢰 민감 필드는 본문을 신뢰하지 않고 서버가 결정한다.
 * - orderStatus/paymentStatus/deliveryStatus: 서버 고정(결제완료·배송완료 위조 차단).
 * - productName/optionName/price: 클라이언트 값은 무시하고 productMap(호출부가 DB에서 미리 조회)의
 *   실제 카탈로그 값에서 파생한다(상품명·옵션명 위장·가격 조작 차단 — resolveOrderItem). DB에 없는
 *   (비노출 포함) productId·가격 미확정 상품, 또는 카탈로그에 없는 optionId가 하나라도 섞이면
 *   주문 전체를 400으로 거부한다.
 * - totalPrice/deliveryFee: 조회 가격 × 수량으로 재계산(0원 위조 차단). 본문 값은 무시한다.
 */
function validate(
  body: unknown,
  productMap: Map<string, Product>,
  bankTransferTtlMs: number | null,
): InsertOrderInput | null {
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
    const resolved = resolveOrderItem(shape, product);
    if (!resolved.ok) return null;
    items.push(resolved.item);
  }

  const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const deliveryFee = subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_FEE : 0;
  // 실제 '결제완료' 승격은 결제 게이트/웹훅에서만. 생성 시엔 대기 상태로 고정한다.
  const isBankTransfer = b.paymentMethod === BANK_TRANSFER_METHOD;
  const paymentStatus = isBankTransfer ? '입금대기' : '결제대기';
  // 카드는 항상 10분 만료(결제 승인 재고 회수 안전망 — 불변). 무통장 자동취소는 기본 **미사용**
  // (2026-07-18 결정) — 이때 reservationExpiryIso 가 null 을 돌려주고 expiresAt 을 아예 기록하지
  // 않아 reclaim-stock cron 스캔에서 제외된다(입금 확인 전까지 입금대기 유지). 관리자가
  // /admin/order-policy 에서 자동취소를 켠 경우에만 설정 TTL 로 만료를 부여한다.
  // 무통장 TTL 은 async 핸들러가 resolveBankTransferTtlMs 로 미리 해석해 주입한다(이 함수는 순수 유지).
  const expiresAt = reservationExpiryIso(b.paymentMethod, Date.now(), bankTransferTtlMs);

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
    ...(expiresAt ? { expiresAt } : {}),
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

  // 공개(게스트) 엔드포인트라 남용 완화용 레이트리밋을 DB 조회 전에 적용한다 — 익명 루프가
  // 재고 차감을 반복해 재고를 고갈시키는 걸 늦춘다(정밀 제한 아님, rateLimit.ts 주석 참고).
  // phone 은 폴백 키로만 쓰므로 여기선 형식 검증 없이 문자열 여부만 본다(정식 검증은 validate).
  const phoneForKey =
    body && typeof body === 'object' && typeof (body as Record<string, unknown>).phone === 'string'
      ? ((body as Record<string, unknown>).phone as string)
      : undefined;
  if (!checkOrderRateLimit(orderRateLimitKey(request, phoneForKey))) {
    return NextResponse.json({ error: 'rate-limited' }, { status: 429 });
  }

  // MAX_ITEMS 상한을 DB 조회 전에 적용 — 거대 페이로드가 .in() 조회로 새지 않게 한다.
  const productIds = extractProductIds(body).slice(0, MAX_ITEMS);
  const productList = await listProductsByIds(productIds);
  const productMap = new Map(productList.map((product) => [product.id, product]));

  // 무통장 TTL(관리자 설정 — 자동취소 미사용이면 null=만료 없음, 기본 미사용) — 조회 실패 시에도
  // repo 가 기본값(비활성=null)으로 폴백하므로 정책 테이블 장애가 주문 생성 실패로 번지지 않는다.
  // 카드 주문(대다수 트래픽)과 무관한 요청이 정책 테이블 조회를 유발하지 않도록 무통장 주장이
  // 있을 때만 읽는다(공개 엔드포인트). 카드 경로는 이 값을 무시한다(reservationExpiryIso).
  const claimsBankTransfer =
    body && typeof body === 'object' &&
    (body as Record<string, unknown>).paymentMethod === BANK_TRANSFER_METHOD;
  const bankTransferTtlMs = claimsBankTransfer ? await resolveBankTransferTtlMs() : null;

  const validated = validate(body, productMap, bankTransferTtlMs);
  if (!validated) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const session = await auth();
    const memberId = session?.user?.memberId ?? null;
    const order = await insertOrder(validated, memberId);

    try {
      await decrementStockForOrder(
        validated.items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
      );
    } catch (stockError) {
      await deleteOrderById(order.id).catch((cleanupError) => {
        logServerError('[POST /api/orders] 재고 차감 실패 후 주문 보상 삭제 실패', cleanupError);
      });
      const message = stockError instanceof Error ? stockError.message : String(stockError);
      if (message.includes('INSUFFICIENT_STOCK')) {
        return NextResponse.json({ error: 'out-of-stock' }, { status: 409 });
      }
      logServerError('[POST /api/orders] 재고 차감 실패', stockError);
      return NextResponse.json({ error: 'server-error' }, { status: 500 });
    }

    // order는 방금 만든 본인/게스트 주문이므로 member_id 동봉이 타인 PII 노출이 아니다.
    // 클라이언트는 Order 필드만 사용하고 나머지는 무시한다.
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    logServerError('[POST /api/orders] 주문 생성 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
