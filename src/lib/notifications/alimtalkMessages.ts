// 카카오 알림톡 메시지 구성(순수 함수 — 네트워크·환경변수·server-only 의존 없음).
// 템플릿 문구는 카카오 승인본이라 여기서 바꾸지 않고, 템플릿 ID와 변수 이름만 보관한다.
// 발송(HMAC 인증·fetch)은 alimtalk.ts, 주문 이벤트 배선은 alimtalkNotify.ts가 맡는다.
import { CARRIER_LABELS } from '@/lib/carriers';
import type { Order, OrderItem } from '@/types';

export const ALIMTALK_EVENTS = [
  'orderPaid',
  'shippingStarted',
  'delivered',
  'purchaseConfirmed',
  'cancelRequested',
  'cancelCompleted',
  'exchangeRequested',
  'exchangeCompleted',
  'returnRequested',
  'returnCompleted',
  'madeToOrderGuide',
] as const;
export type AlimtalkEvent = (typeof ALIMTALK_EVENTS)[number];

type VariableName = '고객명' | '주문번호' | '상품명' | '결제금액' | '택배사' | '운송장번호' | '구매확정일' | '취소금액';

const BASE: readonly VariableName[] = ['고객명', '주문번호', '상품명'];

export const ALIMTALK_TEMPLATES: Record<
  AlimtalkEvent,
  { templateId: string; name: string; variables: readonly VariableName[] }
> = {
  orderPaid: { templateId: 'KA01TP261004182611745ReuYudwj1j5', name: '주문결제완료', variables: [...BASE, '결제금액'] },
  shippingStarted: {
    templateId: 'KA01TP2610041843070259y73QWgIT0v',
    name: '배송출발',
    variables: [...BASE, '택배사', '운송장번호'],
  },
  delivered: { templateId: 'KA01TP2610041850158440QvoWWym0Rs', name: '배송완료', variables: BASE },
  purchaseConfirmed: {
    templateId: 'KA01TP261004193906384OeC4dRwDlM6',
    name: '구매확정',
    variables: [...BASE, '구매확정일'],
  },
  cancelRequested: { templateId: 'KA01TP261004194105402MJCw7NSagIw', name: '주문취소접수', variables: BASE },
  cancelCompleted: {
    templateId: 'KA01TP261004194306136lwkwgLTOhuQ',
    name: '주문취소완료',
    variables: [...BASE, '취소금액'],
  },
  exchangeRequested: { templateId: 'KA01TP261004194536162QDkwhL6RanY', name: '교환접수', variables: BASE },
  exchangeCompleted: { templateId: 'KA01TP261004194716622TWzteENlxrJ', name: '교환처리완료', variables: BASE },
  returnRequested: { templateId: 'KA01TP261004194853591v4paSH984Fu', name: '반품접수', variables: BASE },
  returnCompleted: { templateId: 'KA01TP261004195150743cusTkx4ur3I', name: '반품처리완료', variables: BASE },
  madeToOrderGuide: { templateId: 'KA01TP261004195624501AfAI8SyvrJP', name: '주문제작상품안내', variables: BASE },
};

export interface AlimtalkMessageData {
  customerName: string;
  orderNumber: string;
  /** 상품명 목록 — 첫 번째 + " 외 N건"으로 합쳐진다. */
  itemNames: string[];
  /** 결제금액(orderPaid) 또는 취소금액(cancelCompleted). */
  amount?: number;
  /** 택배사 코드(cj 등) 또는 이미 한글인 라벨. */
  carrier?: string;
  trackingNumber?: string;
  /** 구매확정 시각(ISO 또는 Date) — KST 날짜로 변환한다. */
  confirmedAt?: string | Date;
}

export interface AlimtalkMessage {
  templateId: string;
  /** Solapi 형식 변수 맵: { "#{고객명}": "홍길동" } */
  variables: Record<string, string>;
}

export function formatProductName(itemNames: readonly string[]): string {
  const names = itemNames.map((name) => name.trim()).filter(Boolean);
  if (names.length === 0) return '';
  return names.length === 1 ? names[0] : `${names[0]} 외 ${names.length - 1}건`;
}

export function formatKrw(amount: number): string {
  return Math.round(amount).toLocaleString('en-US');
}

/** 구매확정일 — KST 기준 YYYY-MM-DD. */
export function formatKstDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 숫자만 남기고 +82 접두를 0으로 바꾼 뒤 휴대전화 형식(01X 10~11자리)이 아니면 null. */
export function normalizeKoreanMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('82') && digits.length >= 11) digits = `0${digits.slice(2)}`;
  return /^01\d{8,9}$/.test(digits) ? digits : null;
}

/** 로그용 마스킹 — 010****5678. 형식이 틀려도 원문을 남기지 않는다. */
export function maskPhone(raw: string | null | undefined): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length < 7) return '****';
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

