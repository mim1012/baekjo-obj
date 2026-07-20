import {
  AdminDashboardSummary,
  Brand,
  ConfirmedOrderSummary,
  InsuranceApplication,
  Order,
  PartnerInquiry,
  Product,
  Review,
  Shipment,
  User,
} from '@/types';
import { defaultSurveyConfig, type SurveyConfig } from '@/lib/survey/config';
import type { KitsConfig } from '@/lib/kits/config';
import type { PartnersConfig } from '@/lib/partners/config';
import { defaultQnaConfig, type QnaConfig } from '@/lib/qna/config';
import { defaultInsuranceContentConfig, type InsuranceContentConfig } from '@/lib/insuranceContent/config';
import { defaultConcernsConfig, type ConcernsConfig } from '@/lib/concerns/config';
import { defaultNoticesConfig, type NoticesConfig } from '@/lib/notices/config';
import { defaultShowcaseReviewsConfig, type ShowcaseReviewsConfig } from '@/lib/reviews/showcaseConfig';
import { type OrderPolicyConfig } from '@/lib/orderPolicy/config';

function cloneFallback<T>(fallback: T): T {
  return JSON.parse(JSON.stringify(fallback)) as T;
}

function getJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : cloneFallback(fallback);
  } catch {
    return cloneFallback(fallback);
  }
}

function setJSON<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

const WISHLIST_KEY = 'baekjo_wishlist';
let wishlistCache: string[] | null = null;
let wishlistRequest: Promise<string[]> | null = null;

function getLocalWishlist(): string[] {
  return getJSON<string[]>(WISHLIST_KEY, []);
}

function setLocalWishlist(value: string[]): void {
  setJSON(WISHLIST_KEY, value);
}

function toggleLocalWishlist(productId: string): boolean {
  const list = getLocalWishlist();
  const index = list.indexOf(productId);
  if (index >= 0) {
    list.splice(index, 1);
    setLocalWishlist(list);
    return false;
  }
  list.push(productId);
  setLocalWishlist(list);
  return true;
}

function setWishlistCache(productIds: string[]): string[] {
  wishlistCache = productIds;
  return productIds;
}

function clearWishlistCache(): void {
  wishlistCache = null;
  wishlistRequest = null;
}

export function getCachedWishlist(): string[] {
  return wishlistCache ?? getLocalWishlist();
}

export async function getWishlist(options: { force?: boolean } = {}): Promise<string[]> {
  if (!options.force && wishlistCache) return wishlistCache;
  if (!options.force && wishlistRequest) return wishlistRequest;

  wishlistRequest = fetch('/api/wishlist')
    .then(async (response) => {
      if (response.status === 401) return setWishlistCache(getLocalWishlist());
      if (!response.ok) return setWishlistCache(wishlistCache ?? getLocalWishlist());
      const { productIds } = (await response.json()) as { productIds: string[] };
      return setWishlistCache(Array.isArray(productIds) ? productIds : []);
    })
    .catch(() => setWishlistCache(wishlistCache ?? getLocalWishlist()))
    .finally(() => {
      wishlistRequest = null;
    });

  return wishlistRequest;
}

export async function toggleWishlist(productId: string): Promise<boolean> {
  const response = await fetch('/api/wishlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId }),
  });

  if (response.status === 401) {
    const wishlisted = toggleLocalWishlist(productId);
    setWishlistCache(getLocalWishlist());
    emitStorageEvent(STORAGE_EVENTS.WISHLIST_CHANGED);
    return wishlisted;
  }
  if (!response.ok) {
    throw new Error('wishlist-toggle-failed');
  }

  const { wishlisted } = (await response.json()) as { wishlisted: boolean };
  await getWishlist({ force: true });
  emitStorageEvent(STORAGE_EVENTS.WISHLIST_CHANGED);
  return wishlisted;
}

export async function removeWishlist(productId: string): Promise<boolean> {
  const response = await fetch('/api/wishlist', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId }),
  });

  if (response.status === 401) {
    if (getLocalWishlist().includes(productId)) toggleLocalWishlist(productId);
    setWishlistCache(getLocalWishlist());
    emitStorageEvent(STORAGE_EVENTS.WISHLIST_CHANGED);
    return false;
  }
  if (!response.ok) {
    throw new Error('wishlist-remove-failed');
  }

  await getWishlist({ force: true });
  emitStorageEvent(STORAGE_EVENTS.WISHLIST_CHANGED);
  return false;
}

export function isWishlisted(productId: string): boolean {
  return getCachedWishlist().includes(productId);
}

/* ── 보험 분석 신청 ─────────────────────────────────────────
 * 관리자 목록은 GET /api/admin/insurance, 내 신청은 GET /api/insurance/mine,
 * 생성은 POST /api/insurance(공개·게스트 허용), 상태 변경은 PATCH /api/admin/insurance/[id].
 * 컴포넌트는 fetch 를 직접 하지 않고 아래 콘센트만 거친다(§4). 실패는 orders 와 동일하게
 * 읽기=빈 배열, 쓰기=throw 로 접는다.
 */

/**
 * 신청 생성 입력(콘센트). id/createdAt/member_id 와 status 는 서버(POST /api/insurance)가 정하므로
 * 클라이언트는 신뢰시키지 않는다(mass-assignment·상태 위조 차단). 화면 타입 InsuranceApplication 은
 * 그대로 두고 Omit 으로 입력 표면만 좁힌다.
 */
export type CreateInsuranceInput = Omit<InsuranceApplication, 'id' | 'createdAt' | 'status'>;

/**
 * 전체 보험 신청 목록(관리자). GET /api/admin/insurance. 권한 없음·실패 시 빈 배열
 * (getAllOrders 와 동일한 실패 계약).
 */
export async function getInsuranceApplications(): Promise<InsuranceApplication[]> {
  try {
    const response = await fetch('/api/admin/insurance');
    if (!response.ok) return [];
    const { applications } = (await response.json()) as { applications: InsuranceApplication[] };
    return applications;
  } catch {
    return [];
  }
}

/**
 * 내 보험 신청 목록. GET /api/insurance/mine(세션 필요). 세션이 없거나(401) 실패하면
 * 화면이 다루기 쉽도록 일관되게 빈 배열을 반환한다(getMyOrders 와 동일).
 */
export async function getMyInsuranceApplications(): Promise<InsuranceApplication[]> {
  try {
    const response = await fetch('/api/insurance/mine');
    if (!response.ok) return [];
    const { applications } = (await response.json()) as { applications: InsuranceApplication[] };
    return applications;
  } catch {
    return [];
  }
}

/**
 * 신청 생성. POST /api/insurance(공개 — 게스트 신청 허용). 서버가 id·createdAt·member_id·status 를
 * 정하므로 클라이언트는 그것들을 body 로 신뢰시키지 않는다. 실패 시 throw — 호출부(apply)가
 * 사용자에게 실패를 알릴 수 있도록(createOrder 와 동일 계약).
 */
export async function addInsuranceApplication(
  input: CreateInsuranceInput,
): Promise<InsuranceApplication> {
  const response = await fetch('/api/insurance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (response.status !== 201) {
    throw new Error('insurance-create-failed');
  }
  const { application } = (await response.json()) as { application: InsuranceApplication };
  return application;
}

export const saveInsuranceApplication = addInsuranceApplication;

/**
 * 신청 상태 변경(관리자). PATCH /api/admin/insurance/[id]. 실패 시 throw 해
 * 호출부가 사용자에게 알리거나 재조회할 수 있게 한다(updateOrderStatus 와 동일 계약).
 */
export async function updateInsuranceStatus(
  id: string,
  status: InsuranceApplication['status'],
  memo?: string,
): Promise<void> {
  const body: { status: InsuranceApplication['status']; memo?: string } = { status };
  if (memo !== undefined) body.memo = memo;
  const response = await fetch(`/api/admin/insurance/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error('insurance-update-failed');
  }
}

/** 신청 메모 변경(관리자). PATCH /api/admin/insurance/[id]. 실패 시 throw. */
export async function updateInsuranceMemo(id: string, memo: string): Promise<void> {
  const response = await fetch(`/api/admin/insurance/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memo }),
  });
  if (!response.ok) {
    throw new Error('insurance-update-failed');
  }
}

