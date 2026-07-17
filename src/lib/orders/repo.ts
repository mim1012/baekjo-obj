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
export type OrderRecord = Order & { memberId: string | null; reclaimDead: boolean };

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
  reclaim_attempts: number;
  last_reclaim_error: string | null;
  reclaim_dead: boolean;
}

const SELECT_COLUMNS =
  'id, member_id, customer_name, phone, address, items, total_price, delivery_fee, payment_method, order_status, payment_status, delivery_status, tracking_number, delivery_memo, created_at, carrier, payment_key, paid_at, expires_at, reclaim_attempts, last_reclaim_error, reclaim_dead';

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
    reclaimAttempts: row.reclaim_attempts,
    reclaimError: row.last_reclaim_error ?? undefined,
    reclaimDead: row.reclaim_dead,
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

/** 관리자 전량 조회 상한. 집계 호출부가 "상한에 닿았다 = 모집단이 잘렸다"를 감지할 수 있게 export한다. */
export const ORDERS_LIST_CAP = 1000;

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
  Pick<
    Order,
    'orderStatus' | 'paymentStatus' | 'deliveryStatus' | 'trackingNumber' | 'carrier' | 'deliveryMemo'
  >
>;

export async function updateOrderStatus(id: string, updates: OrderStatusUpdate): Promise<void> {
  const patch: Record<string, string | null> = {};
  if (updates.orderStatus !== undefined) patch.order_status = updates.orderStatus;
  if (updates.paymentStatus !== undefined) patch.payment_status = updates.paymentStatus;
  if (updates.deliveryStatus !== undefined) patch.delivery_status = updates.deliveryStatus;
  // 빈 문자열은 해제 신호라 NULL로 저장한다 — ''가 그대로 들어가면 buildTrackingUrl/isCarrierCode가
  // 매번 falsy 검사를 해야 한다. trackingNumber/carrier가 같은 규칙을 따라야 `tracking_number IS NULL`
  // 같은 운영 쿼리(미발송 주문 조회 등)가 조용히 어긋나지 않는다.
  if (updates.trackingNumber !== undefined) patch.tracking_number = updates.trackingNumber || null;
  if (updates.carrier !== undefined) patch.carrier = updates.carrier || null;
  if (updates.deliveryMemo !== undefined) patch.delivery_memo = updates.deliveryMemo ?? null;
  if (Object.keys(patch).length === 0) return;

  const { error } = await getSupabase().from('orders').update(patch).eq('id', id);
  if (error) throw error;
}

/**
 * 관리자 수동 결제상태 전이(조건부 UPDATE = CAS). setOrderPaid/claimOrderForConfirmation와 같은
 * 패턴으로 WHERE payment_status=<fromStatus> 를 걸어, 우리가 현재 상태를 읽은 시점과 UPDATE 시점
 * 사이에 다른 요청이 상태를 바꿨으면 0행 매치로 무성 no-op 이 된다(경합 안전). 반환값 = 영향받은
 * 행 수. 1 = 이번 호출이 전이시킴, 0 = 경합(호출부가 409로 분기).
 *
 * ⚠️ 이 함수는 **결제상태만** 바꾼다(order_status 등은 건드리지 않음). 어떤 전이가 허용되는지는
 * 이 함수가 아니라 route.ts 가 paymentTransition.ts 화이트리스트로 먼저 검증한다 — 이 함수는
 * "검증된 전이를 경합 안전하게 기록"하는 역할만 한다(관심사 분리). '결제취소'로의 전이(취소)는
 * 이 경로가 아니라 cancel_order_reservation_and_restore RPC(재고 복원 동반)로만 일어난다.
 */
export async function updatePaymentStatusGuarded(
  id: string,
  fromStatus: string,
  toStatus: string,
): Promise<number> {
  const { data, error } = await getSupabase()
    .from('orders')
    .update({ payment_status: toStatus })
    .eq('id', id)
    .eq('payment_status', fromStatus)
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}

/**
 * 토스 결제 승인 확정. WHERE payment_status='승인중' AND payment_key=? 조건으로 claim이
 * 발급한 바로 그 승인중 시도만 확정시킨다(이중승인 방어 핵심 — 같은 주문에 다른 paymentKey로
 * 재시도가 끼어들었거나 이미 확정된 행은 매치되지 않는다).
 * 반환값 = 영향받은 행 수. 1이면 이번 호출이 확정시킨 것, 0이면 이미 처리됐거나(idempotency 신호)
 * WHERE 불일치(R6 — 승인 성공·확정 실패 경합).
 * ⚠️ 웹훅/reconcile(W2)이 '결제대기' 주문(사용자 이탈로 claim 자체가 없었던 건)을 확정하려면
 * 반드시 claimOrderForConfirmation을 먼저 호출해 '승인중'으로 전이시켜야 한다 — '결제대기' 주문에
 * 이 함수를 직접 호출하면 WHERE payment_status='승인중' 불일치로 0행 무성 실패(조용한 미확정)가 된다.
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
    .eq('payment_status', '승인중')
    .eq('payment_key', payment.paymentKey)
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}

/**
 * 재고 선점 취소 + 복원(결제 실패·이탈·만료, '결제대기' 주문 전용). 0024 마이그레이션 rpc —
 * 취소 UPDATE와 restore_stock_for_order 호출이 **같은 DB 트랜잭션**으로 묶여 있어 부분 커밋이
 * 불가능하다. cancel 라우트와 만료 cron이 호출하며, WHERE payment_status='결제대기'이므로
 * '승인중' 주문은 이 함수가 절대 건드리지 못한다(상태기계 불변식 — cancelConfirmingAndRestore와
 * 상호배타). 반환 true = 이번 호출이 취소·복원을 수행함, false = 이미 처리된 주문이라 no-op.
 */
