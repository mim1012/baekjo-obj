import { NextResponse, type NextRequest } from 'next/server';
import { getOrderById } from '@/lib/orders/repo';
import { logServerError } from '@/lib/logServerError';

const MAX_ORDER_ID = 100;

// 베스트에포트 레이트리밋(webhook U5와 동일 패턴 재사용) — 같은 orderId로 60초 내 10회 초과
// 요청은 DB 조회 없이 429로 거절한다. 무인증 GET(orderId capability)이라 대량 조회로 orderId를
// 스캔하거나 폴링을 남용하는 걸 막는다(Codex 재검증 MEDIUM-4). order-complete의 정상 폴링은
// 3초 간격 최대 10회(=30초, PendingIssueBlock)라 이 한도 안에 있다 — 정상 사용은 안 막힌다.
// 인스턴스(서버리스 함수 컨테이너) 로컬 메모리라 여러 컨테이너에 분산되면 우회될 수 있는 한계가
// 있다(전역 보장 아님) — 운영 레벨의 원천 차단은 Vercel WAF/방화벽 룰로 별도 구성할 것.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_HITS = 10;
const rateLimitHits = new Map<string, { count: number; windowStart: number }>();

/** true면 이번 요청을 처리해도 됨(한도 이내), false면 한도 초과. */
function checkRateLimit(orderId: string): boolean {
  const now = Date.now();
  const entry = rateLimitHits.get(orderId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitHits.set(orderId, { count: 1, windowStart: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT_MAX_HITS;
}

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

  if (!checkRateLimit(orderId)) {
    return NextResponse.json({ error: 'rate-limited' }, { status: 429 });
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
