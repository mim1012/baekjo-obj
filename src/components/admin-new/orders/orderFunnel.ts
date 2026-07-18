import type { Order, OrderStatus, PaymentStatus, DeliveryStatus } from '@/types';
import { PAID_PAYMENT_STATUS } from '@/types';

/**
 * 관리자 주문 목록의 스마트스토어식 퍼널(깔때기) 파생 로직 — 순수 함수만.
 *
 * 목록에서 3축(주문·결제·배송) select 를 직접 만지면 `입금대기 + 배송중`처럼 모순 조합이
 * 만들어지고 매 행에 입금확인 버튼이 떠 UX 가 복잡했다. 대신 세 축을 **하나의 진행 단계
 * (FunnelStage)** 로 접어 탭·배지·행동 버튼을 이 단계에서 파생한다. 세밀한 3축 편집은
 * 주문 상세(OrderStatusPanel)에만 남긴다.
 *
 * 컴포넌트에서 분리해 순수 함수로 둔 이유는 브라우저·DB 없이 회귀 테스트하기 위함(tests/admin).
 * 상태 문자열은 로컬 리터럴 사본을 만들지 않고 @/types 의 상수/타입에서 가져온다(§4 드리프트 방지).
 */

export type FunnelStage =
  | '입금대기'
  | '결제진행중'
  | '발송대기'
  | '배송중'
  | '배송완료'
  | '취소반품'
  | '기타';

/** 탭 바에 고정으로 노출하는 단계 순서(전체 탭은 컴포넌트가 앞에 붙인다). '기타'는 건수>0 일 때만 노출. */
export const FUNNEL_STAGE_ORDER: readonly FunnelStage[] = [
  '입금대기',
  '결제진행중',
  '발송대기',
  '배송중',
  '배송완료',
  '취소반품',
];

/**
 * 취소·반품으로 묶는 주문상태(ORDER_STATUSES 중 취소/환불 구간). `readonly OrderStatus[]` 로
 * 타입을 강제하므로, ORDER_STATUSES 유니온에서 값이 사라지면 빌드가 깨져 드리프트를 잡는다.
 */
const CANCEL_RETURN_ORDER_STATUSES: readonly OrderStatus[] = ['취소요청', '취소완료', '환불완료'];
/**
 * 결제상태만으로도 취소·반품으로 접는 값. 상세(OrderStatusPanel)는 세 축을 독립 편집할 수 있어
 * orderStatus 는 그대로 두고 paymentStatus 만 결제취소/환불완료로 바꾸는 운영이 가능한데,
 * 이때 기존 배송상태 때문에 배송중/배송완료 탭에 남으면 환불된 주문이 진행 중처럼 보인다(codex 2차 리뷰 MEDIUM).
 */
const CANCEL_RETURN_PAYMENT_STATUSES: readonly PaymentStatus[] = ['결제취소', '환불완료'];
/** 아직 결제가 확정되지 않은 진행 구간(무통장 입금대기는 별도 단계로 앞서 분기). */
const IN_PROGRESS_PAYMENT_STATUSES: readonly PaymentStatus[] = ['결제대기', '승인중'];
/** 결제완료 후 아직 발송 전(배송전·배송준비). */
const PRE_SHIP_DELIVERY_STATUSES: readonly DeliveryStatus[] = ['배송전', '배송준비'];

const DEPOSIT_PENDING_PAYMENT: PaymentStatus = '입금대기';
const SHIPPING_DELIVERY: DeliveryStatus = '배송중';
const DELIVERED_DELIVERY: DeliveryStatus = '배송완료';

/**
 * 주문 하나를 단일 진행 단계로 접는다. **우선순위 순서가 곧 규칙**이다.
 * 1. 취소·반품(주문상태 또는 결제상태의 취소/환불) — 결제/배송이 무엇이든 취소 구간이면 최우선.
 * 2. 입금대기(무통장) — 관리자가 입금확인해야 진행된다.
 * 3. 결제진행중(결제대기·승인중) — 자동/PG 처리 대기.
 * 4. 발송대기 — 결제완료(PAID_PAYMENT_STATUS) 이고 아직 발송 전.
 * 5. 배송중 / 6. 배송완료 — 배송상태 파생.
 * 그 외는 '기타'로 접어 탭에서 사라지지 않게 한다(전체 탭에는 항상 잡힘).
 *
 * Order.paymentStatus·deliveryStatus 는 레거시 호환으로 string 타입이라 상수 배열과
 * 비교할 때 `readonly string[]` 로 넓혀 includes 한다.
 */
export function deriveFunnelStage(order: Order): FunnelStage {
  if (
    (CANCEL_RETURN_ORDER_STATUSES as readonly string[]).includes(order.orderStatus) ||
    (CANCEL_RETURN_PAYMENT_STATUSES as readonly string[]).includes(order.paymentStatus)
  ) {
    return '취소반품';
  }
  if (order.paymentStatus === DEPOSIT_PENDING_PAYMENT) {
    return '입금대기';
  }
  if ((IN_PROGRESS_PAYMENT_STATUSES as readonly string[]).includes(order.paymentStatus)) {
    return '결제진행중';
  }
  const isPaid = order.paymentStatus === PAID_PAYMENT_STATUS;
  if (isPaid && (PRE_SHIP_DELIVERY_STATUSES as readonly string[]).includes(order.deliveryStatus)) {
    return '발송대기';
  }
  if (order.deliveryStatus === SHIPPING_DELIVERY) {
    return '배송중';
  }
  if (order.deliveryStatus === DELIVERED_DELIVERY) {
    return '배송완료';
  }
  return '기타';
}

/** 복합 배지에 쓰는 표시 라벨. 취소반품만 가운뎃점 표기로 다듬고 나머지는 단계명 그대로. */
export function funnelBadgeLabel(stage: FunnelStage): string {
  return stage === '취소반품' ? '취소·반품' : stage;
}

/** 각 단계별 주문 수. 탭 카운트 배지에 쓴다. */
export function stageCounts(orders: Order[]): Record<FunnelStage, number> {
  const counts: Record<FunnelStage, number> = {
    입금대기: 0,
    결제진행중: 0,
    발송대기: 0,
    배송중: 0,
    배송완료: 0,
    취소반품: 0,
    기타: 0,
  };
  for (const order of orders) {
    counts[deriveFunnelStage(order)] += 1;
  }
  return counts;
}

/** 이 단계에서 목록/일괄로 제공하는 행동. 입금대기→입금확인, 발송대기→발송, 그 외는 없음. */
export type StageAction = 'depositConfirm' | 'ship' | 'none';

export function stageAction(stage: FunnelStage): StageAction {
  if (stage === '입금대기') return 'depositConfirm';
  if (stage === '발송대기') return 'ship';
  return 'none';
}