export async function cancelReservationAndRestore(id: string): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('cancel_order_reservation_and_restore', {
    p_order_id: id,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

/**
 * '승인중' 주문 취소 + 재고 복원(0028 rpc — payment_key 바인딩판). confirm 거절(402)·
 * reconcile(토스=CANCELED 등)·webhook 전용 — WHERE payment_status='승인중' AND payment_key=?이라
 * cancelReservationAndRestore(0024, WHERE '결제대기')와 상호배타적이다. 같은 주문이 두 함수
 * 모두에서 true를 반환할 수 없다(한 시점엔 둘 중 한 상태만 가능).
 * ⚠️ paymentKey는 호출부가 "이 시점에 취소하려던 바로 그 승인 시도"의 키를 넘겨야 한다
 * (decide.ts의 PaymentAction.restoreConfirming.paymentKey가 그 증거다) — 0026(1-인자 버전, DB에는
 * 남아있으나 이 리포는 더 이상 호출하지 않음)은 payment_key를 보지 않아, 경합 중 다른 paymentKey로
 * 새 claim이 이미 발급된 주문을 옛 취소 신호가 잘못 복원시킬 수 있었다(codex HIGH 지적).
 * 반환 true = 이번 호출이 취소·복원을 수행함, false = 이미 처리됐거나 승인중이 아니거나
 * payment_key가 다르면 no-op.
 */
export async function cancelConfirmingAndRestore(id: string, paymentKey: string): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('cancel_confirming_and_restore', {
    p_order_id: id,
    p_payment_key: paymentKey,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

/** claimOrderForConfirmation이 payment_key unique 제약(0022) 충돌을 만났을 때 던지는 전용
 *  에러 — 호출부가 일반 500이 아니라 409(같은 paymentKey가 다른 주문에 이미 묶임)로 구분
 *  응답할 수 있게 한다. */
export class ClaimPaymentKeyConflictError extends Error {
  constructor(message = 'claim-payment-key-conflict') {
    super(message);
    this.name = 'ClaimPaymentKeyConflictError';
  }
}

/**
 * 결제 승인 착수 선언(confirm 라우트가 토스 승인 API를 호출하기 **직전에** 반드시 호출) —
 * '결제대기'→'승인중' 배타적 상태전이로 승격(재수술, 웹훅 웨이브 W1). paymentKey를 이 시점에
 * 기록해 reconcile(U6)이 이 키로 토스 조회할 수 있게 한다. expires_at도 함께 연장해, 토스 API
 * 응답을 기다리는 동안 만료 cron이 같은 주문을 먼저 집어 취소해버리는 경합을 차단한다(승인 중
 * 크래시 창 보호) — WHERE가 '결제대기'뿐이라 cron은 어차피 '승인중'을 못 건드리지만, 전이 자체가
 * 원자적이라 두 confirm 요청이 동시에 '결제대기'를 보고 있어도 하나만 '승인중' 전이에 성공한다.
 * 반환 1 = 이번 호출이 이 주문을 승인중으로 전이시킴(승인 진행 가능), 0 = 이미 취소·승인중·확정된
 * 주문이라 이번 호출은 전이하지 못했다(호출부가 멱등/409로 분기).
 * ⚠️ 웹훅 경로(W2): 미claim '결제대기' 주문(사용자 이탈로 confirm이 안 온 건)을 웹훅으로 확정하려면
 * 이 함수로 먼저 '승인중' 선전이한 뒤 setOrderPaid를 호출해야 한다 — 순서를 건너뛰면 setOrderPaid의
 * WHERE 조건과 맞물려 조용히 no-op된다.
 */
export async function claimOrderForConfirmation(id: string, paymentKey: string): Promise<number> {
  const { data, error } = await getSupabase()
    .from('orders')
    .update({
      payment_status: '승인중',
      payment_key: paymentKey,
      expires_at: new Date(Date.now() + CLAIM_EXTENSION_MS).toISOString(),
    })
    .eq('id', id)
    .eq('payment_status', '결제대기')
    .select('id');
  if (error) {
    // 23505 = postgres unique_violation. 0022가 orders.payment_key에 unique 제약을 걸어뒀으므로
    // 극히 드물게 이미 다른 주문에 묶인 paymentKey로 claim이 들어오면 여기서 걸린다(위조/재사용
    // 의심 또는 클라이언트 버그) — 500으로 흘리지 않고 라우트가 409로 구분 응답하게 한다.
    if (error.code === '23505') {
      throw new ClaimPaymentKeyConflictError();
    }
    throw error;
  }
  return data?.length ?? 0;
}

// claimOrderForConfirmation이 연장하는 선점 시간. 원래 선점 만료(10분)와 동일한 폭으로 둬
// "승인 착수 = 처음부터 다시 10분 여유"로 통일한다(토스 API 왕복 지연을 흡수).
const CLAIM_EXTENSION_MS = 10 * 60 * 1000;

const EXPIRED_PENDING_ORDERS_CAP = 100;
const ORPHANED_CONFIRMING_ORDERS_CAP = 100;

/** 만료된 선점 주문 목록(카드결제 PENDING이 10분 내 승인/취소 콜백을 못 받은 건, '결제대기' 전용).
 *  cron이 순회하며 재고를 복원한다. listAllOrders(ORDERS_LIST_CAP)와 동일하게 배치 상한을
 *  둬 한 번의 cron 실행이 무제한 행을 끌어오지 않게 한다. expires_at 오름차순 정렬로 배치 상한이
 *  걸릴 때 항상 가장 오래 만료된 건부터 결정적으로 처리한다(정렬 없으면 DB가 임의 순서로 잘라
 *  같은 100건이 반복 누락될 수 있음). reclaim_dead=false로 좁혀 dead-letter 처리된 건은 cron이
 *  더 이상 반복 조회하지 않는다(U7). '승인중' 주문은 이 목록에서 항상 제외된다 — 그건 U6 담당. */
export async function listExpiredPendingOrders(): Promise<OrderRecord[]> {
  const { data, error } = await getSupabase()
    .from('orders')
    .select(SELECT_COLUMNS)
    .eq('payment_status', '결제대기')
    .eq('reclaim_dead', false)
    .not('expires_at', 'is', null)
    .lt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true })
    .limit(EXPIRED_PENDING_ORDERS_CAP);
  if (error) throw error;
  return (data as OrderRow[]).map(rowToRecord);
}

/** '승인중' 상태로 만료된 고아 주문 목록(claim 이후 토스 응답을 못 받고 죽은 세션 — 웹훅
 *  미등록 기간엔 이게 유일한 정산 경로). reconcile cron(U6)이 순회하며 토스에 실제 상태를
 *  재조회해 확정하거나 복원한다. reclaim_dead=false로 좁혀 dead-letter 처리된 건은 제외.
 *  cancel/cron/0024는 '승인중'을 절대 못 건드리므로 이 고아들은 오직 이 목록 → reconcile로만
 *  회수된다(상태기계 불변식). */
export async function listOrphanedConfirmingOrders(): Promise<OrderRecord[]> {
  const { data, error } = await getSupabase()
    .from('orders')
    .select(SELECT_COLUMNS)
    .eq('payment_status', '승인중')
    .eq('reclaim_dead', false)
    .not('expires_at', 'is', null)
    .lt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true })
    .limit(ORPHANED_CONFIRMING_ORDERS_CAP);
  if (error) throw error;
  return (data as OrderRow[]).map(rowToRecord);
}

