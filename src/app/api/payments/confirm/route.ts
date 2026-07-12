import { NextResponse, type NextRequest } from 'next/server';
import {
  getOrderById,
  setOrderPaid,
  claimOrderForConfirmation,
  cancelReservationAndRestore,
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

    // ③ 멱등 흡수 — 이미 결제완료거나 payment_key가 이미 있으면(중복 콜백/재방문) 토스를 다시
    //    호출하지 않고 현재 주문을 그대로 반환한다. claim보다 먼저 둬야 한다: 순서가 바뀌면
    //    정상 결제 완료건의 재확인 요청이 claim=0(이미 결제대기 아님) → 409로 잘못 분류된다.
    if (order.paymentStatus === '결제완료' || order.paymentKey) {
      // 키 바인딩 — 저장된 payment_key가 있는데 이번 요청의 paymentKey와 다르면 다른 결제건으로
      // 이 주문을 흡수시키려는 시도(대체 공격)일 수 있다. 무조건 200으로 흡수하지 않고 거부한다.
      if (order.paymentKey && order.paymentKey !== paymentKey) {
        logServerError(
          `[POST /api/payments/confirm] 멱등 흡수 키 불일치(대체 시도 의심) orderId=${orderId} submittedKey=${paymentKey} storedKey=${order.paymentKey}`,
          {},
        );
        return NextResponse.json({ error: 'payment-key-mismatch' }, { status: 409 });
      }
      return NextResponse.json({ order: toSummary(order) }, { status: 200 });
    }

    // ③-b 승인 착수 선언 — 토스 API 호출 전에 반드시 claim. 0이면 이미 취소/만료 처리된
    //    주문이라 토스 승인 API를 호출하면 안 된다(승인해봐야 확정 못 함 = 이중 리스크만 증가).
    const claimed = await claimOrderForConfirmation(orderId);
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
      // 확정 거절 = tossCode 있음 && httpStatus가 4xx(진짜 클라이언트 오류로 토스가 응답을 완료함).
      // httpStatus가 5xx면 tossCode가 실려 있어도 토스 내부 사정으로 캡처 여부가 불확실하므로
      // "불명" 경로로 보낸다(§ 확장1 — 5xx도 불명 취급).
      const isConfirmedDecline =
        tossError instanceof TossConfirmError &&
        tossError.tossCode !== null &&
        tossError.httpStatus !== null &&
        tossError.httpStatus < 500;

      if (isConfirmedDecline) {
        // 진짜 토스 거절(카드사 거부 등) — 토스가 결제를 캡처하지 않았으므로
        // 재고를 즉시 회수해 다음 구매자가 기다리지 않게 한다.
        await cancelReservationAndRestore(orderId).catch((restoreError) => {
          logServerError(
            `[POST /api/payments/confirm] 토스 승인 거부 후 재고 복원 실패 orderId=${orderId}`,
            restoreError,
          );
        });
        logServerError(`[POST /api/payments/confirm] 토스 승인 거부 orderId=${orderId}`, tossError);
        return NextResponse.json({ error: 'payment-declined' }, { status: 402 });
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

    // ⑤ 승인 확정 — WHERE payment_status='결제대기' 조건으로 최초 1회만 성공(이중승인 방어).
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
