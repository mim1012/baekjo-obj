import { NextResponse, type NextRequest } from 'next/server';
import { confirmPayment, MAX_PAYMENT_KEY, MAX_ORDER_ID, type ConfirmPaymentResult } from '@/lib/payments/confirmPayment';

/** 토스 승인 응답이 5xx/네트워크로 불명(502)일 때 서버가 대신 재시도하는 대기 시간.
 *  클라이언트 자동재시도를 대체한다 — 브라우저는 이 라우트가 끝날 때까지 아무 것도 안 한다. */
const UNKNOWN_RETRY_DELAY_MS = 700;

type RedirectStatus = 'done' | 'pending' | 'declined' | 'expired' | 'unconfirmed' | 'invalid';

function parseQuery(searchParams: URLSearchParams): { paymentKey: string; orderId: string; amount: number } | null {
  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amountRaw = searchParams.get('amount');
  if (!paymentKey || paymentKey.length < 1 || paymentKey.length > MAX_PAYMENT_KEY) return null;
  if (!orderId || orderId.length < 1 || orderId.length > MAX_ORDER_ID) return null;
  if (!amountRaw) return null;
  const amount = Number(amountRaw);
  if (!Number.isInteger(amount) || amount <= 0) return null;
  return { paymentKey, orderId, amount };
}

/** confirmPayment 결과(HTTP 상태코드 지향) → order-complete 화면이 읽는 status 쿼리값.
 *  409(reservation-expired/payment-key-mismatch/payment-not-confirmable/payment-key-already-bound)는
 *  전부 "재사용 불가능한 주문"이라는 같은 사용자 안내(expired)로 뭉뚱그린다 — 세부 사유는
 *  로그(logServerError, confirmPayment 내부)에만 남고 화면에는 노출하지 않는다. */
function toRedirectStatus(result: ConfirmPaymentResult): RedirectStatus {
  switch (result.status) {
    case 200:
      return 'done';
    case 202:
      return 'pending';
    case 402:
      return 'declined';
    case 404:
    case 409:
      return 'expired';
    case 400:
    case 500:
    case 502:
      return 'unconfirmed';
    default: {
      const exhaustiveCheck: never = result;
      throw new Error(`[GET /api/payments/return] 처리되지 않은 result.status: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}

function redirectToOrderComplete(request: NextRequest, status: RedirectStatus, orderId: string | null): NextResponse {
  const url = new URL('/order-complete', request.url);
  url.searchParams.set('status', status);
  if (orderId) url.searchParams.set('orderId', orderId);
  return NextResponse.redirect(url, 302);
}

/**
 * GET /api/payments/return — 토스 결제위젯 successUrl. 브라우저가 아니라 서버가 승인을
 * 오케스트레이션한다(R4) — 이전에는 이 successUrl이 클라이언트 페이지(order-complete)를 직접
 * 가리켜, 세대 카운터·자동재시도 타이머 같은 클라이언트측 오케스트레이션이 필요했다.
 * 승인 코어는 confirm/route.ts(POST, 클라이언트 재확인용)와 동일한 @/lib/payments/confirmPayment
 * 를 호출한다 — 정책 중복 없음. 결과는 JSON이 아니라 order-complete로의 302 리다이렉트로
 * 번역해 브라우저에는 렌더링할 status만 넘긴다(승인 판정의 유일한 권위는 서버 DB — 클라이언트가
 * status 쿼리를 위조해도 화면 문구만 바뀔 뿐 실제 주문 상태는 바뀌지 않는다).
 */
export async function GET(request: NextRequest) {
  const parsed = parseQuery(request.nextUrl.searchParams);
  if (!parsed) {
    return redirectToOrderComplete(request, 'invalid', null);
  }

  let result = await confirmPayment(parsed);
  if (result.status === 502) {
    // 불명 1회 재시도 — 클라이언트 자동재시도(구 order-complete의 502/네트워크성 재시도)를
    // 대체한다. 여전히 502면 unconfirmed로 넘겨 화면 안내 + 마이페이지 확인으로 유도한다.
    await new Promise((resolve) => setTimeout(resolve, UNKNOWN_RETRY_DELAY_MS));
    result = await confirmPayment(parsed);
  }

  return redirectToOrderComplete(request, toRedirectStatus(result), parsed.orderId);
}
