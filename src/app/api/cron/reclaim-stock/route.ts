import { NextResponse, type NextRequest } from 'next/server';
import { listExpiredPendingOrders, cancelReservationAndRestore } from '@/lib/orders/repo';
import { logServerError } from '@/lib/logServerError';

/**
 * GET /api/cron/reclaim-stock — Vercel Cron 전용(5분 주기). 만료된 카드결제 선점(PENDING)
 * 주문을 찾아 취소+재고복원(0024 원자 RPC)한다. 개별 주문 실패가 배치 전체를 막지 않도록
 * 주문별 try/catch로 격리한다. cancelReservationAndRestore는 confirm/cancel 라우트와 동시에
 * 같은 주문을 집어도 트랜잭션 하나만 커밋되므로 이중 복원은 구조적으로 불가능하다.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
  for (const order of expired) {
    try {
      const didReclaim = await cancelReservationAndRestore(order.id);
      if (didReclaim) {
        reclaimed += 1;
      }
    } catch (error) {
      failed += 1;
      logServerError(`[GET /api/cron/reclaim-stock] 주문 ${order.id} 복원 실패`, error);
    }
  }

  return NextResponse.json({ checked: expired.length, reclaimed, failed });
}
