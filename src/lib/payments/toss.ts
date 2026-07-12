/**
 * 토스페이먼츠 결제 승인 서버 호출. 시크릿 키는 process.env.TOSS_SECRET_KEY로만 읽는다
 * (서버 전용 — NEXT_PUBLIC_ 접두사 금지, 클라이언트 번들에 유입되면 안 됨).
 * 승인 성공 시 토스 응답을 그대로 반환하고, 실패 시 토스가 내려준 에러 코드/메시지를 담아 던진다
 * (호출부가 402/409 등으로 구분해 응답하도록).
 */

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';

export class TossConfirmError extends Error {
  constructor(
    message: string,
    public readonly tossCode: string | null,
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
    throw new TossConfirmError('toss-secret-key-missing', null);
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
    throw new TossConfirmError('toss-network-error', null);
  }

  const data = (await response.json().catch(() => null)) as
    | (TossConfirmResult & { code?: string; message?: string })
    | null;

  if (!response.ok || !data) {
    throw new TossConfirmError(data?.message ?? 'toss-confirm-failed', data?.code ?? null);
  }

  return {
    paymentKey: data.paymentKey,
    orderId: data.orderId,
    totalAmount: data.totalAmount,
    status: data.status,
  };
}
