// 배송 파생·검증 순수 함수. Supabase를 import하지 않는다 — 값 계산만 하므로 브라우저·테스트에서
// 그대로 구동된다. shipments/repo.ts(DB 접근)와 라우트(HTTP) 사이에 끼는 결정 레이어로,
// 결제의 decide.ts(순수 결정 함수)와 같은 사상이다.
import { DELIVERY_STATUSES, PAID_PAYMENT_STATUS, type DeliveryStatus, type OrderItem, type Shipment, type ShipmentDeliveryStatus } from '@/types';
import { isCarrierCode } from '@/lib/carriers';

/** 배송 상태의 진행 서열. 파생(deriveOrderDeliveryStatus)·스탬프(resolveShipmentStamps)가
 *  "어디까지 진행됐나"를 숫자로 비교하는 데 쓴다. 미지 문자열은 여기 없으므로 rank 조회 시 0 취급. */
export const SHIPMENT_STATUS_RANK: Record<ShipmentDeliveryStatus, number> = {
  배송전: 0,
  배송준비: 1,
  배송중: 2,
  배송완료: 3,
  구매확정: 4,
};

/** 미지 상태 문자열은 rank 0(배송전)으로 접는다 — DB의 delivery_status는 자유 text라 어휘집 밖 값이
 *  들어올 수 있고, 그런 행이 파생을 조용히 끌어올리지 않게 한다. */
function rankOf(status: string | undefined): number {
  if (status === undefined) return 0;
  return SHIPMENT_STATUS_RANK[status as ShipmentDeliveryStatus] ?? 0;
}

/**
 * 주문에 스냅샷된 브랜드 id들의 중복 제거 목록. 단, item 하나라도 brandId가 없으면 null을 반환한다
 * — 레거시 주문(brandId 도입 전 items jsonb)은 어떤 브랜드가 몇 개인지 알 수 없어 주문 단위 배송을
 * 파생하면 안 된다(일부 업체가 통째로 누락된 채 "전부 배송완료"로 오판할 수 있다). null이면 호출부는
 * 주문 단위 파생을 건너뛴다.
 */
export function orderBrandIds(items: OrderItem[]): string[] | null {
  const ids: string[] = [];
  for (const it of items) {
    if (!it.brandId) return null;
    if (!ids.includes(it.brandId)) ids.push(it.brandId);
  }
  return ids;
}

/**
 * 주문 단위 배송 상태를 업체별 송장들로부터 파생한다. 각 브랜드(=번들)마다 해당 송장의 rank를 보되,
 * 송장 행이 없거나 어휘집 밖 상태인 번들은 rank 0(배송전)으로 친다. 규칙(가장 뒤처진 번들이 주문을
 * 대표):
 *   - 모든 번들이 rank≥3 → '배송완료'   (구매확정은 배송완료 이상으로 친다)
 *   - 아니면 하나라도 rank≥2 → '배송중'
 *   - 아니면 하나라도 rank≥1 → '배송준비'
 *   - 그 외 → '배송전'                  (brandIds가 비면 '배송전')
 */
export function deriveOrderDeliveryStatus(
  brandIds: string[],
  shipments: Shipment[],
): DeliveryStatus {
  if (brandIds.length === 0) return '배송전';

  const rankByBrand = new Map<string, number>();
  for (const s of shipments) rankByBrand.set(s.brandId, rankOf(s.deliveryStatus));

  const ranks = brandIds.map((id) => rankByBrand.get(id) ?? 0);

  if (ranks.every((r) => r >= 3)) return '배송완료';
  if (ranks.some((r) => r >= 2)) return '배송중';
  if (ranks.some((r) => r >= 1)) return '배송준비';
  return '배송전';
}

/** 관리자 송장 PATCH가 받는 입력(carrier/trackingNumber/deliveryStatus만). */
export type AdminShipmentPatchInput = Partial<
  Pick<Shipment, 'carrier' | 'trackingNumber' | 'deliveryStatus'>
>;

const MAX_CARRIER = 40;
const MAX_TRACKING = 100;

/**
 * 관리자 송장 PATCH body 검증. admin orders 라우트 validate()와 같은 규칙을 따른다:
 * object가 아니면 null, carrier는 문자열 ≤40('' 는 해제 신호로 허용, 그 외는 isCarrierCode 통과 필수),
 * trackingNumber는 문자열 ≤100, deliveryStatus는 DELIVERY_STATUSES(배송전~배송완료 4단계)에 포함
 * (''는 허용하지 않는다 — repo가 무시하긴 하지만 여기서 400으로 거른다). 유효 필드가 하나도 없으면 null.
 *
 * ⚠️ '구매확정'은 관리자 PATCH로 설정할 수 없다(SHIPMENT_DELIVERY_STATUSES가 아니라 DELIVERY_STATUSES로
 * 좁힌 이유). '구매확정'은 고객 버튼(POST .../confirm)이나 자동확정 크론만 만드는 종결 상태이고, 그 전이는
 * confirmShipmentIfDelivered가 WHERE delivery_status='배송완료'로 원자적으로 잠근다(배송완료 전제).
 * PATCH에 '구매확정'을 열어두면 관리자가 배송전→구매확정으로 점프시켜 이 상태기계 전제를 깨뜨릴 수 있다.
 * 관리자 대행 확정이 필요하면 confirm 라우트가 admin을 허용하므로 그 경로를 쓴다.
 */
