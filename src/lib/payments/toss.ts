/**
 * 토스페이먼츠 결제 승인 서버 호출. 시크릿 키는 process.env.TOSS_SECRET_KEY로만 읽는다
 * (서버 전용 — NEXT_PUBLIC_ 접두사 금지, 클라이언트 번들에 유입되면 안 됨).
 * 승인 성공 시 토스 응답을 그대로 반환하고, 실패 시 토스가 내려준 에러 코드/메시지를 담아 던진다
 * (호출부가 402/409 등으로 구분해 응답하도록).
 */

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';
const TOSS_PAYMENT_QUERY_URL = 'https://api.tosspayments.com/v1/payments';

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

interface TossConfirmResult {
  paymentKey: string;
  orderId: string;
  totalAmount: number;
  status: string;
}

/** POST /v1/payments/confirm — Basic 인증(시크릿키:빈 password, base64). amount는 원 단위 정수. */
export async function confirmTossPayment(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<TossConfirmResult> {
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
    });
  } catch {
    throw new TossConfirmError('toss-network-error', null, null);
  }

  const data = (await response.json().catch(() => null)) as
    | (TossConfirmResult & { code?: string; message?: string })
    | null;

  if (!response.ok || !data) {
    throw new TossConfirmError(data?.message ?? 'toss-confirm-failed', data?.code ?? null, response.status);
  }

  return {
    paymentKey: data.paymentKey,
    orderId: data.orderId,
    totalAmount: data.totalAmount,
    status: data.status,
  };
}

/**
 * GET /v1/payments/{paymentKey} — 토스에 결제 실제 상태를 직접 재조회(권위 소스).
 * reconcile cron(U6)·webhook(U5)이 페이로드/claim 시점 정보를 신뢰하지 않고 이 조회 결과로만
 * 확정·취소를 판단한다. Basic 인증은 confirmTossPayment와 동일. 404(결제 없음)도 토스가 응답을
 * 완료한 것이므로 TossConfirmError(httpStatus=404)로 던져 호출부가 "거절/미존재"와 "불명"을
 * 구분할 수 있게 한다.
 */
export async function queryTossPayment(paymentKey: string): Promise<TossConfirmResult> {
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
    });
  } catch {
    throw new TossConfirmError('toss-network-error', null, null);
  }

  const data = (await response.json().catch(() => null)) as
    | (TossConfirmResult & { code?: string; message?: string })
    | null;

  if (!response.ok || !data) {
    throw new TossConfirmError(data?.message ?? 'toss-query-failed', data?.code ?? null, response.status);
  }

  return {
    paymentKey: data.paymentKey,
    orderId: data.orderId,
    totalAmount: data.totalAmount,
    status: data.status,
  };
}
