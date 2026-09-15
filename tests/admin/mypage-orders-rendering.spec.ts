import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test.describe('마이페이지 주문 렌더링', () => {
  test('주문내역은 공통 기간 필터와 선택 기간 빈 상태를 제공한다', () => {
    const page = src('src', 'app', 'mypage', 'components', 'OrdersSection.tsx');

    expect(page).toContain("import { OrderDateRangeFilter }");
    expect(page).toContain('matchesOrderDateRange');
    expect(page).toContain('선택한 기간에 해당하는 주문 내역이 없습니다.');
  });

  test('주문 카드는 배송조회 전체 완료를 기다리지 않고 먼저 렌더한다', () => {
    const page = src('src', 'app', 'mypage', 'MypageClient.tsx');

    const ordersLoadBlock = page.match(/getMyOrders\(\)\.then\(\(orders\) => \{[\s\S]*?\n    \}\);/);
    expect(ordersLoadBlock?.[0]).toContain('setOrders(orders)');
    expect(ordersLoadBlock?.[0]).toContain('getMyOrderShipments()');
    expect(ordersLoadBlock?.[0].indexOf('setOrders(orders)')).toBeLessThan(
      ordersLoadBlock?.[0].indexOf('getMyOrderShipments()') ?? -1,
    );
  });

  test('주문 카드는 상품별 취소·환불 요청 현황을 상태 배지와 함께 보여준다(PR4 U4)', () => {
    const page = src('src', 'app', 'mypage', 'components', 'OrdersSection.tsx');

    expect(page).toContain('취소·환불 요청 현황');
    // 요청(request) 레벨이 아니라 아이템(라인) 레벨 status로 배지를 그린다 — 요청 하나에 상품이
    // 여러 개면 상품별로 승인/반려/완료가 갈릴 수 있어야 한다.
    expect(page).toContain('request.items.map((item) =>');
    expect(page).toContain("REQUESTED: '취소요청', APPROVED: '취소승인', REJECTED: '취소반려', COMPLETED: '취소완료'");
    // 반려된 요청이 있으면 목록(접힌 상태)에서도 즉시 알 수 있어야 한다.
    expect(page).toContain('hasRejectedRequest');
    expect(page).toContain('취소 반려');
  });

  test('종결(취소완료 등) 주문도 취소·환불 요청 이력을 계속 보여준다(구 409 게이트 잔재 제거)', () => {
    const page = src('src', 'app', 'mypage', 'components', 'OrdersSection.tsx');

    // GET /api/orders/[id]/action-requests가 더 이상 종결 주문을 막지 않으므로(회귀 확인은
    // tests/admin/action-request-routes.spec.ts), 클라이언트에도 그 시절 방어 분기가 남아있지
    // 않아야 한다 — 남아있으면 항상 죽은 코드(서버가 그 코드를 절대 안 준다)다.
    expect(page).not.toContain('action-request-order-closed');
  });

  test('부분취소 주문은 취소요청과 동일하게 교환·반품 요청을 막는다(부분취소완료는 계속 허용)', () => {
    const page = src('src', 'app', 'mypage', 'components', 'OrdersSection.tsx');

    expect(page).toContain("!['취소요청', '부분취소', '취소완료'].includes(order.orderStatus)");
  });
});
