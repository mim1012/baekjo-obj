import { NextResponse, type NextRequest } from 'next/server';
import { getOrderById } from '@/lib/orders/repo';
import { logServerError } from '@/lib/logServerError';

const MAX_ORDER_ID = 100;

// 베스트에포트 레이트리밋(webhook U5와 동일 패턴 재사용) — 같은 orderId로 60초 내 한도 초과
// 요청은 DB 조회 없이 429로 거절한다. 무인증 GET(orderId capability)이라 대량 조회로 orderId를
// 스캔하거나 폴링을 남용하는 걸 막는다(Codex 재검증 MEDIUM-4). 인스턴스(서버리스 함수 컨테이너)
// 로컬 메모리라 여러 컨테이너에 분산되면 우회될 수 있는 한계가 있다(전역 보장 아님) — 운영
// 레벨의 원천 차단은 Vercel WAF/방화벽 룰로 별도 구성할 것.
// ★한도를 10이 아니라 30으로 잡는다(opus 최종 재검증 LOW) — order-complete의 정상 폴링
// (PendingIssueBlock)이 정확히 "3초×10회"라, 10으로 두면 첫 폴링 사이클만으로 60초 윈도우를
// 다 써버려 그 안에 사용자가 "다시 확인"을 누르거나 새로고침하면 전부 429가 났다. 정상 폴링
// 10회 + 재확인·새로고침 여유를 남겨 스캔 방어 목적은 유지하면서 정상 사용자를 막지 않는다.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_HITS = 30;
const rateLimitHits = new Map<string, { count: number; windowStart: number }>();

// 만료 엔트리 정리(prune) — 이 Map은 컨테이너가 살아있는 동안 계속 쌓인다. 윈도우가 지난
// orderId 엔트리를 안 지우면 서로 다른 orderId가 계속 유입될 때(정상 트래픽) 무한정 증가한다
// (Codex 최종 재검증 MEDIUM). 매 호출마다 훑으면 낭비이므로 호출 N회마다 한 번만 스윕한다.
const RATE_LIMIT_PRUNE_INTERVAL_HITS = 200;
let hitsSincePrune = 0;

function pruneExpiredRateLimitEntries(now: number): void {
  for (const [key, entry] of rateLimitHits) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitHits.delete(key);
    }
  }
}

/** true면 이번 요청을 처리해도 됨(한도 이내), false면 한도 초과. */
function checkRateLimit(orderId: string): boolean {
  const now = Date.now();

  hitsSincePrune += 1;
  if (hitsSincePrune >= RATE_LIMIT_PRUNE_INTERVAL_HITS) {
    hitsSincePrune = 0;
    pruneExpiredRateLimitEntries(now);
  }

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
