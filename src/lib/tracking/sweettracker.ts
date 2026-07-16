/**
 * 스마트택배(Sweet Tracker) 조회 클라이언트 — 순수 함수.
 * 이 파일은 의도적으로 스키마 무지(schema-agnostic)하다: 배송 데이터 모델(shipments 테이블,
 * order/brand 연동)이 별도 브랜치에서 재설계 중이라, 여기서는 "택배사 코드 + 송장번호"를 받아
 * 정규화된 조회 결과만 돌려준다. orders/DB 배선은 나중 단계에서 이 함수를 호출하는 쪽이 담당한다
 * — 그러니 이 파일은 `@/lib/orders/*` 를 import하지 않는다.
 *
 * 벤더 API 실측(2026-07-16, LIVE):
 * - GET https://info.sweettracker.co.kr/api/v1/trackingInfo?t_key=&t_code=&t_invoice=
 * - t_code 는 반드시 문자열(leading zero 포함, 예: 우체국 '01') — 숫자로 파싱하면 안 된다.
 *   내부 CarrierCode → 벤더 t_code 매핑은 @/lib/carriers 의 SWEET_TRACKER_CODES 하나만 쓴다
 *   (§4.6: 화이트리스트를 두 곳에 두면 드리프트).
 * - ⚠️ 함정: 미등록/알 수 없는 송장번호도 HTTP 200 + `result:'N'` + `trackingDetails:[]` 로 응답한다.
 *   HTTP 상태코드만 보고 성공 처리하면 안 되고 반드시 `result` 필드를 확인해야 한다.
 * - Swagger(v2/api-docs) 문서는 실제 응답 필드의 일부만 담은 축약 모델이라, 실측 응답 형태를
 *   진실로 두고 방어적으로 파싱한다.
 */
import { isCarrierCode, SWEET_TRACKER_CODES } from '@/lib/carriers';
import { logServerError } from '@/lib/logServerError';
import type { DeliveryStatus } from '@/types';

const SWEET_TRACKER_BASE = 'https://info.sweettracker.co.kr';
const FETCH_TIMEOUT_MS = 8_000;

export type TrackingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface TrackingStep {
  time: string;
  where: string;
  kind: string;
}

export type TrackingResult =
  | {
      ok: true;
      level: TrackingLevel;
      complete: boolean;
      steps: TrackingStep[];
      deliveryStatus: DeliveryStatus;
      invoiceNo: string;
    }
  | {
      ok: false;
      reason: 'not-found' | 'invalid-carrier' | 'no-api-key' | 'quota-or-api-error';
      message?: string;
    };

/** 벤더 응답의 trackingDetails[] 원소 — Swagger엔 없지만 실측 응답에 존재하는 필드까지 담는다. */
interface RawTrackingDetail {
  time?: unknown;
  timeString?: unknown;
  where?: unknown;
  kind?: unknown;
}

/** 벤더 trackingInfo 응답 — 실측 필드 중 이 파일이 실제로 쓰는 것만 좁게 선언(나머지는 무시). */
interface RawTrackingInfoResponse {
  result?: unknown;
  complete?: unknown;
  completeYN?: unknown;
  invoiceNo?: unknown;
  level?: unknown;
  trackingDetails?: unknown;
}

function isValidLevel(value: unknown): value is TrackingLevel {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 6;
}

/**
 * 벤더 level(1~6) → 화면 DeliveryStatus 매핑.
 * 1(배송준비중) → 배송준비
 * 2(집화완료)~5(배송출발) → 배송중 — 2는 "이미 판매자 손을 떠났다"는 뜻이라 배송준비로 두면
 *   관리자가 오해한다(택배기사 인계 완료 = 배송 시작으로 간주).
 * 6(배송완료) → 배송완료
 * 범위 밖 값(방어적 파싱 실패)은 가장 보수적인 '배송준비'로 폴백한다.
 */
export function levelToDeliveryStatus(level: number): DeliveryStatus {
  // 문자열 리터럴을 직접 반환한다(DELIVERY_STATUSES 배열 인덱싱 금지) — 배열 순서가 바뀌거나
  // 원소가 추가/삽입되면 인덱스 매핑은 타입 에러 없이 조용히 잘못된 상태를 반환한다.
  // 리터럴은 DeliveryStatus 유니온에 의해 오타가 컴파일 에러로 잡히면서도, 배열 재정렬의 영향을
  // 받지 않는다.
  if (level <= 1) return '배송준비';
  if (level >= 6) return '배송완료';
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

/**
 * 로그로 내보내기 전 비밀값(API 키 등)을 제거한다.
 * `text` 안에 `secret`이 그대로 들어있으면 전부 마스킹한다 — 비어있는 secret은 무시(치환 없음).
 */
function redact(text: string, secret: string): string {
  if (!secret) return text;
  return text.split(secret).join('***');
}

/**
 * fetch 실패(TypeError 등) 에러 객체를 안전하게 로그용으로 축약한다.
 * Node의 fetch 실패는 message/stack/cause 어디에도 요청 URL(=API 키가 박힌 쿼리스트링)을 실어
 * 나를 수 있다. logServerError가 `error.message`만 추출한다 해도, message 자체에 URL이 섞여
 * 나오는 벤더/런타임 조합을 배제할 수 없으므로 message를 한 번 더 redact()로 마스킹해서 넘긴다.
 * stack/cause는 애초에 로거에 넘기지 않는다(여기서 사용하지 않음).
 */
function sanitizeFetchErrorForLog(error: unknown, secret: string): { name?: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: redact(error.message, secret) };
  }
  return { message: redact(String(error), secret) };
}

