import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { listAllOrders, ORDERS_LIST_CAP } from '@/lib/orders/repo';
import { listInsuranceApplications } from '@/lib/insurance/repo';
import { listMembers } from '@/lib/members/repo';
import { listAllBrandsForAdmin, BRANDS_LIST_CAP } from '@/lib/brands/repo';
import { listAllProductsForAdmin, PRODUCTS_LIST_CAP } from '@/lib/products/repo';
import { listAllInquiries, INQUIRIES_LIST_CAP } from '@/lib/inquiries/repo';
import { buildBrandStats, buildBrandStatsMeta } from '@/lib/admin/dashboardStats';
import { logServerError } from '@/lib/logServerError';
import type {
  AdminDashboardBrandStat,
  AdminDashboardBrandStatsMeta,
  AdminDashboardSummary,
  Brand,
  Order,
  Product,
  ProductInquiry,
} from '@/types';

const RECENT_LIMIT = 5;

/** 브랜드 통계 집계 기간 — 최근 30일. 쿼리스트링 기간 필터는 UI가 생긴 뒤(다음 PR) 도입. */
const BRAND_STATS_WINDOW_DAYS = 30;

function byCreatedAtDesc<T extends { createdAt: string }>(a: T, b: T): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

interface BrandStatsPayload {
  brandStats: AdminDashboardBrandStat[];
  brandStatsMeta: AdminDashboardBrandStatsMeta;
}

/** allSettled 결과에서 값을 꺼내고, 실패면 폴백 + 실패 소스명을 기록한다(부분 성공 허용). */
function settledOr<T>(
  result: PromiseSettledResult<T>,
  fallback: T,
  sourceName: string,
  failedSources: string[],
): T {
  if (result.status === 'fulfilled') return result.value;
  failedSources.push(sourceName);
  logServerError(`[GET /api/admin/dashboard] brandStats 소스 조회 실패: ${sourceName}`, result.reason);
  return fallback;
}

/**
 * 브랜드별 통계(§6-3). 집계 소스 4종을 병렬 조회해 순수 함수 buildBrandStats()에 넘긴다.
 *
 * - **부분 성공을 허용한다**(Promise.allSettled): 문의 조회만 죽어도 상품·미완성·금액 지표는 살린다.
 *   결손이 생기면 meta.partial=true로 명시해 "0"이 진짜 0인지 조회 실패인지 구분되게 한다.
 * - brands가 실패하면 행 자체를 만들 수 없으므로 brandStats 필드를 생략한다(대시보드 본체는 산다).
 * - repo LIST_CAP에 도달하면 모집단이 잘린 것이므로 meta.truncated=true + 서버 로그.
 */
async function loadBrandStats(ordersPromise: Promise<Order[]>): Promise<BrandStatsPayload | undefined> {
  const failedSources: string[] = [];
  // orders는 본 응답과 같은 조회를 재사용한다(중복 쿼리 방지).
  const [brandsRes, productsRes, inquiriesRes, ordersRes] = await Promise.allSettled([
    listAllBrandsForAdmin(),
    listAllProductsForAdmin(),
    listAllInquiries(),
    ordersPromise,
  ]);

  if (brandsRes.status === 'rejected') {
    logServerError('[GET /api/admin/dashboard] brandStats 집계 실패: brands(가산 필드 생략)', brandsRes.reason);
    return undefined;
  }
  const brands: Brand[] = brandsRes.value;
  const products: Product[] = settledOr(productsRes, [], 'products', failedSources);
  const inquiries: ProductInquiry[] = settledOr(inquiriesRes, [], 'inquiries', failedSources);
  const orders: Order[] = settledOr(ordersRes, [], 'orders', failedSources);

  const since = new Date(Date.now() - BRAND_STATS_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  let invalidItemCount = 0;
  const brandStats = buildBrandStats({
    brands,
    products,
    orders,
    inquiries,
    since,
    onInvalidOrderItem: () => {
      invalidItemCount += 1;
    },
  });
  if (invalidItemCount > 0) {
    logServerError(
      '[GET /api/admin/dashboard] brandStats 금액 집계에서 숫자가 아닌 주문 아이템 스킵',
      new Error(`invalidOrderItemCount=${invalidItemCount}`),
    );
  }

  // 상한 도달 = 모집단 절삭(가장 오래된 행이 창 밖으로 밀려남 — 미답변 문의 지표가 특히 위험).
  const truncated =
    brands.length >= BRANDS_LIST_CAP ||
    products.length >= PRODUCTS_LIST_CAP ||
    orders.length >= ORDERS_LIST_CAP ||
    inquiries.length >= INQUIRIES_LIST_CAP;
  if (truncated) {
    logServerError(
      '[GET /api/admin/dashboard] brandStats 모집단 절삭(LIST_CAP 도달) — 수치를 신뢰할 수 없다',
      new Error(
        `brands=${brands.length}/${BRANDS_LIST_CAP} products=${products.length}/${PRODUCTS_LIST_CAP} ` +
          `orders=${orders.length}/${ORDERS_LIST_CAP} inquiries=${inquiries.length}/${INQUIRIES_LIST_CAP}`,
      ),
    );
  }

  const brandStatsMeta = buildBrandStatsMeta({
    brands,
    products,
    since,
    windowDays: BRAND_STATS_WINDOW_DAYS,
    truncated,
    partial: failedSources.length > 0,
  });

  return { brandStats, brandStatsMeta };
}

/**
 * GET /api/admin/dashboard — 관리자 대시보드 요약(최근 주문·보험 신청·가입 승인 대기 + 브랜드별 통계).
 * requireAdmin()이 DB 재조회로 role/active를 다시 확인한다(admin/orders·admin/insurance와 동일 방어).
 *
 * ⚠️ 성능/정확도: 지금은 orders·products·inquiries를 **repo 상한(LIST_CAP)까지 조회 → 서버 집계**한다.
 * 상한에 닿으면 수치가 잘리므로 meta.truncated로 알린다. 데이터가 커지면 SQL 집계(뷰/RPC 또는
 * group by 쿼리)로 내려야 한다.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const ordersPromise = listAllOrders();
    const [orders, insurances, members, brandStatsPayload] = await Promise.all([
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
      ...(brandStatsPayload ?? {}),
    };
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/admin/dashboard] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
