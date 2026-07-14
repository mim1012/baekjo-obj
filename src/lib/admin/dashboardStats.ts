import {
  PAID_PAYMENT_STATUS,
  type AdminDashboardBrandStat,
  type AdminDashboardBrandStatsMeta,
  type Brand,
  type Order,
  type OrderStatus,
  type Product,
  type ProductInquiry,
} from '@/types';

/**
 * 관리자 대시보드 브랜드별 통계 — 순수 집계(DB를 모른다).
 * 라우트(`/api/admin/dashboard`)가 repo로 데이터를 읽어 이 함수에 넘긴다.
 * 설계: docs/admin-dashboard-uiux-improvement.md §6-3.
 *
 * ⚠️ 입력은 **모집단 전체가 아닐 수 있다** — repo가 LIST_CAP(orders/products/inquiries 1000, brands 500)으로
 * 자른다. 절삭 감지·표시는 호출부(라우트)의 책임이며 응답 meta.truncated로 내려간다.
 */

/**
 * 금액 집계에서 제외하는 주문 상태(**결제가 확정된 주문 중에서** 다시 빼는 것).
 * 근거: src/types/index.ts `ORDER_STATUSES` — 취소가 "완료된" 상태만 제외한다.
 * '취소요청'은 제외하지 않는다: 돈은 이미 들어왔고(결제완료) 환불 전이라 매출에 남는 게 맞다.
 * 환불이 끝나면 orderStatus가 '환불완료'로 바뀌며 이 목록에 걸려 빠진다.
 */
const EXCLUDED_ORDER_STATUSES: readonly OrderStatus[] = ['취소완료', '환불완료'];

/** 미답변 문의 상태값. 근거: src/types/index.ts `ProductInquiry.status: 'waiting' | 'answered'`. */
const INQUIRY_WAITING: ProductInquiry['status'] = 'waiting';

export interface BrandStatsInput {
  brands: Brand[];
  products: Product[];
  orders: Order[];
  inquiries: ProductInquiry[];
  /** ISO 문자열. 이 시각 이후(inclusive) 생성된 주문만 금액에 합산한다. */
  since: string;
  /**
   * 금액 가드(Number.isFinite)에 걸려 스킵한 주문 아이템 통지 훅.
   * items는 jsonb라 price/quantity가 숫자가 아닐 수 있다(무검증 캐스트 — orders/repo.ts parseItems).
   * 호출부가 로그로 남길 수 있게 한다.
   */
  onInvalidOrderItem?: (info: { orderId: string; productId: string }) => void;
}

/**
 * 노출 여부 판정 — **미지정(undefined)은 노출로 본다.**
 * 근거: DB 컬럼 is_visible은 `not null default true`라 실데이터에는 undefined가 없고,
 * 정적/mock 데이터(`src/data/*`)에만 누락이 있을 수 있다. 이 프로젝트의 서버/repo 기본값과
 * 동일하게 "미지정 = 노출"로 통일한다.
 * ⚠️ /admin 대시보드 클라이언트(src/app/admin/page.tsx)는 `if (p.isVisible)`(미지정=숨김)로 세는데,
 * DB 데이터에는 undefined가 없어 현재 두 판정의 결과는 동일하다. 정적 데이터가 섞이는 순간
 * 갈리므로, 클라이언트 집계를 서버로 옮길 때는 이 헬퍼로 통일할 것.
 */
export function isEntityVisible(isVisible?: boolean): boolean {
  return isVisible !== false;
}

/**
 * 상품 정보 미완성 판정 — /admin 대시보드 클라이언트 집계(src/app/admin/page.tsx:67-103, `isMissingInfo`)와
 * **문자 그대로 동일한 기준**이다. 화면 두 곳이 다른 숫자를 말하지 않게 하기 위함:
 *   품절(stock <= 0) · 가격 결손(null/undefined/<=0) · 대표이미지 결손 · 상세 결손(detailBlocks·description 둘 다 빔)
 * 중 하나라도 해당하면 미완성. (클라이언트는 이 상품들을 "조치 필요 상품" 목록에 '품절' 배지까지 붙여 띄운다.)
 */
export function isProductIncomplete(product: Product): boolean {
  const outOfStock = product.stock <= 0;
  const missingPrice = product.price === null || product.price === undefined || product.price <= 0;
  const missingImage = !product.image || product.image.trim() === '';
  const hasDetailBlocks = Boolean(product.detailBlocks && product.detailBlocks.length > 0);
  const hasDescription = Boolean(product.description && product.description.trim() !== '');
  const missingDetail = !hasDetailBlocks && !hasDescription;
  return outOfStock || missingPrice || missingImage || missingDetail;
}

/** 아이템 금액 = 단가 × 수량. 숫자가 아니면(jsonb 결손) null — 합계를 NaN으로 오염시키지 않는다. */
function itemAmount(item: { price: unknown; quantity: unknown }): number | null {
  const price = item.price;
  const quantity = item.quantity;
  if (!Number.isFinite(price) || !Number.isFinite(quantity)) return null;
  const amount = (price as number) * (quantity as number);
  return Number.isFinite(amount) ? amount : null;
}