export function validateAdminShipmentPatch(body: unknown): AdminShipmentPatchInput | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const patch: AdminShipmentPatchInput = {};

  if (b.carrier !== undefined) {
    if (typeof b.carrier !== 'string' || b.carrier.length > MAX_CARRIER) return null;
    // ''는 택배사 해제 신호 — 화이트리스트 검사를 건너뛰고 그대로 통과. 그 외는 CARRIER_CODES 필수.
    if (b.carrier !== '' && !isCarrierCode(b.carrier)) return null;
    patch.carrier = b.carrier;
  }
  if (b.trackingNumber !== undefined) {
    if (typeof b.trackingNumber !== 'string' || b.trackingNumber.length > MAX_TRACKING) return null;
    patch.trackingNumber = b.trackingNumber;
  }
  if (b.deliveryStatus !== undefined) {
    if (typeof b.deliveryStatus !== 'string') return null;
    if (!DELIVERY_STATUSES.includes(b.deliveryStatus as DeliveryStatus)) return null;
    patch.deliveryStatus = b.deliveryStatus;
  }

  if (Object.keys(patch).length === 0) return null;
  return patch;
}

/**
 * 다음 배송 상태 전이에 맞춰 채워야 할 타임스탬프를 계산한다. nextStatus가 없거나 미지 문자열이면 {}.
 * rank(nextStatus)를 r이라 할 때: shippedAt은 r≥2(배송중)에서, deliveredAt은 r≥3(배송완료)에서,
 * confirmedAt은 r≥4(구매확정)에서 — 단 각각 current에 아직 값이 없을 때만 now로 찍는다.
 * ⚠️ 역전이(배송완료→배송준비)는 이미 찍힌 스탬프를 지우지 않는다 — 관리자 정정 이력을 보존하기
 * 위해서다(스탬프는 "그 단계를 실제로 지나간 시각"의 기록이지 현재 상태의 미러가 아니다).
 */
export function resolveShipmentStamps(
  current: Shipment | undefined,
  nextStatus: string | undefined,
  now: string,
): Partial<Pick<Shipment, 'shippedAt' | 'deliveredAt' | 'confirmedAt'>> {
  if (nextStatus === undefined) return {};
  const r = rankOf(nextStatus);
  if (r === 0) return {};

  const stamps: Partial<Pick<Shipment, 'shippedAt' | 'deliveredAt' | 'confirmedAt'>> = {};
  if (r >= 2 && !current?.shippedAt) stamps.shippedAt = now;
  if (r >= 3 && !current?.deliveredAt) stamps.deliveredAt = now;
  if (r >= 4 && !current?.confirmedAt) stamps.confirmedAt = now;
  return stamps;
}

/**
 * 고객/관리자 구매확정 라우트의 사전 판정(순수). 결제·멱등 규칙을 한 곳에 모아 라우트가 결정만
 * 소비하게 한다(decide.ts와 같은 사상). 세 갈래:
 *   - 'idempotent-ok' : current가 이미 '구매확정' → 재확정은 비파괴(멱등)이므로 결제상태와 무관하게 통과.
 *   - 'blocked-unpaid': 아직 미확정인데 부모 주문이 결제완료가 아님 → 미결제 구매확정 차단(409).
 *   - 'proceed'       : 조건부 UPDATE(confirmShipmentIfDelivered, WHERE '배송완료')를 시도해도 되는 상태.
 * ⚠️ 결제 검사는 사전 read 기반이다(주문의 결제상태는 shipments 테이블에 없어 단일 조건부 UPDATE로
 * 원자 결합할 수 없다) — 확정 클릭과 환불의 경합 창은 좁고, claim 2 요구도 read 검사다. 멱등 판정을
 * 결제 검사보다 앞에 둬서, 확정 후 환불된 주문의 재확정 클릭이 'blocked-unpaid'로 퇴행하지 않게 한다.
 */
export type ShipmentConfirmDecision = 'idempotent-ok' | 'blocked-unpaid' | 'proceed';

export function decideShipmentConfirm(
  orderPaymentStatus: string,
  current: Shipment | undefined,
): ShipmentConfirmDecision {
  if (current?.deliveryStatus === '구매확정') return 'idempotent-ok';
  if (orderPaymentStatus !== PAID_PAYMENT_STATUS) return 'blocked-unpaid';
  return 'proceed';
}

/**
 * 관리자 송장 PATCH가 이미 '구매확정'된(종결) 송장을 되돌리려는 시도인지 판정(순수, 빠른 409용).
 * confirmed_at이 찍혔거나 delivery_status가 '구매확정'이면 종결 행이고, 관리자 PATCH는
 * DELIVERY_STATUSES(구매확정 미포함)만 보내므로 그런 행에 대한 어떤 상태 변경도 후퇴다.
 * ⚠️ 이 함수는 사전 차단일 뿐이며, 실제 경합 안전은 repo의 조건부 쓰기(confirmed_at IS NULL)가 보증한다
 * (사전 read 이후 고객 확정이 끼어드는 TOCTOU를 pure 검사만으로는 막을 수 없다).
 */
export function isTerminalShipment(current: Shipment | undefined): boolean {
  return current?.deliveryStatus === '구매확정' || Boolean(current?.confirmedAt);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 자동 구매확정 크론(auto-confirm-shipments)의 기준점 계산 — now 로부터 days 일 이전 시각을 ISO로
 * 돌려준다. delivered_at 이 이 값보다 오래된('<') 배송완료 행만 자동확정 대상이다(D-2 결정: 7일).
 * 순수 계산이라 DB 없이 브라우저·테스트에서 그대로 구동된다(derive.ts의 다른 함수와 같은 사상).
 */
export function autoConfirmCutoff(now: Date, days: number): string {
  return new Date(now.getTime() - days * MS_PER_DAY).toISOString();
}
