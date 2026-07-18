import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

/**
 * 주문 목록 상태 UX — 스마트스토어식 퍼널 개편(2026-07-17).
 * 목록의 3축 select 를 제거하고 진행 단계 탭 + 복합 배지 + 문맥 행동(입금확인/발송처리) + 일괄
 * 입금확인으로 대체했다. 세밀한 3축 편집은 주문 상세(OrderStatusPanel)에만 남는다.
 */
test.describe('주문 목록 상태 UX (퍼널 개편)', () => {
  test('목록 테이블은 3축 select 를 버리고 복합 배지 + 문맥 행동을 쓴다', () => {
    const table = src('src', 'components', 'admin-new', 'orders', 'OrderDataTable.tsx');

    // 진행 단계 복합 배지로 대체.
    expect(table).toContain("header: '진행 상태'");
    expect(table).toContain('<OrderFunnelBadge');
    expect(table).toContain('deriveFunnelStage(row)');

    // 3축 select(주문/결제/배송)는 목록에서 완전히 사라진다.
    expect(table).not.toContain('OrderInlineStatusControls');
    expect(table).not.toContain("header: '상태 변경'");
    expect(table).not.toContain("header: '주문 상태'");
    expect(table).not.toContain("header: '결제 상태'");
    expect(table).not.toContain("header: '배송 상태'");

    // 문맥 행동: 입금대기→입금확인, 발송대기→발송처리 팝오버.
    expect(table).toContain("action === 'depositConfirm'");
    expect(table).toContain('<DepositConfirmButton');
    expect(table).toContain("action === 'ship'");
    expect(table).toContain('<ShipActionPopover');
  });

  test('목록 페이지는 진행 단계 탭 + 일괄 입금확인을 제공한다', () => {
    const listPage = src('src', 'components', 'admin-new', 'orders', 'OrderListPage.tsx');

    expect(listPage).toContain("import { getAllOrders, updateOrderStatus, getAdminBrands } from '@/lib/storage'");
    expect(listPage).toContain('<OrderFunnelTabs');
    // 일괄 입금확인: 같은 입금확인 경로(updateOrderStatus)를 순차 호출.
    expect(listPage).toContain('handleBulkDepositConfirm');
    expect(listPage).toContain('await updateOrderStatus(id, DEPOSIT_CONFIRM_UPDATE);');
    // 발송대기 탭에서는 선택(일괄)을 끈다.
    expect(listPage).toContain("const selectable = activeTab === '입금대기';");
    // 발송 성공 시 주문 재조회.
    expect(listPage).toContain('onShipped={loadOrders}');
  });

  test('모바일 카드도 3축 select 대신 배지 + 문맥 행동을 쓴다', () => {
    const mobileCard = src('src', 'components', 'admin-new', 'orders', 'OrderMobileCard.tsx');

    expect(mobileCard).toContain('<OrderFunnelBadge');
    expect(mobileCard).not.toContain('OrderInlineStatusControls');
    expect(mobileCard).not.toContain('layout="stack"');
    expect(mobileCard).toContain('<ShipActionPopover');
  });

  test('발송처리 팝오버는 단일 업체만 목록에서 처리하고 다업체·레거시는 상세로 보낸다', () => {
    const popover = src('src', 'components', 'admin-new', 'orders', 'ShipActionPopover.tsx');

    expect(popover).toContain('groupItemsByBrand(order.items, [])');
    // 단일 업체 판정 후에만 발송(배송중) 처리.
    expect(popover).toContain("deliveryStatus: '배송중'");
    expect(popover).toContain('updateOrderShipment(order.id, singleBrandId');
    // 다업체·레거시는 상세 링크로 폴백.
    expect(popover).toContain('/admin/orders/${order.id}');
    expect(popover).toContain('상세에서 발송하기');
  });

  test('상세 화면의 3축 편집은 그대로 유지된다(세밀 편집 정본)', () => {
    const detailPanel = src('src', 'components', 'admin-new', 'orders', 'OrderStatusPanel.tsx');

    expect(detailPanel).toContain('PAYMENT_STATUSES');
    expect(detailPanel).toContain('ORDER_STATUSES.map');
    expect(detailPanel).toContain('DELIVERY_STATUSES.map');
    expect(detailPanel).toContain('PAYMENT_STATUSES.map');
    expect(detailPanel).not.toContain('<option value="결제대기">결제대기</option>');
  });
});
