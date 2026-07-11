import { InsuranceApplication, Order, User } from '@/types';
import { insuranceApplications } from '@/data/insuranceApplications';
import { orders as mockOrders } from '@/data/orders';
import { users as mockUsers } from '@/data/users';

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

const INSURANCE_KEY = 'baekjo_insurance';

export function getInsuranceApplications(): InsuranceApplication[] {
  return getJSON<InsuranceApplication[]>(INSURANCE_KEY, insuranceApplications);
}

export function addInsuranceApplication(application: InsuranceApplication): void {
  const list = getInsuranceApplications();
  list.push(application);
  setJSON(INSURANCE_KEY, list);
}

export const saveInsuranceApplication = addInsuranceApplication;

export function updateInsuranceStatus(
  id: string,
  status: InsuranceApplication['status'],
  memo?: string,
): void {
  const list = getInsuranceApplications();
  const item = list.find((application) => application.id === id);
  if (item) {
    item.status = status;
    if (memo !== undefined) item.memo = memo;
    setJSON(INSURANCE_KEY, list);
  }
}

export function updateInsuranceMemo(id: string, memo: string): void {
  const list = getInsuranceApplications();
  const item = list.find((application) => application.id === id);
  if (item) {
    item.memo = memo;
    setJSON(INSURANCE_KEY, list);
  }
}

export function updateInsuranceContacted(id: string, contacted: boolean): void {
  const list = getInsuranceApplications();
  const item = list.find((application) => application.id === id);
  if (item) {
    item.contacted = contacted;
    setJSON(INSURANCE_KEY, list);
  }
}

const ORDER_KEY = 'baekjo_orders';
const LAST_ORDER_KEY = 'baekjo_last_order_id';

export function getOrders(): Order[] {
  return getJSON<Order[]>(ORDER_KEY, mockOrders);
}

export function addOrder(order: Order): void {
  const list = getOrders();
  list.push(order);
  setJSON(ORDER_KEY, list);
  if (typeof window !== 'undefined') localStorage.setItem(LAST_ORDER_KEY, order.id);
}

export function getOrderById(id: string): Order | undefined {
  return getOrders().find((order) => order.id === id);
}

export function getLastOrder(): Order | undefined {
  if (typeof window === 'undefined') return undefined;
  const id = localStorage.getItem(LAST_ORDER_KEY);
  return id ? getOrderById(id) : undefined;
}

export function updateOrderStatus(
  id: string,
  updates: Partial<Pick<Order, 'orderStatus' | 'paymentStatus' | 'deliveryStatus' | 'trackingNumber'>>,
): void {
  const list = getOrders();
  const item = list.find((order) => order.id === id);
  if (item) {
    Object.assign(item, updates);
    setJSON(ORDER_KEY, list);
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

export function registerUser(user: User): User {
  const registered = getJSON<User[]>(REGISTERED_USERS_KEY, []);
  registered.push(user);
  setJSON(REGISTERED_USERS_KEY, registered);
  setCurrentUser(user);
  return user;
}

export function updateUserStatus(id: string, status: User['status'], rejectReason?: string): void {
  const registered = getJSON<User[]>(REGISTERED_USERS_KEY, []);
  const index = registered.findIndex((u) => u.id === id);
  if (index >= 0) {
    registered[index].status = status;
    if (rejectReason !== undefined) {
      registered[index].rejectReason = rejectReason;
    }
    setJSON(REGISTERED_USERS_KEY, registered);
  }
}

export function login(email: string): User {
  const existing = getUsers().find(
    (user) => user.email.toLowerCase() === email.toLowerCase(),
  );
  const user: User = existing ?? {
    id: `u-${Date.now()}`,
    name: email.split('@')[0] || '백조회원',
    email,
    phone: '',
    role: 'user',
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  setCurrentUser(user);
  return user;
}

export function logout(): void {
  setCurrentUser(null);
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
