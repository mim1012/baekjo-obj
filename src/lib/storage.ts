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