/** 신청 연락여부 변경(관리자). PATCH /api/admin/insurance/[id]. 실패 시 throw. */
export async function updateInsuranceContacted(id: string, contacted: boolean): Promise<void> {
  const response = await fetch(`/api/admin/insurance/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contacted }),
  });
  if (!response.ok) {
    throw new Error('insurance-update-failed');
  }
}

/* ── B2B 제휴 문의(케어키트 랜딩 → 관리자 접수함) ─────────────────────────
 * 생성은 POST /api/partner-inquiries(공개·게스트 허용), 관리자 목록은 GET /api/admin/partner-inquiries,
 * 상태 변경은 PATCH /api/admin/partner-inquiries/[id]. 컴포넌트는 fetch 를 직접 하지 않고
 * 아래 콘센트만 거친다(§4). 실패는 insurance 와 동일하게 읽기=빈 배열, 쓰기=throw 로 접는다.
 */

/**
 * 제휴 문의 생성 입력(콘센트). id/createdAt/status/memo 는 서버(POST /api/partner-inquiries)가
 * 정하므로 클라이언트는 신뢰시키지 않는다(mass-assignment·상태 위조 차단).
 */
export type CreatePartnerInquiryInput = Omit<
  PartnerInquiry,
  'id' | 'createdAt' | 'status' | 'memo'
>;

/**
 * 제휴 문의 생성. POST /api/partner-inquiries(공개 — 게스트 제출 허용). 서버가 id·createdAt·status 를
 * 정한다. 실패 시 throw — 호출부(랜딩 폼)가 사용자에게 실패를 알릴 수 있도록(addInsuranceApplication 과 동일 계약).
 */
export async function addPartnerInquiry(input: CreatePartnerInquiryInput): Promise<PartnerInquiry> {
  const response = await fetch('/api/partner-inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (response.status !== 201) {
    throw new Error('partner-inquiry-create-failed');
  }
  const { inquiry } = (await response.json()) as { inquiry: PartnerInquiry };
  return inquiry;
}

/**
 * 전체 제휴 문의 목록(관리자). GET /api/admin/partner-inquiries. 권한 없음·실패 시 빈 배열
 * (getInsuranceApplications 와 동일한 실패 계약).
 */
export async function getAdminPartnerInquiries(): Promise<PartnerInquiry[]> {
  try {
    const response = await fetch('/api/admin/partner-inquiries');
    if (!response.ok) return [];
    const { inquiries } = (await response.json()) as { inquiries: PartnerInquiry[] };
    return inquiries;
  } catch {
    return [];
  }
}

/**
 * 제휴 문의 상태/메모 변경(관리자). PATCH /api/admin/partner-inquiries/[id]. 실패 시 throw 해
 * 호출부가 사용자에게 알리거나 재조회할 수 있게 한다(updateInsuranceStatus 와 동일 계약).
 */
export async function updatePartnerInquiryStatus(
  id: string,
  status: PartnerInquiry['status'],
  memo?: string,
): Promise<void> {
  const body: { status: PartnerInquiry['status']; memo?: string } = { status };
  if (memo !== undefined) body.memo = memo;
  const response = await fetch(`/api/admin/partner-inquiries/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error('partner-inquiry-update-failed');
  }
}

/**
 * 제휴 문의 삭제(관리자). DELETE /api/admin/partner-inquiries/[id]. 실패 시 throw 해 호출부가
 * 사용자에게 알리거나 재조회할 수 있게 한다(updatePartnerInquiryStatus와 동일 계약 — additive).
 */
export async function deletePartnerInquiry(id: string): Promise<void> {
  const response = await fetch(`/api/admin/partner-inquiries/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('partner-inquiry-delete-failed');
  }
}

// 주문완료 화면 전용 스냅샷. 서버 재조회 없이 sessionStorage 에서만 읽는다
// → 게스트 주문의 PII 가 /api/orders/[id] IDOR 로 새지 않게 한다(§보안 요건).
const LAST_ORDER_KEY = 'baekjo_last_order';

/**
 * 주문 생성 입력(콘센트). 클라이언트가 실제로 아는 값만 받는다 — id/createdAt/member_id 는
 * POST /api/orders 가 정하고, totalPrice/deliveryFee/orderStatus/paymentStatus/deliveryStatus 는
 * 서버가 카탈로그 가격 재계산·정책으로 고정한다(§4). 이 필드들을 여기서 받으면 "클라이언트가
 * 정한 것처럼" 보여 착각을 유발하므로 타입 단계에서부터 제거한다. Order 타입 자체는 그대로 두고
 * Pick 으로 입력 표면만 좁힌다.
 */
export type CreateOrderInput = Pick<
  Order,
  'customerName' | 'phone' | 'address' | 'items' | 'paymentMethod' | 'deliveryMemo'
>;

/**
 * 주문 생성. POST /api/orders(공개 — 게스트 결제 허용). 서버가 id·createdAt·member_id 및
 * totalPrice/deliveryFee/orderStatus/paymentStatus/deliveryStatus 를 정하므로 클라이언트는
 * body 로 그것들을 신뢰시키지 않는다(mass-assignment 차단). 반환된 Order 를 sessionStorage 에
 * 저장해 주문완료 화면이 서버 재조회 없이 쓰게 한다.
 * 실패 시 throw — 호출부(checkout)가 결제 실패를 사용자에게 알릴 수 있도록.
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (response.status !== 201) {
    if (response.status === 409) {
      throw new Error('out-of-stock');
    }
    throw new Error('order-create-failed');
  }
  const { order } = (await response.json()) as { order: Order };
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
  }
  return order;
}

/**
 * 내 주문 목록. GET /api/orders/mine(세션 필요). 세션이 없거나(401) 요청이 실패하면
 * 화면이 다루기 쉽도록 일관되게 빈 배열을 반환한다.
 */
export async function getMyOrders(): Promise<Order[]> {
  try {
    const response = await fetch('/api/orders/mine');
    if (!response.ok) return [];
    const { orders } = (await response.json()) as { orders: Order[] };
    return orders;
  } catch {
    return [];
  }
}

/**
 * 전체 주문 목록(관리자). GET /api/admin/orders. 권한 없음·실패 시 빈 배열
 * (getMyOrders 와 동일한 실패 계약).
 */
export async function getAllOrders(): Promise<Order[]> {
  try {
    const response = await fetch('/api/admin/orders');
    if (!response.ok) return [];
    const { orders } = (await response.json()) as { orders: Order[] };
    return orders;
  } catch {
    return [];
  }
}

/**
 * 단건 주문 조회. GET /api/orders/[id]. 소유자 또는 admin 만 200, 아니면 404
 * (주문 존재 은폐). 404·실패는 null 로 접는다.
 */
export async function getOrderById(id: string): Promise<Order | null> {
  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(id)}`);
    if (!response.ok) return null;
    const { order } = (await response.json()) as { order: Order };
    return order;
  } catch {
    return null;
  }
}

/**
 * 최근 주문 스냅샷. sessionStorage 에 저장된 createOrder 응답만 파싱한다
 * (서버 재조회 없음 → 게스트 PII IDOR 방지). 없으면 null.
 */
export async function getLastOrder(): Promise<Order | null> {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(LAST_ORDER_KEY);
    return raw ? (JSON.parse(raw) as Order) : null;
  } catch {
    return null;
  }
}

/**
 * 주문 상태 변경(관리자). PATCH /api/admin/orders/[id]. 실패 시 throw 해
 * 호출부가 재조회 없이 낙관적 갱신을 되돌리거나 사용자에게 알릴 수 있게 한다.
 */
export async function updateOrderStatus(
  id: string,
  updates: Partial<
    Pick<
      Order,
      | 'orderStatus'
      | 'paymentStatus'
      | 'deliveryStatus'
      | 'trackingNumber'
      | 'carrier'
      | 'deliveryMemo'
    >
  >,
): Promise<void> {
  const response = await fetch(`/api/admin/orders/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    // 서버가 준 구체 코드(invalid-payment-transition / payment-status-conflict / not-found 등)를
    // Error 메시지에 실어 호출부가 결제상태 전이 거부·경합을 구분·안내할 수 있게 한다. 콘센트
    // 시그니처는 불변(throw Error 유지) — body 파싱 실패 시 기존 일반 코드로 폴백한다.
    let code = 'order-update-failed';
    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body?.error === 'string' && body.error) code = body.error;
    } catch {
      /* 본문 없음/비JSON — 일반 코드 유지 */
    }
    throw new Error(code);
  }
}

/**
 * 내 주문의 업체별 송장 목록. GET /api/orders/[id]/shipments(소유자 또는 admin). 이 함수가 P6
 * 마이페이지 배송 모달이 송장을 읽는 유일한 데이터 경로다(§4 콘센트 규칙 — 컴포넌트는 fetch를 직접
 * 부르지 않는다). 비소유·404·실패는 getMyOrders와 동일하게 빈 배열로 접는다.
 */
export async function getOrderShipments(orderId: string): Promise<Shipment[]> {
  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/shipments`);
    if (!response.ok) return [];
    const { shipments } = (await response.json()) as { shipments: Shipment[] };
    return shipments;
  } catch {
    return [];
  }
}

/**
 * 고객 구매확정. POST /api/orders/[id]/shipments/[brandId]/confirm. P6 배송 모달의 확정 버튼이
 * 쓰는 유일한 경로(§4 콘센트). 실패 시 throw 해 호출부가 낙관적 갱신을 되돌리거나 사용자에게 알릴 수
 * 있게 한다 — 409(아직 배송완료 아님)는 'not-deliverable', 그 외는 'confirm-failed'로 구분한다.
 */
export async function confirmOrderShipment(orderId: string, brandId: string): Promise<void> {
  const response = await fetch(
    `/api/orders/${encodeURIComponent(orderId)}/shipments/${encodeURIComponent(brandId)}/confirm`,
    { method: 'POST' },
  );
  if (!response.ok) {
    throw new Error(response.status === 409 ? 'not-deliverable' : 'confirm-failed');
  }
}

