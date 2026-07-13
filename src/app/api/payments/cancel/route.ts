import { NextResponse, type NextRequest } from 'next/server';
import { getOrderById } from '@/lib/orders/repo';
import { cancelPendingOrderIfUnpaid } from '@/lib/payments/cancelPending';
import { logServerError } from '@/lib/logServerError';

const MAX_ORDER_ID = 100;

function validate(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.orderId !== 'string' || b.orderId.length < 1 || b.orderId.length > MAX_ORDER_ID) return null;
  return b.orderId;
}

/**
 * POST /api/payments/cancel — 결제창 취소(failUrl)·이탈 시 재고 선점 즉시 복원.
 * 게스트 호출이라 세션 불요.
 *
 * ★R4 최종 라운드(Codex 최종 재검증 CRITICAL-2) — 예전엔 토스 확인 없이 곧장
 * cancelReservationAndRestore를 불렀다: 사용자가 결제를 완료한 직후 stale failUrl 핸들러가
 * 뒤늦게 오거나(예: 뒤로가기 후 재방문) 악의적 호출이 오면, 실제로는 결제된 주문이 취소되는
 * 레이스가 있었다. 이제 취소 전에 `cancelPendingOrderIfUnpaid`(reclaim-stock cron과 공유하는
 * 단일 함수, cancelPending.ts)로 토스 상태를 확인한다 — 취소 정책이 두 벌로 갈라지지 않는다.
 *
 * 응답 계약: 취소됨/이미 처리됨 → 200 { ok:true } · 권위 DONE 확인돼 확정됨 → 200
 * { ok:true, order } · 과도기 상태·조회 불명·재무 예외라 이번 요청에서 취소할 수 없음 → 202
 * { error:'cancel-pending' }(클라이언트는 "취소 처리 중" 안내, cron이 마저 처리한다 — 거짓
 * "취소되었습니다"를 보여주지 않는다).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const orderId = validate(body);
  if (!orderId) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const order = await getOrderById(orderId);
    if (!order) {
      // 주문 없음 — 취소할 것도 없다. failUrl 핸들러가 이미 삭제된/무관한 주문으로 재호출해도
      // 조용히 성공 취급한다(기존 cancelReservationAndRestore의 no-op=성공 흡수와 동일 관례).
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const outcome = await cancelPendingOrderIfUnpaid(order, 'cancel-route');
    switch (outcome.kind) {
      case 'canceled':
      case 'already-settled':
        return NextResponse.json({ ok: true }, { status: 200 });

      case 'confirmed':
        if (outcome.result.status === 200) {
          return NextResponse.json({ ok: true, order: outcome.result.order }, { status: 200 });
        }
        // 확정을 시도했지만 이번 요청에선 못 끝남(경합 등) — 취소는 절대 아니었다는 것만
        // 확실하다. 진행 중으로 안내한다.
        return NextResponse.json({ error: 'cancel-pending' }, { status: 202 });

      case 'transitional':
      case 'unclear':
      case 'financial-exception':
        return NextResponse.json({ error: 'cancel-pending' }, { status: 202 });

      default: {
        const exhaustiveCheck: never = outcome;
        throw new Error(`[POST /api/payments/cancel] 처리되지 않은 outcome: ${JSON.stringify(exhaustiveCheck)}`);
      }
    }
  } catch (error) {
    logServerError('[POST /api/payments/cancel] 취소·복원 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
