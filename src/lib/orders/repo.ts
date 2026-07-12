// orders 테이블 접근 계층. 이 파일 밖에서는 Supabase를 직접 호출하지 않는다.
import { getSupabase } from '@/lib/supabase/server';
import { ORDER_STATUSES, type Order, type OrderItem, type OrderStatus } from '@/types';

const ORDER_STATUS_SET = new Set<string>(ORDER_STATUSES);

/** DB order_status 는 자유 text 라 유니온 밖 값이 들어올 수 있다. 미지값은 '주문접수'로 정규화해
 *  admin select/필터/통계가 조용히 깨지지 않게 한다. */
function normalizeOrderStatus(raw: string): OrderStatus {
  return ORDER_STATUS_SET.has(raw) ? (raw as OrderStatus) : '주문접수';
}

/**
 * DB 레코드. Order(화면 타입) + member_id(소유자, 게스트 주문이면 null).
 * memberId는 소유권 검증(내 주문 / IDOR 방지)에만 쓰이고 Order의 상위집합이므로
 * 그대로 화면 타입 자리에 넘겨도 안전하다.
 */
export type OrderRecord = Order & { memberId: string | null };

interface OrderRow {
  id: string;
  member_id: string | null;
  customer_name: string;
  phone: string;
  address: string;
  items: unknown;
  total_price: number;
  delivery_fee: number;
  payment_method: string;
  order_status: string;
  payment_status: string;
  delivery_status: string;
  tracking_number: string | null;
  delivery_memo: string | null;
  created_at: string;
  carrier: string | null;
  payment_key: string | null;
  paid_at: string | null;
  expires_at: string | null;
}

const SELECT_COLUMNS =
  'id, member_id, customer_name, phone, address, items, total_price, delivery_fee, payment_method, order_status, payment_status, delivery_status, tracking_number, delivery_memo, created_at, carrier, payment_key, paid_at, expires_at';

/** jsonb items를 OrderItem[]로 안전 파싱. 배열이 아니면 빈 배열로 방어한다. */
function parseItems(raw: unknown): OrderItem[] {
  if (Array.isArray(raw)) return raw as OrderItem[];
  return [];
}

function rowToRecord(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    memberId: row.member_id,
    customerName: row.customer_name,
    phone: row.phone,
    address: row.address,
    items: parseItems(row.items),
    totalPrice: row.total_price,
    deliveryFee: row.delivery_fee,
    paymentMethod: row.payment_method,
    orderStatus: normalizeOrderStatus(row.order_status),
    paymentStatus: row.payment_status,
    deliveryStatus: row.delivery_status,
    trackingNumber: row.tracking_number ?? undefined,
    deliveryMemo: row.delivery_memo ?? undefined,
    createdAt: row.created_at,
    carrier: row.carrier ?? undefined,
    paymentKey: row.payment_key ?? undefined,
    paidAt: row.paid_at ?? undefined,
    expiresAt: row.expires_at ?? undefined,
  };
}

/**
 * 주문 생성 입력. id/createdAt/memberId는 서버가 정하므로 여기서 받지 않는다(mass-assignment 차단).
 * Omit이 아니라 명시 Pick으로 좁힌다 — carrier/paymentKey/paidAt은 생성 시점엔 존재할 수 없는 값이라
 * (택배 발송·결제 승인은 주문 생성 이후 이벤트) 여기 섞이면 "생성할 때부터 이미 결제됐다"는 위조 경로가
 * 생긴다. carrier는 updateOrderStatus, paymentKey/paidAt은 setOrderPaid 전용 — 이 함수는 손대지 않는다.
 */
export type InsertOrderInput = Pick<
  Order,
  | 'customerName'
  | 'phone'
  | 'address'
  | 'items'
  | 'totalPrice'
  | 'deliveryFee'
  | 'paymentMethod'
  | 'orderStatus'
  | 'paymentStatus'
  | 'deliveryStatus'
  | 'trackingNumber'
  | 'deliveryMemo'
  | 'expiresAt'
