import { test, expect } from '@playwright/test';
import {
  ALLOWED_MANUAL_PAYMENT_TRANSITIONS,
  isManualPaymentTransitionAllowed,
} from '@/lib/orders/paymentTransition';
import { PAYMENT_STATUSES } from '@/types';

// 관리자 수동 결제상태 전이 가드 순수 함수 스펙 — DB/브라우저/네트워크 불필요.
// 회귀 배경(W3): PATCH /api/admin/orders/[id]의 결제상태 변경이 조건 없는 UPDATE라, 관리자 UI의
// 자유 select 로 결제상태를 아무 값이나 덮어쓸 수 있었다. 그 결과:
//   1) 이중 재고복원 재생 — 취소(재고 복원 RPC)된 주문의 결제상태를 '입금대기'로 되돌린 뒤 또
//      취소하면 RPC가 또 매치돼 재고가 두 번 복원된다.
//   2) 증빙 없는 '결제완료' — payment_key/paid_at 없이 카드주문을 '결제완료'로 위조.
// 이 스펙은 화이트리스트가 재생 체인을 끊는 전이 거부를 고정한다(라우트는 이 결과를 409로 매핑).

test.describe('관리자 수동 결제상태 전이 화이트리스트', () => {
  test('(c) 입금대기 → 결제완료 는 허용된다 (무통장 입금 확인)', () => {
    expect(isManualPaymentTransitionAllowed('입금대기', '결제완료')).toBe(true);
  });

  test('결제완료 → 환불완료 는 허용된다 (환불 처리)', () => {
    expect(isManualPaymentTransitionAllowed('결제완료', '환불완료')).toBe(true);
  });

  test('(a) 결제취소 → 입금대기 는 거부된다 — 이중 재고복원 재생 체인을 끊는다', () => {
    // 이게 핵심 회귀 방어다. 취소된 주문을 '입금대기'로 되돌려야 두 번째 취소가 RPC에 매치되는데,
    // 그 되돌리기를 여기서 금지한다.
    expect(isManualPaymentTransitionAllowed('결제취소', '입금대기')).toBe(false);
  });

  test('(b) 종결 상태(결제취소·환불완료)에서는 어떤 전이도 나갈 수 없다', () => {
    for (const to of PAYMENT_STATUSES) {
      expect(isManualPaymentTransitionAllowed('결제취소', to)).toBe(false);
      expect(isManualPaymentTransitionAllowed('환불완료', to)).toBe(false);
    }
  });

  test('결제대기·승인중 은 수동 전이의 출발점이 될 수 없다 (토스 상태기계 자동 관리)', () => {
    for (const to of PAYMENT_STATUSES) {
      expect(isManualPaymentTransitionAllowed('결제대기', to)).toBe(false);
      expect(isManualPaymentTransitionAllowed('승인중', to)).toBe(false);
    }
  });

  test('결제상태로의 위조 전이 대부분은 거부되고, 화이트리스트에 명시된 2건만 허용된다', () => {
    // 전수 대조 — 허용은 정확히 {입금대기→결제완료, 결제완료→환불완료} 뿐이어야 한다.
    const allowedPairs: Array<[string, string]> = [];
    for (const from of PAYMENT_STATUSES) {
      for (const to of PAYMENT_STATUSES) {
        if (isManualPaymentTransitionAllowed(from, to)) allowedPairs.push([from, to]);
      }
    }
    expect(allowedPairs.sort()).toEqual(
      [
        ['결제완료', '환불완료'],
        ['입금대기', '결제완료'],
      ].sort(),
    );
  });

  test('동일 상태(from === to)는 전이가 아니라 no-op 이라 false — 라우트가 CAS 없이 건너뛴다', () => {
    for (const s of PAYMENT_STATUSES) {
      expect(isManualPaymentTransitionAllowed(s, s)).toBe(false);
    }
  });

  test('취소(→결제취소)는 화이트리스트에 없다 — 취소는 재고 복원 RPC 경로 전용', () => {
    // route.ts applyOrderUpdates가 '결제취소' 요청을 이 가드에 닿기 전에 취소 RPC로 가로챈다.
    expect(ALLOWED_MANUAL_PAYMENT_TRANSITIONS['결제완료']).not.toContain('결제취소');
    expect(ALLOWED_MANUAL_PAYMENT_TRANSITIONS['입금대기']).not.toContain('결제취소');
  });
});
