import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import {
  applyAdminOrderFilters,
  MAX_ADMIN_ORDER_EXPORT_ROWS,
  parseAdminOrderExportQuery,
  type AdminOrderExportParseError,
} from '@/lib/orders/adminOrderFilters';
import { serializeAdminOrdersXlsx } from '@/lib/orders/adminOrderExportXlsx';
import { listAllBrandsForAdmin } from '@/lib/brands/repo';
import { listOrdersForAdminExport } from '@/lib/orders/repo';
import { logServerError } from '@/lib/logServerError';

const XLSX_HEADERS = {
  'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'Content-Disposition': 'attachment; filename="admin-orders-export.xlsx"',
  'Cache-Control': 'no-store',
} as const;

function errorStatus(error: AdminOrderExportParseError): number {
  return error === 'date-range-too-large' ? 413 : 400;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const parsed = parseAdminOrderExportQuery(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: errorStatus(parsed.error) });
  }

  try {
    const [orders, brands] = await Promise.all([
      listOrdersForAdminExport(parsed.dbRange, MAX_ADMIN_ORDER_EXPORT_ROWS + 1),
      listAllBrandsForAdmin(),
    ]);
    const filteredOrders = applyAdminOrderFilters(orders, parsed.filters);
    if (filteredOrders.length > MAX_ADMIN_ORDER_EXPORT_ROWS) {
      return NextResponse.json({ error: 'export-row-limit-exceeded' }, { status: 413 });
    }

    return new NextResponse(await serializeAdminOrdersXlsx(filteredOrders, brands), {
      status: 200,
      headers: XLSX_HEADERS,
    });
  } catch (error) {
    logServerError('[GET /api/admin/orders/export] 다운로드 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
