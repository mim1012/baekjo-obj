/**
 * 토스페이먼츠 결제 승인 서버 호출. 시크릿 키는 process.env.TOSS_SECRET_KEY로만 읽는다
 * (서버 전용 — NEXT_PUBLIC_ 접두사 금지, 클라이언트 번들에 유입되면 안 됨).
 * 승인 성공 시 토스 응답을 그대로 반환하고, 실패 시 토스가 내려준 에러 코드/메시지를 담아 던진다
 * (호출부가 402/409 등으로 구분해 응답하도록).
 */

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';
const TOSS_PAYMENT_QUERY_URL = 'https://api.tosspayments.com/v1/payments';
const TOSS_PAYMENT_QUERY_BY_ORDER_URL = 'https://api.tosspayments.com/v1/payments/orders';
const TOSS_CANCEL_URL = 'https://api.tosspayments.com/v1/payments';
// 응답이 없는 요청이 무한정 매달려 cron/confirm 라우트를 막지 않도록 상한을 둔다.
// 타임아웃은 fetch가 AbortError를 던지므로 아래 catch에서 network-error와 동일하게 "불명"(httpStatus null)로 흡수된다.
const TOSS_FETCH_TIMEOUT_MS = 10_000;

export class TossConfirmError extends Error {
  constructor(
    message: string,
    public readonly tossCode: string | null,
    /** 토스 응답 HTTP status. 네트워크 실패·시크릿키 미설정처럼 응답 자체를 못 받은 경우 null —
     *  호출부가 "확정 거절(4xx)"과 "결과 불명(네트워크/5xx)"을 구분하는 데 쓴다. */
    public readonly httpStatus: number | null,
  ) {
    super(message);
    this.name = 'TossConfirmError';
  }
}

export interface TossConfirmResult {
  paymentKey: string;
  orderId: string;
  totalAmount: number;
  status: string;
}

/**
 * 토스 2xx 응답 바디의 런타임 검증 — confirmPayment.ts의 바인딩 검증/이중승인 판단이 이 결과의
 * orderId·paymentKey·totalAmount·status를 그대로 신뢰하므로(claim 여부·재고 복원 여부를 이 값들로
 * 결정한다), 필드가 기대 타입이 아닌 응답을 그냥 캐스팅해서 넘기면 그 판단 전체가 흔들린다
 * (Codex 재검증 HIGH — "queryTossPayment가 임의 JSON을 캐스팅만 한다"). 응답을 unknown으로 받아
 * 이 함수를 반드시 통과해야만 TossConfirmResult로 좁혀진다.
 */
function isValidTossConfirmResult(data: unknown): data is TossConfirmResult {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.paymentKey === 'string' &&
    d.paymentKey.length > 0 &&
    typeof d.orderId === 'string' &&
    d.orderId.length > 0 &&
    typeof d.totalAmount === 'number' &&
    Number.isFinite(d.totalAmount) &&
    typeof d.status === 'string' &&
    d.status.length > 0
  );
}

/** 실패 응답(비-2xx)에서 에러 코드/메시지만 느슨하게 읽는다 — 사람이 읽는 로그용이라 형식이
 *  달라도 안전하게 undefined로 흡수한다(성공 응답과 달리 이 값들로 판단·전이를 결정하지 않는다). */
function readErrorFields(data: unknown): { code: string | null; message: string | null } {
  if (!data || typeof data !== 'object') return { code: null, message: null };
  const d = data as Record<string, unknown>;
  return {
    code: typeof d.code === 'string' ? d.code : null,
    message: typeof d.message === 'string' ? d.message : null,
  };
}

/** POST /v1/payments/confirm — Basic 인증(시크릿키:빈 password, base64). amount는 원 단위 정수.
 *  timeoutMs 기본값은 TOSS_FETCH_TIMEOUT_MS(10초, 기존 confirm/reconcile 경로 무영향) —
 *  successUrl(GET /api/payments/return, R4)처럼 사용자가 브라우저에서 결과를 기다리는 경로는
 *  더 짧은 값을 넘겨 최악 대기시간을 줄인다(queryTossPayment와 동일 패턴). */
export async function confirmTossPayment(
  params: { paymentKey: string; orderId: string; amount: number },
  timeoutMs: number = TOSS_FETCH_TIMEOUT_MS,
): Promise<TossConfirmResult> {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    // 설정 오류 — 토스에 요청 자체가 안 나갔으니 network-error와 동일하게 "결과 불명"(httpStatus null)로 던진다.
    throw new TossConfirmError('toss-secret-key-missing', null, null);
  }

  const authHeader = 'Basic ' + Buffer.from(`${secretKey}:`).toString('base64');

  let response: Response;
  try {
    response = await fetch(TOSS_CONFIRM_URL, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new TossConfirmError('toss-network-error', null, null);
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok || !data) {
    const { code, message } = readErrorFields(data);
    throw new TossConfirmError(message ?? 'toss-confirm-failed', code, response.status);
  }

  if (!isValidTossConfirmResult(data)) {
    // 2xx인데 기대한 필드 형태가 아님 — 토스가 응답은 완료했지만 우리가 신뢰할 수 있는 모양이
    // 아니다. 승인됐는지 여부를 판단할 근거가 없으므로 취소·확정 어느 쪽도 하지 않는 "불명"으로
    // 던진다(httpStatus는 그대로 넘겨 호출부가 4xx/2xx 구분 로직에 흔들리지 않게 한다).
    throw new TossConfirmError('toss-response-schema-invalid', null, response.status);
  }

  return data;
}

