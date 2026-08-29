import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { ALL_ADMIN_API_ROUTES } from '../golden/_lib/allAdminApiRoutes';

const root = path.resolve(__dirname, '..', '..');
const source = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test.describe('관리자 주문 export API 계약', () => {
  test('신규 export route는 관리자 인증, 서버 DB 조회, 공용 필터, CSV 직렬화를 모두 사용한다', () => {
    const route = source('src', 'app', 'api', 'admin', 'orders', 'export', 'route.ts');

    expect(route).toContain("import { requireAdmin } from '@/lib/admin/requireAdmin'");
    expect(route).toContain('const admin = await requireAdmin();');
    expect(route).toContain('listOrdersForAdminExport(parsed.dbRange, MAX_ADMIN_ORDER_EXPORT_ROWS + 1)');
    expect(route).toContain('applyAdminOrderFilters(orders, parsed.filters)');
    expect(route).toContain('serializeAdminOrdersCsv(filteredOrders, brands)');
    expect(route).toContain("'Content-Type': 'text/csv; charset=utf-8'");
    expect(route).toContain("'Content-Disposition': 'attachment; filename=\"admin-orders-export.csv\"'");
    expect(route).not.toContain('requester');
    expect(route).not.toContain('customerName');
    expect(route).not.toContain('phone');
    expect(route).not.toContain('address');
  });

  test('export route는 관리자 API 전수 차단 레지스트리에 등록돼 있다', () => {
    expect(ALL_ADMIN_API_ROUTES).toContain('/api/admin/orders/export');
  });
});
