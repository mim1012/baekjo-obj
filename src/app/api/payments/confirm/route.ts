import { NextResponse, type NextRequest } from 'next/server';
import {
  getOrderById,
  claimOrderForConfirmation,
  ClaimPaymentKeyConflictError,
  type OrderRecord,
} from '@/lib/orders/repo';
import { confirmTossPayment, TossConfirmError } from '@/lib/payments/toss';
import { decidePaymentAction, type PaymentAction } from '@/lib/payments/decide';
import { applyPaymentAction } from '@/lib/payments/execute';
import { logServerError } from '@/lib/logServerError';
import type { ConfirmedOrderSummary } from '@/types';

const MAX_PAYMENT_KEY = 200;
const MAX_ORDER_ID = 100;

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

/** 응답 최소화 — 무인증 공개 엔드포인트라 PII(customerName/phone/address/items)를 내려주지 않는다. */
function toSummary(order: OrderRecord): ConfirmedOrderSummary {
  return {
    id: order.id,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    totalPrice: order.totalPrice,
    deliveryFee: order.deliveryFee,
    paidAt: order.paidAt,
  };
}

/**
 * decidePaymentAction(observation:'none')의 결과를 HTTP로 매핑하는 얇은 표(구 respondForObservedState
 * — 판단 매트릭스는 decide.ts로 이전됨). ③ 멱등 흡수와 ③-b claim 패자 재조회(경합) 두 호출부가 공유.
 */
