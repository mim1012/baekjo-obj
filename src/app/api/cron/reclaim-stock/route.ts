import { NextResponse, type NextRequest } from 'next/server';
import {
  listExpiredPendingOrders,
  cancelReservationAndRestore,
  recordReclaimAttempt,
  markReclaimDead,
  type OrderRecord,
} from '@/lib/orders/repo';
import { queryTossPaymentByOrderId, TossConfirmError } from '@/lib/payments/toss';
import { decidePaymentAction } from '@/lib/payments/decide';
import { applyAuthoritativeAction } from '@/lib/payments/confirmPayment';
import { logServerError } from '@/lib/logServerError';

// recordReclaimAttempt 임계치 — reconcile-confirming cron(U6)과 동일 상수(dead-letter 판정 기준).
const MAX_RECLAIM_ATTEMPTS = 5;
// 취소 전 토스 조회 타임아웃 — cron이라 여유는 있지만 배치 전체(최대 100건)가 한 건의 느린
// 조회에 막히지 않도록 상한을 둔다.
const RECLAIM_TOSS_TIMEOUT_MS = 5_000;

/**
 * GET /api/cron/reclaim-stock — Vercel Cron 전용(5분 주기). 만료된 카드결제 선점(PENDING)
 * 주문을 찾아 취소+재고복원(0024 원자 RPC)한다. 개별 주문 실패가 배치 전체를 막지 않도록
 * 주문별 try/catch로 격리한다. cancelReservationAndRestore는 confirm/cancel 라우트와 동시에
 * 같은 주문을 집어도 트랜잭션 하나만 커밋되므로 이중 복원은 구조적으로 불가능하다.
 * 이 cron은 '결제대기' 만료건만 대상 — '승인중' 고아는 reconcile-confirming(U6) 담당이다.
 *
 * ★R4 최종 라운드(Codex 최종 재검증 최우선) — 취소 전에 토스에 실제로 결제됐는지 먼저 묻는다.
 * 예전엔 묻지 않고 곧장 취소했다: 사용자가 결제를 마쳤는데 브라우저가 죽어 successUrl에
 * 도달 못 하거나, pre-claim 조회·권위 재조회가 둘 다 타임아웃되면 — 돈은 실제로 빠져나갔는데
 * 주문은 여전히 '결제대기'로 남고, reconcile-confirming은 '승인중'만 보므로 이 주문을 구제할
 * 수 없어 이 cron이 10분 뒤 "돈이 빠져나간 주문을 취소"해버렸다(돈 손실). 취소 직전에
 * queryTossPaymentByOrderId로 먼저 확인해 이 경로를 막는다.
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
   *  cron(U6)의 동일 헬퍼와 대칭 — 재고 취소가 아니라 "이번 회차에 판단을 못 내렸다"는 뜻이라
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

  /** 기존 취소 경로(0024) — 무통장입금, 토스 미설정 폴백, "결제 안 됨"이 확인된 카드결제
   *  전부 여기로 모인다. */
  async function reclaimViaCancel(order: OrderRecord) {
    try {
      const didReclaim = await cancelReservationAndRestore(order.id);
      if (didReclaim) reclaimed += 1;
    } catch (error) {
      logServerError(`[GET /api/cron/reclaim-stock] 주문 ${order.id} 복원 실패`, error);
      const message = error instanceof Error ? error.message : String(error);
      await recordFailureAndMaybeDead(order.id, message);
    }
  }

  const tossSecretConfigured = !!process.env.TOSS_SECRET_KEY;
  if (!tossSecretConfigured) {
    // 계약 전(시크릿 미설정) — 취소 전 조회 자체가 불가능하다. 조회를 건너뛰고 기존 동작(취소)
    // 으로 폴백하되(재고를 영구히 묶는 것보다 안전한 방향을 택함) 배치당 한 번만 시끄럽게 남긴다
    // (주문마다 반복 로그를 남기면 신호가 파묻힌다).
    logServerError(
      '[GET /api/cron/reclaim-stock] TOSS_SECRET_KEY 미설정 — 취소 전 조회를 건너뛰고 기존 동작(취소)으로 폴백',
      {},
    );
  }

  for (const order of expired) {
    try {
      // 무통장입금은 토스와 무관 — 조회할 대상 자체가 없으므로 기존대로 즉시 취소.
      if (order.paymentMethod === '무통장입금' || !tossSecretConfigured) {
        await reclaimViaCancel(order);
        continue;
      }

      let observation;
      try {
        observation = await queryTossPaymentByOrderId(order.id, RECLAIM_TOSS_TIMEOUT_MS);
      } catch (queryError) {
        if (queryError instanceof TossConfirmError && queryError.httpStatus === 404) {
          // 토스에 이 orderId로 결제 기록 자체가 없음 — 정상 만료. 기존대로 취소한다.
          await reclaimViaCancel(order);
          continue;
        }
        // 조회 불명(네트워크·타임아웃·5xx·스키마 불량) — ★취소 금지. 돈이 이미 빠져나갔을
        // 가능성을 배제할 수 없으므로 이번 회차는 skip하고 재시도 기록만 남긴다.
        const message = queryError instanceof Error ? queryError.message : String(queryError);
        logServerError(`[GET /api/cron/reclaim-stock] 취소 전 토스 조회 실패(불명) orderId=${order.id}`, queryError);
        await recordFailureAndMaybeDead(order.id, `pre-cancel-query-unclear:${message}`);
        continue;
      }

      const expectedAmount = order.totalPrice + order.deliveryFee;
      const identityMatches = observation.orderId === order.id;
      if (!identityMatches) {
        // 신원 불일치(극히 드묾) — 신뢰할 수 없으므로 취소도 확정도 하지 않는다.
        logServerError(
          `[GET /api/cron/reclaim-stock] 토스 응답 신원 불일치 orderId=${order.id} tossOrderId=${observation.orderId}`,
          {},
        );
        await recordFailureAndMaybeDead(order.id, `identity-mismatch:tossOrderId=${observation.orderId}`);
        continue;
      }

      if (observation.status === 'DONE' && observation.totalAmount !== expectedAmount) {
        // ★재무 예외 — 실제로 DONE인데 금액이 우리 계산과 다르다. 취소도 확정도 하지 않고
        // 사람이 봐야 한다(자동으로 어느 쪽이든 결정하면 돈 문제를 은폐할 위험이 있다).
        logServerError(
          `[GET /api/cron/reclaim-stock] ★재무 예외 — DONE인데 금액 불일치 orderId=${order.id} ` +
            `tossAmount=${observation.totalAmount} expected=${expectedAmount}`,
          {},
        );
        await recordFailureAndMaybeDead(order.id, `amount-mismatch-done:toss=${observation.totalAmount},expected=${expectedAmount}`);
        continue;
      }

      if (observation.status === 'DONE') {
        // 돈이 이미 빠져나간 결제 — ★취소 절대 금지. claim-먼저 규칙(HIGH-1)으로 정식 확정한다.
        // decide.ts는 이 시점 order.paymentStatus==='결제대기'에서 DONE+금액일치를 항상 'confirm'
        // 으로 판정하므로 그대로 재사용한다(정책 복제 0 — 새 취소/확정 로직을 만들지 않는다).
        const action = decidePaymentAction(
          order,
          { kind: 'authoritative', payment: { paymentKey: observation.paymentKey, status: observation.status, amountMatches: true } },
          observation.paymentKey,
          'reconcile',
        );
        const result = await applyAuthoritativeAction(action, order, order.id, observation.paymentKey, false, true);
        if (result.status === 200) {
          converged += 1;
        } else {
          // claim 경합 패자 등 이번 회차에 못 끝난 경우 — applyAuthoritativeAction이 내부적으로
          // 이미 안전하게 처리했다(취소 없음). 다음 cron 회차 또는 webhook/reconcile-confirming이
          // 마저 수렴시킨다. 여기서는 실패로 카운트하지 않는다(취소가 필요한 게 아니므로).
          logServerError(
            `[GET /api/cron/reclaim-stock] DONE 확인됐지만 이번 회차엔 확정 못함(경합 추정) orderId=${order.id} resultStatus=${result.status}`,
            {},
          );
        }
        continue;
      }

      // DONE이 아닌 그 외 모든 명시적 상태(CANCELED/EXPIRED/ABORTED/WAITING_FOR_DEPOSIT 등) —
      // 실제 결제가 완료되지 않았다는 뜻이므로 기존대로 취소·재고복원한다.
      // ★decide.ts의 "결제대기 주문은 절대 취소하지 않는다" 불변식을 여기서는 적용하지 않는다
      // (의도적 예외 — 정책 복제 아님). 그 불변식은 공개 confirm/return 엔드포인트가 "공격자가
      // 제시한 신뢰 불가 paymentKey"로 남의 정상 주문을 잘못 취소시키는 걸 막기 위한 것이다.
      // 이 cron은 이미 우리 DB의 만료 목록에서 스스로 고른 orderId를 조회한 것이라(외부 입력
      // 없음) 그 위협 모델이 적용되지 않는다 — 오히려 여기서 취소를 막으면 cron의 존재 목적
      // (만료된 미결제 주문의 재고 회수)이 무력화된다.
      await reclaimViaCancel(order);
    } catch (error) {
      // 예상 밖 예외(위 어떤 catch에도 안 걸린 경우) — 안전한 쪽으로: 취소하지 않고 기록만 남긴다.
      logServerError(`[GET /api/cron/reclaim-stock] 주문 ${order.id} 처리 중 예상 밖 오류`, error);
      const message = error instanceof Error ? error.message : String(error);
      await recordFailureAndMaybeDead(order.id, `unexpected:${message}`);
    }
  }

  return NextResponse.json({ checked: expired.length, reclaimed, converged, failed, dead, deadOrderIds });
}
