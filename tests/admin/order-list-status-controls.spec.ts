import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test.describe('주문 목록 상태 변경 UX', () => {
  test('주문관리 목록에서 상세 진입 없이 주문·결제·배송 상태를 변경한다', () => {
    const listPage = src('src', 'components', 'admin-new', 'orders', 'OrderListPage.tsx');
    const table = src('src', 'components', 'admin-new', 'orders', 'OrderDataTable.tsx');
    const mobileCard = src('src', 'components', 'admin-new', 'orders', 'OrderMobileCard.tsx');
    const controls = src('src', 'components', 'admin-new', 'orders', 'OrderInlineStatusControls.tsx');

    expect(listPage).toContain("import { getAllOrders, updateOrderStatus } from '@/lib/storage'");
    expect(listPage).toContain('const [savingOrderIds, setSavingOrderIds] = useState<Set<string>>(new Set());');
    expect(listPage).toContain('await updateOrderStatus(id, updates);');
    expect(listPage).toContain('savingOrderIds={savingOrderIds}');
    expect(listPage).toContain('onStatusChange={handleInlineStatusChange}');

    expect(table).toContain("header: '상태 변경'");
    expect(table).toContain('<OrderInlineStatusControls');
    expect(table).not.toContain("header: '주문 상태'");
    expect(table).not.toContain("header: '결제 상태'");
    expect(table).not.toContain("header: '배송 상태'");

    expect(mobileCard).toContain('<OrderInlineStatusControls');
    expect(mobileCard).toContain('layout="stack"');

    expect(controls).toContain('ORDER_STATUSES.map');
    expect(controls).toContain('PAYMENT_STATUSES.map');
    expect(controls).toContain("status === '승인중' ? '승인중(자동)' : status");
    expect(controls).toContain('DELIVERY_STATUSES.map');
  });

  test('상세 화면의 결제 상태 select 도 입금대기 값을 잃지 않는다', () => {
    const detailPanel = src('src', 'components', 'admin-new', 'orders', 'OrderStatusPanel.tsx');

    expect(detailPanel).toContain("import { PAYMENT_STATUSES, type Order } from '@/types'");
    expect(detailPanel).toContain('PAYMENT_STATUSES.map');
    expect(detailPanel).not.toContain('<option value="결제대기">결제대기</option>');
  });
});
