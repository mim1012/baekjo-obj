import type { Brand, DeliveryFeeBreakdown, Order, OrderItem } from '@/types';
import { ALL_ORDER_FILTER_VALUE } from './adminOrderFilters';

export const ADMIN_ORDER_DETAIL_COLUMNS = [
  '주문번호',
  '주문일시',
  '브랜드명',
  '상품명',
  '옵션',
  '판매수량',
  '상품 판매금액',
  '배송비',
  '최종 결제금액',
  '구매자명',
  '연락처',
  '배송지',
  '주문상태',
  '취소·환불 여부',
  '송장번호',
] as const;

export const ADMIN_ORDER_BRAND_SUMMARY_COLUMNS = [
  '브랜드명',
  '상품명',
  '옵션',
  '판매수량',
  '상품 판매금액 합계',
  '배송비 합계',
  '최종 결제금액 합계',
] as const;

export interface AdminOrderReportInput {
  readonly orders: readonly Order[];
  readonly brands: readonly Brand[];
  readonly brandId?: string;
}

export interface AdminOrderReportDetailRow {
  readonly orderId: string;
  readonly createdAt: string;
  readonly brandName: string;
  readonly productName: string;
  readonly optionName: string;
  readonly quantity: number;
  readonly productAmount: number;
  readonly shipping: number;
  readonly finalAmount: number;
  readonly customerName: string;
  readonly phone: string;
  readonly address: string;
  readonly orderStatus: string;
  readonly cancelRefundFlag: 'Y' | 'N';
  readonly trackingNumber: string;
}

export interface AdminOrderSalesTotals {
  readonly quantity: number;
  readonly productAmount: number;
  readonly shipping: number;
  readonly finalAmount: number;
}

export interface AdminOrderProductSummaryRow extends AdminOrderSalesTotals {
  readonly productName: string;
  readonly optionName: string;
}

export interface AdminOrderBrandSummary {
  readonly brandId: string;
  readonly brandName: string;
  readonly products: readonly AdminOrderProductSummaryRow[];
  readonly total: AdminOrderSalesTotals;
}

export interface AdminOrderReport {
  readonly detailRows: readonly AdminOrderReportDetailRow[];
  readonly brands: readonly AdminOrderBrandSummary[];
  readonly overall: AdminOrderSalesTotals;
}

interface MutableProductSummary {
  productName: string;
  optionName: string;
  quantity: number;
  productAmount: number;
  shipping: number;
  finalAmount: number;
}

interface MutableBrandSummary {
  brandId: string;
  brandName: string;
  products: Map<string, MutableProductSummary>;
  total: AdminOrderSalesTotals;
}

const EMPTY_TOTALS: AdminOrderSalesTotals = {
  quantity: 0,
  productAmount: 0,
  shipping: 0,
  finalAmount: 0,
};

const KST_FORMATTER = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function emptyOrderItem(): OrderItem {
  return { productId: '', productName: '상품 정보 없음', quantity: 0, price: 0 };
}

function selectedBrandId(input: AdminOrderReportInput): string | undefined {
  return input.brandId && input.brandId !== ALL_ORDER_FILTER_VALUE ? input.brandId : undefined;
}

function brandKeyFor(item: OrderItem): string {
  return item.brandId ?? '__legacy__';
}

function productSummaryKey(item: OrderItem): string {
  return `${item.productName}\u0000${item.optionName ?? ''}`;
}

function brandBreakdown(order: Order, brandId: string): DeliveryFeeBreakdown | undefined {
  return (order.deliveryFeeBreakdown ?? []).find((row) => row.brandId === brandId);
}

function brandNameFor(order: Order, item: OrderItem, brandMap: ReadonlyMap<string, Brand>): string {
  if (!item.brandId) return '미지정 브랜드';
  return brandBreakdown(order, item.brandId)?.brandName ?? brandMap.get(item.brandId)?.name ?? item.brandId;
}

function shippingForOrderBrand(order: Order, item: OrderItem): number {
  if (!item.brandId) return order.deliveryFee;
  return brandBreakdown(order, item.brandId)?.appliedDeliveryFee ?? 0;
}

function addTotals(left: AdminOrderSalesTotals, right: AdminOrderSalesTotals): AdminOrderSalesTotals {
  return {
    quantity: left.quantity + right.quantity,
    productAmount: left.productAmount + right.productAmount,
    shipping: left.shipping + right.shipping,
    finalAmount: left.finalAmount + right.finalAmount,
  };
}