/**
 * 주문의 업체별 송장 목록(관리자). GET /api/admin/orders/[id]/shipments. P5 관리자 주문 상세의
 * 업체별 배송 카드가 송장을 읽는 유일한 경로(§4 콘센트). 권한 없음·실패는 빈 배열로 접는다.
 */
export async function getAdminOrderShipments(orderId: string): Promise<Shipment[]> {
  try {
    const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/shipments`);
    if (!response.ok) return [];
    const { shipments } = (await response.json()) as { shipments: Shipment[] };
    return shipments;
  } catch {
    return [];
  }
}

/**
 * 업체별 송장 생성/갱신(관리자). PATCH /api/admin/orders/[id]/shipments/[brandId]. P5 관리자 배송
 * 카드의 입력이 쓰는 유일한 경로(§4 콘센트). 실패 시 throw 해 호출부가 낙관적 갱신을 되돌릴 수 있게 한다.
 */
export async function updateOrderShipment(
  orderId: string,
  brandId: string,
  updates: Partial<Pick<Shipment, 'carrier' | 'trackingNumber' | 'deliveryStatus'>>,
): Promise<void> {
  const response = await fetch(
    `/api/admin/orders/${encodeURIComponent(orderId)}/shipments/${encodeURIComponent(brandId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    },
  );
  if (!response.ok) {
    throw new Error('shipment-update-failed');
  }
}

/**
 * 토스 결제 승인 확정(수동 재확인용). R4 이전에는 successUrl(order-complete)이 이 함수를
 * 직접 호출해 승인을 오케스트레이션했으나, 지금은 successUrl이 GET /api/payments/return(서버)을
 * 가리켜 서버가 승인을 끝낸 뒤 결과만 리다이렉트로 넘긴다 — 그래서 이 함수는 현재 어떤 화면에서도
 * 호출되지 않는다(콘센트로 삭제하지 않고 남겨둠: POST /api/payments/confirm 라우트 자체는 웹훅
 * 없이도 사람이 수동으로 재확인할 수 있는 안전판으로 의도적으로 유지되고 있고, 이 함수가 그 유일한
 * 클라이언트 접근 경로이기 때문이다 — 라우트만 남기고 이 래퍼를 지우면 사실상 curl 전용이 된다).
 * 서버가 DB 총액과 amount를 대조 후 토스에 승인 요청 → setOrderPaid로 조건부 확정한다
 * (§ 이중승인 방어). amount는 클라이언트 쿼리값을 신뢰하지 않고 서버가 재검증한다.
 * 반환 order는 전체 Order가 아니라 ConfirmedOrderSummary(가산 타입) — 무인증 공개
 * 엔드포인트라 서버가 customerName/phone/address/items 같은 PII를 내려주지 않는다.
 */
export async function confirmTossPayment(payment: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<{ ok: true; order: ConfirmedOrderSummary } | { ok: false; error: string }> {
  try {
    const response = await fetch('/api/payments/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    });
    // 200(진짜 승인 확정)만 성공으로 본다 — 202(payment-confirming)는 response.ok 범위(200-299)에
    // 들어가지만 바디에 order가 없어(라우트가 {error:'payment-confirming'}만 반환) ok:true로
    // 잘못 흡수되면 호출부가 undefined order를 승인완료로 오인한다. 실패/확인중 응답은 바디의
    // error 코드를 그대로 전달해 호출부가 402/409/502/'payment-confirming' 등을 구분하게 한다.
    // 서버가 error 필드를 안 준 경우(예상 밖 응답 형태)에만 폴백한다. 502/503은 라우트 자체가
    // 아니라 그 앞단 인프라(Vercel/프록시 게이트웨이)가 논-JSON 에러 페이지를 내려줄 수 있어,
    // 그런 경우엔 라우트가 원래 의도하는 'payment-unconfirmed'(재시도 가능·취소 안 함)로
    // 매핑해 완전히 낯선 502/503까지 거부성 실패로 잘못 분류되지 않게 한다.
    if (response.status !== 200) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (body?.error) {
        return { ok: false, error: body.error };
      }
      if (response.status === 502 || response.status === 503) {
        return { ok: false, error: 'payment-unconfirmed' };
      }
      return { ok: false, error: 'payment-confirm-failed' };
    }
    const { order } = (await response.json()) as { order: ConfirmedOrderSummary };
    return { ok: true, order };
  } catch {
    // fetch 자체가 throw(오프라인·CORS·타임아웃 등) — 서버가 뭘 했는지 전혀 알 수 없는 네트워크
    // 예외다. 'payment-confirm-failed'(거부성 실패)와 구분해 호출부가 502(불명·재시도 가능)와
    // 같은 "지연" UX로 흡수하도록 별도 코드로 반환한다.
    return { ok: false, error: 'network' };
  }
}

export type PaymentStatusResult =
  | { kind: 'ok'; paymentStatus: string; orderStatus: string }
  | { kind: 'rate-limited' }
  | { kind: 'error' };

/**
 * 결제 상태 읽기 전용 폴링(R4 라운드2·라운드3). GET /api/payments/status — order-complete의
 * pending/unconfirmed 화면이 승인 완료 여부를 확인하는 데 쓴다. 변이 없음(claim·confirm·
 * 취소 어느 것도 호출하지 않음) — 승인 판정 권위는 여전히 서버(webhook/reconcile/return
 * 라우트)에만 있고, 이 함수는 그 결과가 DB에 반영되길 기다렸다가 읽기만 한다.
 * ★429(레이트리밋)를 'error'로 뭉뚱그리지 않고 'rate-limited'로 구분해 반환한다(opus 최종
 * 재검증 LOW) — 예전엔 !response.ok를 전부 null로 흡수해서, 레이트리밋에 걸려도 화면이
 * 아무 말 없이 "확인 중"만 보여주는 조용한 실패였다. 호출부가 이 구분으로 사용자에게
 * "요청이 많다"고 안내할 수 있게 한다.
 */
export async function getPaymentStatus(orderId: string): Promise<PaymentStatusResult> {
  try {
    const response = await fetch(`/api/payments/status?orderId=${encodeURIComponent(orderId)}`);
    if (response.status === 429) return { kind: 'rate-limited' };
    if (!response.ok) return { kind: 'error' };
    const body = (await response.json()) as { paymentStatus: string; orderStatus: string };
    return { kind: 'ok', paymentStatus: body.paymentStatus, orderStatus: body.orderStatus };
  } catch {
    return { kind: 'error' };
  }
}

/**
 * 결제 실패/이탈 시 재고 선점 취소. failUrl 또는 결제창 이탈 시 호출한다.
 * 서버가 실제로 결제 안 됐음을 확인한 선점 주문만 취소·재고복원한다(확정건은 no-op).
 * 실패 시 throw — 호출부가 "취소됐다"고 오인해 사용자에게 잘못된 안내를 하지 않도록.
 * ★200만 성공으로 본다(R4 최종 라운드) — 202(cancel-pending)는 response.ok 범위(200~299)에
 * 들어가지만 "과도기 상태·조회 불명이라 이번 요청에선 취소하지 않았다"는 뜻이다. 여기서 성공으로
 * 흡수하면 호출부(checkout의 fail 핸들러)가 아직 확정 중이거나 대사가 안 끝난 주문을 취소된
 * 것으로 오인해 pending 표식을 지우고 "결제가 취소되었습니다"라고 거짓 안내할 수 있다.
 */
export async function cancelReservation(orderId: string): Promise<void> {
  const response = await fetch('/api/payments/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  });
  if (response.status !== 200) {
    throw new Error('reservation-cancel-failed');
  }
}

/* ── 상품 / 브랜드 ─────────────────────────────────────────
 * 공개 화면은 DB(서버 repo)를 GET /api/products·/api/brands 로 읽고, 관리자 화면은
 * POST/PATCH/DELETE /api/admin/products·brands 로 쓴다. 컴포넌트는 fetch 를 직접 하지
 * 않고 아래 콘센트만 거친다(§4). 실패는 orders 와 동일하게 빈 배열/undefined 로 접는다.
 */

/** 공개 상품 목록. GET /api/products(공개). 실패 시 빈 배열. */
export async function getPublicProducts(filter?: {
  categorySlug?: string;
  brandId?: string;
  petType?: string;
}): Promise<Product[]> {
  try {
    const params = new URLSearchParams();
    if (filter?.categorySlug) params.set('categorySlug', filter.categorySlug);
    if (filter?.brandId) params.set('brandId', filter.brandId);
    if (filter?.petType) params.set('petType', filter.petType);
    const query = params.toString();
    const response = await fetch(`/api/products${query ? `?${query}` : ''}`);
    if (!response.ok) return [];
    const { products } = (await response.json()) as { products: Product[] };
    return products;
  } catch {
    return [];
  }
}

/**
 * getPublicProducts와 동일하게 조회하되, "실패"(네트워크 오류·!ok·파싱 실패)와 "정말로
 * 노출 상품이 0건"을 구분해야 하는 호출부 전용이다 — null=실패, []=성공했지만 진짜 0건.
 *
 * 왜 별도 함수인가: getPublicProducts()의 "실패는 빈 배열로 접는다" 계약은 이미 5곳
 * (admin/inquiries·admin/settings·checkout·diagnosis/result·mypage)이 그 계약을 전제로
 * 쓰고 있어 손대면 그만큼 회귀 위험이 퍼진다. 반면 카트 자가치유(pruneCartToVisibleProducts,
 * cart/page.tsx)는 "빈 배열"을 "노출 상품이 하나도 없다"로 해석해 카트 전체를 지워버리는데,
 * 일시적 네트워크 오류로 받은 빈 배열까지 그렇게 해석하면 고객 카트가 영구 삭제되는
 * CRITICAL 데이터 유실 사고가 된다(2026-07-19, PR #173 리뷰에서 발견). 실패와 진짜 0건을
 * 구분해야만 하는 이 한 곳만 이 함수로 옮기고, 나머지 호출부는 기존 계약 그대로 둔다.
 */
export async function getPublicProductsOrNull(filter?: {
  categorySlug?: string;
  brandId?: string;
  petType?: string;
}): Promise<Product[] | null> {
  try {
    const params = new URLSearchParams();
    if (filter?.categorySlug) params.set('categorySlug', filter.categorySlug);
    if (filter?.brandId) params.set('brandId', filter.brandId);
    if (filter?.petType) params.set('petType', filter.petType);
    const query = params.toString();
    const response = await fetch(`/api/products${query ? `?${query}` : ''}`);
    if (!response.ok) return null;
    const { products } = (await response.json()) as { products: Product[] };
    return products;
  } catch {
    return null;
  }
}

/**
 * 내 과거 주문 이력에 등장한 상품(비노출 상품 포함). GET /api/orders/mine/products
 * (세션 필요). 관리자가 상품을 숨겨도 이미 구매한 회원의 마이페이지에서는 상품명·
 * 이미지가 계속 보여야 하므로 getPublicProducts 와 별도로 둔다. 실패·비로그인 시
 * getMyOrders 와 동일하게 빈 배열.
 */
export async function getMyHistoryProducts(): Promise<Product[]> {
  try {
    const response = await fetch('/api/orders/mine/products');
    if (!response.ok) return [];
    const { products } = (await response.json()) as { products: Product[] };
    return products;
  } catch {
    return [];
  }
}

/** 단건 공개 상품. GET /api/products/[id]. 404·실패는 null. */
export async function getPublicProductById(id: string): Promise<Product | null> {
  try {
    const response = await fetch(`/api/products/${encodeURIComponent(id)}`);
    if (!response.ok) return null;
    const { product } = (await response.json()) as { product: Product };
    return product;
  } catch {
    return null;
  }
}

/** 공개 브랜드 목록. GET /api/brands. 실패 시 빈 배열. */
export async function getPublicBrands(): Promise<Brand[]> {
  try {
    const response = await fetch('/api/brands');
    if (!response.ok) return [];
    const { brands } = (await response.json()) as { brands: Brand[] };
    return brands;
  } catch {
    return [];
  }
}

/** 단건 공개 브랜드. GET /api/brands/[id]. 404·실패는 null. */
export async function getPublicBrandById(id: string): Promise<Brand | null> {
  try {
    const response = await fetch(`/api/brands/${encodeURIComponent(id)}`);
    if (!response.ok) return null;
    const { brand } = (await response.json()) as { brand: Brand };
    return brand;
  } catch {
    return null;
  }
}

/**
 * 관리자 상품 목록(비노출 포함). GET /api/admin/products(관리자 세션 필요). 실패 시 빈 배열.
 * ⚠️ **클라이언트 전용** — 서버 컴포넌트에서 호출 금지. 상대경로 fetch라 서버 런타임엔 origin이
 * 없어 throw하고, 그 예외를 catch가 조용히 삼켜 빈 배열을 반환한다(→ 상세/수정 페이지가 원인불명 404).
 * 서버 컴포넌트에서는 `@/lib/products/repo`의 `getProductById`/`listProducts`를 직접 호출할 것.
 */
export async function getAdminProducts(): Promise<Product[]> {
  try {
    const response = await fetch('/api/admin/products');
    if (!response.ok) return [];
    const { products } = (await response.json()) as { products: Product[] };
    return products;
  } catch {
    return [];
  }
}

/** 상품 생성 입력. id 는 서버가 정한다. */
export type CreateProductInput = Omit<Product, 'id'>;
export type UpdateProductInput = Partial<Omit<Product, 'id'>>;

/** 상품 생성. POST /api/admin/products. */
export async function createProduct(
  input: CreateProductInput,
): Promise<{ product?: Product; error?: string }> {
  try {
    const response = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      return { error: data?.error ?? 'network' };
    }
    const { product } = (await response.json()) as { product: Product };
    return { product };
  } catch {
    return { error: 'network' };
  }
}

/** 상품 수정. PATCH /api/admin/products/[id]. */
export async function updateProduct(
  id: string,
  updates: UpdateProductInput,
): Promise<{ product?: Product; error?: string }> {
  try {
    const response = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      return { error: data?.error ?? 'network' };
    }
    const { product } = (await response.json()) as { product: Product };
    return { product };
  } catch {
    return { error: 'network' };
  }
}

/** 상품 삭제. DELETE /api/admin/products/[id]. 409는 'product-has-history'로 구분해
 *  호출부가 "숨김 처리하라"는 안내를 띄울 수 있게 한다(리뷰/문의가 남은 상품은 삭제 불가 — 0029). */
export async function deleteProduct(id: string): Promise<{ ok?: true; error?: string }> {
  try {
    const response = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (response.status === 409) return { error: 'product-has-history' };
    if (!response.ok) return { error: 'network' };
    return { ok: true };
  } catch {
    return { error: 'network' };
  }
}

/**
 * 파트너/관리자 본인 관리 브랜드의 상품 목록(비노출 포함). GET /api/partner/products.
 * 실패를 error로 구분해 반환한다 — 호출부(BrandProductsClient)가 실패를 빈 배열과 혼동해
 * 기존에 보여주던 목록을 조용히 비우지 않도록(§4) getAdminProducts와 다르게 설계했다.
 */
export async function getPartnerProducts(
  brandId: string,
): Promise<{ products?: Product[]; error?: string }> {
  try {
    const response = await fetch(`/api/partner/products?brandId=${encodeURIComponent(brandId)}`);
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      return { error: data?.error ?? 'network' };
    }
    const { products } = (await response.json()) as { products: Product[] };
    return { products };
  } catch {
    return { error: 'network' };
  }
}

