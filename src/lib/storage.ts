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
