import { NextResponse, type NextRequest } from 'next/server';
import { getOrderById, claimOrderForConfirmation } from '@/lib/orders/repo';
import { queryTossPayment, TossConfirmError } from '@/lib/payments/toss';
import { decidePaymentAction } from '@/lib/payments/decide';
import { applyPaymentAction } from '@/lib/payments/execute';
import { recordPaymentFinancialException } from '@/lib/payments/confirmPayment';
import { logServerError } from '@/lib/logServerError';

const MAX_BODY_BYTES = 20_000;
const MAX_ORDER_ID = 100;
const MAX_PAYMENT_KEY = 200;
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
 * POST /api/payments/webhook — 토스 웹훅 수신(PAYMENT_STATUS_CHANGED). 사용자가 successUrl에
 * 도달하지 못하고 이탈한 경우를 확정시키는 최후의 경로 — confirm이 못 닫는 R6/R5b를 여기서 닫는다.
 *
 * 페이로드는 절대 신뢰하지 않는다: data.{orderId,paymentKey}로 "무엇을 조회할지"만 얻고, 실제
 * 상태·금액 판단은 전부 queryTossPayment(권위 조회) 결과로만 한다 — reconcile과 대칭 패턴.
 *
 * ★인증은 서명이 아니라 재조회가 권위다 — tosspayments-webhook-signature 헤더는 PAYMENT_STATUS_CHANGED엔
 * 제공되지 않는다(Codex 리뷰 확인). 페이로드를 신뢰하지 않고 토스 조회 API로 직접 재확인하는 것
 * 자체로 인증이 성립한다.
 *
 * 항상 10초 내 응답한다. 예상 상태(주문 없음/신원 불일치/이미 처리됨 등)는 200으로 흡수해 재전송을
 * 유도하지 않는다. DB/네트워크 오류만 500으로 재전송(최대 7회)을 유도한다(모든 분기가 멱등이라 안전).
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

    const isDoneSignal = tossResult.status === 'DONE' && tossResult.totalAmount === expectedAmount;
    const action = decidePaymentAction(
      order,
      { kind: 'authoritative', payment: { paymentKey: tossResult.paymentKey, status: tossResult.status, amountMatches: tossResult.totalAmount === expectedAmount } },
      tossResult.paymentKey,
      'webhook',
    );

    // setOrderPaid가 0행이면(경합으로 이미 처리됐거나 WHERE 불일치) 조용히 넘어가지 않고 원인을
    // 구분한다(Codex 라운드6 — confirmPayment.ts의 applyAuthoritativeAction과 동일 패턴, 공유
    // 헬퍼 recordPaymentFinancialException 재사용 — 정책 복제 0).
    const confirmAndLogIfNoop = async () => {
      const result = await applyPaymentAction(action, orderId, paymentKey);
      if (result.applied === 'confirm' && result.affected === 0) {
        const latest = await getOrderById(orderId);
        if (latest?.paymentStatus === '결제완료') {
          return; // 경합 승자가 이미 확정을 마쳤다 — 멱등 수렴, 예외 아님.
        }
        if (latest && latest.paymentStatus !== '승인중') {
          // ★재무 예외 — '승인중'에서 벗어났는데(결제취소/환불완료 등) 우리는 방금 권위 DONE을
          // 확인했다. 조용히 넘어가지 않고 dead-letter로 표시한다.
          await recordPaymentFinancialException(
            '[POST /api/payments/webhook]',
            orderId,
            `setOrderPaid 0행 후 최신 상태 종결(${latest.paymentStatus})`,
          );
          return;
        }
        logServerError(
          `[POST /api/payments/webhook] setOrderPaid 0행(경합으로 이미 처리됐거나 WHERE 불일치) orderId=${orderId} paymentKey=${paymentKey}`,
          {},
        );
      }
    };

    const logUnresolvedAndAbsorb = () => {
      // ignore:'unknown-status'(도달 불가 — observation:'declined'는 confirm 전용이라 웹훅엔 없음)
      // 또는 retryLater — 그 외(DONE인데 금액 불일치, WAITING_FOR_DEPOSIT 등) 불명 취급.
      logServerError(
        `[POST /api/payments/webhook] 처리 대상 아닌 토스 상태 orderId=${orderId} tossStatus=${tossResult.status} ` +
          `tossAmount=${tossResult.totalAmount} expected=${expectedAmount}`,
        {},
      );
    };

    switch (action.kind) {
      case 'settled':
        // 이미 확정됨 — 멱등 no-op.
        break;

      case 'confirm':
        if (order.paymentStatus === '결제대기') {
          // claim된 적 없는 주문(사용자 이탈로 confirm 미도달) — 이게 웹훅이 존재하는 이유다. claim으로
          // 먼저 '승인중' 선전이 후 setOrderPaid해야 한다(순서 건너뛰면 WHERE 불일치로 no-op).
          // ★Codex 검토: attacker가 orderId를 조작해도 악용 불가 — DONE·금액일치를 통과하려면
          // 피해자 주문 "전액"을 실제로 결제해야 하고 그 돈은 우리 가맹점이 수령한다(공격자 손해).
          const claimed = await claimOrderForConfirmation(orderId, paymentKey);
          if (claimed === 0) {
            // 경합 패자 — 다른 경로(confirm/reconcile)가 그 사이 먼저 처리했을 수 있다. 재조회 후 수렴.
            const latest = await getOrderById(orderId);
            if (latest?.paymentStatus === '결제완료') {
              break;
            }
            if (latest?.paymentStatus === '승인중' && latest.paymentKey === paymentKey) {
              await confirmAndLogIfNoop();
              break;
            }
            // ★재무 예외(Codex 라운드5 HIGH-3, 라운드6에서 공유 헬퍼로 통합) — 이 분기에
            // 도달했다는 것 자체가 권위 DONE을 이미 관측했다는 뜻이다(action.kind==='confirm'은
            // 결제대기+DONE+금액일치에서만 나온다). 그런데 claim이 경합에 져서 재조회한 latest가
            // 결제완료도, 같은 키의 승인중도 아니다 — 그 사이 다른 경로(예: reclaim-stock)가 이
            // 주문을 취소시켰다는 뜻이라 "돈은 받았는데 주문은 취소됨"과 동일한 재무 예외다.
            // recordPaymentFinancialException이 실패를 삼키지 않으므로 바깥 catch로 전파돼
            // 500(토스 재전송 유도)이 된다.
            await recordPaymentFinancialException(
              '[POST /api/payments/webhook]',
              orderId,
              `claim 경합 패배 후 최신 상태 종결(주문이 그 사이 취소된 것으로 추정, latestStatus=${latest?.paymentStatus})`,
            );
            break;
          }
          await confirmAndLogIfNoop();
          break;
        }
        // order.paymentStatus === '승인중' — decide가 이미 keyMatches를 확인했으므로 여기 도달했다는
        // 것 자체가 키 바인딩이 맞다는 뜻이다. setOrderPaid의 WHERE도 동일 조건으로 한번 더 방어한다.
        await confirmAndLogIfNoop();
        break;

      case 'restoreConfirming':
        // ★키 바인딩 — cancelConfirmingAndRestore(0028)가 action.paymentKey(decide가 실은 증거)로
        // WHERE payment_status='승인중' AND payment_key=?를 확인해, 옛 키의 취소류 웹훅이 새 claim을
        // 잘못 취소시키지 않게 방어한다.
        await applyPaymentAction(action, orderId);
        break;

      case 'ignore':
        if (action.reason === 'key-mismatch') {
          logServerError(
            isDoneSignal
              ? `[POST /api/payments/webhook] 승인중 주문 paymentKey 불일치 orderId=${orderId} webhookKey=${paymentKey} storedKey=${order.paymentKey}`
              : `[POST /api/payments/webhook] 승인중 주문 paymentKey 불일치(취소 시도) orderId=${orderId} webhookKey=${paymentKey} storedKey=${order.paymentKey}`,
            {},
          );
        } else if (action.reason === 'conflicting-terminal-state') {
          if (isDoneSignal) {
            // ★재무 예외 — 결제취소/환불완료 등 이미 종결된 상태인데 권위 DONE 웹훅이 옴(돈은
            // 실제로 받았다). confirmPayment.ts의 applyAuthoritativeAction과 동일한 공유 헬퍼를
            // 쓴다(Codex 라운드6 — 웹훅에만 고치고 공유 코어에 안 고쳤던 라운드5의 재발 방지,
            // 정책 복제 0). 실패를 삼키지 않으므로 바깥 catch로 전파돼 500(토스 재전송)이 된다.
            await recordPaymentFinancialException(
              '[POST /api/payments/webhook]',
              orderId,
              `종결 상태(${order.paymentStatus})에서 DONE 웹훅 수신`,
            );
          } else if (order.paymentStatus === '결제완료') {
            // ★CRITICAL — '결제대기' 주문은 이 웹훅으로 취소시키지 않는다(decide.ts 참고: orderId
            // 위조로 피해자 주문을 취소시키는 벡터 차단). 결제완료 확정건에 취소류가 온 경우만
            // 로그(회귀 방지) — 이미 확정된 결제는 취소·복원하지 않는다. 실제 환불은 별도 관리자
            // 플로우(스코프 밖).
            logServerError(
              `[POST /api/payments/webhook] 결제완료 확정건에 취소류(${tossResult.status}) 웹훅 수신, 취소 생략 orderId=${orderId}`,
              {},
            );
          }
          // '결제대기' 등 그 외 상태는 의도적으로 무로그(원래 동작 보존).
        } else {
          logUnresolvedAndAbsorb();
        }
        break;

      case 'retryLater':
        logUnresolvedAndAbsorb();
        break;

      case 'proceedToClaim':
        // 웹훅은 항상 observation:'authoritative'로만 decide를 호출하므로 도달 불가(방어적).
        logServerError(`[POST /api/payments/webhook] 예상 밖 action orderId=${orderId} kind=proceedToClaim`, {});
        break;

      default: {
        const exhaustiveCheck: never = action;
        throw new Error(`[POST /api/payments/webhook] 처리되지 않은 action.kind: ${JSON.stringify(exhaustiveCheck)}`);
      }
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    // DB·네트워크 등 "다시 시도하면 나아질 수 있는" 실패 — 500으로 토스 재전송을 유도한다
    // (모든 분기가 멱등이라 안전).
    logServerError(`[POST /api/payments/webhook] 처리 실패 orderId=${orderId} paymentKey=${paymentKey}`, error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
