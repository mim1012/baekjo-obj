import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { listAllOrders } from '@/lib/orders/repo';
import { listInsuranceApplications } from '@/lib/insurance/repo';
import { listMembers } from '@/lib/members/repo';
import { logServerError } from '@/lib/logServerError';
import type { AdminDashboardSummary } from '@/types';

const RECENT_LIMIT = 5;

function byCreatedAtDesc<T extends { createdAt: string }>(a: T, b: T): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

/**
 * GET /api/admin/dashboard — 관리자 대시보드 요약(최근 주문·보험 신청·가입 승인 대기).
 * requireAdmin()이 DB 재조회로 role/active를 다시 확인한다(admin/orders·admin/insurance와 동일 방어).
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const [orders, insurances, members] = await Promise.all([
      listAllOrders(),
      listInsuranceApplications(),
      listMembers(),
    ]);

    const recentOrders = [...orders]
      .sort(byCreatedAtDesc)
      .slice(0, RECENT_LIMIT)
      .map((order) => ({
        id: order.id,
        customerName: order.customerName,
        orderNumber: order.id,
        totalAmount: order.totalPrice,
        status: order.orderStatus,
      }));

    const recentInsurances = [...insurances].sort(byCreatedAtDesc).slice(0, RECENT_LIMIT);

    // 가입 승인 대기: B2B/보험사/입점업체 회원 중 pending 상태. 별도 "신청서" 테이블은 아직 없어
    // members를 role/status로 좁혀 구성한다(§4 가산 — 기존 members 계약 무변경).
    const recentApplications = members
      .filter(
        (member) =>
          (member.role === 'b2b' || member.role === 'insurance' || member.role === 'partner') &&
          member.status === 'pending',
      )
      .sort(byCreatedAtDesc)
      .slice(0, RECENT_LIMIT)
      .map((member) => ({
        id: member.id,
        name: member.name,
        companyName: member.companyName,
        role: member.role as 'b2b' | 'insurance' | 'partner',
        status: member.status ?? 'pending',
      }));

    const summary: AdminDashboardSummary = { recentOrders, recentInsurances, recentApplications };
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/admin/dashboard] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
