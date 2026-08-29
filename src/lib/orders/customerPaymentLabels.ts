import { PAYMENT_STATUSES, type PaymentStatus } from '@/types';

/**
 * 고객용 결제 상태 라벨/배지 스타일. PAYMENT_STATUSES(types/index.ts) 전 값을 커버한다 —
 * 새 상태가 추가되면 여기 타입 체크(Record<PaymentStatus, ...>)가 누락을 잡아준다.
 * '승인중'처럼 서버 상태기계 내부 어휘를 그대로 노출하면 고객이 오해하므로(문의 유발),
 * 고객 화면(마이페이지 주문내역·order-complete)은 이 라벨을 쓴다.
 * ⚠️ 관리자 화면(OrderStatusPanel 등)은 내부 어휘를 그대로 유지해야 하므로 이 맵을 쓰지 않는다.
 */
export const CUSTOMER_PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  결제대기: '결제 대기',
  입금대기: '입금 대기',
  승인중: '결제 확인 중',
  결제완료: '결제완료',
  결제취소: '결제취소',
  환불완료: '환불완료',
};

export const CUSTOMER_PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  결제대기: 'bg-[#F2EEE5] text-[#68716C]',
  입금대기: 'bg-[#FFFDF9] border border-[#DED8CC] text-[#18231F]',
  승인중: 'bg-[#FFFDF9] border border-[#DED8CC] text-[#18231F]',
  결제완료: 'bg-[#2F3B34] text-white',
  결제취소: 'bg-gray-100 text-gray-600',
  환불완료: 'bg-gray-100 text-gray-600',
};

function isKnownPaymentStatus(status: string): status is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(status);
}

/** 알 수 없는(레거시) 상태값은 원문을 그대로 반환한다 — 화면이 죽지 않도록. */
export function customerPaymentStatusLabel(status: string): string {
  return isKnownPaymentStatus(status) ? CUSTOMER_PAYMENT_STATUS_LABELS[status] : status;
}

export function customerPaymentStatusStyle(status: string): string | null {
  return isKnownPaymentStatus(status) ? CUSTOMER_PAYMENT_STATUS_STYLES[status] : null;
}
