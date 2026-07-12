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
}

const SELECT_COLUMNS =
  'id, member_id, customer_name, phone, address, items, total_price, delivery_fee, payment_method, order_status, payment_status, delivery_status, tracking_number, delivery_memo, created_at';

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
  };
}

/** 주문 생성 입력. id/createdAt/memberId는 서버가 정하므로 여기서 받지 않는다(mass-assignment 차단). */
export type InsertOrderInput = Omit<Order, 'id' | 'createdAt'>;

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
  Pick<Order, 'orderStatus' | 'paymentStatus' | 'deliveryStatus' | 'trackingNumber'>
>;

export async function updateOrderStatus(id: string, updates: OrderStatusUpdate): Promise<void> {
  const patch: Record<string, string | null> = {};
  if (updates.orderStatus !== undefined) patch.order_status = updates.orderStatus;
  if (updates.paymentStatus !== undefined) patch.payment_status = updates.paymentStatus;
  if (updates.deliveryStatus !== undefined) patch.delivery_status = updates.deliveryStatus;
  if (updates.trackingNumber !== undefined) patch.tracking_number = updates.trackingNumber ?? null;
  if (Object.keys(patch).length === 0) return;

  const { error } = await getSupabase().from('orders').update(patch).eq('id', id);
  if (error) throw error;
}
