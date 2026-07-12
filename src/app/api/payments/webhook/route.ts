import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import {
  getOrderById,
  setOrderPaid,
  claimOrderForConfirmation,
  cancelConfirmingAndRestore,
  cancelReservationAndRestore,
} from '@/lib/orders/repo';
import { queryTossPayment } from '@/lib/payments/toss';
import { logServerError } from '@/lib/logServerError';

const MAX_BODY_BYTES = 20_000;
const MAX_ORDER_ID = 100;
const MAX_PAYMENT_KEY = 200;
const SIGNATURE_HEADER = 'tosspayments-webhook-signature';
const RESTORABLE_TOSS_STATUSES = new Set(['CANCELED', 'EXPIRED', 'ABORTED']);

interface TossWebhookBody {
  eventType?: string;
  data?: {
    orderId?: string;
    paymentKey?: string;
    // status는 페이로드에 실려 오지만 신뢰하지 않는다 — 아래 재조회로만 판단한다.
  };
}

/** 페이로드에서 우리가 실제로 쓰는 두 식별자만 추려낸다(그 외 필드는 신뢰하지 않으므로 안 읽음). */
function extractIdentifiers(body: TossWebhookBody): { orderId: string; paymentKey: string } | null {
  const orderId = body.data?.orderId;
  const paymentKey = body.data?.paymentKey;
  if (typeof orderId !== 'string' || orderId.length < 1 || orderId.length > MAX_ORDER_ID) return null;
  if (typeof paymentKey !== 'string' || paymentKey.length < 1 || paymentKey.length > MAX_PAYMENT_KEY) return null;
  return { orderId, paymentKey };
}

/**
 * HMAC-SHA256(rawBody, TOSS_WEBHOOK_SECRET) base64를 tosspayments-webhook-signature 헤더와
 * timingSafeEqual로 비교한다. SECRET 미설정(웹훅 실등록=계약 전) 시 스킵 — 이 경우 아래 재조회가
 * 유일한 권위 소스가 된다(페이로드를 신뢰하지 않는 설계이므로 서명 없이도 안전).
 * ★정확한 서명 알고리즘/헤더 포맷은 토스 웹훅 실등록 시 개발자센터 문서로 재확인 필요 — 지금은
 * SECRET이 없어 이 분기 자체가 비활성이므로 알고리즘 오류가 있어도 즉시 드러나지 않는다.
 */
function isValidSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('base64');
  const expectedBuf = Buffer.from(expected);
  const headerBuf = Buffer.from(header);
  if (expectedBuf.length !== headerBuf.length) return false;
  return timingSafeEqual(expectedBuf, headerBuf);
}

/**
 * POST /api/payments/webhook — 토스 웹훅 수신(PAYMENT_STATUS_CHANGED). 결제 직후 사용자가
 * successUrl에 도달하지 못하고 이탈한 경우(브라우저 종료 등)를 확정시키는 최후의 경로 —
 * confirm 라우트가 못 닫는 R6/R5b 잔존 리스크를 여기서 닫는다.
 *
 * 페이로드는 절대 신뢰하지 않는다: data.{orderId,paymentKey}로 "무엇을 조회할지"만 얻고,
 * 실제 상태·금액 판단은 전부 queryTossPayment(토스 권위 조회) 결과로만 한다 —
 * reconcile-confirming(U6, 이미 main)의 재조회+신원검증 패턴과 대칭이다.
 *
 * 항상 10초 내 응답한다(토스가 그 이상이면 재전송). 우리가 예상하는 상태(주문 없음/eventType
 * 불일치/신원 불일치/이미 처리됨 등)는 200으로 흡수해 재전송을 유도하지 않는다. DB/네트워크 오류
 * 등 "다시 시도하면 나아질 수 있는" 실패만 500으로 응답해 토스 재전송(최대 7회)을 유도한다
 * (모든 분기가 멱등이라 재전송이 안전하다).
 */