/** 파트너/관리자 상품 생성. POST /api/partner/products. */
export async function createPartnerProduct(
  input: CreateProductInput,
): Promise<{ product?: Product; error?: string }> {
  try {
    const response = await fetch('/api/partner/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      return { error: data?.error ?? 'network' };
    }
    const { product } = (await response.json()) as { product: Product };
    return { product };
  } catch {
    return { error: 'network' };
  }
}

/** 파트너/관리자 상품 수정. PATCH /api/partner/products/[id]. */
export async function updatePartnerProduct(
  id: string,
  updates: UpdateProductInput,
): Promise<{ product?: Product; error?: string }> {
  try {
    const response = await fetch(`/api/partner/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      return { error: data?.error ?? 'network' };
    }
    const { product } = (await response.json()) as { product: Product };
    return { product };
  } catch {
    return { error: 'network' };
  }
}

/** 파트너/관리자 상품 삭제. DELETE /api/partner/products/[id]. */
export async function deletePartnerProduct(id: string): Promise<{ ok?: true; error?: string }> {
  try {
    const response = await fetch(`/api/partner/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      return { error: data?.error ?? 'network' };
    }
    return { ok: true };
  } catch {
    return { error: 'network' };
  }
}

/**
 * 관리자 브랜드 목록(비노출 포함). GET /api/admin/brands(관리자 세션 필요). 실패 시 빈 배열.
 * ⚠️ **클라이언트 전용** — 서버 컴포넌트에서 호출 금지. 상대경로 fetch라 서버 런타임엔 origin이
 * 없어 throw하고, 그 예외를 catch가 조용히 삼켜 빈 배열을 반환한다(→ 브랜드 select가 원인불명 공백).
 * 서버 컴포넌트에서는 `@/lib/brands/repo`의 `listAllBrandsForAdmin`을 직접 호출할 것.
 */
export async function getAdminBrands(): Promise<Brand[]> {
  try {
    const response = await fetch('/api/admin/brands');
    if (!response.ok) return [];
    const { brands } = (await response.json()) as { brands: Brand[] };
    return brands;
  } catch {
    return [];
  }
}

export type CreateBrandInput = Omit<Brand, 'id'>;
export type UpdateBrandInput = Partial<Omit<Brand, 'id'>>;

