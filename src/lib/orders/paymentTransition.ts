// 관리자 수동 결제상태 전이 규칙(순수 함수 — DB·네트워크 없음). PATCH /api/admin/orders/[id]가
// 이 화이트리스트로 "이 관리자가 지금 이 결제상태로 바꿔도 되는가"를 판정한다.
//
// ⚠️ 왜 필요한가: 예전 관리자 상태변경은 조건 없는 UPDATE(updateOrderStatus)라, 관리자 UI의
// 자유 select 로 결제상태를 아무 값이나 덮어쓸 수 있었다. 그 결과 두 가지 결함:
//   1) 이중 재고복원 재생: 입금대기 주문을 취소하면 재고 복원 RPC가 돈다. 그 뒤 결제상태를 다시
//      '입금대기'로 되돌린 뒤 또 취소하면 RPC가 또 매치돼 재고가 두 번 복원된다(재고 부풀림).
//   2) 결제증빙 없는 '결제완료': payment_key/paid_at 없이 카드주문을 '결제완료'로 위조.
// 화이트리스트가 1)의 되돌리기(→'입금대기')와 2)의 근거 없는 전이를 원천 차단한다.
//
// 취소(→'결제취소')는 이 표에 없다 — 취소는 재고 복원 RPC(cancel_order_reservation_and_restore)를
// 타는 별도 경로라 route.ts applyOrderUpdates가 이 가드에 닿기 전에 가로챈다.
// '결제대기'·'승인중'은 토스 상태기계가 관리하는 자동 상태라 관리자가 수동으로 세팅할 수 없다
// (표의 key 에도, value 에도 없다).
// 종결 상태('결제취소'·'환불완료')는 key 가 없으므로 어떤 전이도 나갈 수 없다.
import type { PaymentStatus } from '@/types';

export const ALLOWED_MANUAL_PAYMENT_TRANSITIONS: Readonly<
  Partial<Record<PaymentStatus, readonly PaymentStatus[]>>
> = {
  입금대기: ['결제완료'], // 무통장 입금 확인(DepositConfirmButton)
  결제완료: ['환불완료'], // 환불 처리
};

/**
 * from → to 가 관리자 수동 전이로 허용되는지 판정한다. 동일 상태(from === to)는 전이가 아니라
 * no-op 이므로 여기서는 false 를 반환한다 — 무변경 저장은 호출부(route.ts)가 CAS 를 태우지 않고
 * 그냥 건너뛰어 처리한다. 즉 이 함수는 "실제로 값이 바뀌는 전이"만 판정한다.
 */
export function isManualPaymentTransitionAllowed(from: string, to: string): boolean {
  const allowed = ALLOWED_MANUAL_PAYMENT_TRANSITIONS[from as PaymentStatus];
  return allowed?.includes(to as PaymentStatus) ?? false;
}

// 취소 요청 중 재고 복원 RPC 가 매치하지 않은(0행) 경우의 payment_status 처리 결정(순수 함수).
// route.ts applyOrderUpdates 의 취소 fallback 이 이 결정만 실행한다.
//
// ⚠️ 왜 필요한가(opus HIGH): 취소 fallback 이 요청의 paymentStatus 를 조건 없이 기록하면 리플레이
// 우회로가 열린다 — 이미 취소된 주문에 {orderStatus:'취소완료', paymentStatus:'입금대기'} 를 보내면
// isCancelRequest=true 로 취소 브랜치에 진입하고, RPC 0행 후 fallback 이 payment_status='입금대기'
// 로 되돌려 재취소 시 0031 RPC 가 재매치 → 재고 2차 복원. 그래서 fallback 이 쓸 수 있는 값은 오직
// 하나뿐이다: '결제완료' 확정 주문을 '결제취소'로 취소 기록(환불은 별도라 재고 미복원 — 기존
// 시맨틱 보존). from='결제완료'로 고정된 CAS 라, 어떤 입력으로도 restore-eligible 상태
// ('결제대기'/'입금대기')로는 payment_status 를 절대 쓸 수 없다.
export const CANCEL_RECORD_FROM: PaymentStatus = '결제완료';
export const CANCEL_RECORD_TO: PaymentStatus = '결제취소';

/**
 * 취소 fallback 이 수행할 CAS 결제상태 쓰기를 결정한다. null = payment_status 를 건드리지 않음.
 * '결제취소' 요청일 때만 {from:'결제완료', to:'결제취소'} 를 돌려준다 — CAS from 이 '결제완료'라
 * 실제로 확정 주문일 때만 기록되고, 그 외(취소·환불·승인중·pending)엔 0행 no-op 이 된다.
 */
export function resolveCancelFallbackPaymentWrite(
  requestedPaymentStatus: string | undefined,
): { from: PaymentStatus; to: PaymentStatus } | null {
  if (requestedPaymentStatus === CANCEL_RECORD_TO) {
    return { from: CANCEL_RECORD_FROM, to: CANCEL_RECORD_TO };
  }
  return null;
}
