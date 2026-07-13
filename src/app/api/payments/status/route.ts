import { NextResponse, type NextRequest } from 'next/server';
import { getOrderById } from '@/lib/orders/repo';
import { logServerError } from '@/lib/logServerError';

const MAX_ORDER_ID = 100;

/**
 * GET /api/payments/status?orderId=... — 읽기 전용 상태 조회(R4 라운드2, Codex HIGH#4).
 * order-complete의 pending/unconfirmed 화면이 폴링하는 용도다 — claim·confirm·취소 등
 * **어떤 변이도 하지 않는다**(getOrderById 외 다른 repo 호출 없음). DB를 있는 그대로
 * 읽어 보여줄 뿐이고, 승인 판정의 유일한 권위는 여전히 confirmPayment/webhook/reconcile
 * 이다 — 이 라우트는 그 결과가 반영되길 기다렸다가 읽기만 한다(클라이언트 오케스트레이션
 * 복귀가 아니다).
 * 무인증(orderId capability) — 기존 POST /api/payments/confirm과 동일한 노출 모델
 * (PII 없음, orderId를 아는 사람만 조회 가능. orderId는 추측 곤란한 값이라는 전제는
 * 기존 confirm/cancel 라우트와 동일).
 */
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('orderId');
  if (!orderId || orderId.length < 1 || orderId.length > MAX_ORDER_ID) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'order-not-found' }, { status: 404 });
    }
    return NextResponse.json(
      { paymentStatus: order.paymentStatus, orderStatus: order.orderStatus },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    logServerError('[GET /api/payments/status] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