export async function POST(request: NextRequest) {
  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'payload-too-large' }, { status: 413 });
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'payload-too-large' }, { status: 413 });
  }

  const webhookSecret = process.env.TOSS_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signatureHeader = request.headers.get(SIGNATURE_HEADER);
    if (!isValidSignature(rawBody, signatureHeader, webhookSecret)) {
      logServerError('[POST /api/payments/webhook] 서명 불일치', {});
      return NextResponse.json({ error: 'invalid-signature' }, { status: 401 });
    }
  }

  let body: TossWebhookBody;
  try {
    body = JSON.parse(rawBody) as TossWebhookBody;
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  // eventType 필터 — 그 외 이벤트(정산·현금영수증 등)는 이 라우트 스코프 밖이라 200으로 무시.
  if (body.eventType !== 'PAYMENT_STATUS_CHANGED') {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const identifiers = extractIdentifiers(body);
  if (!identifiers) {
    logServerError('[POST /api/payments/webhook] 페이로드 필수 식별자 누락/형식 오류', {});
    return NextResponse.json({ ok: true }, { status: 200 });
  }
  const { orderId, paymentKey } = identifiers;

  try {
    const order = await getOrderById(orderId);
    if (!order) {
      // 우리 시스템에 없는 주문 — 다른 상점/테스트 웹훅일 수 있다. 재시도해도 의미 없으니 200.
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // 토스 권위 조회 — 페이로드의 status는 절대 쓰지 않는다.
    const tossResult = await queryTossPayment(paymentKey);
    const expectedAmount = order.totalPrice + order.deliveryFee;

    // 신원 검증 — 조회 결과를 쓰기 전에 orderId·paymentKey가 우리가 물어본 대상과 정확히
    // 일치하는지 확인한다(reconcile과 대칭). 하나라도 어긋나면 상태·금액과 무관하게 무시한다.
    const identityMatches = tossResult.orderId === orderId && tossResult.paymentKey === paymentKey;
    if (!identityMatches) {
      logServerError(
        `[POST /api/payments/webhook] 토스 응답 신원 불일치 orderId=${orderId} paymentKey=${paymentKey} ` +
          `tossOrderId=${tossResult.orderId} tossPaymentKey=${tossResult.paymentKey} tossStatus=${tossResult.status}`,
        {},
      );
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (tossResult.status === 'DONE' && tossResult.totalAmount === expectedAmount) {
      if (order.paymentStatus === '결제완료') {
        // 이미 확정됨 — 멱등 no-op.
        return NextResponse.json({ ok: true }, { status: 200 });
      }

      if (order.paymentStatus === '결제대기') {
        // ★Fable 정정(2026-07-12): claim된 적 없는 주문(사용자 이탈로 confirm 미도달) — 이게
        // 바로 웹훅이 존재하는 이유다. claim으로 먼저 '승인중' 선전이한 뒤 setOrderPaid를 호출해야
        // 한다(repo.setOrderPaid JSDoc breadcrumb 참고) — 순서를 건너뛰면 WHERE 불일치로 no-op.
        const claimed = await claimOrderForConfirmation(orderId, paymentKey);
        if (claimed === 0) {
          // 경합 패자 — 다른 경로(confirm/reconcile)가 그 사이 먼저 처리했을 수 있다. 재조회 후 수렴.
          const latest = await getOrderById(orderId);
          if (latest?.paymentStatus === '결제완료') {
            return NextResponse.json({ ok: true }, { status: 200 });
          }
          if (latest?.paymentStatus === '승인중' && latest.paymentKey === paymentKey) {
            const affected = await setOrderPaid(orderId, { paymentKey, paidAt: new Date().toISOString() });
            return NextResponse.json({ ok: true, confirmed: affected > 0 }, { status: 200 });
          }
          // 그 사이 취소된 경우 등 — 재확정할 수 없는 상태. 사람이 봐야 하므로 시끄럽게 로그.
          logServerError(
            `[POST /api/payments/webhook] claim 실패 후에도 확정 불가 orderId=${orderId} paymentKey=${paymentKey} latestStatus=${latest?.paymentStatus}`,
            {},
          );
          return NextResponse.json({ ok: true }, { status: 200 });
        }
        const affected = await setOrderPaid(orderId, { paymentKey, paidAt: new Date().toISOString() });
        return NextResponse.json({ ok: true, confirmed: affected > 0 }, { status: 200 });
      }

      if (order.paymentStatus === '승인중') {
        if (order.paymentKey !== paymentKey) {
          // 이 주문은 다른 paymentKey로 이미 승인중 — 위조/재사용 의심, 확정하지 않는다.
          logServerError(
            `[POST /api/payments/webhook] 승인중 주문 paymentKey 불일치 orderId=${orderId} webhookKey=${paymentKey} storedKey=${order.paymentKey}`,
            {},
          );
          return NextResponse.json({ ok: true }, { status: 200 });
        }
        const affected = await setOrderPaid(orderId, { paymentKey, paidAt: new Date().toISOString() });
        return NextResponse.json({ ok: true, confirmed: affected > 0 }, { status: 200 });
      }

      // 결제취소/환불완료 등 이미 종결된 상태인데 DONE 웹훅이 옴 — 상충하는 신호. 확정하지 않고
      // 시끄럽게 로그만 남긴다(사람이 토스 상점관리자와 대조 필요).
      logServerError(
        `[POST /api/payments/webhook] 종결 상태(${order.paymentStatus})에서 DONE 웹훅 수신 orderId=${orderId}`,
        {},
      );
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (RESTORABLE_TOSS_STATUSES.has(tossResult.status)) {
      if (order.paymentStatus === '승인중' && order.paymentKey === paymentKey) {
        await cancelConfirmingAndRestore(orderId);
        return NextResponse.json({ ok: true }, { status: 200 });
      }
      if (order.paymentStatus === '결제대기') {
        await cancelReservationAndRestore(orderId);
        return NextResponse.json({ ok: true }, { status: 200 });
      }
      // 결제완료 확정건에 취소류 웹훅이 온 경우(회귀 방지) — 이미 확정된 결제를 취소·복원하지
      // 않는다. 실제 환불이 필요하면 별도 관리자 플로우로 처리한다(이 라우트의 스코프 밖).
      if (order.paymentStatus !== '결제취소' && order.paymentStatus !== '환불완료') {
        logServerError(
          `[POST /api/payments/webhook] ${order.paymentStatus} 상태에서 취소류(${tossResult.status}) 웹훅 수신, 취소 생략 orderId=${orderId}`,
          {},
        );
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // 그 외(DONE인데 금액 불일치, WAITING_FOR_DEPOSIT 등 미처리 상태) — 불명 취급, 아무것도 하지 않는다.
    logServerError(
      `[POST /api/payments/webhook] 처리 대상 아닌 토스 상태 orderId=${orderId} tossStatus=${tossResult.status} ` +
        `tossAmount=${tossResult.totalAmount} expected=${expectedAmount}`,
      {},
    );
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    // DB·네트워크 등 "다시 시도하면 나아질 수 있는" 실패 — 500으로 토스 재전송을 유도한다
    // (모든 분기가 멱등이라 안전).
    logServerError(`[POST /api/payments/webhook] 처리 실패 orderId=${orderId} paymentKey=${paymentKey}`, error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
