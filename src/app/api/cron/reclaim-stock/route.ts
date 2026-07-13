import { NextResponse, type NextRequest } from 'next/server';
import { listExpiredPendingOrders, recordReclaimAttempt, markReclaimDead } from '@/lib/orders/repo';
import { cancelPendingOrderIfUnpaid } from '@/lib/payments/cancelPending';
import { logServerError } from '@/lib/logServerError';

// recordReclaimAttempt 임계치 — reconcile-confirming cron(U6)과 동일 상수(dead-letter 판정 기준).
const MAX_RECLAIM_ATTEMPTS = 5;
// 취소 전 토스 조회 타임아웃 — cron이라 여유는 있지만 배치 전체(최대 100건)가 한 건의 느린
// 조회에 막히지 않도록 상한을 둔다.
const RECLAIM_TOSS_TIMEOUT_MS = 5_000;

/**
 * GET /api/cron/reclaim-stock — Vercel Cron 전용(5분 주기). 만료된 카드결제 선점(PENDING)
 * 주문을 찾아 취소+재고복원한다. 개별 주문 실패가 배치 전체를 막지 않도록 주문별 try/catch로
 * 격리한다. 이 cron은 '결제대기' 만료건만 대상 — '승인중' 고아는 reconcile-confirming(U6) 담당.
 *
 * ★취소 여부 판단은 전부 `cancelPendingOrderIfUnpaid`(src/lib/payments/cancelPending.ts,
 * R4 최종 라운드)로 위임한다 — `/api/payments/cancel` 라우트와 동일한 함수를 공유해 취소
 * 정책이 두 벌로 갈라지지 않게 한다(Codex 최종 재검증 CRITICAL-2). 그 함수가 취소 전 토스에
 * 실제로 결제됐는지 먼저 묻고, DONE/과도기/종결 상태에 따라 취소·확정·보류를 가른다(화이트리스트
 * 규칙은 CRITICAL-1 — cancelPending.ts의 CANCELLABLE_TOSS_STATUSES 참고).
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
  let converged = 0;
  let failed = 0;
  let dead = 0;
  const deadOrderIds: string[] = [];

  /** 재시도 실패 기록(0027 rpc — 원자 증가) + 임계치 초과 시 dead-letter 표시. reconcile-confirming
   *  cron(U6)의 동일 헬퍼와 대칭 — "이번 회차에 판단을 못 내렸다/취소를 못 했다"는 뜻이라
   *  failed 카운터에도 반영한다. */
  async function recordFailureAndMaybeDead(orderId: string, message: string) {
    failed += 1;
    try {
      const attempts = await recordReclaimAttempt(orderId, message);
      if (attempts >= MAX_RECLAIM_ATTEMPTS) {
        await markReclaimDead(orderId);
        logServerError(
          `[GET /api/cron/reclaim-stock] dead-letter 처리 orderId=${orderId} attempts=${attempts}`,
          {},
        );
        dead += 1;
        deadOrderIds.push(orderId);
      }
    } catch (recordError) {
      logServerError(`[GET /api/cron/reclaim-stock] 재시도 기록 실패 orderId=${orderId}`, recordError);
    }
  }

  for (const order of expired) {
    try {
      const outcome = await cancelPendingOrderIfUnpaid(order, 'reclaim-cron', RECLAIM_TOSS_TIMEOUT_MS);

      switch (outcome.kind) {
        case 'canceled':
          reclaimed += 1;
          break;

        case 'already-settled':
          // 취소할 것도 확정할 것도 없음 — 이미 다른 경로가 처리했다. no-op.
          break;

        case 'confirmed':
          if (outcome.result.status === 200) {
            converged += 1;
          } else {
            // claim 경합 패자 등 이번 회차엔 못 끝난 경우 — cancelPendingOrderIfUnpaid 내부에서
            // 이미 안전하게 처리했다(취소 없음). 다음 cron 회차 또는 webhook/reconcile-confirming이
            // 마저 수렴시킨다. 실패로 카운트하지 않는다(취소가 필요한 상황이 아니므로).
            logServerError(
              `[GET /api/cron/reclaim-stock] DONE 확인됐지만 이번 회차엔 확정 못함(경합 추정) orderId=${order.id} resultStatus=${outcome.result.status}`,
              {},
            );
          }
          break;

        case 'financial-exception':
          // markReclaimDead는 cancelPendingOrderIfUnpaid가 로그만 남기고 직접 호출하지 않는다 —
          // 재시도 임계치를 거쳐 사람이 보게 한다(즉시 dead-letter로 알림 폭주를 막기 위함).
          await recordFailureAndMaybeDead(order.id, 'financial-exception-amount-mismatch-done');
          break;

        case 'pending':
          // 과도기 상태이거나 조회 불명 — 다음 회차에 재조회한다.
          await recordFailureAndMaybeDead(order.id, 'pending-or-unclear');
          break;

        default: {
          const exhaustiveCheck: never = outcome;
          throw new Error(`[GET /api/cron/reclaim-stock] 처리되지 않은 outcome: ${JSON.stringify(exhaustiveCheck)}`);
        }
      }
    } catch (error) {
      // 예상 밖 예외(RPC/DB 오류 등) — 안전한 쪽으로: 취소하지 않고 기록만 남긴다.
      logServerError(`[GET /api/cron/reclaim-stock] 주문 ${order.id} 처리 중 예상 밖 오류`, error);
      const message = error instanceof Error ? error.message : String(error);
      await recordFailureAndMaybeDead(order.id, `unexpected:${message}`);
    }
  }

  return NextResponse.json({ checked: expired.length, reclaimed, converged, failed, dead, deadOrderIds });
}
