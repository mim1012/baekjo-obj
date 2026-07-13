import { NextResponse, type NextRequest } from 'next/server';
import { confirmPayment, MAX_PAYMENT_KEY, MAX_ORDER_ID, type ConfirmPaymentResult } from '@/lib/payments/confirmPayment';

interface ConfirmBody {
  paymentKey: string;
  orderId: string;
  amount: number;
}

function validate(body: unknown): ConfirmBody | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.paymentKey !== 'string' || b.paymentKey.length < 1 || b.paymentKey.length > MAX_PAYMENT_KEY)
    return null;
  if (typeof b.orderId !== 'string' || b.orderId.length < 1 || b.orderId.length > MAX_ORDER_ID) return null;
  if (typeof b.amount !== 'number' || !Number.isInteger(b.amount) || b.amount <= 0) return null;
  return { paymentKey: b.paymentKey, orderId: b.orderId, amount: b.amount };
}

function toResponse(result: ConfirmPaymentResult): NextResponse {
  if (result.status === 200) {
    return NextResponse.json({ order: result.order }, { status: 200 });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}

/**
 * POST /api/payments/confirm — 클라이언트가 결제 상태를 수동/자동 재확인할 때 쓰는 승인 게이트.
 * 승인 코어는 @/lib/payments/confirmPayment 로 추출됨(R4) — GET /api/payments/return(토스
 * successUrl)도 같은 코어를 공유한다. 이 라우트는 HTTP 입출력(JSON body ↔ 상태코드)만 담당한다.
 */
export async function POST(request: NextRequest) {
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

  const result = await confirmPayment(validated);
  return toResponse(result);
}
