import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { listAllOrders } from '@/lib/orders/repo';
import { listInsuranceApplications } from '@/lib/insurance/repo';
import { listMembers } from '@/lib/members/repo';
import { listAllBrandsForAdmin } from '@/lib/brands/repo';
import { listAllProductsForAdmin } from '@/lib/products/repo';
import { listAllInquiries } from '@/lib/inquiries/repo';
import { buildBrandStats } from '@/lib/admin/dashboardStats';
import { logServerError } from '@/lib/logServerError';
import type { AdminDashboardBrandStat, AdminDashboardSummary, Order } from '@/types';

const RECENT_LIMIT = 5;

/** 브랜드 통계 집계 기간 — 최근 30일. 쿼리스트링 기간 필터는 UI가 생긴 뒤(다음 PR) 도입. */
const BRAND_STATS_WINDOW_DAYS = 30;

function byCreatedAtDesc<T extends { createdAt: string }>(a: T, b: T): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

/**
 * 브랜드별 통계(§6-3). 집계에 필요한 3종을 병렬 조회해 순수 함수 buildBrandStats()에 넘긴다.
 * 실패 시 undefined를 반환해 **brandStats 필드만 생략**한다(대시보드 전체가 죽지 않도록).
 */
async function loadBrandStats(
  ordersPromise: Promise<Order[]>,
): Promise<AdminDashboardBrandStat[] | undefined> {
  try {
    // orders는 본 응답과 같은 조회를 재사용한다(중복 쿼리 방지).
    const [brands, products, inquiries, orders] = await Promise.all([
      listAllBrandsForAdmin(),
      listAllProductsForAdmin(),
      listAllInquiries(),
      ordersPromise,
    ]);
    const since = new Date(
      Date.now() - BRAND_STATS_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    return buildBrandStats({ brands, products, orders, inquiries, since });
  } catch (error) {
    logServerError('[GET /api/admin/dashboard] brandStats 집계 실패(가산 필드 생략)', error);
    return undefined;
  }
}

/**
 * GET /api/admin/dashboard — 관리자 대시보드 요약(최근 주문·보험 신청·가입 승인 대기 + 브랜드별 통계).
 * requireAdmin()이 DB 재조회로 role/active를 다시 확인한다(admin/orders·admin/insurance와 동일 방어).
 *
 * ⚠️ 성능: 지금은 orders·products·inquiries를 **전량 조회 → 서버 집계**한다(DB 레벨 limit·집계 없음).
 * 데이터가 커지면 SQL 집계(뷰/RPC 또는 group by 쿼리)로 내려야 한다.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const ordersPromise = listAllOrders();
    const [orders, insurances, members, brandStats] = await Promise.all([
      ordersPromise,
      listInsuranceApplications(),
      listMembers(),
      // 브랜드 통계는 가산 필드다 — 실패해도 대시보드 본체(최근 주문·보험·승인 대기)는 살아야 한다.
      loadBrandStats(ordersPromise),
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

    const summary: AdminDashboardSummary = {
      recentOrders,
      recentInsurances,
      recentApplications,
      // 집계 실패 시 undefined → JSON에서 필드 자체가 빠진다(기존 응답 계약 무영향).
      ...(brandStats ? { brandStats } : {}),
    };
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/admin/dashboard] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