/**
 * GET /v1/payments/{paymentKey} — 토스에 결제 실제 상태를 직접 재조회(권위 소스).
 * reconcile cron(U6)·webhook(U5)이 페이로드/claim 시점 정보를 신뢰하지 않고 이 조회 결과로만
 * 확정·취소를 판단한다. Basic 인증은 confirmTossPayment와 동일. 404(결제 없음)도 토스가 응답을
 * 완료한 것이므로 TossConfirmError(httpStatus=404)로 던져 호출부가 "거절/미존재"와 "불명"을
 * 구분할 수 있게 한다. timeoutMs 기본값은 TOSS_FETCH_TIMEOUT_MS(10초, cron 무영향) — 웹훅은
 * 토스가 요구하는 10초 응답 데드라인 안에 여유를 두려고 더 짧은 값(5초)을 넘긴다.
 */
export async function queryTossPayment(
  paymentKey: string,
  timeoutMs: number = TOSS_FETCH_TIMEOUT_MS,
): Promise<TossConfirmResult> {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    throw new TossConfirmError('toss-secret-key-missing', null, null);
  }

  const authHeader = 'Basic ' + Buffer.from(`${secretKey}:`).toString('base64');

  let response: Response;
  try {
    response = await fetch(`${TOSS_PAYMENT_QUERY_URL}/${encodeURIComponent(paymentKey)}`, {
      method: 'GET',
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new TossConfirmError('toss-network-error', null, null);
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok || !data) {
    const { code, message } = readErrorFields(data);
    throw new TossConfirmError(message ?? 'toss-query-failed', code, response.status);
  }

  if (!isValidTossConfirmResult(data)) {
    // confirmTossPayment와 동일한 근거 — 형태가 안 맞는 2xx는 신뢰할 수 없으니 불명으로 던진다.
    throw new TossConfirmError('toss-response-schema-invalid', null, response.status);
  }

  return data;
}

/**
 * GET /v1/payments/orders/{orderId} — 주문번호로 토스 결제를 역조회한다(권위 소스,
 * paymentKey 불필요). reclaim-stock cron(U7, R4 최종 라운드)이 만료된 '결제대기' 주문을
 * 취소하기 **전에** 이걸로 실제 결제 여부를 확인한다 — claim/successUrl 미도달로 paymentKey를
 * 아직 모르는 상태에서도 "이 orderId로 결제가 이미 끝났는지"를 물을 수 있는 유일한 방법이다
 * (이게 없으면 브라우저가 successUrl 도달 전에 죽은 실결제 주문이 만료 cron에 그냥 취소돼
 * 돈이 빠져나간 채 재고만 복원되는 손실이 생긴다). Basic 인증·타임아웃·런타임 스키마 검증은
 * queryTossPayment와 동일 — 형태가 안 맞는 응답은 신뢰하지 않고 "불명"으로 던진다.
 */
export async function queryTossPaymentByOrderId(
  orderId: string,
  timeoutMs: number = TOSS_FETCH_TIMEOUT_MS,
): Promise<TossConfirmResult> {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    throw new TossConfirmError('toss-secret-key-missing', null, null);
  }

  const authHeader = 'Basic ' + Buffer.from(`${secretKey}:`).toString('base64');

  let response: Response;
  try {
    response = await fetch(`${TOSS_PAYMENT_QUERY_BY_ORDER_URL}/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new TossConfirmError('toss-network-error', null, null);
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok || !data) {
    const { code, message } = readErrorFields(data);
    throw new TossConfirmError(message ?? 'toss-query-by-order-failed', code, response.status);
  }

  if (!isValidTossConfirmResult(data)) {
    throw new TossConfirmError('toss-response-schema-invalid', null, response.status);
  }

  return data;
}

/** 취소(cancel) 2xx 응답은 confirm/query와 같은 필드 모양이되, status가 반드시
 *  'CANCELED'|'PARTIAL_CANCELED' 중 하나여야 "실제로 취소됐다"고 신뢰할 수 있다 — 다른 status가
 *  섞인 2xx를 취소 성공으로 오판하면 refundOrderAndRestore(재고 복원 RPC)가 잘못 뒤따라 돈다. */
function isValidTossCancelResult(data: unknown): data is TossConfirmResult {
  if (!isValidTossConfirmResult(data)) return false;
  return data.status === 'CANCELED' || data.status === 'PARTIAL_CANCELED';
}

/**
 * POST /v1/payments/{paymentKey}/cancel — 관리자 환불(U4)이 DB 상태를 '환불완료'로 쓰기 **전에**
 * 반드시 먼저 호출한다("돈 먼저, 라벨 나중" 원칙). Basic 인증·타임아웃·네트워크/스키마 오류 처리는
 * confirmTossPayment와 동일 패턴 — 실패 시 TossConfirmError를 던져 호출부가 상태·재고를 그대로 두고
 * 에러를 전파하게 한다(응답을 못 받은 경우 httpStatus=null, 토스가 명시 거절한 4xx는 그 status 그대로).
 */
export async function cancelTossPayment(
  paymentKey: string,
  cancelReason: string,
  timeoutMs: number = TOSS_FETCH_TIMEOUT_MS,
): Promise<TossConfirmResult> {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    throw new TossConfirmError('toss-secret-key-missing', null, null);
  }

  const authHeader = 'Basic ' + Buffer.from(`${secretKey}:`).toString('base64');

  let response: Response;
  try {
    response = await fetch(`${TOSS_CANCEL_URL}/${encodeURIComponent(paymentKey)}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancelReason }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new TossConfirmError('toss-network-error', null, null);
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok || !data) {
    const { code, message } = readErrorFields(data);
    throw new TossConfirmError(message ?? 'toss-cancel-failed', code, response.status);
  }

  if (!isValidTossCancelResult(data)) {
    throw new TossConfirmError('toss-response-schema-invalid', null, response.status);
  }

  return data;
}