/**
 * 재시도 실패 기록(카운트 원자 +1, 사유 저장, 0027 rpc). reconcile(U6)·reclaim-stock cron(U7)
 * 공용 — 조회 후 증가하는 2단계 방식(구버전)은 겹친 cron 실행 사이에 lost update가 날 수 있어
 * update ... set reclaim_attempts = reclaim_attempts + 1 단일 문 RPC로 교체됐다.
 * 반환값 = 갱신된 reclaim_attempts. 호출부(cron)가 이 값으로 dead-letter 임계치를 판정한다
 * (실제 markReclaimDead 호출 여부는 호출부 책임).
 */
export async function recordReclaimAttempt(id: string, errorMessage: string): Promise<number> {
  const { data, error } = await getSupabase().rpc('increment_reclaim_attempts', {
    p_order_id: id,
    p_error: errorMessage,
  });
  if (error) throw new Error(error.message);
  return data ?? 0;
}

/** 재시도 임계치 초과 주문을 dead-letter로 표시 — 이후 listExpiredPendingOrders /
 *  listOrphanedConfirmingOrders 양쪽 모두에서 제외되어 cron이 더 이상 반복 조회하지 않는다.
 *  ★0행 갱신을 성공으로 취급하지 않는다(Codex 라운드6) — .select('id')로 실제 갱신 행 수를
 *  확인해, 주문이 삭제됐거나 id가 잘못돼 아무것도 안 바뀌었는데 호출부가 "재무 예외를 durable
 *  하게 기록했다"고 오신하지 않게 한다. 0행이면 throw — 호출부(recordPaymentFinancialException
 *  등)가 이 실패를 삼키지 않고 500/재시도로 이어가게 한다. */
export async function markReclaimDead(id: string): Promise<void> {
  const { data, error } = await getSupabase().from('orders').update({ reclaim_dead: true }).eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(`markReclaimDead: 0행 갱신(orderId=${id}) — 주문을 찾지 못했거나 예상 밖 상태`);
  }
}