>;

export async function insertOrder(
  input: InsertOrderInput,
  memberId: string | null,
): Promise<OrderRecord> {
  const { data, error } = await getSupabase()
    .from('orders')
    .insert({
      member_id: memberId,
      customer_name: input.customerName,
      phone: input.phone,
      address: input.address,
      items: input.items,
      total_price: input.totalPrice,
      delivery_fee: input.deliveryFee,
      payment_method: input.paymentMethod,
      order_status: input.orderStatus,
      payment_status: input.paymentStatus,
      delivery_status: input.deliveryStatus,
      tracking_number: input.trackingNumber ?? null,
      delivery_memo: input.deliveryMemo ?? null,
      expires_at: input.expiresAt ?? null,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return rowToRecord(data as OrderRow);
}

/** 재고 차감 실패 시 방금 만든 주문을 되돌리는 보상용. 생성 직후 자기 주문에만 사용한다. */
export async function deleteOrderById(id: string): Promise<void> {
  const { error } = await getSupabase().from('orders').delete().eq('id', id);
  if (error) throw error;
}

/** 주문 항목만큼 상품 재고를 원자적으로 차감(0021 마이그레이션 rpc). 재고 부족 시
 *  'INSUFFICIENT_STOCK:<productId>' 메시지를 담은 에러를 던지고 DB 트랜잭션은 롤백된다. */
export async function decrementStockForOrder(
  items: Pick<OrderItem, 'productId' | 'quantity'>[],
): Promise<void> {
  const { error } = await getSupabase().rpc('decrement_stock_for_order', {
    p_items: items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
  });
  // PostgrestError는 instanceof Error가 아니어서 String() 검사에서 '[object Object]'로 유실된다 —
  // 진짜 Error로 감싸 'INSUFFICIENT_STOCK:<id>' 메시지를 라우트까지 보존한다(프리뷰 실측으로 발견).
  if (error) throw new Error(error.message);
}

export async function getOrderById(id: string): Promise<OrderRecord | null> {
  const { data, error } = await getSupabase()
    .from('orders')
    .select(SELECT_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRecord(data as OrderRow) : null;
}

export async function listOrdersByMember(memberId: string): Promise<OrderRecord[]> {
  const { data, error } = await getSupabase()
    .from('orders')
    .select(SELECT_COLUMNS)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as OrderRow[]).map(rowToRecord);
}

const ORDERS_LIST_CAP = 1000;

export async function listAllOrders(): Promise<OrderRecord[]> {
  const { data, error } = await getSupabase()
    .from('orders')
    .select(SELECT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(ORDERS_LIST_CAP);
  if (error) throw error;
  return (data as OrderRow[]).map(rowToRecord);
}

/** 관리자 주문 상태 변경. 허용 필드만 반영한다(라우트에서 화이트리스트 검증됨). */
export type OrderStatusUpdate = Partial<
  Pick<Order, 'orderStatus' | 'paymentStatus' | 'deliveryStatus' | 'trackingNumber' | 'carrier'>
>;

export async function updateOrderStatus(id: string, updates: OrderStatusUpdate): Promise<void> {
  const patch: Record<string, string | null> = {};
  if (updates.orderStatus !== undefined) patch.order_status = updates.orderStatus;
  if (updates.paymentStatus !== undefined) patch.payment_status = updates.paymentStatus;
  if (updates.deliveryStatus !== undefined) patch.delivery_status = updates.deliveryStatus;
  if (updates.trackingNumber !== undefined) patch.tracking_number = updates.trackingNumber ?? null;
  if (updates.carrier !== undefined) patch.carrier = updates.carrier ?? null;
  if (Object.keys(patch).length === 0) return;

  const { error } = await getSupabase().from('orders').update(patch).eq('id', id);
  if (error) throw error;
}

/**
 * 토스 결제 승인 확정. WHERE payment_status='결제대기' 조건으로 최초 1회만 성공시킨다
 * (이중승인 방어 핵심 — 같은 paymentKey로 두 번 호출돼도 두 번째는 0행 매치).
 * 반환값 = 영향받은 행 수. 1이면 이번 호출이 확정시킨 것, 0이면 이미 처리됨(idempotency 신호).
 */
export async function setOrderPaid(
  id: string,
  payment: { paymentKey: string; paidAt: string },
): Promise<number> {
  const { data, error } = await getSupabase()
    .from('orders')
    .update({
      payment_status: '결제완료',
      payment_key: payment.paymentKey,
      paid_at: payment.paidAt,
      order_status: '결제완료',
    })
    .eq('id', id)
    .eq('payment_status', '결제대기')
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}

/**
 * 재고 선점 취소 + 복원(결제 실패·이탈·만료). 0024 마이그레이션 rpc — 취소 UPDATE와
 * restore_stock_for_order 호출이 **같은 DB 트랜잭션**으로 묶여 있어, 구버전의
 * "cancelOrderReservation 먼저 → 반환 1일 때만 restoreStockForOrder" 2단계 호출 순서 계약이
 * 통째로 필요 없어졌다. cancel 라우트와 만료 cron이 같은 주문을 동시에 집어도 트랜잭션
 * 하나만 커밋되므로 이중 복원 자체가 구조적으로 불가능하다.
 * 반환 true = 이번 호출이 취소·복원을 수행함, false = 이미 처리된 주문(확정/취소)이라 no-op.
 * (구 cancelOrderReservation/restoreStockForOrder 2단계 함수는 이 함수로 대체돼 제거됨.)
 */
export async function cancelReservationAndRestore(id: string): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('cancel_order_reservation_and_restore', {
    p_order_id: id,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

/**
 * 결제 승인 착수 선언(confirm 라우트가 토스 승인 API를 호출하기 **직전에** 반드시 호출).
 * expires_at을 조건부로 연장해, 토스 API 응답을 기다리는 동안 만료 cron이 같은 주문을
 * 먼저 집어 취소해버리는 경합을 차단한다(승인 중 크래시 창 보호).
 * 반환 1 = 이번 호출이 선점을 갱신함(승인 진행 가능), 0 = 이미 취소·확정된 주문이라
 * 토스 승인 API를 호출하면 안 된다(호출부는 409로 응답).
 */
export async function claimOrderForConfirmation(id: string): Promise<number> {
  const { data, error } = await getSupabase()
    .from('orders')
    .update({ expires_at: new Date(Date.now() + CLAIM_EXTENSION_MS).toISOString() })
    .eq('id', id)
    .eq('payment_status', '결제대기')
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}

// claimOrderForConfirmation이 연장하는 선점 시간. 원래 선점 만료(10분)와 동일한 폭으로 둬
// "승인 착수 = 처음부터 다시 10분 여유"로 통일한다(토스 API 왕복 지연을 흡수).
const CLAIM_EXTENSION_MS = 10 * 60 * 1000;

const EXPIRED_PENDING_ORDERS_CAP = 100;

/** 만료된 선점 주문 목록(카드결제 PENDING이 10분 내 승인/취소 콜백을 못 받은 건).
 *  cron이 순회하며 재고를 복원한다. listAllOrders(ORDERS_LIST_CAP)와 동일하게 배치 상한을
 *  둬 한 번의 cron 실행이 무제한 행을 끌어오지 않게 한다. */
export async function listExpiredPendingOrders(): Promise<OrderRecord[]> {
  const { data, error } = await getSupabase()
    .from('orders')
    .select(SELECT_COLUMNS)
    .eq('payment_status', '결제대기')
    .not('expires_at', 'is', null)
    .lt('expires_at', new Date().toISOString())
    .limit(EXPIRED_PENDING_ORDERS_CAP);
  if (error) throw error;
  return (data as OrderRow[]).map(rowToRecord);
}
