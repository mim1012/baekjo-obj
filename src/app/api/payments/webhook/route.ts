import { NextResponse, type NextRequest } from 'next/server';
import {
  getOrderById,
  setOrderPaid,
  claimOrderForConfirmation,
  cancelConfirmingAndRestore,
} from '@/lib/orders/repo';
import { queryTossPayment, TossConfirmError } from '@/lib/payments/toss';
import { logServerError } from '@/lib/logServerError';

const MAX_BODY_BYTES = 20_000;
const MAX_ORDER_ID = 100;
const MAX_PAYMENT_KEY = 200;
const RESTORABLE_TOSS_STATUSES = new Set(['CANCELED', 'EXPIRED', 'ABORTED']);
// 토스가 웹훅에 요구하는 10초 응답 데드라인 안에 여유를 두려고 confirm/reconcile(10초)보다
// 짧게 잡는다 — 재조회 자체가 오래 걸려 우리가 못 지키면 토스가 재전송하게 되므로 5초 컷.
const WEBHOOK_TOSS_TIMEOUT_MS = 5_000;

// 베스트에포트 레이트리밋 — 같은 orderId로 60초 내 10회 초과 요청은 토스 조회 없이 무시한다.
// 인스턴스(서버리스 함수 컨테이너) 로컬 메모리라 여러 컨테이너에 분산되면 우회될 수 있는
// 한계가 있다(전역 보장 아님) — 운영 레벨의 원천 차단은 Vercel WAF/방화벽 룰로 별도 구성할 것.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_HITS = 10;
const rateLimitHits = new Map<string, { count: number; windowStart: number }>();