function toDetailRow(order: Order, item: OrderItem, brandName: string, shipping: number): AdminOrderReportDetailRow {
  const productAmount = item.price * item.quantity;
  return {
    orderId: order.id,
    createdAt: formatOrderCreatedAtKst(order.createdAt),
    brandName,
    productName: item.productName,
    optionName: item.optionName ?? '',
    quantity: item.quantity,
    productAmount,
    shipping,
    finalAmount: productAmount + shipping,
    customerName: order.customerName,
    phone: order.phone,
    address: order.address,
    orderStatus: order.orderStatus,
    cancelRefundFlag: isCanceledOrRefundedOrder(order) ? 'Y' : 'N',
    trackingNumber: order.trackingNumber ?? '',
  };
}

function sortedBrandSummaries(summaries: ReadonlyMap<string, MutableBrandSummary>): AdminOrderBrandSummary[] {
  return [...summaries.values()]
    .sort((a, b) => a.brandName.localeCompare(b.brandName, 'ko'))
    .map((brand) => ({
      brandId: brand.brandId,
      brandName: brand.brandName,
      products: [...brand.products.values()].sort((a, b) => {
        const productOrder = a.productName.localeCompare(b.productName, 'ko');
        return productOrder === 0 ? a.optionName.localeCompare(b.optionName, 'ko') : productOrder;
      }),
      total: brand.total,
    }));
}

function ensureBrandSummary(
  summaries: Map<string, MutableBrandSummary>,
  brandId: string,
  brandName: string,
): MutableBrandSummary {
  const current = summaries.get(brandId);
  if (current) return current;
  const created: MutableBrandSummary = {
    brandId,
    brandName,
    products: new Map(),
    total: EMPTY_TOTALS,
  };
  summaries.set(brandId, created);
  return created;
}

function addProductSummary(brand: MutableBrandSummary, item: OrderItem, shipping: number): void {
  const key = productSummaryKey(item);
  const current = brand.products.get(key) ?? {
    productName: item.productName,
    optionName: item.optionName ?? '',
    quantity: 0,
    productAmount: 0,
    shipping: 0,
    finalAmount: 0,
  };
  const productAmount = item.price * item.quantity;
  const delta = {
    quantity: item.quantity,
    productAmount,
    shipping,
    finalAmount: productAmount + shipping,
  };
  const nextTotals = addTotals(current, delta);
  brand.products.set(key, {
    productName: current.productName,
    optionName: current.optionName,
    ...nextTotals,
  });
  brand.total = addTotals(brand.total, delta);
}

export function isCanceledOrRefundedOrder(order: Pick<Order, 'orderStatus' | 'paymentStatus'>): boolean {
  return (
    order.orderStatus === '취소요청' ||
    order.orderStatus === '취소완료' ||
    order.paymentStatus === '결제취소' ||
    order.paymentStatus === '환불완료'
  );
}

export function formatOrderCreatedAtKst(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;
  return KST_FORMATTER.format(date).replace('T', ' ');
}

export function buildAdminOrderReport(input: AdminOrderReportInput): AdminOrderReport {
  const brandMap = new Map(input.brands.map((brand) => [brand.id, brand]));
  const brandFilter = selectedBrandId(input);
  const detailRows: AdminOrderReportDetailRow[] = [];
  const summaries = new Map<string, MutableBrandSummary>();
  let overall = EMPTY_TOTALS;

  for (const order of input.orders) {
    const items = order.items.length > 0 ? order.items : [emptyOrderItem()];
    const seenOrderBrands = new Set<string>();

    for (const item of items) {
      const brandId = brandKeyFor(item);
      if (brandFilter && item.brandId !== brandFilter) continue;

      const firstBrandRow = !seenOrderBrands.has(brandId);
      seenOrderBrands.add(brandId);
      const shipping = firstBrandRow ? shippingForOrderBrand(order, item) : 0;
      const brandName = brandNameFor(order, item, brandMap);
      detailRows.push(toDetailRow(order, item, brandName, shipping));

      if (isCanceledOrRefundedOrder(order)) continue;

      const brand = ensureBrandSummary(summaries, brandId, brandName);
      addProductSummary(brand, item, shipping);
      const productAmount = item.price * item.quantity;
      overall = addTotals(overall, {
        quantity: item.quantity,
        productAmount,
        shipping,
        finalAmount: productAmount + shipping,
      });
    }
  }

  return {
    detailRows,
    brands: sortedBrandSummaries(summaries),
    overall,
  };
}
