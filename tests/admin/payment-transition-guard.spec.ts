import { test, expect } from '@playwright/test';
import {
  ALLOWED_MANUAL_PAYMENT_TRANSITIONS,
  isManualPaymentTransitionAllowed,
  resolveCancelFallbackPaymentWrite,
} from '@/lib/orders/paymentTransition';
import { PAYMENT_STATUSES } from '@/types';

// restore_stock_for_order(0031 RPC)가 재매치하는 재고 복원 대상 상태. 취소 경로가 이 상태로
// payment_status 를 되돌리면 재취소 시 이중 복원이 난다.
const RESTORE_ELIGIBLE = ['결제대기', '입금대기'] as const;

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

// opus HIGH 회귀 — 취소 브랜치 fallback 우회로. 취소 요청은 orderStatus='취소완료' 하나로도
// isCancelRequest=true 가 되므로, 이미 취소된 주문에 {orderStatus:'취소완료', paymentStatus:'입금대기'}
// 를 보내면 취소 브랜치 → RPC 0행 → fallback 이 payment_status 를 되돌릴 수 있었다. 이 결정을
// resolveCancelFallbackPaymentWrite 로 좁혔고, 여기서 그 결정을 라우트 관점으로 고정한다.
test.describe('취소 fallback 결제상태 쓰기 결정 (리플레이 봉합)', () => {
  test('3단계 리플레이 — 취소된 주문에 취소완료+입금대기 crafted 요청은 결제상태를 되돌리지 않는다', () => {
    // 3단계: ① 주문 취소됨(결제취소) → ② 공격이 paymentStatus='입금대기'를 실어 취소 브랜치 재진입 →
    // ③ fallback 결정. '입금대기'는 '결제취소'가 아니므로 결정은 null = payment_status 미기록.
    // 재취소가 매치할 '입금대기' 상태 자체가 만들어지지 않아 2차 재고복원이 불가능하다.
    expect(resolveCancelFallbackPaymentWrite('입금대기')).toBeNull();
    expect(resolveCancelFallbackPaymentWrite('결제대기')).toBeNull();
  });

  test('결제완료 확정 주문의 취소 기록만 허용 — {from:결제완료, to:결제취소} (환불 별도, 재고 미복원)', () => {
    expect(resolveCancelFallbackPaymentWrite('결제취소')).toEqual({ from: '결제완료', to: '결제취소' });
  });

  test('취소가 아닌/무의미한 paymentStatus(결제완료·환불완료·승인중·undefined)는 기록하지 않는다', () => {
    expect(resolveCancelFallbackPaymentWrite('결제완료')).toBeNull();
    expect(resolveCancelFallbackPaymentWrite('환불완료')).toBeNull();
    expect(resolveCancelFallbackPaymentWrite('승인중')).toBeNull();
    expect(resolveCancelFallbackPaymentWrite(undefined)).toBeNull();
  });

  test('어떤 입력으로도 fallback 은 restore-eligible 상태(결제대기·입금대기)로 payment_status 를 쓰지 않는다', () => {
    // 전수 대조 — from 도 to 도 절대 restore-eligible 이 될 수 없다(우회로 원천 차단).
    for (const input of [...PAYMENT_STATUSES, undefined]) {
      const write = resolveCancelFallbackPaymentWrite(input);
      if (write) {
        expect(RESTORE_ELIGIBLE).not.toContain(write.from);
        expect(RESTORE_ELIGIBLE).not.toContain(write.to);
      }
    }
  });
});
