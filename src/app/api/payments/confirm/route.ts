import { NextResponse, type NextRequest } from 'next/server';
import {
  getOrderById,
  setOrderPaid,
  claimOrderForConfirmation,
  cancelConfirmingAndRestore,
  type OrderRecord,
} from '@/lib/orders/repo';
import { confirmTossPayment, TossConfirmError } from '@/lib/payments/toss';
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
 * 이미 '결제대기'를 벗어난 주문(승인중/결제완료/취소 등)을 다시 confirm하려는 요청에 무엇을
 * 응답할지 상태별로 명시 분기한다(opus HIGH#2 — `|| order.paymentKey` 존재 여부만으로 뭉뚱그려
 * 판단하면 취소된 주문도 키가 남아있다는 이유로 200을 돌려줄 여지가 생긴다). ③ 멱등 흡수와
 * ③-b claim 패자 재조회(경합) 양쪽이 공유 — 둘 다 "이 주문 지금 무슨 상태냐"라는 같은 질문이다.
 */
function respondForObservedState(order: OrderRecord, paymentKey: string, orderId: string) {
  const keyMatches = order.paymentKey === paymentKey;

  if (order.paymentStatus === '결제완료') {
    if (!keyMatches) {
      logServerError(
        `[POST /api/payments/confirm] 멱등 흡수 키 불일치(대체 시도 의심) orderId=${orderId} submittedKey=${paymentKey} storedKey=${order.paymentKey}`,
        {},
      );
      return NextResponse.json({ error: 'payment-key-mismatch' }, { status: 409 });
    }
    return NextResponse.json({ order: toSummary(order) }, { status: 200 });
  }

  if (order.paymentStatus === '승인중') {
    if (!keyMatches) {
      logServerError(
        `[POST /api/payments/confirm] 멱등 흡수 키 불일치(대체 시도 의심) orderId=${orderId} submittedKey=${paymentKey} storedKey=${order.paymentKey}`,
        {},
      );
      return NextResponse.json({ error: 'payment-key-mismatch' }, { status: 409 });
    }
    // 같은 paymentKey로 이미 '승인중'인 재진입(재시도/경합) — 아직 확정 전이므로 취소 금지.
    return NextResponse.json({ error: 'payment-confirming' }, { status: 202 });
  }

  if (order.paymentStatus === '결제취소') {
    // 취소된 주문은 키 일치 여부와 무관하게 200으로 흡수하면 안 된다(거짓 성공 방지).
    return NextResponse.json({ error: 'reservation-expired' }, { status: 409 });
  }

  // 그 외 비정상 조합(환불완료 등 예상 밖 상태에서 재요청) — 정상 흐름이면 도달하지 않는다.
  // 조용히 200/202로 흡수하지 않고 시끄럽게 로그 후 거부한다.
  logServerError(
    `[POST /api/payments/confirm] 예상 밖 주문 상태에서 confirm 재요청 orderId=${orderId} paymentStatus=${order.paymentStatus}`,
    {},
  );
  return NextResponse.json({ error: 'reservation-expired' }, { status: 409 });
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

    // ③ 멱등 흡수 — 이미 '결제대기'를 벗어난 주문(결제완료/승인중/취소 등)은 상태별로 명시
    //    분기한다(respondForObservedState). claim보다 먼저 둬야 한다: 순서가 바뀌면 정상
    //    결제 완료건의 재확인 요청이 claim=0(이미 결제대기 아님) → 409로 잘못 분류된다.
    //    ★ `|| order.paymentKey` 조건은 쓰지 않는다 — paymentStatus만으로 갈라야 취소된
    //    주문이 키가 남아있다는 이유로 거짓 200을 돌려주는 경로가 생기지 않는다.
    if (order.paymentStatus !== '결제대기') {
      return respondForObservedState(order, paymentKey, orderId);
    }

    // ③-b 승인 착수 선언 — 토스 API 호출 전에 반드시 claim. '결제대기'→'승인중' 배타적 전이이므로
    //    claimed=0이면 이미 다른 요청이 먼저 승인중으로 전이시켰거나(경합 패자) 취소/만료된
    //    주문이라 토스 승인 API를 호출하면 안 된다(승인해봐야 확정 못 함 = 이중 리스크만 증가).
    //    경합 패자는 아래 ALREADY_PROCESSED_PAYMENT 분기가 아니라 여기서 409로 먼저 걸러진다
    //    (재수술 전엔 claim이 상태전이가 아니어서 이 경합을 못 닫았음 — 이번 웨이브의 핵심).
    const claimed = await claimOrderForConfirmation(orderId, paymentKey);
    if (claimed === 0) {
      return NextResponse.json({ error: 'reservation-expired' }, { status: 409 });
    }

    // ④ 토스 승인 API 호출 — expectedAmount(DB 값)만 보낸다. 클라이언트가 보낸 amount 변수는
    //    ②에서 이미 expectedAmount와 동일함이 확인됐지만, 요청 필드 자체를 서버 값으로 고정해
    //    "클라이언트 변수가 실제로 무엇을 승인시켰는지"에 대한 여지를 남기지 않는다.
    let tossResult;
    try {
      tossResult = await confirmTossPayment({ paymentKey, orderId, amount: expectedAmount });
    } catch (tossError) {
      // ALREADY_PROCESSED_PAYMENT는 4xx+코드가 실려 있어도 "이 주문을 다른 confirm 요청이
      // 이미 캡처했다"는 신호다 — 이걸 확정 거절로 잘못 묶으면 동시 이중 confirm의 패자가
      // 승자의 결제 완료 주문을 취소+재고 과복원시킬 수 있다. 확정 거절 판정에서 반드시 제외.
      const alreadyProcessed =
        tossError instanceof TossConfirmError && tossError.tossCode === 'ALREADY_PROCESSED_PAYMENT';

      // 확정 거절 = tossCode 있음 && httpStatus가 4xx(진짜 클라이언트 오류로 토스가 응답을 완료함)
      // && ALREADY_PROCESSED_PAYMENT가 아님. httpStatus가 5xx면 tossCode가 실려 있어도 토스
      // 내부 사정으로 캡처 여부가 불확실하므로 "불명" 경로로 보낸다(§ 확장1 — 5xx도 불명 취급).
      const isConfirmedDecline =
        tossError instanceof TossConfirmError &&
        tossError.tossCode !== null &&
        tossError.httpStatus !== null &&
        tossError.httpStatus < 500 &&
        !alreadyProcessed;

      if (isConfirmedDecline) {
        // 진짜 토스 거절(카드사 거부 등) — 토스가 결제를 캡처하지 않았으므로
        // 재고를 즉시 회수해 다음 구매자가 기다리지 않게 한다. claim이 이미 '승인중'으로
        // 전이시켰으므로 0024(WHERE '결제대기')는 no-op이 된다 — 반드시 0026을 호출한다.
        await cancelConfirmingAndRestore(orderId).catch((restoreError) => {
          logServerError(
            `[POST /api/payments/confirm] 토스 승인 거부 후 재고 복원 실패 orderId=${orderId}`,
            restoreError,
          );
        });
        logServerError(`[POST /api/payments/confirm] 토스 승인 거부 orderId=${orderId}`, tossError);
        return NextResponse.json({ error: 'payment-declined' }, { status: 402 });
      }

      if (alreadyProcessed) {
        // 취소·복원 금지 — 이 결제는 이미 다른 confirm 요청이 승자로 처리했다. 재조회해
        // 승자가 확정을 끝냈으면 멱등하게 수렴시키고, 아직이면(레이스 윈도우) 확인 중으로 응답한다.
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
        // 불명(네트워크/타임아웃/시크릿키 설정 오류/토스 5xx) — "토스가 실제로 뭘 했는지 불명".
        // 이 경우 토스가 이미 결제를 캡처했을 가능성을 배제할 수 없으므로 여기서 취소·복원하면
        // 안 된다(캡처된 결제인데 재고를 풀어버리는 반대 방향 리스크가 생김). 주문을 결제대기로
        // 남겨두면 ① 사용자가 같은 successUrl로 재시도할 때 동일 paymentKey로 토스 confirm이
        // 멱등하게 재확정할 수 있고, ② 진짜 미결제였다면 claim이 연장한 10분 뒤 만료 cron이
        // 재고를 회수한다 — 두 경로 모두 이 분기에서 취소하지 않아야 안전하다.
        logServerError(
          `[POST /api/payments/confirm] 토스 승인 응답 불명(네트워크/설정/5xx) orderId=${orderId} paymentKey=${paymentKey} httpStatus=${tossError.httpStatus}`,
          tossError,
        );
        return NextResponse.json({ error: 'payment-unconfirmed' }, { status: 502 });
      }
      throw tossError;
    }

    // ④-b 토스 2xx 성공 응답 런타임 검증 — 캐스팅만으로는 응답 위조·불일치를 잡지 못한다.
    //    orderId·paymentKey·금액·상태 넷 다 일치해야만 "진짜 이 요청에 대한 승인"으로 인정한다.
    //    하나라도 어긋나면 성공으로도, 취소 사유로도 삼지 않고 불명 경로(취소 금지·502)로 보낸다.
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

    // ⑤ 승인 확정 — WHERE payment_status='승인중' AND payment_key=? 조건으로 claim이 발급한
    //    이 시도만 확정(이중승인 방어).
    const affected = await setOrderPaid(orderId, {
      paymentKey: tossResult.paymentKey,
      paidAt: new Date().toISOString(),
    });

    if (affected === 0) {
      // 토스 승인은 성공했는데 DB 확정이 0행(승인 처리 도중 만료 취소가 먼저 커밋된 극단적 경합).
      // 웹훅 없이는 이 잔존 리스크를 완전히 닫을 수 없다(스코프 밖, R6) — 실결제와 DB 불일치를
      // 조용히 흘리지 않도록 반드시 로그를 남기고, 클라이언트에는 확정 실패가 아니라 "확인 중"으로 응답한다.
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
