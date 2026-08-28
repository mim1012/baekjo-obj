import { isCarrierCode, SWEET_TRACKER_CODES } from '@/lib/carriers';
import { logServerError } from '@/lib/logServerError';
import type { DeliveryStatus, TrackingLevel, TrackingResult, TrackingStep } from '@/types';

export type { TrackingLevel, TrackingResult, TrackingStep };

const SWEET_TRACKER_BASE = 'https://info.sweettracker.co.kr';
const FETCH_TIMEOUT_MS = 8_000;

interface RawTrackingDetail {
  time?: unknown;
  timeString?: unknown;
  where?: unknown;
  kind?: unknown;
}

const PROVIDER_ERROR_REASONS = {
  '101': 'unknown-api-key',
  '102': 'expired-api-key',
  '103': 'quota-exceeded',
  '104': 'invalid-invoice-or-carrier',
  '105': 'same-invoice-daily-limit-exceeded',
  '106': 'invoice-query-error',
} as const satisfies Record<string, Extract<TrackingResult, { ok: false }>['reason']>;

type ProviderErrorCode = keyof typeof PROVIDER_ERROR_REASONS;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidLevel(value: unknown): value is TrackingLevel {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6;
}

export function levelToDeliveryStatus(level: number): DeliveryStatus {
  if (level <= 1) return '배송준비';
  if (level === 6) return '배송완료';
  if (level > 6) return '배송준비';
  return '배송중';
}

function normalizeInvoice(invoice: string): string {
  return invoice.replace(/\D/g, '');
}

function parseSteps(raw: unknown): TrackingStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is RawTrackingDetail => !!item && typeof item === 'object')
    .map((item) => ({
      time: typeof item.timeString === 'string' ? item.timeString : String(item.time ?? ''),
      where: typeof item.where === 'string' ? item.where : '',
      kind: typeof item.kind === 'string' ? item.kind : '',
    }));
}

async function fetchWithTimeout(url: string, headers?: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function redact(text: string, secret: string): string {
  if (!secret) return text;
  return text.split(secret).join('***');
}

function sanitizeFetchErrorForLog(error: unknown, secret: string): { name?: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: redact(error.message, secret) };
  }
  return { message: redact(String(error), secret) };
}

function isProviderErrorCode(value: string): value is ProviderErrorCode {
  return Object.hasOwn(PROVIDER_ERROR_REASONS, value);
}

function parseProviderError(parsed: Record<string, unknown>): TrackingResult | null {
  if (parsed.status !== false) return null;
  const code = typeof parsed.code === 'string' ? parsed.code : '';
  if (!isProviderErrorCode(code)) {
    return { ok: false, reason: 'quota-or-api-error', message: '알 수 없는 provider code' };
  }
  const reason = PROVIDER_ERROR_REASONS[code];
  const message = typeof parsed.msg === 'string' ? parsed.msg : undefined;
  return message === undefined ? { ok: false, reason } : { ok: false, reason, message };
}

export async function fetchTrackingInfoWithApiKey(
  carrier: string,
  invoice: string,
  apiKey: string | undefined,
): Promise<TrackingResult> {
  if (!isCarrierCode(carrier)) {
    return { ok: false, reason: 'invalid-carrier' };
  }

  const normalizedInvoice = normalizeInvoice(invoice);
  if (normalizedInvoice.length === 0) {
    return { ok: false, reason: 'not-found' };
  }

  if (!apiKey) {
    return { ok: false, reason: 'no-api-key' };
  }

  const tCode = SWEET_TRACKER_CODES[carrier];
  if (!tCode) {
    return { ok: false, reason: 'invalid-carrier' };
  }

  const url =
    `${SWEET_TRACKER_BASE}/api/v1/trackingInfo` +
    `?t_key=${encodeURIComponent(apiKey)}` +
    `&t_code=${encodeURIComponent(tCode)}` +
    `&t_invoice=${encodeURIComponent(normalizedInvoice)}`;

  let res: Response;
  try {
    res = await fetchWithTimeout(url);
  } catch (error) {
    logServerError(
      'sweettracker.fetchTrackingInfo:network',
      sanitizeFetchErrorForLog(error, apiKey),
    );
    return { ok: false, reason: 'quota-or-api-error', message: '네트워크 오류' };
  }

  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch (error) {
    logServerError(
      'sweettracker.fetchTrackingInfo:parse',
      sanitizeFetchErrorForLog(error, apiKey),
    );
    return { ok: false, reason: 'quota-or-api-error', message: '응답 파싱 실패' };
  }

  if (!isPlainObject(parsed)) {
    if (!res.ok) {
      logServerError('sweettracker.fetchTrackingInfo:http', { message: `status ${res.status}` });
    }
    return { ok: false, reason: 'quota-or-api-error', message: '응답 형식 오류' };
  }

  const providerError = parseProviderError(parsed);
  if (providerError) return providerError;

  if (!res.ok) {
    logServerError('sweettracker.fetchTrackingInfo:http', { message: `status ${res.status}` });
    return { ok: false, reason: 'quota-or-api-error', message: `HTTP ${res.status}` };
  }

  const steps = parseSteps(parsed.trackingDetails);
  if (parsed.result === 'N') {
    return { ok: false, reason: 'not-found' };
  }
  if (parsed.result !== 'Y') {
    return { ok: false, reason: 'quota-or-api-error', message: '알 수 없는 result' };
  }
  if (!isValidLevel(parsed.level)) {
    return { ok: false, reason: 'quota-or-api-error', message: '알 수 없는 level' };
  }

  const complete = parsed.complete === true || parsed.completeYN === 'Y';
  const invoiceNo = typeof parsed.invoiceNo === 'string' ? parsed.invoiceNo : normalizedInvoice;

  return {
    ok: true,
    level: parsed.level,
    complete,
    steps,
    deliveryStatus: levelToDeliveryStatus(parsed.level),
    invoiceNo,
  };
}

export async function fetchKeyUsageWithApiKey(
  apiKey: string | undefined,
): Promise<{ readonly total: number; readonly left: number } | null> {
  if (!apiKey) return null;

  try {
    const res = await fetchWithTimeout(`${SWEET_TRACKER_BASE}/api/v1/key/usage`, { key: apiKey });
    if (!res.ok) {
      logServerError('sweettracker.fetchKeyUsage:http', { message: `status ${res.status}` });
      return null;
    }
    const body: unknown = await res.json();
    if (!isPlainObject(body)) return null;
    if (typeof body.totalAmount !== 'number' || typeof body.leftAmount !== 'number') return null;
    return { total: body.totalAmount, left: body.leftAmount };
  } catch (error) {
    logServerError('sweettracker.fetchKeyUsage:network', sanitizeFetchErrorForLog(error, apiKey));
    return null;
  }
}
