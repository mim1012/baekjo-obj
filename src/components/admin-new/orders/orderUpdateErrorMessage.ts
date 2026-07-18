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
      return '허용되지 않는 상태 변경입니다. 이미 다른 관리자가 처리했을 수 있어 목록을 새로고침합니다.';
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