/**
 * 택배사 코드 + 송장번호로 배송 조회 결과를 가져온다.
 * 절대 throw 하지 않는다 — 네트워크/파싱 실패는 `{ok:false, reason:'quota-or-api-error'}`로 흡수한다
 * (호출부가 서버리스 함수 하나를 이 함수 실패로 통째로 죽이지 않도록).
 */
export async function fetchTrackingInfo(carrier: string, invoice: string): Promise<TrackingResult> {
  if (!isCarrierCode(carrier)) {
    return { ok: false, reason: 'invalid-carrier' };
  }

  const normalizedInvoice = normalizeInvoice(invoice);
  if (normalizedInvoice.length === 0) {
    return { ok: false, reason: 'not-found' };
  }

  const apiKey = process.env.SWEETTRACKER_API_KEY;
  if (!apiKey) {
    // 키가 아직 발급/등록되지 않은 상태 — 앱은 @/lib/carriers 의 기존 딥링크로 우아하게 성능
    // 저하(degrade)해야 하므로 던지지 않는다.
    return { ok: false, reason: 'no-api-key' };
  }

  const tCode = SWEET_TRACKER_CODES[carrier];
  const url =
    `${SWEET_TRACKER_BASE}/api/v1/trackingInfo` +
    `?t_key=${encodeURIComponent(apiKey)}` +
    `&t_code=${encodeURIComponent(tCode)}` +
    `&t_invoice=${encodeURIComponent(normalizedInvoice)}`;

  let res: Response;
  try {
    res = await fetchWithTimeout(url);
  } catch (error) {
    // 원본 에러(특히 cause/stack)에는 요청 URL(=t_key 쿼리스트링에 박힌 API 키)이 실려 나올 수
    // 있어 절대 그대로 로거에 넘기지 않는다 — name/message만, 그것도 redact()로 마스킹해서 넘긴다.
    logServerError(
      'sweettracker.fetchTrackingInfo:network',
      sanitizeFetchErrorForLog(error, apiKey),
    );
    return { ok: false, reason: 'quota-or-api-error', message: '네트워크 오류' };
  }

  if (!res.ok) {
    logServerError('sweettracker.fetchTrackingInfo:http', { message: `status ${res.status}` });
    return { ok: false, reason: 'quota-or-api-error', message: `HTTP ${res.status}` };
  }

  let body: RawTrackingInfoResponse;
  try {
    body = (await res.json()) as RawTrackingInfoResponse;
  } catch (error) {
    logServerError('sweettracker.fetchTrackingInfo:parse', error);
    return { ok: false, reason: 'quota-or-api-error', message: '응답 파싱 실패' };
  }

  // ⚠️ 함정 방어: HTTP 200이어도 result==='N'이면 미등록/조회불가 송장이다.
  // result:'N'만 미등록이다 — 등록 직후(집화 전) 주문은 result:'Y' + level:1 + 빈
  // trackingDetails로 올 수 있어, 빈 배열을 미등록으로 접으면 "송장 등록됨, 아직 집화 전"이라는
  // 정상 상태를 잃는다. 그래서 steps.length===0 은 더 이상 not-found 판정에 쓰지 않는다.
  const steps = parseSteps(body.trackingDetails);
  if (body.result === 'N') {
    return { ok: false, reason: 'not-found' };
  }

  if (!isValidLevel(body.level)) {
    // level을 신뢰할 수 없으면 조회 결과를 성공으로 단정할 수 없다 — API 이상 응답으로 취급.
    return { ok: false, reason: 'quota-or-api-error', message: '알 수 없는 level' };
  }

  const complete = body.complete === true || body.completeYN === 'Y';
  const invoiceNo = typeof body.invoiceNo === 'string' ? body.invoiceNo : normalizedInvoice;

  return {
    ok: true,
    level: body.level,
    complete,
    steps,
    deliveryStatus: levelToDeliveryStatus(body.level),
    invoiceNo,
  };
}

/** 스마트택배 API 키의 남은 조회 가능 건수. 키 미설정/조회 실패 시 null(호출부가 UI를 숨기도록). */
export async function fetchKeyUsage(): Promise<{ total: number; left: number } | null> {
  const apiKey = process.env.SWEETTRACKER_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetchWithTimeout(`${SWEET_TRACKER_BASE}/api/v1/key/usage`, { key: apiKey });
    if (!res.ok) {
      logServerError('sweettracker.fetchKeyUsage:http', { message: `status ${res.status}` });
      return null;
    }
    const body = (await res.json()) as { totalAmount?: unknown; leftAmount?: unknown };
    if (typeof body.totalAmount !== 'number' || typeof body.leftAmount !== 'number') return null;
    return { total: body.totalAmount, left: body.leftAmount };
  } catch (error) {
    // 이 호출은 키를 URL이 아니라 헤더(`key`)로 보내므로 fetch 실패 에러에 URL을 통해 키가 실릴
    // 위험은 fetchTrackingInfo보다 낮다 — 그래도 방어적으로 동일하게 sanitize해서 넘긴다.
    logServerError('sweettracker.fetchKeyUsage:network', sanitizeFetchErrorForLog(error, apiKey));
    return null;
  }
}
