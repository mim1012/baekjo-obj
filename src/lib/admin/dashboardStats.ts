import type {
  AdminDashboardBrandStat,
  Brand,
  Order,
  OrderStatus,
  Product,
  ProductInquiry,
} from '@/types';

/**
 * 관리자 대시보드 브랜드별 통계 — 순수 집계(DB를 모른다).
 * 라우트(`/api/admin/dashboard`)가 repo로 데이터를 읽어 이 함수에 넘긴다.
 * 설계: docs/admin-dashboard-uiux-improvement.md §6-3.
 */

/**
 * 금액 집계에서 제외하는 주문 상태.
 * 근거: src/types/index.ts:235-246 `ORDER_STATUSES` — 8개 값 중 취소가 "완료된" 상태만 제외한다.
 * '취소요청'은 아직 취소가 확정되지 않아(운영자 승인 전) 매출에 남긴다.
 */
const EXCLUDED_ORDER_STATUSES: readonly OrderStatus[] = ['취소완료', '환불완료'];

/** 미답변 문의 상태값. 근거: src/types/index.ts:322 `ProductInquiry.status: 'waiting' | 'answered'`. */
const INQUIRY_WAITING: ProductInquiry['status'] = 'waiting';

export interface BrandStatsInput {
  brands: Brand[];
  products: Product[];
  orders: Order[];
  inquiries: ProductInquiry[];
  /** ISO 문자열. 이 시각 이후(inclusive) 생성된 주문만 금액에 합산한다. */
  since: string;
}

/**
 * 상품 정보 미완성 판정 — /admin 대시보드 클라이언트 집계(src/app/admin/page.tsx:67-103)와 **동일 기준**.
 * 화면 두 곳이 다른 숫자를 말하지 않도록 그 로직을 그대로 옮겼다(품절(stock)은 "미완성"이 아니라
 * 별도 지표라 여기서 제외 — incompleteCount 정의 = 가격·대표이미지·상세 중 하나라도 빔).
 */
export function isProductIncomplete(product: Product): boolean {
  const missingPrice = product.price === null || product.price === undefined || product.price <= 0;
  const missingImage = !product.image || product.image.trim() === '';
  const hasDetailBlocks = Boolean(product.detailBlocks && product.detailBlocks.length > 0);
  const hasDescription = Boolean(product.description && product.description.trim() !== '');
  const missingDetail = !hasDetailBlocks && !hasDescription;
  return missingPrice || missingImage || missingDetail;
}

/**
 * 브랜드별 통계 집계.
 *
 * 동작 명세(조용히 버리지 않기 위해 명시):
 * - 브랜드 순서는 입력(`listAllBrandsForAdmin()`) 순서를 그대로 유지하며, **숨김 브랜드도 포함**한다
 *   (관리자는 숨김을 봐야 한다 → `isVisible: false`로 내려간다).
 * - 어떤 브랜드에도 매칭되지 않는 상품(`brandId`가 빈 문자열이거나 brands에 없는 id)은 결과 행이 없다.
 *   그 개수는 {@link countUnmatchedProducts}로 따로 셀 수 있다(호출부가 필요하면 노출).
 * - 매칭되지 않는 상품을 참조하는 주문 아이템·문의도 같은 이유로 어느 브랜드에도 합산되지 않는다.
 */
export function buildBrandStats(input: BrandStatsInput): AdminDashboardBrandStat[] {
  const { brands, products, orders, inquiries, since } = input;
  if (brands.length === 0) return [];

  const statByBrandId = new Map<string, AdminDashboardBrandStat>();
  const result: AdminDashboardBrandStat[] = brands.map((brand) => {
    const stat: AdminDashboardBrandStat = {
      brandId: brand.id,
      brandName: brand.name,
      logo: brand.logo || undefined,
      // isVisible 미지정(레거시 시드)은 노출로 본다 — repo/화면의 기본값과 동일.
      isVisible: brand.isVisible !== false,
      productCount: 0,
      visibleProductCount: 0,
      incompleteCount: 0,
      orderAmount: 0,
      unansweredInquiryCount: 0,
    };
    statByBrandId.set(brand.id, stat);
    return stat;
  });

  // 상품 → 브랜드 인덱스(주문 아이템·문의 조인에 재사용).
  const brandIdByProductId = new Map<string, string>();

  for (const product of products) {
    if (product.id) brandIdByProductId.set(product.id, product.brandId);
    const stat = statByBrandId.get(product.brandId);
    if (!stat) continue; // 브랜드 없는 상품 — 위 동작 명세 참고.
    stat.productCount += 1;
    if (product.isVisible !== false) stat.visibleProductCount += 1;
    if (isProductIncomplete(product)) stat.incompleteCount += 1;
  }

  const sinceMs = new Date(since).getTime();

  for (const order of orders) {
    if (EXCLUDED_ORDER_STATUSES.includes(order.orderStatus)) continue;
    const createdMs = new Date(order.createdAt).getTime();
    if (Number.isNaN(createdMs) || createdMs < sinceMs) continue;

    for (const item of order.items ?? []) {
      const brandId = brandIdByProductId.get(item.productId);
      if (!brandId) continue;
      const stat = statByBrandId.get(brandId);
      if (!stat) continue;
      // OrderItem.price = 단가(src/types/index.ts:217-223) → 아이템 금액 = price × quantity.
      // 주문 1건이 여러 브랜드를 포함할 수 있으므로 총액(totalPrice)이 아니라 아이템 단위로 귀속한다.
      stat.orderAmount += item.price * item.quantity;
    }
  }

  for (const inquiry of inquiries) {
    if (inquiry.status !== INQUIRY_WAITING) continue;
    // 문의 → product → brand 조인. 상품이 삭제됐으면 문의가 들고 있는 brandId로 폴백한다.
    const brandId = brandIdByProductId.get(inquiry.productId) ?? inquiry.brandId;
    const stat = statByBrandId.get(brandId);
    if (!stat) continue;
    stat.unansweredInquiryCount += 1;
  }

  return result;
}

/** 어느 브랜드에도 매칭되지 않는 상품 수(집계에서 빠진 상품). */
export function countUnmatchedProducts(brands: Brand[], products: Product[]): number {
  const brandIds = new Set(brands.map((brand) => brand.id));
  return products.filter((product) => !brandIds.has(product.brandId)).length;
}
