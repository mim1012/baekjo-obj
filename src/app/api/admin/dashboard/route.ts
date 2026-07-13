import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findMemberById } from '@/lib/members/repo';
import { listAllOrders } from '@/lib/orders/repo';
import { listAllProductsForAdmin } from '@/lib/products/repo';
import { listInsuranceApplications } from '@/lib/insurance/repo';
import { listMembers } from '@/lib/members/repo';
import { logServerError } from '@/lib/logServerError';
import type { AdminDashboardSummary } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const REVENUE_ORDER_STATUSES = new Set([
  '결제완료',
  '배송준비',
  '배송중',
  '배송완료',
]);

const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json(
      { error: session?.user ? 'forbidden' : 'unauthorized' },
      { status: session?.user ? 403 : 401 },
    );
  }

  try {
    const requester = session.user.memberId ? await findMemberById(session.user.memberId) : null;
    if (!requester || requester.role !== 'admin' || requester.status === 'inactive') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const [orders, products, insuranceApplications, members] = await Promise.all([
      listAllOrders(),
      listAllProductsForAdmin(),
      listInsuranceApplications(),
      listMembers(),
    ]);

    // 1. Revenue & Orders
    let totalPaidAmount = 0;
    let newCount = 0;
    let pendingCount = 0;

    const now = new Date();
    const seoulNow = new Date(now.getTime() + SEOUL_OFFSET_MS);
    const seoulTodayStartUtc = new Date(
      Date.UTC(seoulNow.getUTCFullYear(), seoulNow.getUTCMonth(), seoulNow.getUTCDate()) - SEOUL_OFFSET_MS
    );
    const todayStartTimestamp = seoulTodayStartUtc.getTime();

    for (const order of orders) {
      if (REVENUE_ORDER_STATUSES.has(order.orderStatus)) {
        totalPaidAmount += order.totalPrice; // 부분 환불 데이터가 Order 타입에 없으므로 일단 totalPrice 전체 사용
      }
      if (order.orderStatus === '주문접수') {
        pendingCount++;
      }
      const orderDate = new Date(order.createdAt).getTime();
      if (orderDate >= todayStartTimestamp) {
        newCount++;
      }
    }

    // 2. Products
    let activeCount = 0;
    let preparingCount = 0;
    for (const p of products) {
      if (p.isVisible) {
        activeCount++;
      } else {
        preparingCount++;
      }
    }

    // 3. Insurance
    let insurancePendingCount = 0;
    let insuranceReviewingCount = 0;
    for (const i of insuranceApplications) {
      if (i.status === '접수' || i.status === '신청완료') insurancePendingCount++;
      if (i.status === '상담중' || i.status === '분석중') insuranceReviewingCount++;
    }

    // 4. Applications & Members
    let totalUsers = 0;
    let todayNewUsers = 0;
    let partnerPendingCount = 0;
    let insuranceRolePendingCount = 0;
    let b2bPendingCount = 0;

    const pendingApplications = [];

    for (const m of members) {
      if (m.role === 'user') {
        totalUsers++;
        const memberDate = new Date(m.createdAt).getTime();
        if (memberDate >= todayStartTimestamp) {
          todayNewUsers++;
        }
      } else if (m.status === 'pending') {
        if (m.role === 'partner') partnerPendingCount++;
        else if (m.role === 'insurance') insuranceRolePendingCount++;
        else if (m.role === 'b2b') b2bPendingCount++;

        pendingApplications.push(m);
      } else if (m.status === 'rejected') {
         pendingApplications.push(m);
      }
    }

    // Sort pending applications: pending first, then by date desc
    pendingApplications.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const summary: AdminDashboardSummary = {
      revenue: {
        totalPaidAmount,
      },
      orders: {
        newCount,
        pendingCount,
      },
      insuranceAnalyses: {
        pendingCount: insurancePendingCount,
        reviewingCount: insuranceReviewingCount,
      },
      products: {
        totalCount: products.length,
        activeCount,
        preparingCount,
      },
      applications: {
        totalUsers,
        todayNewUsers,
        partnerPendingCount,
        insurancePendingCount: insuranceRolePendingCount,
        b2bPendingCount,
      },
      recentOrders: orders.slice(0, 5).map(o => ({
        id: o.id,
        orderNumber: o.id,
        customerName: o.customerName,
        totalAmount: o.totalPrice,
        status: o.orderStatus,
        createdAt: o.createdAt,
      })),
      recentInsurances: insuranceApplications.slice(0, 5).map(i => ({
        id: i.id,
        petName: i.petName,
        ownerName: i.ownerName ?? i.name,
        insuranceName: i.currentInsuranceName,
        status: i.status,
        createdAt: i.createdAt,
      })),
      recentApplications: pendingApplications.slice(0, 5).map(m => ({
        id: m.id,
        role: m.role,
        companyName: m.companyName,
        name: m.name,
        status: m.status ?? 'pending',
        createdAt: m.createdAt,
      })),
    };

    return NextResponse.json(summary, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    logServerError('[GET /api/admin/dashboard] 통계 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
