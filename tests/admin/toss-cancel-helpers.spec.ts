import { test, expect } from '@playwright/test';
import { isTossClientRejection, isFullyCanceledToss } from '@/lib/payments/toss';

// 관리자 카드 환불(applyOrderUpdates.ts)이 공유하는 두 순수 판정 함수의 회귀 — 브라우저·DB 없이
// 순수 함수만 검증한다(admin project). 두 함수 모두 route.ts/applyOrderUpdates.ts가 그대로
// import 해 쓰므로, 여기서 검증한 분류 기준이 실제 배선과 항상 같은 소스다(중복 판정 로직 없음).

test.describe('isTossClientRejection — 4xx(거절) vs 네트워크·5xx(불명) 분류(§8-6 codex MEDIUM)', () => {
  test('httpStatus < 500(4xx)은 토스가 명시 거절한 것 — 클라이언트 거절(true, route.ts가 409로 매핑)', () => {
    expect(isTossClientRejection(400)).toBe(true);
    expect(isTossClientRejection(404)).toBe(true);
    expect(isTossClientRejection(409)).toBe(true);
    expect(isTossClientRejection(499)).toBe(true);
  });

  test('httpStatus null(네트워크/타임아웃/시크릿키 미설정) 또는 5xx는 결과 불명(false, route.ts가 502로 매핑)', () => {
    expect(isTossClientRejection(null)).toBe(false);
    expect(isTossClientRejection(500)).toBe(false);
    expect(isTossClientRejection(502)).toBe(false);
    expect(isTossClientRejection(503)).toBe(false);
  });
});

test.describe('isFullyCanceledToss — 전액취소 판정(§8-6 codex LOW-1: 부분환불 오판 봉쇄)', () => {
  test("status==='CANCELED'는 balanceAmount와 무관하게 전액취소로 인정한다", () => {
    expect(isFullyCanceledToss({ status: 'CANCELED', balanceAmount: 0 })).toBe(true);
    expect(isFullyCanceledToss({ status: 'CANCELED', balanceAmount: null })).toBe(true);
  });

  test("status==='PARTIAL_CANCELED'는 balanceAmount===0일 때만 전액취소로 인정한다", () => {
    expect(isFullyCanceledToss({ status: 'PARTIAL_CANCELED', balanceAmount: 0 })).toBe(true);
  });

  test('PARTIAL_CANCELED이면서 잔액이 남아있으면(balanceAmount>0) 부분환불 — 전액취소 아님', () => {
    // ★ 이 케이스가 LOW-1의 핵심 방어 대상이다: 잔액이 남았는데도 성공으로 오판하면
    // refundOrderAndRestore(재고 전량 복원 RPC)가 부분환불 주문에도 잘못 뒤따라 돈다.
    expect(isFullyCanceledToss({ status: 'PARTIAL_CANCELED', balanceAmount: 10000 })).toBe(false);
  });

  test('balanceAmount를 모르면(null) 안전하게 미확정(false)으로 본다', () => {
    expect(isFullyCanceledToss({ status: 'PARTIAL_CANCELED', balanceAmount: null })).toBe(false);
    expect(isFullyCanceledToss({ status: 'DONE', balanceAmount: null })).toBe(false);
  });

  test("status가 CANCELED/PARTIAL_CANCELED가 아니면(예: 'DONE') balanceAmount===0이어도 취소로 보지 않는다", () => {
    expect(isFullyCanceledToss({ status: 'DONE', balanceAmount: 0 })).toBe(false);
  });
});