function resolveValue(name: VariableName, data: AlimtalkMessageData): string {
  switch (name) {
    case '고객명':
      return data.customerName.trim() || '고객';
    case '주문번호':
      return data.orderNumber.trim();
    case '상품명':
      return formatProductName(data.itemNames) || '주문 상품';
    case '결제금액':
    case '취소금액':
      return typeof data.amount === 'number' && Number.isFinite(data.amount) ? formatKrw(data.amount) : '';
    case '택배사': {
      const carrier = data.carrier?.trim() ?? '';
      return CARRIER_LABELS[carrier] ?? carrier;
    }
    case '운송장번호':
      return data.trackingNumber?.trim() ?? '';
    case '구매확정일':
      return data.confirmedAt ? formatKstDate(data.confirmedAt) : '';
  }
}

/**
 * 템플릿의 모든 변수를 채운 발송 본문을 만든다. Solapi는 변수가 하나라도 비면 거절하므로
 * 값이 비는 변수가 있으면 던진다(호출부 sendAlimtalk가 잡아 로그 후 건너뛴다).
 */
export function buildAlimtalkMessage(event: AlimtalkEvent, data: AlimtalkMessageData): AlimtalkMessage {
  const template = ALIMTALK_TEMPLATES[event];
  const variables: Record<string, string> = {};
  for (const name of template.variables) {
    const value = resolveValue(name, data);
    if (!value) throw new Error(`alimtalk-missing-variable:${event}:${name}`);
    variables[`#{${name}}`] = value;
  }
  return { templateId: template.templateId, variables };
}

/** 이벤트 발생 지점이 알려주는 컨텍스트. 주문 본문(고객명·연락처·상품)은 발송 직전에 읽는다. */
export interface AlimtalkTrigger {
  event: Exclude<AlimtalkEvent, 'madeToOrderGuide'>;
  orderId: string;
  /** 브랜드 단위 이벤트(배송·구매확정) — 그 브랜드 상품만 상품명에 쓴다. */
  brandId?: string;
  /** 교환·반품 이벤트 — 그 판매자 그룹 상품만 상품명에 쓴다. */
  sellerKey?: string;
  /** 취소·환불 요청처럼 대상 상품이 따로 정해진 경우 상품명 직접 지정. */
  itemNames?: string[];
  /** 취소금액 직접 지정(부분 취소·환불). 없으면 주문 총액(상품+배송비). */
  amount?: number;
  carrier?: string;
  trackingNumber?: string;
  confirmedAt?: string;
}

export interface ResolvedAlimtalk {
  event: AlimtalkEvent;
  data: AlimtalkMessageData;
}

function scopedItems(order: Order, trigger: AlimtalkTrigger): OrderItem[] {
  let scoped: OrderItem[] = [];
  if (trigger.brandId) {
    scoped = order.items.filter((item) => item.brandId === trigger.brandId);
  } else if (trigger.sellerKey) {
    const group = (order.sellerGroups ?? []).find((candidate) => candidate.key === trigger.sellerKey);
    if (group) scoped = order.items.filter((item) => group.productIds.includes(item.productId));
  }
  return scoped.length > 0 ? scoped : order.items;
}

/** 주문 중 주문제작(made_to_order) 동의가 기록된 상품명. */
export function madeToOrderItemNames(order: Order): string[] {
  const productIds = new Set(
    (order.consentRecords ?? []).filter((record) => record.type === 'made_to_order').map((record) => record.subjectKey),
  );
  if (productIds.size === 0) return [];
  return order.items.filter((item) => productIds.has(item.productId)).map((item) => item.productName);
}

/**
 * 트리거 + 주문 → 보낼 알림 목록(순수 함수). 결제완료(orderPaid)에는 주문제작 상품이 있으면
 * 주문제작상품안내가 뒤따른다. 필수 값이 없는 알림(운송장 없는 배송출발)은 목록에서 빠진다.
 */
export function resolveAlimtalkMessages(order: Order, trigger: AlimtalkTrigger): ResolvedAlimtalk[] {
  const itemNames = trigger.itemNames?.length
    ? trigger.itemNames
    : scopedItems(order, trigger).map((item) => item.productName);
  const base = { customerName: order.customerName, orderNumber: order.id, itemNames };
  const orderTotal = order.totalPrice + order.deliveryFee;

  switch (trigger.event) {
    case 'orderPaid': {
      const messages: ResolvedAlimtalk[] = [{ event: 'orderPaid', data: { ...base, amount: orderTotal } }];
      const madeToOrder = madeToOrderItemNames(order);
      if (madeToOrder.length > 0) {
        messages.push({ event: 'madeToOrderGuide', data: { ...base, itemNames: madeToOrder } });
      }
      return messages;
    }
    case 'shippingStarted': {
      const trackingNumber = trigger.trackingNumber ?? order.trackingNumber;
      if (!trackingNumber) return [];
      const carrier = trigger.carrier ?? order.carrier ?? '';
      return [{ event: 'shippingStarted', data: { ...base, carrier, trackingNumber } }];
    }
    case 'purchaseConfirmed':
      return [{ event: 'purchaseConfirmed', data: { ...base, confirmedAt: trigger.confirmedAt ?? new Date() } }];
    case 'cancelCompleted':
      return [{ event: 'cancelCompleted', data: { ...base, amount: trigger.amount ?? orderTotal } }];
    default:
      return [{ event: trigger.event, data: base }];
  }
}
