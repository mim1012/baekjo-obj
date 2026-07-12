import { NextResponse, type NextRequest } from 'next/server';
import {
  listExpiredPendingOrders,
  cancelReservationAndRestore,
  recordReclaimAttempt,
  markReclaimDead,
} from '@/lib/orders/repo';
import { logServerError } from '@/lib/logServerError';

// recordReclaimAttempt 임계치 — reconcile-confirming cron(U6)과 동일 상수(dead-letter 판정 기준).
const MAX_RECLAIM_ATTEMPTS = 5;

/**
 * GET /api/cron/reclaim-stock — Vercel Cron 전용(5분 주기). 만료된 카드결제 선점(PENDING)
 * 주문을 찾아 취소+재고복원(0024 원자 RPC)한다. 개별 주문 실패가 배치 전체를 막지 않도록
 * 주문별 try/catch로 격리한다. cancelReservationAndRestore는 confirm/cancel 라우트와 동시에
 * 같은 주문을 집어도 트랜잭션 하나만 커밋되므로 이중 복원은 구조적으로 불가능하다.
 * 이 cron은 '결제대기' 만료건만 대상 — '승인중' 고아는 reconcile-confirming(U6) 담당이다.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // 미설정을 401(정상 거부)로 흡수하면 "Bearer undefined"가 통과 문자열이 돼 인증 우회로 이어진다.
    // 조용히 막지 않고 500으로 시끄럽게 실패시켜 운영자가 크론 대시보드에서 바로 알아채게 한다.
    logServerError('[GET /api/cron/reclaim-stock] CRON_SECRET 미설정', new Error('CRON_SECRET missing'));
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let expired;
  try {
    expired = await listExpiredPendingOrders();
  } catch (error) {
    logServerError('[GET /api/cron/reclaim-stock] 만료 주문 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }

  let reclaimed = 0;
  let failed = 0;
  let dead = 0;
  const deadOrderIds: string[] = [];

  for (const order of expired) {
    try {
      const didReclaim = await cancelReservationAndRestore(order.id);
      if (didReclaim) {
        reclaimed += 1;
      }
    } catch (error) {
      failed += 1;
      logServerError(`[GET /api/cron/reclaim-stock] 주문 ${order.id} 복원 실패`, error);

      // 복원 실패 시 재시도 카운트 원자 증가(0027 rpc) — reconcile-confirming(U6)과 동일 패턴.
      // 임계치(5) 초과 시 dead-letter 표시해 다음 회차부터 listExpiredPendingOrders가 제외한다.
      try {
        const message = error instanceof Error ? error.message : String(error);
        const attempts = await recordReclaimAttempt(order.id, message);
        if (attempts >= MAX_RECLAIM_ATTEMPTS) {
          await markReclaimDead(order.id);
          logServerError(
            `[GET /api/cron/reclaim-stock] dead-letter 처리 orderId=${order.id} attempts=${attempts}`,
            {},
          );
          dead += 1;
          deadOrderIds.push(order.id);
        }
      } catch (recordError) {
        logServerError(`[GET /api/cron/reclaim-stock] 재시도 기록 실패 orderId=${order.id}`, recordError);
      }
    }
  }

  return NextResponse.json({ checked: expired.length, reclaimed, failed, dead, deadOrderIds });
}
