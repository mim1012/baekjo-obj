import type {
  DeliveryFeeBreakdown,
  OrderConsentRecord,
  OrderItem,
  OrderSellerGroup,
  Product,
  SellerSnapshot,
} from '@/types';
import { isMadeToOrderProduct } from '@/lib/products/madeToOrder';

export const CHECKOUT_POLICY_VERSION = 'checkout-2026-09-06';

export interface CheckoutConsentClaims {
  orderTerms: boolean;
  thirdPartySellerKeys: string[];
  madeToOrderProductIds: string[];
}

export const ORDER_TERMS_CONTENT =
  '주문 상품, 실제 판매자, 결제 금액, 판매자별 배송비, 출고 예정, 교환·반품 기준 및 개인정보 수집·이용 안내를 확인했습니다.';

export function sellerGroupKey(product: Pick<Product, 'sellerId' | 'brandId'>): string {
  return product.sellerId ? `seller:${product.sellerId}` : `brand:${product.brandId || 'unknown'}`;
}

export function sellerSnapshot(product: Pick<Product, 'seller' | 'sellerId' | 'sellerName' | 'brandName' | 'brandId'>): SellerSnapshot {
  if (product.seller) {
    return {
      id: product.seller.id,
      displayName: product.seller.displayName,
      legalName: product.seller.legalName,
      representativeName: product.seller.representativeName,
      businessRegistrationNumber: product.seller.businessRegistrationNumber,
      mailOrderRegistrationNumber: product.seller.mailOrderRegistrationNumber,
      businessAddress: product.seller.businessAddress,
      phone: product.seller.phone,
      email: product.seller.email,
      returnAddress: product.seller.returnAddress || product.seller.businessAddress,
    };
  }
  return { displayName: product.sellerName || product.brandName || product.brandId || '판매자 확인 필요' };
}

export function thirdPartyConsentContent(snapshot: SellerSnapshot): string {
  return [
    `제공받는 자: ${snapshot.legalName || snapshot.displayName}`,
    '제공 목적: 주문 상품의 제작·배송 및 취소·교환·반품 고객지원',
    '제공 항목: 주문자명, 연락처, 배송지 주소, 배송 메모, 주문 상품·옵션·수량',
    '보유 기간: 제공 목적 달성 후 지체 없이 파기. 단, 관계 법령에 따른 보관 의무가 있으면 해당 기간 보관',
    '동의를 거부할 수 있으나 거부 시 해당 판매자 상품을 주문할 수 없습니다.',
  ].join('\n');
}

export function madeToOrderConsentContent(product: Pick<Product, 'id' | 'name' | 'madeToOrderPolicy'>): string {
  const policy = product.madeToOrderPolicy;
  return [
    `주문제작 상품: ${product.name} (${product.id})`,
    `제작 기간: ${policy?.productionPeriod || '제작 일정에 따라 최대 3개월'}`,
    `확인 방법: ${policy?.proofMethod || '카카오톡 채널을 통한 사진 확인'}`,
    `수정 횟수·범위: ${policy?.revisionCount || '개별 안내'} / ${policy?.revisionScope || '제작 단계에 따라 개별 안내'}`,
    `사진 처리: ${policy?.photoPurpose || '제작 진행 및 완성품 확인'} / ${policy?.photoRetentionPeriod || '배송 후 필요한 기간'} / ${policy?.photoDeletionMethod || '목적 달성 후 삭제'}`,
    `취소 제한: ${policy?.cancellationRestriction || '제작 시작 후 단순 변심 취소가 제한될 수 있음'}`,
  ].join('\n');
}

export function buildOrderSellerGroups(
  items: OrderItem[],
  products: Product[],
  feeBreakdown: DeliveryFeeBreakdown[],
): OrderSellerGroup[] {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const groups = new Map<string, OrderSellerGroup>();
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) continue;
    const key = sellerGroupKey(product);
    const current = groups.get(key) ?? {
      key,
      seller: sellerSnapshot(product),
      productIds: [],
      subtotal: 0,
      shippingFee: 0,
      dispatchEstimate: product.seller?.dispatchEstimate || product.deliveryEstimate,
      returnPolicy: product.seller?.returnPolicy || product.returnNotice,
      acceptanceStatus: 'pending' as const,
    };
    if (!current.productIds.includes(product.id)) current.productIds.push(product.id);
    current.subtotal += item.price * item.quantity;
    groups.set(key, current);
  }

  for (const fee of feeBreakdown) {
    const product = products.find((candidate) =>
      fee.sellerKey ? sellerGroupKey(candidate) === fee.sellerKey : candidate.brandId === fee.brandId);
    if (!product) continue;
    const group = groups.get(sellerGroupKey(product));
    if (group) group.shippingFee += fee.appliedDeliveryFee;
  }
  return [...groups.values()];
}

export function expectedMadeToOrderProductIds(products: Product[]): string[] {
  return products.filter(isMadeToOrderProduct).map((product) => product.id).sort();
}

function exactStringSet(value: unknown, expected: string[]): boolean {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) return false;
  const actual = [...new Set(value as string[])].sort();
  const target = [...new Set(expected)].sort();
  return actual.length === target.length && actual.every((item, index) => item === target[index]);
}

export function validateCheckoutConsentClaims(
  raw: unknown,
  sellerGroups: OrderSellerGroup[],
  products: Product[],
): CheckoutConsentClaims | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (value.orderTerms !== true) return null;
  const sellerKeys = sellerGroups.map((group) => group.key);
  const madeToOrderProductIds = expectedMadeToOrderProductIds(products);
  if (!exactStringSet(value.thirdPartySellerKeys, sellerKeys)) return null;
  if (!exactStringSet(value.madeToOrderProductIds, madeToOrderProductIds)) return null;
  return {
    orderTerms: true,
    thirdPartySellerKeys: [...sellerKeys].sort(),
    madeToOrderProductIds,
  };
}

export interface ConsentEvidenceContext {
  agreedAt: string;
  ipAddress?: string;
  userAgent?: string;
  hash: (content: string) => string;
}

export function buildConsentRecords(
  sellerGroups: OrderSellerGroup[],
  products: Product[],
  context: ConsentEvidenceContext,
): OrderConsentRecord[] {
  const base = { agreedAt: context.agreedAt, ipAddress: context.ipAddress, userAgent: context.userAgent };
  const records: OrderConsentRecord[] = [{
    type: 'order_terms',
    subjectKey: 'order',
    policyVersion: CHECKOUT_POLICY_VERSION,
    contentHash: context.hash(ORDER_TERMS_CONTENT),
    contentSnapshot: ORDER_TERMS_CONTENT,
    ...base,
  }];
  for (const group of sellerGroups) {
    const content = thirdPartyConsentContent(group.seller);
    records.push({ type: 'third_party_provision', subjectKey: group.key, policyVersion: CHECKOUT_POLICY_VERSION, contentHash: context.hash(content), contentSnapshot: content, ...base });
  }
  for (const product of products.filter(isMadeToOrderProduct)) {
    const content = madeToOrderConsentContent(product);
    records.push({ type: 'made_to_order', subjectKey: product.id, policyVersion: product.madeToOrderPolicy?.policyVersion || 'made-to-order-legacy-2026-09-06', contentHash: context.hash(content), contentSnapshot: content, ...base });
  }
  return records;
}
