import { NextResponse, type NextRequest } from 'next/server';
import {
  listOrphanedConfirmingOrders,
  cancelConfirmingAndRestore,
  recordReclaimAttempt,
  markReclaimDead,
} from '@/lib/orders/repo';
import { queryTossPayment, TossConfirmError } from '@/lib/payments/toss';
import { decidePaymentAction } from '@/lib/payments/decide';
import { applyPaymentAction } from '@/lib/payments/execute';
import { logServerError } from '@/lib/logServerError';

// recordReclaimAttempt 임계치 — reclaim-stock cron(U7)과 동일 상수(dead-letter 판정 기준).
const MAX_RECLAIM_ATTEMPTS = 5;

/**
 * GET /api/cron/reconcile-confirming — Vercel Cron 전용(5분 주기, reclaim-stock과 동일한
 * fail-closed Bearer CRON_SECRET 패턴). '승인중'으로 claim된 뒤 토스 응답을 못 받고 만료된
 * 고아 주문을 순회해 토스 결제 조회 API(권위 소스)로 실제 상태를 재확인해 정산한다.
 * cancel/cron(reclaim-stock)/0024는 '승인중'을 절대 못 건드리므로, 이 경로가 유일한
 * 회수 창구다(상태기계 불변식). 주문별 try/catch로 격리해 한 건의 실패가 배치를 막지 않는다.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    logServerError(
      '[GET /api/cron/reconcile-confirming] CRON_SECRET 미설정',
      new Error('CRON_SECRET missing'),
    );
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let orphaned;
  try {
    orphaned = await listOrphanedConfirmingOrders();
  } catch (error) {
    logServerError('[GET /api/cron/reconcile-confirming] 고아 주문 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }

  let confirmed = 0;
  let restored = 0;
  let skipped = 0;
  let dead = 0;
  const deadOrderIds: string[] = [];

  /** 재시도 실패 기록(0027 rpc — 원자 증가) + 임계치 초과 시 dead-letter 표시. RPC가 갱신 후의
   *  실제 카운트를 반환하므로 겹친 cron 실행 사이의 lost update 없이 정확히 판정할 수 있다. */
  async function recordFailureAndMaybeDead(orderId: string, message: string) {
    try {
      const attempts = await recordReclaimAttempt(orderId, message);
      if (attempts >= MAX_RECLAIM_ATTEMPTS) {
        await markReclaimDead(orderId);
        logServerError(
          `[GET /api/cron/reconcile-confirming] dead-letter 처리 orderId=${orderId} attempts=${attempts}`,
          {},
        );
        dead += 1;
        deadOrderIds.push(orderId);
      }
    } catch (recordError) {
      logServerError(`[GET /api/cron/reconcile-confirming] 재시도 기록 실패 orderId=${orderId}`, recordError);
    }
  }

  for (const order of orphaned) {
    if (!order.paymentKey) {
      // claim이 반드시 payment_key를 기록하므로 이론상 불가능 — 그래도 방어적으로 재시도
      // 기록에 합류시킨다(그냥 skip만 하면 이 주문은 dead-letter 경로에 절대 못 들어가
      // 무한히 조용히 조회만 반복되는 루프가 생긴다).
      logServerError(
        `[GET /api/cron/reconcile-confirming] 승인중 주문에 payment_key 없음 orderId=${order.id}`,
        {},
      );
      await recordFailureAndMaybeDead(order.id, 'missing-payment-key');
      skipped += 1;
      continue;
    }

    try {
      const tossResult = await queryTossPayment(order.paymentKey);
      const expectedAmount = order.totalPrice + order.deliveryFee;

      // 신원 바인딩 — 조회 결과를 쓰기 전에 orderId·paymentKey가 물어본 대상과 일치하는지 확인.
      // 하나라도 어긋나면 DONE이든 CANCELED든 신뢰할 수 없으므로 확정도 취소도 하지 않는다.
      const identityMatches = tossResult.orderId === order.id && tossResult.paymentKey === order.paymentKey;
      if (!identityMatches) {
        logServerError(
          `[GET /api/cron/reconcile-confirming] 토스 응답 신원 불일치 orderId=${order.id} paymentKey=${order.paymentKey} ` +
            `tossOrderId=${tossResult.orderId} tossPaymentKey=${tossResult.paymentKey} tossStatus=${tossResult.status}`,
          {},
        );
        await recordFailureAndMaybeDead(order.id, `identity-mismatch:tossOrderId=${tossResult.orderId}`);
        skipped += 1;
        continue;
      }

      const action = decidePaymentAction(
        order,
        { kind: 'authoritative', payment: { paymentKey: tossResult.paymentKey, status: tossResult.status, amountMatches: tossResult.totalAmount === expectedAmount } },
        tossResult.paymentKey,
        'reconcile',
      );

      if (action.kind === 'confirm') {
        const result = await applyPaymentAction(action, order.id, order.paymentKey);
        if (result.applied === 'confirm' && result.affected > 0) {
          confirmed += 1;
        } else if (result.applied === 'confirm') {
          // 안전한 쪽 통일 — setOrderPaid 0행을 조용히 넘기지 않고 로그+카운터(webhook과 대칭).
          logServerError(
            `[GET /api/cron/reconcile-confirming] setOrderPaid 0행(경합으로 이미 처리됐거나 WHERE 불일치) orderId=${order.id} paymentKey=${order.paymentKey}`,
            {},
          );
          skipped += 1;
        }
        continue;
      }

      if (action.kind === 'restoreConfirming') {
        const result = await applyPaymentAction(action, order.id);
        if (result.applied === 'restore' && result.restored) restored += 1;
        continue;
      }

      // settled/ignore/retryLater — 승인중 주문만 순회하므로(listOrphanedConfirmingOrders) 정상
      // 흐름이면 도달하지 않는다. 방어적으로 불명 취급.
      logServerError(
        `[GET /api/cron/reconcile-confirming] 승인중 주문 재조회 결과 불명 orderId=${order.id} ` +
          `tossStatus=${tossResult.status} tossAmount=${tossResult.totalAmount} expected=${expectedAmount}`,
        {},
      );
      await recordFailureAndMaybeDead(order.id, `unexpected-status:${tossResult.status}`);
      skipped += 1;
    } catch (error) {
      if (error instanceof TossConfirmError && error.httpStatus === 404) {
        // 토스에 결제 기록 자체가 없음 — 결제가 일어나지 않은 것으로 간주해 복원.
        // ★decide.ts 네 관찰 종류 중 어디에도 안 맞는다 — reconcile 자기 신뢰값(order.paymentKey)
        // 으로 물어 얻은 명확한 부재 신호라 unknown이 아니다. webhook은 신뢰 못 할 페이로드의
        // 같은 404에서 절대 복원하지 않는 것과 대칭적으로 다르다(의도된 차이).
        try {
          const didRestore = await cancelConfirmingAndRestore(order.id, order.paymentKey);
          if (didRestore) restored += 1;
        } catch (restoreError) {
          logServerError(`[GET /api/cron/reconcile-confirming] 404 복원 실패 orderId=${order.id}`, restoreError);
          skipped += 1;
        }
        continue;
      }

      // 불명(네트워크·타임아웃·5xx) — 절대 취소하지 않는다(불변식). 재시도 기록만 남기고 다음 회차로.
      logServerError(`[GET /api/cron/reconcile-confirming] 주문 ${order.id} 재조회 실패(불명)`, error);
      const message = error instanceof Error ? error.message : String(error);
      await recordFailureAndMaybeDead(order.id, message);
      skipped += 1;
    }
  }

  return NextResponse.json({ checked: orphaned.length, confirmed, restored, skipped, dead, deadOrderIds });
}
