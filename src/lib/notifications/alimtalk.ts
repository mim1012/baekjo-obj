import 'server-only';
import crypto from 'node:crypto';
import {
  buildAlimtalkMessage,
  maskPhone,
  normalizeKoreanMobile,
  type AlimtalkEvent,
  type AlimtalkMessageData,
} from '@/lib/notifications/alimtalkMessages';

// 솔라피(Solapi) 카카오 알림톡 발송 클라이언트. 비즈니스 흐름(결제·배송·취소)을 절대 막거나
// 깨뜨리면 안 되므로 sendAlimtalk는 어떤 경우에도 던지지 않고 결과만 돌려준다.
// 전화번호 원문과 시크릿은 로그에 남기지 않는다(마스킹 010****5678).

const SOLAPI_API_BASE = 'https://api.solapi.com';
const SEND_TIMEOUT_MS = 8000;

export interface SolapiSendRequest {
  url: string;
  headers: Record<string, string>;
  body: unknown;
}
export interface SolapiSendResponse {
  status: number;
  body: unknown;
}
/** 테스트에서 네트워크 없이 교체할 수 있는 전송 계층. */
export type AlimtalkTransport = (request: SolapiSendRequest) => Promise<SolapiSendResponse>;

export interface AlimtalkLogger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

export interface AlimtalkDeps {
  transport?: AlimtalkTransport;
  env?: Record<string, string | undefined>;
  logger?: AlimtalkLogger;
  now?: () => Date;
}

export type AlimtalkSendResult =
  | { status: 'sent' }
  | { status: 'skipped'; reason: 'disabled' | 'missing-credentials' | 'non-production' | 'invalid-phone' | 'invalid-message' }
  | { status: 'failed'; reason: string };

const defaultLogger: AlimtalkLogger = {
  info: (message) => console.info(message),
  warn: (message) => console.warn(message),
  error: (message) => console.error(message),
};

export function isAlimtalkEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.ALIMTALK_ENABLED?.trim() === 'true';
}

/** 외부 응답·에러 문구를 로그에 남기기 전에 번호처럼 보이는 긴 숫자열을 가리고 길이를 제한한다. */
function scrub(text: string, secrets: readonly (string | undefined)[] = []): string {
  let safe = text;
  for (const secret of secrets) {
    if (secret) safe = safe.split(secret).join('***');
  }
  return safe.replace(/\d{9,}/g, (digits) => maskPhone(digits)).slice(0, 200);
}

function authorizationHeader(apiKey: string, apiSecret: string, now: Date): string {
  const date = now.toISOString();
  const salt = crypto.randomBytes(16).toString('hex');
  const signature = crypto.createHmac('sha256', apiSecret).update(date + salt).digest('hex');
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

const fetchTransport: AlimtalkTransport = async ({ url, headers, body }) => {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // JSON이 아니면 원문 그대로(로그에선 scrub 후 잘라 쓴다)
  }
  return { status: response.status, body: parsed };
};

function describeFailure(response: SolapiSendResponse, secrets: readonly (string | undefined)[]): string | null {
  const body = response.body && typeof response.body === 'object' ? (response.body as Record<string, unknown>) : null;
  if (response.status < 200 || response.status >= 300) {
    const code = typeof body?.errorCode === 'string' ? body.errorCode : '';
    const message = typeof body?.errorMessage === 'string' ? body.errorMessage : '';
    return scrub(`http-${response.status} ${code} ${message}`.trim(), secrets);
  }
  // 단건 발송 응답: 접수 성공은 statusCode "2000". 다른 코드는 HTTP 200이어도 실패다.
  if (typeof body?.statusCode === 'string' && body.statusCode !== '2000') {
    const message = typeof body.statusMessage === 'string' ? body.statusMessage : '';
    return scrub(`status-${body.statusCode} ${message}`.trim(), secrets);
  }
  const failed = body?.failedMessageList;
  if (Array.isArray(failed) && failed.length > 0) {
    const first = failed[0] as Record<string, unknown> | undefined;
    const code = typeof first?.statusCode === 'string' ? first.statusCode : '';
    const message = typeof first?.statusMessage === 'string' ? first.statusMessage : '';
    return scrub(`message-failed ${code} ${message}`.trim(), secrets);
  }
  return null;
}

