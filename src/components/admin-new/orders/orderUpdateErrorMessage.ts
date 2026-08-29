// 관리자 주문 상태변경 실패를 UI 문구로 매핑하는 순수 함수.
//
// 서버(src/app/api/admin/orders/[id]/route.ts)는 409를 두 코드로 구분한다:
//   · invalid-payment-transition — PaymentTransitionError(전이 화이트리스트 위반). 재시도 무의미.
//   · payment-status-conflict    — PaymentStatusConflictError(다른 관리자와 CAS 경합). 새로고침 후 재시도 가능.
// storage.ts의 updateOrderStatus는 실패 시 이 코드를 그대로 Error.message로 전달한다(파싱 실패 시
// 'order-update-failed' 폴백). 즉 여기서는 error.message가 곧 서버 코드라는 계약에 기댄다.

export function orderUpdateErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  switch (code) {
    case 'invalid-payment-transition':
      return '허용되지 않는 상태 변경입니다. 이미 다른 관리자가 처리했을 수 있으니 목록을 새로고침해 확인해주세요.';
    case 'payment-status-conflict':
      return '다른 관리자가 동시에 이 주문을 수정했습니다. 목록을 새로고침한 뒤 다시 확인해주세요.';
    default:
      return '주문 상태 변경에 실패했습니다. 잠시 후 다시 시도해주세요.';
  }
}

/**
 * 일괄 입금확인 요약 문구를 만든다. 실패를 위 409 두 코드 + 기타로 나눠 건수를 구분 표기하고,
 * 건수가 0인 분류의 줄은 생략한다. (0건 줄까지 나열하면 알림이 길어지고 핵심이 묻힌다.)
 */
export function summarizeBulkFailures(
  total: number,
  success: number,
  failed: { id: string; code: string }[],
): string {
  const transition = failed.filter((f) => f.code === 'invalid-payment-transition');
  const conflict = failed.filter((f) => f.code === 'payment-status-conflict');
  const other = failed.filter(
    (f) => f.code !== 'invalid-payment-transition' && f.code !== 'payment-status-conflict',
  );

  const lines = [`${total}건 중 ${success}건 완료, ${failed.length}건 실패했습니다.`];
  const describe = (group: { id: string }[]) =>
    `${group.length}건 (주문 ${group.map((f) => f.id).join(', ')})`;
  if (transition.length > 0) lines.push(`· 이미 처리됐거나 허용되지 않는 변경: ${describe(transition)}`);
  if (conflict.length > 0) lines.push(`· 동시 수정 충돌(재시도 가능): ${describe(conflict)}`);
  if (other.length > 0) lines.push(`· 기타 오류: ${describe(other)}`);
  return lines.join('\n');
}

// 관리자 업체별 송장 저장 실패를 UI 문구로 매핑하는 순수 함수. 서버(shipments/[brandId]/route.ts)가
// 주는 코드:
//   · shipment-confirmed — 고객이 이미 구매확정한 송장(종결 행). 되돌릴 수 없음, 재시도 무의미.
//   · invalid-input / invalid-brand — 요청 자체가 잘못됨(택배사·운송장·배송상태 형식/브랜드 불일치).
//   · not-found — 주문을 찾을 수 없음(삭제됐거나 잘못된 주문ID).
//   · server-error / 기타(네트워크 등) — 일시적 오류.
// storage.ts의 updateOrderShipment는 실패 시 이 코드를 그대로 Error.message로 전달한다(파싱 실패 시
// 'shipment-update-failed' 폴백).
export function shipmentUpdateErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  switch (code) {
    case 'shipment-confirmed':
      return '고객이 이미 구매확정한 송장이라 변경할 수 없습니다. 화면을 새로고침해 최신 상태를 확인해주세요.';
    case 'invalid-input':
    case 'invalid-brand':
      return '입력값을 확인해주세요. 택배사·운송장 번호·배송상태 형식이 올바르지 않습니다.';
    case 'not-found':
      return '주문을 찾을 수 없습니다. 새로고침 후 다시 시도해주세요.';
    default:
      return '배송 정보 저장에 실패했습니다. 잠시 후 다시 시도해주세요.';
  }
}