/** 브랜드 생성. POST /api/admin/brands. */
export async function createBrand(
  input: CreateBrandInput,
): Promise<{ brand?: Brand; error?: string }> {
  try {
    const response = await fetch('/api/admin/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      return { error: data?.error ?? 'network' };
    }
    const { brand } = (await response.json()) as { brand: Brand };
    return { brand };
  } catch {
    return { error: 'network' };
  }
}

/** 브랜드 수정. PATCH /api/admin/brands/[id]. */
export async function updateBrand(
  id: string,
  updates: UpdateBrandInput,
): Promise<{ brand?: Brand; error?: string }> {
  try {
    const response = await fetch(`/api/admin/brands/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      return { error: data?.error ?? 'network' };
    }
    const { brand } = (await response.json()) as { brand: Brand };
    return { brand };
  } catch {
    return { error: 'network' };
  }
}

/** 브랜드 삭제. DELETE /api/admin/brands/[id]. */
export async function deleteBrand(id: string): Promise<{ ok?: true; error?: string }> {
  try {
    const response = await fetch(`/api/admin/brands/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok) return { error: 'network' };
    return { ok: true };
  } catch {
    return { error: 'network' };
  }
}

/* ── 맞춤 진단 설문 ─────────────────────────────────────────
 * 공개 진단 화면(/diagnosis·/diagnosis/result)은 GET /api/survey 로 설문 config 를 읽고,
 * 관리자 화면은 PUT /api/admin/survey 로 통째로 저장한다. 컴포넌트는 fetch 를 직접 하지 않고
 * 아래 콘센트만 거친다(§4). 공개 조회는 category-settings 와 동일하게 실패·빈응답을
 * defaultSurveyConfig 로 접어 진단 화면이 절대 빈 문항으로 깨지지 않게 한다(Golden Flow #1).
 */

/** 공개 설문 config. GET /api/survey. 실패·미저장 시 defaultSurveyConfig 로 폴백. */
export async function getSurveyConfig(): Promise<SurveyConfig> {
  try {
    const response = await fetch('/api/survey');
    if (!response.ok) return defaultSurveyConfig;
    const { questions, rules } = (await response.json()) as SurveyConfig;
    if (!Array.isArray(questions) || !Array.isArray(rules)) return defaultSurveyConfig;
    return { questions, rules };
  } catch {
    return defaultSurveyConfig;
  }
}