/** true면 이번 요청을 처리해도 됨(한도 이내), false면 한도 초과 — 호출부가 조용히 200 무시. */
function checkRateLimit(orderId: string): boolean {
  const now = Date.now();
  const entry = rateLimitHits.get(orderId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitHits.set(orderId, { count: 1, windowStart: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT_MAX_HITS;
}

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
 * POST /api/payments/webhook — 토스 웹훅 수신(PAYMENT_STATUS_CHANGED). 결제 직후 사용자가
 * successUrl에 도달하지 못하고 이탈한 경우(브라우저 종료 등)를 확정시키는 최후의 경로 —
 * confirm 라우트가 못 닫는 R6/R5b 잔존 리스크를 여기서 닫는다.
 *
 * 페이로드는 절대 신뢰하지 않는다: data.{orderId,paymentKey}로 "무엇을 조회할지"만 얻고,
 * 실제 상태·금액 판단은 전부 queryTossPayment(토스 권위 조회) 결과로만 한다 —
 * reconcile-confirming(U6, main)의 재조회+신원검증 패턴과 대칭이다.
 *
 * ★결제 웹훅 인증은 서명이 아니라 재조회가 권위다 — tosspayments-webhook-signature 헤더는
 * 토스 문서상 PAYOUT_STATUS_CHANGED 등 정산/셀러 이벤트 전용이고 PAYMENT_STATUS_CHANGED(이
 * 라우트가 처리하는 이벤트)엔 제공되지 않는다(Codex 리뷰로 확인, 2026-07). 예전 구현은
 * TOSS_WEBHOOK_SECRET을 설정하면 정상 결제 웹훅 전량이 서명 불일치로 401 거부되는 함정이
 * 있었다 — 그래서 서명 검증 분기를 아예 두지 않는다. 인증은 이 라우트가 페이로드를 신뢰하지
 * 않고 토스 결제 조회 API로 직접 재확인하는 것 자체로 성립한다.
 *
 * 항상 10초 내 응답한다(토스가 그 이상이면 재전송). 우리가 예상하는 상태(주문 없음/eventType
 * 불일치/신원 불일치/이미 처리됨 등)는 200으로 흡수해 재전송을 유도하지 않는다. DB/네트워크 오류
 * 등 "다시 시도하면 나아질 수 있는" 실패만 500으로 응답해 토스 재전송(최대 7회)을 유도한다
 * (모든 분기가 멱등이라 재전송이 안전하다).
 */
export async function POST(request: NextRequest) {
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    // 숫자가 아니거나 음수인 Content-Length는 위조/이상 요청 — 신뢰하지 않고 거부한다.
    if (!Number.isFinite(contentLength) || contentLength < 0) {
      return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
    }
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'payload-too-large' }, { status: 413 });
    }
  }

  const rawBody = await request.text();
  // 문자 길이(rawBody.length)가 아니라 실제 UTF-8 바이트 수로 재확인한다 — 멀티바이트 문자가
  // 섞이면 .length(코드 유닛 수)가 실제 바이트 수보다 작게 나와 제한을 우회할 수 있다.
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'payload-too-large' }, { status: 413 });
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

  if (!checkRateLimit(orderId)) {
    // 같은 orderId로 60초 내 10회 초과 — 토스 조회조차 하지 않고 조용히 무시한다(200).
    logServerError(`[POST /api/payments/webhook] 레이트리밋 초과 orderId=${orderId}`, {});
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  try {
    const order = await getOrderById(orderId);
    if (!order) {
      // 우리 시스템에 없는 주문 — 다른 상점/테스트 웹훅일 수 있다. 재시도해도 의미 없으니 200.
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // 토스 권위 조회 — 페이로드의 status는 절대 쓰지 않는다. 웹훅은 confirm/reconcile(10초)보다
    // 짧은 타임아웃(5초)을 넘겨 토스의 10초 응답 데드라인 안에 여유를 둔다.
    let tossResult;
    try {
      tossResult = await queryTossPayment(paymentKey, WEBHOOK_TOSS_TIMEOUT_MS);
    } catch (queryError) {
      if (queryError instanceof TossConfirmError && queryError.httpStatus !== null && queryError.httpStatus < 500) {
        // 토스가 4xx로 응답을 완료함(404=결제 없음 포함) — 영구 실패다. 재전송해도 나아지지
        // 않으므로 500 poison 루프(토스가 최대 7회까지 계속 재시도)를 만들지 않고 200으로 흡수한다.
        logServerError(
          `[POST /api/payments/webhook] 토스 조회 4xx(영구 실패, 재전송 무의미) orderId=${orderId} paymentKey=${paymentKey} httpStatus=${queryError.httpStatus}`,
          queryError,
        );
        return NextResponse.json({ ok: true }, { status: 200 });
      }
      // 네트워크/타임아웃/시크릿키 미설정(httpStatus null)·토스 5xx — 다시 시도하면 나아질 수
      // 있는 실패이므로 바깥 catch로 넘겨 500 → 토스 재전송을 유도한다.
      throw queryError;
    }
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
        // ★Codex 검토(위해성 없음 확인): 이 경로는 attacker가 자기 주문의 orderId를 조작해도
        // 악용할 수 없다 — DONE·금액일치를 통과하려면 attacker가 피해자 주문 "전액"을 실제로
        // 결제해야 하고, 그 돈은 우리 가맹점 계좌로 실수령된다(공격자에게 손해, 우리에게 이득).
        // 그래서 이 분기는 그대로 유지한다.
        const claimed = await claimOrderForConfirmation(orderId, paymentKey);
        if (claimed === 0) {
          // 경합 패자 — 다른 경로(confirm/reconcile)가 그 사이 먼저 처리했을 수 있다. 재조회 후 수렴.
          const latest = await getOrderById(orderId);
          if (latest?.paymentStatus === '결제완료') {
            return NextResponse.json({ ok: true }, { status: 200 });
          }
          if (latest?.paymentStatus === '승인중' && latest.paymentKey === paymentKey) {
            await setOrderPaid(orderId, { paymentKey, paidAt: new Date().toISOString() });
            return NextResponse.json({ ok: true }, { status: 200 });
          }
          // 그 사이 취소된 경우 등 — 재확정할 수 없는 상태. 사람이 봐야 하므로 시끄럽게 로그.
          logServerError(
            `[POST /api/payments/webhook] claim 실패 후에도 확정 불가 orderId=${orderId} paymentKey=${paymentKey} latestStatus=${latest?.paymentStatus}`,
            {},
          );
          return NextResponse.json({ ok: true }, { status: 200 });
        }
        await setOrderPaid(orderId, { paymentKey, paidAt: new Date().toISOString() });
        return NextResponse.json({ ok: true }, { status: 200 });
      }

      if (order.paymentStatus === '승인중') {
        // ★키 바인딩 필수 — setOrderPaid의 WHERE(payment_status='승인중' AND payment_key=?)가
        // 이미 방어하므로 이 체크가 없어도 DB는 안전하지만, 체크 없이 호출부만 보면 "왜 안전한지"가
        // 라우트 코드만으로 드러나지 않는다. 명시적으로 검증해 라우트 레벨에서도 의도를 보증한다.
        if (order.paymentKey !== paymentKey) {
          logServerError(
            `[POST /api/payments/webhook] 승인중 주문 paymentKey 불일치 orderId=${orderId} webhookKey=${paymentKey} storedKey=${order.paymentKey}`,
            {},
          );
          return NextResponse.json({ ok: true }, { status: 200 });
        }
        await setOrderPaid(orderId, { paymentKey, paidAt: new Date().toISOString() });
        return NextResponse.json({ ok: true }, { status: 200 });
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
      if (order.paymentStatus === '승인중') {
        // ★키 바인딩 필수 — cancelConfirmingAndRestore(0026 rpc)는 payment_key를 보지 않고
        // WHERE payment_status='승인중'만 본다. 그래서 이 취소 경로는 setOrderPaid와 달리
        // DB의 WHERE로 방어되지 않는다 — 라우트가 직접 키 일치를 검증하지 않으면, 이미 claim이
        // 새 paymentKey로 재시도를 시작한 주문을 옛 paymentKey의 취소류 웹훅이 잘못 취소시킬 수
        // 있다. 이 체크가 이 함수를 호출하는 유일한 방어선이다.
        if (order.paymentKey !== paymentKey) {
          logServerError(
            `[POST /api/payments/webhook] 승인중 주문 paymentKey 불일치(취소 시도) orderId=${orderId} webhookKey=${paymentKey} storedKey=${order.paymentKey}`,
            {},
          );
          return NextResponse.json({ ok: true }, { status: 200 });
        }
        await cancelConfirmingAndRestore(orderId);
        return NextResponse.json({ ok: true }, { status: 200 });
      }

      // ★CRITICAL 수정(Codex 리뷰, 이번 커밋) — '결제대기' 주문을 이 웹훅으로 취소시키는 경로를
      // 완전히 제거했다. orderId는 클라이언트(성공/실패 리다이렉트, 웹훅 페이로드)가 지정하는
      // 값이라, 공격자가 피해자의 실제 orderId를 자신의 새 결제 시도에 끼워 넣고 그 결제를
      // 중단(CANCELED)시키면, 이 라우트가 "토스가 그 orderId로 취소 웹훅을 보냈다"는 이유만으로
      // 피해자의 정상 '결제대기' 주문을 취소해버리는 벡터가 있었다(신원검증은 토스 응답의
      // orderId/paymentKey가 우리가 물어본 값과 같은지만 볼 뿐, 그 결제가 애초에 이 주문 소유였는지는
      // 보장하지 못한다). '결제대기' 만료 주문의 취소는 reclaim-stock cron이 10분 내 자동으로
      // 이미 전담하므로, 이 라우트가 손대는 것은 중복 기능이자 불필요한 공격 표면이었다.
      if (order.paymentStatus === '결제완료') {
        // 결제완료 확정건에 취소류 웹훅이 온 경우(회귀 방지) — 이미 확정된 결제를 취소·복원하지
        // 않는다. 실제 환불이 필요하면 별도 관리자 플로우로 처리한다(이 라우트의 스코프 밖).
        logServerError(
          `[POST /api/payments/webhook] 결제완료 확정건에 취소류(${tossResult.status}) 웹훅 수신, 취소 생략 orderId=${orderId}`,
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