/**
 * 알림톡 1건 발송. 안전 스위치:
 *  - ALIMTALK_ENABLED가 정확히 "true"가 아니면 발송하지 않는다.
 *  - SOLAPI_API_KEY/SECRET/PF_ID가 없으면 건너뛴다.
 *  - ALIMTALK_TEST_RECIPIENT가 있으면 고객 번호 대신 그 번호로만 보낸다(로컬·스테이징 시험용).
 * disableSms:true — 알림톡 실패 시 대체문자는 보내지 않는다.
 */
export async function sendAlimtalk(
  event: AlimtalkEvent,
  data: AlimtalkMessageData,
  customerPhone: string | null | undefined,
  deps: AlimtalkDeps = {},
): Promise<AlimtalkSendResult> {
  const env = deps.env ?? process.env;
  const log = deps.logger ?? defaultLogger;
  const tag = `[alimtalk] event=${event} order=${data.orderNumber}`;

  try {
    if (!isAlimtalkEnabled(env)) {
      log.info('[alimtalk] skipped (disabled)');
      return { status: 'skipped', reason: 'disabled' };
    }

    const apiKey = env.SOLAPI_API_KEY?.trim();
    const apiSecret = env.SOLAPI_API_SECRET?.trim();
    const pfId = env.SOLAPI_PF_ID?.trim();
    if (!apiKey || !apiSecret || !pfId) {
      log.warn(`${tag} skipped (missing SOLAPI credentials)`);
      return { status: 'skipped', reason: 'missing-credentials' };
    }

    const testRecipient = env.ALIMTALK_TEST_RECIPIENT?.trim();
    // 운영(Vercel production) 밖에서는 시험 수신번호 없이 고객에게 보내지 않는다(로컬은 VERCEL_ENV가 없어 동일하게 막힘).
    if (env.VERCEL_ENV !== 'production' && !testRecipient) {
      log.warn('[alimtalk] skipped (non-production without ALIMTALK_TEST_RECIPIENT)');
      return { status: 'skipped', reason: 'non-production' };
    }
    const rawPhone = testRecipient ? testRecipient : customerPhone;
    const to = normalizeKoreanMobile(rawPhone);
    if (!to) {
      log.warn(`${tag} skipped (invalid phone ${maskPhone(rawPhone)})`);
      return { status: 'skipped', reason: 'invalid-phone' };
    }
    if (testRecipient) {
      log.info(`${tag} redirected to test recipient ${maskPhone(to)}`);
    }

    let message;
    try {
      message = buildAlimtalkMessage(event, data);
    } catch (error) {
      log.warn(`${tag} skipped (${error instanceof Error ? error.message : 'invalid message'})`);
      return { status: 'skipped', reason: 'invalid-message' };
    }

    const transport = deps.transport ?? fetchTransport;
    const response = await transport({
      url: `${SOLAPI_API_BASE}/messages/v4/send`,
      headers: {
        Authorization: authorizationHeader(apiKey, apiSecret, (deps.now ?? (() => new Date()))()),
        'Content-Type': 'application/json',
      },
      body: {
        message: {
          to,
          type: 'ATA',
          kakaoOptions: {
            pfId,
            templateId: message.templateId,
            variables: message.variables,
            disableSms: true,
          },
        },
      },
    });

    const failure = describeFailure(response, [apiKey, apiSecret]);
    if (failure) {
      log.error(`${tag} send failed (${failure})`);
      return { status: 'failed', reason: failure };
    }
    const messageId =
      response.body && typeof response.body === 'object' && typeof (response.body as Record<string, unknown>).messageId === 'string'
        ? ` messageId=${scrub((response.body as Record<string, string>).messageId)}`
        : '';
    log.info(`${tag} sent to ${maskPhone(to)}${messageId}`);
    return { status: 'sent' };
  } catch (error) {
    const reason = scrub(error instanceof Error ? error.message : String(error), [env.SOLAPI_API_KEY, env.SOLAPI_API_SECRET]);
    log.error(`${tag} send failed (${reason})`);
    return { status: 'failed', reason };
  }
}