/** 설문 config 저장(관리자). PUT /api/admin/survey. 성공/실패를 boolean 으로 돌려 화면이 알림을 띄운다. */
export async function saveSurveyConfig(config: SurveyConfig): Promise<{ ok: boolean }> {
  try {
    const response = await fetch('/api/admin/survey', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}

/* ── 케어 키트 / B2B 제휴처 / Q&A (관리자 싱글턴 config) ───────
 * 세 화면 모두 예전엔 page.tsx 인라인 mock 또는 정적 @/data 라 관리자가 편집해도 저장되지 않았다
 * (drift). 이제 각각 싱글턴 config 로 DB 에 담고, 관리자 화면은 아래 콘센트로 읽고(get*) 통째로
 * 저장한다(save*). 컴포넌트는 fetch 를 직접 하지 않고 아래 콘센트만 거친다(§4).
 *  - 케어 키트·제휴처: 공개 소비자가 없어 조회도 관리자 전용(GET /api/admin/kits·partners).
 *  - Q&A: 공개 상품상세·마이페이지가 GET /api/qna 로 읽으므로 공개 조회를 둔다.
 * 공개 조회는 실패·미저장을 default* 로 접지만, 관리자 kits/partners 는 실패를 throw 해 저장을 막는다.
 */

/** 관리자 케어 키트 config. GET /api/admin/kits. 실패·깨진 응답은 throw 해서 저장을 막는다. */
export async function getKitsConfig(): Promise<KitsConfig> {
  const response = await fetch('/api/admin/kits');
  if (!response.ok) throw new Error('kits-config-load-failed');
  const { items } = (await response.json()) as KitsConfig;
  if (!Array.isArray(items)) throw new Error('kits-config-invalid-response');
  return { items };
}

/** 케어 키트 config 저장(관리자). PUT /api/admin/kits. 성공/실패를 boolean 으로 돌려 화면이 알린다. */
export async function saveKitsConfig(config: KitsConfig): Promise<{ ok: boolean }> {
  try {
    const response = await fetch('/api/admin/kits', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}

/** 관리자 제휴처 config. GET /api/admin/partners. 실패·깨진 응답은 throw 해서 저장을 막는다. */
export async function getPartnersConfig(): Promise<PartnersConfig> {
  const response = await fetch('/api/admin/partners');
  if (!response.ok) throw new Error('partners-config-load-failed');
  const { items } = (await response.json()) as PartnersConfig;
  if (!Array.isArray(items)) throw new Error('partners-config-invalid-response');
  return { items };
}

/** 제휴처 config 저장(관리자). PUT /api/admin/partners. 성공/실패를 boolean 으로 돌려 화면이 알린다. */
export async function savePartnersConfig(config: PartnersConfig): Promise<{ ok: boolean }> {
  try {
    const response = await fetch('/api/admin/partners', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}

/** 공개 Q&A config. GET /api/qna. 실패·미저장 시 defaultQnaConfig 로 폴백(상품상세 Q&A 탭이 안 깨진다). */
export async function getQnaConfig(): Promise<QnaConfig> {
  try {
    const response = await fetch('/api/qna');
    if (!response.ok) return defaultQnaConfig;
    const { items } = (await response.json()) as QnaConfig;
    if (!Array.isArray(items)) return defaultQnaConfig;
    return { items };
  } catch {
    return defaultQnaConfig;
  }
}

/** Q&A config 저장(관리자). PUT /api/admin/qna. 성공/실패를 boolean 으로 돌려 화면이 알린다. */
export async function saveQnaConfig(config: QnaConfig): Promise<{ ok: boolean }> {
  try {
    const response = await fetch('/api/admin/qna', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}

/* ── 보험 페이지 콘텐츠(동의 전문·FAQ) ─────────────────────────
 * 공개 /insurance 는 GET /api/insurance-content 로 동의 전문·FAQ 를 읽고, 관리자 화면
 * (/admin/insurance-content)은 PUT /api/admin/insurance-content 로 통째로 저장한다.
 * 공개 조회는 실패·빈응답을 defaultInsuranceContentConfig 로 접어 보험 화면(Golden Flow #3)이
 * 절대 동의 체크박스 없이 깨지지 않게 한다.
 */

/** 공개 보험 콘텐츠 config. GET /api/insurance-content. 실패·미저장 시 defaultInsuranceContentConfig 로 폴백. */
export async function getInsuranceContentConfig(): Promise<InsuranceContentConfig> {
  try {
    const response = await fetch('/api/insurance-content');
    if (!response.ok) return defaultInsuranceContentConfig;
    const { consents, faqs } = (await response.json()) as InsuranceContentConfig;
    if (!Array.isArray(consents) || !Array.isArray(faqs) || consents.length === 0) return defaultInsuranceContentConfig;
    return { consents, faqs };
  } catch {
    return defaultInsuranceContentConfig;
  }
}

/** 관리자 보험 콘텐츠 config. GET /api/admin/insurance-content. 실패·깨진 응답은 throw 해서 저장을 막는다
 * (공개 콘센트는 default 폴백이라 장애 시 커스텀 콘텐츠를 default 로 덮어쓸 위험 — codex 리뷰 F5). */
export async function getAdminInsuranceContentConfig(): Promise<InsuranceContentConfig> {
  const response = await fetch('/api/admin/insurance-content');
  if (!response.ok) throw new Error('insurance-content-config-load-failed');
  const { consents, faqs } = (await response.json()) as InsuranceContentConfig;
  if (!Array.isArray(consents) || !Array.isArray(faqs)) throw new Error('insurance-content-config-invalid-response');
  return { consents, faqs };
}

/** 보험 콘텐츠 config 저장(관리자). PUT /api/admin/insurance-content. 성공/실패를 boolean 으로 돌려 화면이 알린다. */
export async function saveInsuranceContentConfig(config: InsuranceContentConfig): Promise<{ ok: boolean }> {
  try {
    const response = await fetch('/api/admin/insurance-content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}

/* ── 고민별 케어(concerns) ─────────────────────────────────────
 * 공개 클라이언트 화면(회원가입 관심사 select 등)은 GET /api/concerns 로 고민 config 를 읽고,
 * 관리자 화면(/admin/concerns)은 PUT /api/admin/concerns 로 통째로 저장한다.
 * 공개 조회는 실패·빈응답을 defaultConcernsConfig 로 접어 화면이 절대 빈 목록으로 깨지지 않게 한다.
 * 서버 컴포넌트는 이 콘센트가 아니라 lib/concerns/repo 를 직접 읽는다(자기 API HTTP 왕복 금지).
 */

/** 공개 고민 config. GET /api/concerns. 실패·미저장 시 defaultConcernsConfig 로 폴백. */
export async function getConcernsConfig(): Promise<ConcernsConfig> {
  try {
    const response = await fetch('/api/concerns');
    if (!response.ok) return defaultConcernsConfig;
    const { items } = (await response.json()) as ConcernsConfig;
    if (!Array.isArray(items) || items.length === 0) return defaultConcernsConfig;
    return { items };
  } catch {
    return defaultConcernsConfig;
  }
}

/** 관리자 고민 config. GET /api/admin/concerns. 실패·깨진 응답은 throw 해서 저장을 막는다
 * (공개 콘센트는 default 폴백이라 장애 시 커스텀 콘텐츠를 default 로 덮어쓸 위험 — insurance-content 미러). */
export async function getAdminConcernsConfig(): Promise<ConcernsConfig> {
  const response = await fetch('/api/admin/concerns');
  if (!response.ok) throw new Error('concerns-config-load-failed');
  const { items } = (await response.json()) as ConcernsConfig;
  if (!Array.isArray(items)) throw new Error('concerns-config-invalid-response');
  return { items };
}

/** 고민 config 저장(관리자). PUT /api/admin/concerns. 성공/실패를 boolean 으로 돌려 화면이 알린다. */
export async function saveConcernsConfig(config: ConcernsConfig): Promise<{ ok: boolean }> {
  try {
    const response = await fetch('/api/admin/concerns', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}

/* ── 공지사항(notices) ─────────────────────────────────────
 * 공개 클라이언트 화면은 GET /api/notices 로 공지 config 를 읽고,
 * 관리자 화면(/admin/notices)은 PUT /api/admin/notices 로 통째로 저장한다.
 * 공개 조회는 실패·빈응답을 defaultNoticesConfig 로 접어 화면이 절대 빈 목록으로 깨지지 않게 한다.
 * 서버 컴포넌트는 이 콘센트가 아니라 lib/notices/repo 를 직접 읽는다(자기 API HTTP 왕복 금지).
 */

/** 공개 공지 config. GET /api/notices. 실패·미저장 시 defaultNoticesConfig 로 폴백. */
export async function getNoticesConfig(): Promise<NoticesConfig> {
  try {
    const response = await fetch('/api/notices');
    if (!response.ok) return defaultNoticesConfig;
    const { items } = (await response.json()) as NoticesConfig;
    if (!Array.isArray(items) || items.length === 0) return defaultNoticesConfig;
    return { items };
  } catch {
    return defaultNoticesConfig;
  }
}

/** 관리자 공지 config. GET /api/admin/notices. 실패·깨진 응답은 throw 해서 저장을 막는다
 * (공개 콘센트는 default 폴백이라 장애 시 커스텀 콘텐츠를 default 로 덮어쓸 위험 — concerns 미러). */
export async function getAdminNoticesConfig(): Promise<NoticesConfig> {
  const response = await fetch('/api/admin/notices');
  if (!response.ok) throw new Error('notices-config-load-failed');
  const { items } = (await response.json()) as NoticesConfig;
  if (!Array.isArray(items)) throw new Error('notices-config-invalid-response');
  return { items };
}

/** 공지 config 저장(관리자). PUT /api/admin/notices. 성공/실패를 boolean 으로 돌려 화면이 알린다. */
export async function saveNoticesConfig(config: NoticesConfig): Promise<{ ok: boolean }> {
  try {
    const response = await fetch('/api/admin/notices', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}

/* ── 전시용 후기(showcase reviews) ─────────────────────────────
 * 공개 클라이언트 어댑터(adapters.ts)가 GET /api/showcase-reviews 로 읽고,
 * 관리자 화면(/admin/reviews)은 GET/PUT /api/admin/showcase-reviews 로 통째로 읽고 저장한다.
 * 공개 조회는 실패·빈응답을 defaultShowcaseReviewsConfig 로 접어 화면이 절대 빈 목록으로 깨지지
 * 않게 한다. 서버 컴포넌트는 이 콘센트가 아니라 lib/reviews/repo 를 직접 읽는다(notices 미러).
 */

/** 공개 전시 후기 목록. GET /api/showcase-reviews. 실패·미저장 시 defaultShowcaseReviewsConfig.items 로 폴백. */
export async function getShowcaseReviews(): Promise<Review[]> {
  try {
    const response = await fetch('/api/showcase-reviews');
    if (!response.ok) return defaultShowcaseReviewsConfig.items;
    const { items } = (await response.json()) as ShowcaseReviewsConfig;
    if (!Array.isArray(items)) return defaultShowcaseReviewsConfig.items;
    return items;
  } catch {
    return defaultShowcaseReviewsConfig.items;
  }
}

/** 관리자 전시 후기 config. GET /api/admin/showcase-reviews. 실패·깨진 응답은 throw 해서 저장을 막는다
 * (공개 콘센트는 default 폴백이라 장애 시 커스텀 콘텐츠를 default 로 덮어쓸 위험 — notices 미러). */
export async function getAdminShowcaseReviewsConfig(): Promise<ShowcaseReviewsConfig> {
  const response = await fetch('/api/admin/showcase-reviews');
  if (!response.ok) throw new Error('showcase-reviews-config-load-failed');
  const { items } = (await response.json()) as ShowcaseReviewsConfig;
  // notices 와 달리 빈 배열(items.length === 0)은 정당한 상태라 여기서 거부하지 않는다.
  if (!Array.isArray(items)) throw new Error('showcase-reviews-config-invalid-response');
  return { items };
}

/** 전시 후기 config 저장(관리자). PUT /api/admin/showcase-reviews. 성공/실패를 boolean 으로 돌려 화면이 알린다. */
export async function saveShowcaseReviewsConfig(config: ShowcaseReviewsConfig): Promise<{ ok: boolean }> {
  try {
    const response = await fetch('/api/admin/showcase-reviews', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}

/* ── 주문 정책(무통장입금 자동취소 on/off + 예약 TTL) ─────────────────────────────
 * 관리자 화면(/admin/order-policy)만 쓰는 관리자 전용 config — 공개 화면은 이 값을 읽지 않고,
 * 주문 생성 서버(POST /api/orders)가 repo(resolveBankTransferTtlMs)로 직접 읽는다.
 */

/** 관리자 주문 정책 config. GET /api/admin/order-policy. 실패·깨진 응답은 throw 해서 저장을 막는다
 * (장애 시 기본값이 실값처럼 로드돼 커스텀 설정을 덮어쓸 위험 — insurance-content 미러).
 * enabled 는 `=== true` 일 때만 true(누락·비불리언 = false, 기본 비활성 — config normalize 와 동일 규칙). */
export async function getAdminOrderPolicyConfig(): Promise<OrderPolicyConfig> {
  const response = await fetch('/api/admin/order-policy');
  if (!response.ok) throw new Error('order-policy-config-load-failed');
  const { bankTransferAutoCancelEnabled, bankTransferTtlHours } =
    (await response.json()) as OrderPolicyConfig;
  if (typeof bankTransferTtlHours !== 'number' || !Number.isFinite(bankTransferTtlHours)) {
    throw new Error('order-policy-config-invalid-response');
  }
  return { bankTransferAutoCancelEnabled: bankTransferAutoCancelEnabled === true, bankTransferTtlHours };
}

/** 주문 정책 config 저장(관리자). PUT /api/admin/order-policy. 성공/실패를 boolean 으로 돌려 화면이 알린다. */
export async function saveOrderPolicyConfig(config: OrderPolicyConfig): Promise<{ ok: boolean }> {
  try {
    const response = await fetch('/api/admin/order-policy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}

const USER_KEY = 'baekjo_user';

export function getCurrentUser(): User | null {
  return getJSON<User | null>(USER_KEY, null);
}

export function setCurrentUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  clearWishlistCache();
  if (user) {
    setJSON(USER_KEY, user);
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

/**
 * 이메일/비밀번호 로그인. Auth.js Credentials 프로바이더로 서버 세션을 세운 뒤
 * /api/members/me 로 최신 회원 정보를 읽어온다. next-auth 는 동적 import 로
 * 불러와 이 파일이 next-auth 에 정적 의존하지 않도록 한다(logout()과 동일 패턴).
 *
 * signIn 자체가 실패하면 'invalid-credentials'(비밀번호 오류). signIn은 성공했는데
 * /api/members/me 조회가 실패하면 — 서버 세션은 이미 생성된 상태이므로 비밀번호
 * 문제로 오인시키지 않도록 별도로 'network'를 반환한다.
 */
export async function login(
  email: string,
  password: string,
): Promise<{ user?: User; error?: 'invalid-credentials' | 'network' }> {
  const { signIn } = await import('next-auth/react');
  const result = await signIn('credentials', { email, password, redirect: false });
  if (result?.error) return { error: 'invalid-credentials' };

  try {
    const response = await fetch('/api/members/me');
    if (!response.ok) return { error: 'network' };
    const { user } = (await response.json()) as { user: User };
    setCurrentUser(user);
    return { user };
  } catch {
    return { error: 'network' };
  }
}

/** 회원가입. 서버에 회원을 생성한 뒤 곧바로 로그인해 세션을 세운다. */
export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  phone: string;
  petType?: string;
  breed?: string;
  mainConcern?: string;
}): Promise<{ user?: User; error?: 'duplicate-email' | 'invalid-input' | 'network' | 'session' }> {
  try {
    const response = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (response.status === 201) {
      const loginResult = await login(input.email, input.password);
      // 가입(201)은 성공했지만 후속 로그인이 실패한 경우 — 조용히 넘기면
      // 로그아웃 상태로 /mypage에 보내게 되므로 명시적으로 알린다.
      if (!loginResult.user) return { error: 'session' };
      return { user: loginResult.user };
    }
    if (response.status === 409) return { error: 'duplicate-email' };
    if (response.status === 400) return { error: 'invalid-input' };
    return { error: 'network' };
  } catch {
    return { error: 'network' };
  }
}

/**
 * B2B/보험/파트너 사업자 회원가입. 승인 전까지 status가 'pending'으로 시작하므로
 * registerUser와 달리 가입 직후 자동 로그인을 걸지 않고 서버 응답을 그대로 반환한다.
 */
export async function registerBusinessMember(input: {
  role: 'b2b' | 'insurance' | 'partner';
  name: string;
  email: string;
  password: string;
  phone: string;
  companyName?: string;
  businessNumber?: string;
  signupData?: Record<string, unknown>;
}): Promise<{ user?: User; error?: 'duplicate-email' | 'invalid-input' | 'network' }> {
  try {
    const response = await fetch('/api/members/business', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (response.status === 201) {
      const { user } = (await response.json()) as { user: User };
      return { user };
    }
    if (response.status === 409) return { error: 'duplicate-email' };
    if (response.status === 400) return { error: 'invalid-input' };
    return { error: 'network' };
  } catch {
    return { error: 'network' };
  }
}

/**
 * 관리자 회원 목록(전체). GET /api/admin/members(관리자 세션 필요). 화면이 "로그인 필요"와
 * "일반 실패"를 구분해 다른 UX를 보여주므로, orders 처럼 빈 배열로 접지 않고 도메인 에러를
 * 반환한다(updateUserStatus 와 동일한 error 유니온 패턴).
 */
export async function getAdminMembers(): Promise<{
  users?: User[];
  error?: 'unauthorized' | 'forbidden' | 'network';
}> {
  try {
    const response = await fetch('/api/admin/members');
    if (response.ok) {
      const { users } = (await response.json()) as { users: User[] };
      return { users };
    }
    if (response.status === 401) return { error: 'unauthorized' };
    if (response.status === 403) return { error: 'forbidden' };
    return { error: 'network' };
  } catch {
    return { error: 'network' };
  }
}

export type AdminDashboardResult =
  | { ok: true; data: AdminDashboardSummary }
  | { ok: false; status: number; message: string };

/** 관리자 대시보드 요약(최근 주문·보험 신청·가입 승인 대기). GET /api/admin/dashboard. */
export async function getAdminDashboardSummary(): Promise<AdminDashboardResult> {
  try {
    const response = await fetch('/api/admin/dashboard');
    if (!response.ok) {
      return { ok: false, status: response.status, message: 'network-error' };
    }
    const data = (await response.json()) as AdminDashboardSummary;
    return { ok: true, data };
  } catch {
    return { ok: false, status: 500, message: 'network-error' };
  }
}

/** 관리자의 회원 승인/반려/상태 변경. */
export async function updateUserStatus(
  id: string,
  status: 'active' | 'inactive' | 'pending' | 'rejected',
  rejectReason?: string,
): Promise<{ user?: User; error?: 'invalid-input' | 'not-found' | 'forbidden' | 'network' }> {
  try {
    const response = await fetch(`/api/admin/members/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, rejectReason }),
    });
    if (response.ok) {
      const { user } = (await response.json()) as { user: User };
      return { user };
    }
    if (response.status === 400) return { error: 'invalid-input' };
    if (response.status === 404) return { error: 'not-found' };
    if (response.status === 401 || response.status === 403) return { error: 'forbidden' };
    return { error: 'network' };
  } catch {
    return { error: 'network' };
  }
}

/**
 * 마이페이지 회원정보(이름/연락처/반려동물종·견종/주요고민) 저장. 서버가 진실이므로
 * 200 응답을 받은 뒤에만 호출부가 setCurrentUser로 로컬 캐시를 갱신해야 한다(그 전엔 갱신 금지 —
 * 예전엔 이 API 호출이 아예 없어 localStorage만 바꾸고 새로고침하면 되돌아가던 문제가 있었다).
 */
export async function updateMyProfile(input: {
  name?: string;
  phone?: string;
  petType?: string;
  breed?: string;
  mainConcern?: string;
}): Promise<{ user?: User; error?: 'invalid-input' | 'not-found' | 'network' }> {
  try {
    const response = await fetch('/api/members/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (response.ok) {
      const { user } = (await response.json()) as { user: User };
      return { user };
    }
    if (response.status === 400) return { error: 'invalid-input' };
    if (response.status === 404) return { error: 'not-found' };
    return { error: 'network' };
  } catch {
    return { error: 'network' };
  }
}

/** 비밀번호 변경. 상태코드를 도메인 에러로 매핑해 화면이 분기할 수 있게 한다. */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok?: true; error?: 'invalid-current' | 'invalid-input' | 'social-account' | 'network' }> {
  try {
    const response = await fetch('/api/members/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (response.ok) return { ok: true };
    if (response.status === 400) {
      const { error } = (await response.json()) as {
        error?: 'invalid-current' | 'invalid-input' | 'social-account';
      };
      return { error: error ?? 'invalid-input' };
    }
    return { error: 'network' };
  } catch {
    return { error: 'network' };
  }
}

/** 비밀번호 재설정 요청. 이메일 존재 여부를 노출하지 않도록 서버는 항상 200을 반환한다. */
export async function requestPasswordReset(email: string): Promise<{ ok?: true; error?: 'network' }> {
  try {
    const response = await fetch('/api/members/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (response.ok) return { ok: true };
    return { error: 'network' };
  } catch {
    return { error: 'network' };
  }
}

/** 비밀번호 재설정 확정. 토큰이 만료·사용됨이면 invalid-token, 새 비밀번호 형식 오류면 invalid-input. */
export async function confirmPasswordReset(
  token: string,
  newPassword: string,
): Promise<{ ok?: true; error?: 'invalid-token' | 'invalid-input' | 'network' }> {
  try {
    const response = await fetch('/api/members/password-reset/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    if (response.ok) return { ok: true };
    if (response.status === 400) {
      const { error } = (await response.json()) as { error?: 'invalid-token' | 'invalid-input' };
      return { error: error ?? 'invalid-input' };
    }
    return { error: 'network' };
  } catch {
    return { error: 'network' };
  }
}

/** 이메일 인증 메일 발송 요청. 로그인 세션(쿠키)이 필요하다. */
export async function requestEmailVerification(): Promise<{
  ok?: true;
  already?: boolean;
  error?: 'no-session' | 'network';
}> {
  try {
    const response = await fetch('/api/members/verify/request', { method: 'POST' });
    if (response.ok) {
      const data = (await response.json()) as { ok: true; already?: boolean };
      return { ok: true, already: data.already };
    }
    if (response.status === 401) return { error: 'no-session' };
    return { error: 'network' };
  } catch {
    return { error: 'network' };
  }
}

/** 이메일 인증 확정. 토큰이 만료·사용됨이면 invalid-token. */
export async function confirmEmailVerification(
  token: string,
): Promise<{ ok?: true; error?: 'invalid-token' | 'network' }> {
  try {
    const response = await fetch('/api/members/verify/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (response.ok) return { ok: true };
    if (response.status === 400) {
      const { error } = (await response.json()) as { error?: 'invalid-token' };
      return { error: error ?? 'invalid-token' };
    }
    return { error: 'network' };
  } catch {
    return { error: 'network' };
  }
}

export function logout(): void {
  setCurrentUser(null);
  // 소셜(Auth.js 쿠키) 세션도 함께 정리. 동적 import 로 storage.ts 의 모든
  // 사용처가 next-auth 에 정적 의존하지 않도록 fire-and-forget 처리.
  import('next-auth/react').then((m) => m.signOut({ redirect: false })).catch(() => {});
}

export function isLoggedIn(): boolean {
  return getCurrentUser() !== null;
}

export function isAdmin(): boolean {
  return getCurrentUser()?.role === 'admin';
}

/* ── 공통 유틸 ─────────────────────────────────── */

/** 주문상품의 안정적인 복합 키 생성 (OrderItem에 고유 id가 없으므로) */
export function buildReviewTargetKey(
  orderId: string,
  productId: string,
  optionName?: string,
): string {
  return `${orderId}:${productId}:${optionName ?? 'default'}`;
}

/** 입점업체 브랜드 관리 권한 확인 (목업 수준) */
export function canManageBrand(user: User, brandId: string): boolean {
  if (user.role === 'admin') return true;
  return user.role === 'partner' && (user.managedBrandIds?.includes(brandId) ?? false);
}

/* ── localStorage 같은 탭 동기화 ─────────────── */

export const STORAGE_EVENTS = {
  WISHLIST_CHANGED: 'wishlist-changed',
  REVIEWS_CHANGED: 'product-reviews-changed',
  INQUIRIES_CHANGED: 'product-inquiries-changed',
} as const;

function emitStorageEvent(eventName: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName));
  }
}

/* ── 사용자 작성 구매평 CRUD ─────────────────────────────────
 * DB 전환(be/reviews-inquiries-db) — localStorage 대신 /api/reviews·/api/products/[id]/reviews
 * 를 읽고 쓴다. 콘센트 시그니처는 이름을 유지하되 전부 async 로 바뀌었다(contract-change).
 * 실패는 orders/products 콘센트와 동일하게 빈 배열/undefined 로 접고, 쓰기 실패는 throw 한다.
 */

import type { ProductReview, ProductInquiry } from '@/types';

/** 특정 상품의 노출(published) 구매평. GET /api/products/[id]/reviews(공개). 실패 시 빈 배열. */
export async function getProductReviewsByProduct(productId: string): Promise<ProductReview[]> {
  try {
    const response = await fetch(`/api/products/${encodeURIComponent(productId)}/reviews`);
    if (!response.ok) return [];
    const { reviews } = (await response.json()) as { reviews: ProductReview[] };
    return reviews;
  } catch {
    return [];
  }
}

/** 본인 구매평 전체(hidden 포함). GET /api/reviews/mine(세션 필요). 실패 시 빈 배열. */
export async function getProductReviewsByUser(userId: string): Promise<ProductReview[]> {
  try {
    const response = await fetch('/api/reviews/mine');
    if (!response.ok) return [];
    const { reviews } = (await response.json()) as { reviews: ProductReview[] };
    return reviews.filter((r) => r.userId === userId);
  } catch {
    return [];
  }
}

/**
 * 구매평 작성. POST /api/reviews(세션 필요). 서버가 orderId 소유권을 재검증하고
 * reviewTargetKey 를 계산해 중복 작성을 막는다. 중복이면 409 → throw 로 알린다
 * (호출부가 기존 duplicated-review 문구로 catch 하던 동작 보존).
 */
export async function addProductReview(
  input: Omit<ProductReview, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { optionName?: string },
): Promise<ProductReview> {
  const response = await fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (response.status === 409) {
    throw new Error('이미 구매평을 작성한 주문상품입니다.');
  }
  if (response.status !== 201) {
    throw new Error('review-create-failed');
  }
  const { review } = (await response.json()) as { review: ProductReview };
  emitStorageEvent(STORAGE_EVENTS.REVIEWS_CHANGED);
  return review;
}

/** 본인 구매평 수정. PATCH /api/reviews/[id](세션 필요, 소유자만). */
export async function updateProductReview(
  id: string,
  userId: string,
  updates: Partial<Pick<ProductReview, 'rating' | 'title' | 'content'>>,
): Promise<void> {
  const response = await fetch(`/api/reviews/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error('review-update-failed');
  }
  emitStorageEvent(STORAGE_EVENTS.REVIEWS_CHANGED);
}

/** 본인 구매평 삭제. DELETE /api/reviews/[id](세션 필요, 소유자만). */
export async function deleteProductReview(id: string, _userId: string): Promise<void> {
  const response = await fetch(`/api/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error('review-delete-failed');
  }
  emitStorageEvent(STORAGE_EVENTS.REVIEWS_CHANGED);
}

/* ── 사용자 작성 상품문의 CRUD ─────────────────────────────── */

/** 특정 상품의 문의 전체(비밀글 포함 — content/answer 는 서버가 열람 권한에 따라 redaction).
 *  GET /api/products/[id]/inquiries(공개). 실패 시 빈 배열. */
export async function getProductInquiriesByProduct(productId: string): Promise<ProductInquiry[]> {
  try {
    const response = await fetch(`/api/products/${encodeURIComponent(productId)}/inquiries`);
    if (!response.ok) return [];
    const { inquiries } = (await response.json()) as { inquiries: ProductInquiry[] };
    return inquiries;
  } catch {
    return [];
  }
}

/** 본인 문의 전체. GET /api/inquiries/mine(세션 필요). 실패 시 빈 배열. */
export async function getProductInquiriesByUser(userId: string): Promise<ProductInquiry[]> {
  try {
    const response = await fetch('/api/inquiries/mine');
    if (!response.ok) return [];
    const { inquiries } = (await response.json()) as { inquiries: ProductInquiry[] };
    return inquiries.filter((i) => i.userId === userId);
  } catch {
    return [];
  }
}

/** 관리자/파트너 문의 목록. GET /api/admin/inquiries(관리자·파트너 세션 필요). 실패 시 빈 배열.
 *  서버가 admin 은 전체, partner 는 자기 브랜드로(TODO(RBAC) 반영 전까지는 빈 배열) 필터링한다. */
export async function getAdminInquiries(): Promise<ProductInquiry[]> {
  try {
    const response = await fetch('/api/admin/inquiries');
    if (!response.ok) return [];
    const { inquiries } = (await response.json()) as { inquiries: ProductInquiry[] };
    return inquiries;
  } catch {
    return [];
  }
}

/** 상품문의 작성. POST /api/inquiries(세션 필요). */
export async function addProductInquiry(
  input: Omit<ProductInquiry, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
): Promise<ProductInquiry> {
  const response = await fetch('/api/inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (response.status !== 201) {
    throw new Error('inquiry-create-failed');
  }
  const { inquiry } = (await response.json()) as { inquiry: ProductInquiry };
  emitStorageEvent(STORAGE_EVENTS.INQUIRIES_CHANGED);
  return inquiry;
}

/** 본인 문의 수정(답변완료 후에는 서버가 반영하지 않는다). PATCH /api/inquiries/[id]. */
export async function updateProductInquiry(
  id: string,
  userId: string,
  updates: Partial<Pick<ProductInquiry, 'title' | 'content' | 'isSecret'>>,
): Promise<void> {
  const response = await fetch(`/api/inquiries/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error('inquiry-update-failed');
  }
  emitStorageEvent(STORAGE_EVENTS.INQUIRIES_CHANGED);
}

/** 본인 문의 삭제. DELETE /api/inquiries/[id]. */
export async function deleteProductInquiry(id: string, _userId: string): Promise<void> {
  const response = await fetch(`/api/inquiries/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error('inquiry-delete-failed');
  }
  emitStorageEvent(STORAGE_EVENTS.INQUIRIES_CHANGED);
}

/** 관리자 또는 브랜드 담당자 — 답변 작성/수정. POST /api/admin/inquiries/[id]/answer.
 *  answeredBy 는 서버가 세션 사용자 이름으로 정하므로 인자는 호출부 호환을 위해서만 남긴다. */
export async function answerProductInquiry(id: string, answer: string): Promise<void> {
  const response = await fetch(`/api/admin/inquiries/${encodeURIComponent(id)}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer }),
  });
  if (!response.ok) {
    throw new Error('inquiry-answer-failed');
  }
  emitStorageEvent(STORAGE_EVENTS.INQUIRIES_CHANGED);
}

/* ── 관리자 이미지 업로드 ──────────────────────────────────────
 * 상품·브랜드·배너 이미지를 Supabase Storage(catalog-assets 버킷)에 올린다.
 * 엔티티가 아직 없는 신규 작성 화면은 entityId 대신 draftId 를 넘겨 temp/ 경로에
 * 임시 업로드하고, 저장을 취소하면 deleteTemporaryAdminImage 로 폐기한다. */

export type AdminImageDomain = 'product' | 'brand' | 'banner';

/** usage 는 domain 별 허용값이 다르다 — product: main|gallery|detail / brand: logo|cover / banner: hero.
 *  서버(/api/admin/upload)가 최종 검증하므로 여기서는 문자열로 받는다. */
export interface AdminImageUploadInput {
  file: File;
  domain: AdminImageDomain;
  usage: string;
  entityId?: string;
  draftId?: string;
}

export interface AdminImageUploadResult {
  success: boolean;
  path: string;
  publicUrl: string;
  bucket: string;
}

/** 관리자 전용 — 이미지 업로드. POST /api/admin/upload (multipart/form-data). */
export async function uploadAdminImage(input: AdminImageUploadInput): Promise<AdminImageUploadResult> {
  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('domain', input.domain);
  formData.append('usage', input.usage);
  if (input.entityId) formData.append('entityId', input.entityId);
  if (input.draftId) formData.append('draftId', input.draftId);

  const response = await fetch('/api/admin/upload', { method: 'POST', body: formData });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'upload-failed');
  }
  return data as AdminImageUploadResult;
}

/** 관리자 전용 — 임시(temp/) 업로드본 폐기. DELETE /api/admin/upload?path=...
 *  정식 경로 파일은 물리 삭제하지 않고 `deleted:false` 로 응답한다(참조만 해제). */
export async function deleteTemporaryAdminImage(path: string): Promise<{ deleted: boolean; reason: string }> {
  const params = new URLSearchParams({ path });
  const response = await fetch(`/api/admin/upload?${params.toString()}`, { method: 'DELETE' });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'delete-failed');
  }
  return data as { deleted: boolean; reason: string };
}
