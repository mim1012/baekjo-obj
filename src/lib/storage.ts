import { InsuranceApplication, Order, User } from '@/types';
import { insuranceApplications } from '@/data/insuranceApplications';
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
  updates: Partial<Pick<Order, 'orderStatus' | 'paymentStatus' | 'deliveryStatus' | 'trackingNumber'>>,
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