/**
 * 브랜드별 통계 집계.
 *
 * 동작 명세(조용히 버리지 않기 위해 명시):
 * - **숨김 브랜드도 포함**한다(관리자는 숨김을 봐야 한다 → `isVisible: false`로 내려간다).
 * - 정렬은 `displayOrder` 오름차순(§6-4), 미지정 브랜드는 뒤로. 동순위는 입력 순서 유지(안정 정렬).
 * - 금액은 **결제 확정('결제완료') 주문만** 합산한다 — 미결제(결제대기/입금대기/승인중)는 매출이 아니다.
 *   특히 무통장입금은 expires_at 없이 '입금대기'로 생성되고 만료 cron이 건드리지 않아 영원히 미결제로
 *   남을 수 있다(orders/repo.ts listExpiredPendingOrders) — orderStatus만 보면 영구히 매출로 잡힌다.
 * - 어떤 브랜드에도 매칭되지 않는 상품(`brandId`가 빈 문자열이거나 brands에 없는 id)은 결과 행이 없다.
 *   그 개수는 {@link countUnmatchedProducts}로 세어 응답 meta에 담는다.
 * - 매칭되지 않는 상품을 참조하는 주문 아이템·문의도 같은 이유로 어느 브랜드에도 합산되지 않는다.
 */
export function buildBrandStats(input: BrandStatsInput): AdminDashboardBrandStat[] {
  const { brands, products, orders, inquiries, since, onInvalidOrderItem } = input;
  if (brands.length === 0) return [];

  const statByBrandId = new Map<string, AdminDashboardBrandStat>();
  const result: AdminDashboardBrandStat[] = brands.map((brand) => {
    const stat: AdminDashboardBrandStat = {
      brandId: brand.id,
      brandName: brand.name,
      logo: brand.logo || undefined,
      isVisible: isEntityVisible(brand.isVisible),
      productCount: 0,
      visibleProductCount: 0,
      incompleteCount: 0,
      orderAmount: 0,
      unansweredInquiryCount: 0,
      ...(typeof brand.displayOrder === 'number' ? { displayOrder: brand.displayOrder } : {}),
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
    if (isEntityVisible(product.isVisible)) stat.visibleProductCount += 1;
    if (isProductIncomplete(product)) stat.incompleteCount += 1;
  }

  const sinceMs = new Date(since).getTime();

  for (const order of orders) {
    // ① 결제 확정이 매출의 진실 소스. orderStatus('주문접수' 등)만으로는 "돈이 들어왔는지"를 알 수 없다.
    if (order.paymentStatus !== PAID_PAYMENT_STATUS) continue;
    // ② 결제된 주문 중에서 취소·환불이 "완료"된 건만 다시 뺀다('취소요청'은 남긴다 — 위 상수 주석).
    if (EXCLUDED_ORDER_STATUSES.includes(order.orderStatus)) continue;
    const createdMs = new Date(order.createdAt).getTime();
    if (Number.isNaN(createdMs) || createdMs < sinceMs) continue;

    for (const item of order.items ?? []) {
      const brandId = brandIdByProductId.get(item.productId);
      if (!brandId) continue;
      const stat = statByBrandId.get(brandId);
      if (!stat) continue;
      // OrderItem.price = 단가 → 아이템 금액 = price × quantity.
      // 주문 1건이 여러 브랜드를 포함할 수 있으므로 총액(totalPrice)이 아니라 아이템 단위로 귀속한다.
      const amount = itemAmount(item);
      if (amount === null) {
        onInvalidOrderItem?.({ orderId: order.id, productId: item.productId });
        continue; // NaN 오염 방지 — 합계 전체가 null로 직렬화돼 UI가 터지는 걸 막는다.
      }
      stat.orderAmount += amount;
    }
  }

  for (const inquiry of inquiries) {
    if (inquiry.status !== INQUIRY_WAITING) continue;
    // 문의 → product → brand 조인. 상품이 없거나 상품의 brandId가 빈 문자열이면 문의가 들고 있는
    // brandId로 폴백한다(?? 는 ''를 폴백하지 않아 문의가 조용히 누락됐다 — 반드시 || 로).
    const mapped = brandIdByProductId.get(inquiry.productId);
    const brandId = mapped || inquiry.brandId;
    const stat = statByBrandId.get(brandId);
    if (!stat) continue;
    stat.unansweredInquiryCount += 1;
  }

  return sortByDisplayOrder(result);
}

/** displayOrder 오름차순(미지정은 뒤). 동순위는 입력 순서 유지 — Array.prototype.sort는 안정 정렬. */
function sortByDisplayOrder(stats: AdminDashboardBrandStat[]): AdminDashboardBrandStat[] {
  return [...stats].sort((a, b) => {
    const ao = a.displayOrder ?? Number.POSITIVE_INFINITY;
    const bo = b.displayOrder ?? Number.POSITIVE_INFINITY;
    return ao - bo;
  });
}

/** 어느 브랜드에도 매칭되지 않는 상품 수(집계에서 빠진 상품). */
export function countUnmatchedProducts(brands: Brand[], products: Product[]): number {
  const brandIds = new Set(brands.map((brand) => brand.id));
  return products.filter((product) => !brandIds.has(product.brandId)).length;
}

export interface BrandStatsMetaInput {
  brands: Brand[];
  products: Product[];
  /** 금액 집계 시작 시각(ISO) — 화면이 기간 라벨을 하드코딩하지 않도록 값으로 내린다. */
  since: string;
  windowDays: number;
  /** repo LIST_CAP 도달로 모집단이 잘렸는가(호출부가 판정해 넘긴다). */
  truncated: boolean;
  /** 일부 소스 조회 실패로 지표가 결손됐는가. */
  partial: boolean;
}

/** 응답 meta 조립(순수) — optional 플래그는 참일 때만 실어 기존 JSON 계약을 넓히지 않는다. */
export function buildBrandStatsMeta(input: BrandStatsMetaInput): AdminDashboardBrandStatsMeta {
  return {
    since: input.since,
    windowDays: input.windowDays,
    unmatchedProductCount: countUnmatchedProducts(input.brands, input.products),
    ...(input.truncated ? { truncated: true as const } : {}),
    ...(input.partial ? { partial: true as const } : {}),
  };
}
