import { Brand, ConfirmedOrderSummary, InsuranceApplication, Order, Product, User } from '@/types';
import { users as mockUsers } from '@/data/users';
import { defaultSurveyConfig, type SurveyConfig } from '@/lib/survey/config';
import { defaultKitsConfig, type KitsConfig } from '@/lib/kits/config';
import { defaultPartnersConfig, type PartnersConfig } from '@/lib/partners/config';
import { defaultQnaConfig, type QnaConfig } from '@/lib/qna/config';

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

export function getWishlist(): string[] {
  return getJSON<string[]>(WISHLIST_KEY, []);
}

export function toggleWishlist(productId: string): boolean {
  const list = getWishlist();
  const index = list.indexOf(productId);
  if (index >= 0) {
    list.splice(index, 1);
    setJSON(WISHLIST_KEY, list);
    return false;
  }
  list.push(productId);
  setJSON(WISHLIST_KEY, list);
  return true;
}

export function isWishlisted(productId: string): boolean {
  return getWishlist().includes(productId);
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
    Pick<Order, 'orderStatus' | 'paymentStatus' | 'deliveryStatus' | 'trackingNumber' | 'carrier'>
  >,
): Promise<void> {
  const response = await fetch(`/api/admin/orders/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error('order-update-failed');
  }
}

/**
 * 토스 결제 승인 확정. successUrl(paymentKey·orderId·amount 쿼리)에서 호출한다.
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

/**
 * 결제 실패/이탈 시 재고 선점 취소. failUrl 또는 결제창 이탈 시 호출한다.
 * 서버가 payment_status='결제대기'인 선점 주문만 대상으로 재고를 복원한다(확정건은 no-op).
 * 실패 시 throw — 호출부가 "취소됐다"고 오인해 사용자에게 잘못된 안내를 하지 않도록.
 */
export async function cancelReservation(orderId: string): Promise<void> {
  const response = await fetch('/api/payments/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  });
  if (!response.ok) {
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

/** 관리자 상품 목록(비노출 포함). GET /api/admin/products(관리자 세션 필요). 실패 시 빈 배열. */
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

/** 상품 삭제. DELETE /api/admin/products/[id]. */
export async function deleteProduct(id: string): Promise<{ ok?: true; error?: string }> {
  try {
    const response = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok) return { error: 'network' };
    return { ok: true };
  } catch {
    return { error: 'network' };
  }
}

/** 관리자 브랜드 목록(비노출 포함). GET /api/admin/brands(관리자 세션 필요). 실패 시 빈 배열. */
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
 * 공개/관리자 조회 모두 실패·미저장을 default* 로 접어 화면이 빈 목록으로 조용히 깨지지 않게 한다.
 */

/** 관리자 케어 키트 config. GET /api/admin/kits. 실패·미저장 시 defaultKitsConfig 로 폴백. */
export async function getKitsConfig(): Promise<KitsConfig> {
  try {
    const response = await fetch('/api/admin/kits');
    if (!response.ok) return defaultKitsConfig;
    const { items } = (await response.json()) as KitsConfig;
    if (!Array.isArray(items)) return defaultKitsConfig;
    return { items };
  } catch {
    return defaultKitsConfig;
  }
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

/** 관리자 제휴처 config. GET /api/admin/partners. 실패·미저장 시 defaultPartnersConfig 로 폴백. */
export async function getPartnersConfig(): Promise<PartnersConfig> {
  try {
    const response = await fetch('/api/admin/partners');
    if (!response.ok) return defaultPartnersConfig;
    const { items } = (await response.json()) as PartnersConfig;
    if (!Array.isArray(items)) return defaultPartnersConfig;
    return { items };
  } catch {
    return defaultPartnersConfig;
  }
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

const USER_KEY = 'baekjo_user';
const REGISTERED_USERS_KEY = 'baekjo_registered_users';

export function getCurrentUser(): User | null {
  return getJSON<User | null>(USER_KEY, null);
}

export function setCurrentUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    setJSON(USER_KEY, user);
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function getUsers(): User[] {
  const registered = getJSON<User[]>(REGISTERED_USERS_KEY, []);
  const merged = [...mockUsers, ...registered];
  return merged.filter(
    (user, index) => merged.findIndex((candidate) => candidate.email === user.email) === index,
  );
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

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

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
  REVIEWS_CHANGED: 'product-reviews-changed',
  INQUIRIES_CHANGED: 'product-inquiries-changed',
} as const;

function emitStorageEvent(eventName: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName));
  }
}

/* ── 사용자 작성 구매평 CRUD ─────────────────── */

import type { ProductReview, ProductInquiry } from '@/types';

const PRODUCT_REVIEWS_KEY = 'baekjo_product_reviews';

export function getProductReviews(): ProductReview[] {
  return getJSON<ProductReview[]>(PRODUCT_REVIEWS_KEY, []);
}

export function getProductReviewsByProduct(productId: string): ProductReview[] {
  return getProductReviews().filter((r) => r.productId === productId);
}

export function getProductReviewsByUser(userId: string): ProductReview[] {
  return getProductReviews().filter((r) => r.userId === userId);
}

export function getProductReviewByOrderItem(reviewTargetKey: string): ProductReview | undefined {
  return getProductReviews().find((r) => r.reviewTargetKey === reviewTargetKey);
}

export function addProductReview(
  input: Omit<ProductReview, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
): ProductReview {
  const list = getProductReviews();

  // 중복 검증
  const duplicated = list.some(
    (r) => r.userId === input.userId && r.reviewTargetKey === input.reviewTargetKey,
  );
  if (duplicated) {
    throw new Error('이미 구매평을 작성한 주문상품입니다.');
  }

  const now = new Date().toISOString();
  const review: ProductReview = {
    ...input,
    id: `pr-${generateId()}`,
    status: 'published',
    createdAt: now,
    updatedAt: now,
  };

  list.push(review);
  setJSON(PRODUCT_REVIEWS_KEY, list);
  emitStorageEvent(STORAGE_EVENTS.REVIEWS_CHANGED);
  return review;
}

export function updateProductReview(
  id: string,
  userId: string,
  updates: Partial<Pick<ProductReview, 'rating' | 'title' | 'content'>>,
): void {
  const list = getProductReviews();
  const item = list.find((r) => r.id === id && r.userId === userId);
  if (!item) return;
  Object.assign(item, updates, { updatedAt: new Date().toISOString() });
  setJSON(PRODUCT_REVIEWS_KEY, list);
  emitStorageEvent(STORAGE_EVENTS.REVIEWS_CHANGED);
}

export function deleteProductReview(id: string, userId: string): void {
  const list = getProductReviews();
  const idx = list.findIndex((r) => r.id === id && r.userId === userId);
  if (idx < 0) return;
  list.splice(idx, 1);
  setJSON(PRODUCT_REVIEWS_KEY, list);
  emitStorageEvent(STORAGE_EVENTS.REVIEWS_CHANGED);
}

/** 관리자 전용 — 노출 상태 변경 */
export function setProductReviewStatus(id: string, status: 'published' | 'hidden'): void {
  const list = getProductReviews();
  const item = list.find((r) => r.id === id);
  if (!item) return;
  item.status = status;
  item.updatedAt = new Date().toISOString();
  setJSON(PRODUCT_REVIEWS_KEY, list);
  emitStorageEvent(STORAGE_EVENTS.REVIEWS_CHANGED);
}

/* ── 사용자 작성 상품문의 CRUD ───────────────── */

const PRODUCT_INQUIRIES_KEY = 'baekjo_product_inquiries';

export function getProductInquiries(): ProductInquiry[] {
  return getJSON<ProductInquiry[]>(PRODUCT_INQUIRIES_KEY, []);
}

export function getProductInquiriesByProduct(productId: string): ProductInquiry[] {
  return getProductInquiries().filter((i) => i.productId === productId);
}

export function getProductInquiriesByUser(userId: string): ProductInquiry[] {
  return getProductInquiries().filter((i) => i.userId === userId);
}

export function getProductInquiriesByBrand(brandId: string): ProductInquiry[] {
  return getProductInquiries().filter((i) => i.brandId === brandId);
}

export function addProductInquiry(
  input: Omit<ProductInquiry, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
): ProductInquiry {
  const now = new Date().toISOString();
  const inquiry: ProductInquiry = {
    ...input,
    id: `pi-${generateId()}`,
    status: 'waiting',
    createdAt: now,
    updatedAt: now,
  };

  const list = getProductInquiries();
  list.push(inquiry);
  setJSON(PRODUCT_INQUIRIES_KEY, list);
  emitStorageEvent(STORAGE_EVENTS.INQUIRIES_CHANGED);
  return inquiry;
}

export function updateProductInquiry(
  id: string,
  userId: string,
  updates: Partial<Pick<ProductInquiry, 'title' | 'content' | 'isSecret'>>,
): void {
  const list = getProductInquiries();
  const item = list.find((i) => i.id === id && i.userId === userId);
  if (!item) return;
  // 답변 완료 후 수정 불가
  if (item.status === 'answered') return;
  Object.assign(item, updates, { updatedAt: new Date().toISOString() });
  setJSON(PRODUCT_INQUIRIES_KEY, list);
  emitStorageEvent(STORAGE_EVENTS.INQUIRIES_CHANGED);
}

export function deleteProductInquiry(id: string, userId: string): void {
  const list = getProductInquiries();
  const idx = list.findIndex((i) => i.id === id && i.userId === userId);
  if (idx < 0) return;
  list.splice(idx, 1);
  setJSON(PRODUCT_INQUIRIES_KEY, list);
  emitStorageEvent(STORAGE_EVENTS.INQUIRIES_CHANGED);
}

/** 관리자 또는 브랜드 담당자 — 답변 작성/수정 */
export function answerProductInquiry(
  id: string,
  answer: string,
  answeredBy: string,
): void {
  const list = getProductInquiries();
  const item = list.find((i) => i.id === id);
  if (!item) return;
  item.answer = answer;
  item.answeredBy = answeredBy;
  item.answeredAt = new Date().toISOString();
  item.status = 'answered';
  item.updatedAt = new Date().toISOString();
  setJSON(PRODUCT_INQUIRIES_KEY, list);
  emitStorageEvent(STORAGE_EVENTS.INQUIRIES_CHANGED);
}