function respondToAction(action: PaymentAction, order: OrderRecord, orderId: string, submittedKey: string) {
  if (action.kind === 'settled') {
    return NextResponse.json({ order: toSummary(order) }, { status: 200 });
  }
  if (action.kind === 'retryLater') {
    return NextResponse.json({ error: 'payment-confirming' }, { status: 202 }); // 아직 확정 전 — 취소 금지
  }
  if (action.kind === 'confirm' || action.kind === 'restoreConfirming') {
    // observation:'none'에서 이 헬퍼가 도달하는 조건(order.paymentStatus!=='결제대기') 위에서는
    // decide가 이 둘을 반환하지 않는다 — 정상 흐름이면 도달 불가, 방어적 처리.
    logServerError(`[POST /api/payments/confirm] respondToAction 예상 밖 action orderId=${orderId} kind=${action.kind}`, {});
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
  // action.kind === 'ignore'
  if (action.reason === 'canceled') {
    return NextResponse.json({ error: 'reservation-expired' }, { status: 409 }); // 취소된 주문은 거짓 성공 금지
  }
  if (action.reason === 'key-mismatch') {
    logServerError(
      `[POST /api/payments/confirm] 멱등 흡수 키 불일치(대체 시도 의심) orderId=${orderId} submittedKey=${submittedKey} storedKey=${order.paymentKey}`,
      {},
    );
    return NextResponse.json({ error: 'payment-key-mismatch' }, { status: 409 });
  }
  // 그 외 예상 밖 상태(환불완료·입금대기 등)에서 재요청 — 조용히 흡수하지 않고 로그 후 거부한다.
  logServerError(
    `[POST /api/payments/confirm] 예상 밖 주문 상태에서 confirm 재요청 orderId=${orderId} paymentStatus=${order.paymentStatus}`,
    {},
  );
  return NextResponse.json({ error: 'payment-not-confirmable' }, { status: 409 });
}

/**
 * POST /api/payments/confirm — 토스 결제위젯 successUrl에서 호출하는 승인 게이트.
 * 게스트 결제도 있어 세션 불요(주문 소유권은 orderId를 아는 사람만 확인 가능한 결제 흐름이므로
 * checkout→successUrl 리다이렉트 경로 밖에서는 orderId를 알 수 없다 — order-complete 스냅샷과 동일 전제).
 * 순서가 이중승인·금액조작·crash window 방어의 핵심이라 재배치 금지(§ 리뷰 인계사항).
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
  const { paymentKey, orderId, amount } = validated;

  try {
    // ① 주문 존재 확인.
    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'order-not-found' }, { status: 404 });
    }

    // ② 금액검증 — successUrl 쿼리(amount)는 위조 가능하므로 DB 총액과 대조 후 거부.
    //    승인 요청(④)은 요청 amount가 아니라 이 expectedAmount만 토스에 보낸다.
    const expectedAmount = order.totalPrice + order.deliveryFee;
    if (!Number.isSafeInteger(expectedAmount) || expectedAmount <= 0) {
      logServerError(
        `[POST /api/payments/confirm] 주문 금액 데이터 이상 orderId=${orderId} expectedAmount=${expectedAmount}`,
        {},
      );
      return NextResponse.json({ error: 'server-error' }, { status: 500 });
    }
    if (expectedAmount !== amount) {
      return NextResponse.json({ error: 'amount-mismatch' }, { status: 400 });
    }

    // ③ 멱등 흡수 — 이미 '결제대기'를 벗어난 주문은 decide(observation:'none')가 상태별로 분기한다.
    //    claim보다 먼저 둬야 한다: 순서가 바뀌면 정상 결제완료건 재확인이 claim=0 → 409로 오분류된다.
    if (order.paymentStatus !== '결제대기') {
      const action = decidePaymentAction(order, { kind: 'none' }, paymentKey, 'confirm');
      return respondToAction(action, order, orderId, paymentKey);
    }

    // ③-b 승인 착수 선언 — 토스 API 호출 전에 반드시 claim. '결제대기'→'승인중' 배타적 전이이므로
    //    claimed=0이면 이미 다른 요청이 먼저 승인중으로 전이시켰거나(경합 패자) 취소/만료된
    //    주문이라 토스 승인 API를 호출하면 안 된다(승인해봐야 확정 못 함 = 이중 리스크만 증가).
    let claimed: number;
    try {
      claimed = await claimOrderForConfirmation(orderId, paymentKey);
    } catch (claimError) {
      if (claimError instanceof ClaimPaymentKeyConflictError) {
        // 이 paymentKey가 이미 다른 주문에 묶여 있음(0022 unique 충돌) — 위조/재사용 의심.
        logServerError(
          `[POST /api/payments/confirm] claim payment_key 충돌 orderId=${orderId} paymentKey=${paymentKey}`,
          claimError,
        );
        return NextResponse.json({ error: 'payment-key-already-bound' }, { status: 409 });
      }
      throw claimError;
    }
    if (claimed === 0) {
      // 경합 패자 — 무조건 409로 뭉뚱그리지 않고 재조회해 decide(observation:'none')로 정확히
      // 안내한다(승자가 confirm 중이면 202, 이미 확정됐으면 200, 취소됐으면 409 등).
      const latest = await getOrderById(orderId);
      if (latest) {
        const action = decidePaymentAction(latest, { kind: 'none' }, paymentKey, 'confirm');
        return respondToAction(action, latest, orderId, paymentKey);
      }
      logServerError(`[POST /api/payments/confirm] claim 실패 후 재조회에서도 주문을 찾지 못함 orderId=${orderId}`, {});
      return NextResponse.json({ error: 'reservation-expired' }, { status: 409 });
    }

    // ④ 토스 승인 API 호출 — expectedAmount(DB 값)만 보낸다. 클라이언트가 보낸 amount 변수는
    //    ②에서 이미 expectedAmount와 동일함이 확인됐지만, 요청 필드 자체를 서버 값으로 고정해
    //    "클라이언트 변수가 실제로 무엇을 승인시켰는지"에 대한 여지를 남기지 않는다.
    let tossResult;
    try {
      tossResult = await confirmTossPayment({ paymentKey, orderId, amount: expectedAmount });
    } catch (tossError) {
      // ALREADY_PROCESSED_PAYMENT는 4xx+코드가 실려 있어도 "다른 confirm 요청이 이미 캡처했다"는
      // 신호다 — 확정 거절로 잘못 묶으면 이중 confirm 패자가 승자의 완료 주문을 취소시킬 수 있다.
      const alreadyProcessed =
        tossError instanceof TossConfirmError && tossError.tossCode === 'ALREADY_PROCESSED_PAYMENT';

      // 확정 거절 = tossCode 있음 && httpStatus 4xx(토스가 응답 완료) && ALREADY_PROCESSED 아님.
      // 5xx는 캡처 여부가 불확실하므로 tossCode가 있어도 "불명" 경로로 보낸다.
      const isConfirmedDecline =
        tossError instanceof TossConfirmError &&
        tossError.tossCode !== null &&
        tossError.httpStatus !== null &&
        tossError.httpStatus < 500 &&
        !alreadyProcessed;

      if (isConfirmedDecline) {
        // 진짜 토스 거절(카드사 거부 등) — 재고를 즉시 회수해 다음 구매자가 기다리지 않게 한다.
        // claim이 이미 '승인중'으로 전이시켰으므로 0024는 no-op — 반드시 0028을 호출한다.
        // observation:'declined'는 source==='confirm'에서만 곧장 restoreConfirming으로 판정된다
        // (claim의 배타성이 보증하므로 재확인 불필요). order는 ①의 claim-이전 스냅샷이라 그대로
        // 넘기지 않고 claim(③-b)이 전이시킨 현재 상태('승인중')를 넘긴다.
        const action = decidePaymentAction({ paymentStatus: '승인중', paymentKey }, { kind: 'declined' }, paymentKey, 'confirm');
        await applyPaymentAction(action, orderId).catch((restoreError) => {
          logServerError(
            `[POST /api/payments/confirm] 토스 승인 거부 후 재고 복원 실패 orderId=${orderId}`,
            restoreError,
          );
        });
        logServerError(`[POST /api/payments/confirm] 토스 승인 거부 orderId=${orderId}`, tossError);
        return NextResponse.json({ error: 'payment-declined' }, { status: 402 });
      }

      if (alreadyProcessed) {
        // 취소·복원 금지 — 다른 confirm 요청이 승자로 처리했다. 재조회해 승자 확정이 끝났으면
        // 멱등 수렴, 아직이면(레이스 윈도우) 확인 중으로 응답한다.
        const latest = await getOrderById(orderId);
        if (latest && latest.paymentStatus === '결제완료') {
          return NextResponse.json({ order: toSummary(latest) }, { status: 200 });
        }
        logServerError(
          `[POST /api/payments/confirm] ALREADY_PROCESSED_PAYMENT — 승자 확정 대기 orderId=${orderId} paymentKey=${paymentKey}`,
          {},
        );
        return NextResponse.json({ error: 'payment-confirming' }, { status: 202 });
      }

      if (tossError instanceof TossConfirmError) {
        // 불명(네트워크/타임아웃/설정오류/5xx) — 토스가 이미 캡처했을 가능성을 배제 못 하므로
        // 취소·복원 금지. 결제대기로 남겨두면 재시도 멱등 재확정 또는 만료 cron 회수로 수렴한다.
        // decide는 observation:'unknown'에서 항상 retryLater(order 매트릭스 분기 없음)이므로
        // 호출을 생략해도 결과가 같다 — 직접 응답한다.
        logServerError(
          `[POST /api/payments/confirm] 토스 승인 응답 불명(네트워크/설정/5xx) orderId=${orderId} paymentKey=${paymentKey} httpStatus=${tossError.httpStatus}`,
          tossError,
        );
        return NextResponse.json({ error: 'payment-unconfirmed' }, { status: 502 });
      }
      throw tossError;
    }

    // ④-b 토스 2xx 성공 응답 런타임 검증 — orderId·paymentKey·금액·상태 넷 다 일치해야 승인 인정.
    //    하나라도 어긋나면 성공/취소 어느 쪽도 아닌 불명 경로(취소 금지·502)로 보낸다.
    const tossResponseValid =
      tossResult.orderId === orderId &&
      tossResult.paymentKey === paymentKey &&
      tossResult.totalAmount === expectedAmount &&
      tossResult.status === 'DONE';

    if (!tossResponseValid) {
      logServerError(
        `[POST /api/payments/confirm] 토스 성공응답 필드 불일치 orderId=${orderId} paymentKey=${paymentKey} ` +
          `tossOrderId=${tossResult.orderId} tossPaymentKey=${tossResult.paymentKey} tossAmount=${tossResult.totalAmount} tossStatus=${tossResult.status}`,
        {},
      );
      return NextResponse.json({ error: 'payment-unconfirmed' }, { status: 502 });
    }

    // ⑤ 승인 확정 — WHERE payment_status='승인중' AND payment_key=?로 claim이 발급한 이 시도만
    //    확정한다(이중승인 방어). tossResponseValid가 이미 DONE·금액일치를 확인했으므로 decide는
    //    항상 'confirm'을 반환한다. order는 claim-이전 스냅샷이라 claim이 전이시킨 현재 상태를 넘긴다.
    const action = decidePaymentAction(
      { paymentStatus: '승인중', paymentKey },
      { kind: 'authoritative', payment: { paymentKey: tossResult.paymentKey, status: tossResult.status, amountMatches: tossResult.totalAmount === expectedAmount } },
      tossResult.paymentKey,
      'confirm',
    );
    const result = await applyPaymentAction(action, orderId, tossResult.paymentKey);
    const affected = result.applied === 'confirm' ? result.affected : 0;

    if (affected === 0) {
      // 토스 승인 성공·DB 확정 0행(극단적 경합) — 웹훅 없이는 완전히 닫을 수 없는 잔존 리스크(R6).
      // 실결제-DB 불일치를 조용히 흘리지 않도록 로그를 남기고 "확인 중"으로 응답한다.
      logServerError(
        `[POST /api/payments/confirm] R6 승인성공·확정0행 orderId=${orderId} paymentKey=${tossResult.paymentKey} — 웹훅 후속 필요`,
        { tossStatus: tossResult.status },
      );
      return NextResponse.json({ error: 'payment-confirming' }, { status: 202 });
    }

    const confirmedOrder = await getOrderById(orderId);
    return NextResponse.json({ order: toSummary(confirmedOrder ?? order) }, { status: 200 });
  } catch (error) {
    logServerError('[POST /api/payments/confirm] 승인 처리 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
