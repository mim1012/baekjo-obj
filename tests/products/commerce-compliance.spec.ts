import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { calcBrandDeliveryFee } from '@/lib/orderPolicy';
import {
  buildConsentRecords,
  buildOrderSellerGroups,
  madeToOrderConsentContent,
  validateCheckoutConsentClaims,
} from '@/lib/orders/compliance';
import { isProductCommerceReady } from '@/lib/products/commerceReadiness';
import {
  PRODUCT_DISCLOSURE_CATEGORIES,
  PRODUCT_DISCLOSURE_SCHEMA_VERSION,
  isDisclosureComplete,
  normalizeDisclosure,
} from '@/lib/products/disclosures';
import { isMadeToOrderProduct } from '@/lib/products/madeToOrder';
import { validateSellerInput } from '@/lib/sellers/validate';
import type { Brand, MadeToOrderPolicy, Product, ProductDisclosure, Seller } from '@/types';

const root = path.resolve(__dirname, '..', '..');
const source = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

function seller(id: string, status: Seller['status'] = 'verified'): Seller {
  return {
    id,
    displayName: `판매자 ${id}`,
    legalName: `주식회사 ${id}`,
    representativeName: '대표자',
    businessRegistrationNumber: '123-45-67890',
    mailOrderRegistrationNumber: '2026-서울-0001',
    businessAddress: '서울특별시 중구 테스트로 1',
    phone: '1544-9883',
    email: 'seller@example.com',
    returnAddress: '서울특별시 중구 반품로 2',
    shippingFee: 3_000,
    freeShippingThreshold: 50_000,
    dispatchEstimate: '결제 후 3영업일 이내 출고',
    returnPolicy: '수령 후 7일 이내 신청',
    status,
    createdAt: '2026-09-06T00:00:00.000Z',
    updatedAt: '2026-09-06T00:00:00.000Z',
  };
}

function disclosure(categoryCode = 'food'): ProductDisclosure {
  const definition = PRODUCT_DISCLOSURE_CATEGORIES.find((item) => item.code === categoryCode)!;
  return {
    categoryCode,
    schemaVersion: PRODUCT_DISCLOSURE_SCHEMA_VERSION,
    values: Object.fromEntries(definition.fields.map((field) => [field.key, `${field.label} 값`])),
  };
}

function product(id: string, sellerValue = seller(`s-${id}`)): Product {
  return {
    id,
    brandId: 'b1',
    sellerId: sellerValue.id,
    seller: sellerValue,
    name: `상품 ${id}`,
    price: 20_000,
    rating: 0,
    reviewCount: 0,
    category: '사료',
    lifestyleCategory: '데일리',
    concernTags: [],
    petType: 'dog',
    ageGroup: 'adult',
    image: '/products/test.webp',
    stock: 5,
    description: '테스트 상품',
    deliveryEstimate: '결제 후 3영업일 이내 출고',
    returnNotice: '수령 후 7일 이내 신청',
    disclosure: disclosure(),
    isVisible: true,
    isBest: false,
    isRecommended: false,
  };
}

function brand(): Brand {
  return {
    id: 'b1',
    slug: 'b1',
    name: '브랜드 1',
    logo: '',
    description: '',
    philosophy: '',
    auditPoints: [],
    representativeProductIds: [],
    relatedConcernSlugs: [],
    isRecommended: false,
    shipping: { shippingFee: 3_000, freeShippingThreshold: 50_000 },
  };
}

test('검증 판매자와 완성된 상품고시가 모두 있어야 구매 가능하다', () => {
  const ready = product('p1');
  expect(isProductCommerceReady(ready)).toBe(true);
  expect(isProductCommerceReady({ ...ready, sellerId: undefined })).toBe(false);
  expect(isProductCommerceReady({ ...ready, seller: seller('s-p1', 'draft') })).toBe(false);
  expect(isProductCommerceReady({ ...ready, disclosure: undefined })).toBe(false);
});

test('상품고시는 상품군의 모든 필수값과 현재 스키마 버전을 요구한다', () => {
  const complete = disclosure('care');
  expect(isDisclosureComplete(complete)).toBe(true);

  const missing = { ...complete, values: { ...complete.values, caution: '' } };
  expect(isDisclosureComplete(missing)).toBe(false);
  expect(normalizeDisclosure({ ...complete, values: { ...complete.values, injected: '금지' } })).toBeNull();
  expect(normalizeDisclosure({ ...complete, schemaVersion: 'old' })).toBeNull();
});

test('검증 상태 판매자는 법정 필수 사업자정보가 모두 있어야 저장된다', () => {
  const complete = seller('s1');
  expect(validateSellerInput(complete, true)).not.toBeNull();
  expect(validateSellerInput({ ...complete, businessRegistrationNumber: '' }, true)).toBeNull();
  expect(validateSellerInput({ ...complete, dispatchEstimate: '' }, true)).toBeNull();
  expect(validateSellerInput({ ...complete, status: 'unknown' }, true)).toBeNull();
});

test('같은 브랜드라도 실제 판매자가 다르면 배송비와 주문 그룹을 분리한다', () => {
  const products = [product('p1', seller('s1')), product('p2', seller('s2'))];
  const fee = calcBrandDeliveryFee([
    { brandId: 'b1', sellerKey: 'seller:s1', totalPrice: 30_000, shippingFee: 2_500, freeShippingThreshold: 40_000 },
    { brandId: 'b1', sellerKey: 'seller:s2', totalPrice: 30_000, shippingFee: 4_500 },
  ], [brand()]);
  expect(fee.deliveryFee).toBe(7_000);
  expect(fee.breakdown.map((item) => item.sellerKey)).toEqual(['seller:s1', 'seller:s2']);

  const groups = buildOrderSellerGroups([
    { productId: 'p1', productName: '상품 p1', quantity: 1, price: 30_000 },
    { productId: 'p2', productName: '상품 p2', quantity: 1, price: 30_000 },
  ], products, fee.breakdown);
  expect(groups).toHaveLength(2);
  expect(groups.map((group) => group.shippingFee)).toEqual([2_500, 4_500]);
  expect(groups.map((group) => group.seller.legalName)).toEqual(['주식회사 s1', '주식회사 s2']);
});

test('주문 동의는 판매자별·주문제작 상품별 정확한 집합만 허용하고 증적을 남긴다', () => {
  const madeToOrderPolicy: MadeToOrderPolicy = {
    active: true,
    productionPeriod: '결제 후 14일',
    proofMethod: '등록된 연락처로 완성 사진 전송',
    revisionCount: '1회',
    revisionScope: '문구 오탈자',
    photoPurpose: '제작 확인',
    photoRetentionPeriod: '배송완료 후 30일',
    photoDeletionMethod: '복구 불가능한 방식으로 삭제',
    cancellationRestriction: '제작 시작 후 단순 변심 취소 제한',
    policyVersion: 'mto-v1',
  };
  const made = { ...product('made'), madeToOrderPolicy };
  const ordinary = product('ordinary', seller('s2'));
  const groups = buildOrderSellerGroups([
    { productId: made.id, productName: made.name, quantity: 1, price: 20_000 },
    { productId: ordinary.id, productName: ordinary.name, quantity: 1, price: 20_000 },
  ], [made, ordinary], []);

  const claims = {
    orderTerms: true,
    thirdPartySellerKeys: groups.map((group) => group.key),
    madeToOrderProductIds: [made.id],
  };
  expect(validateCheckoutConsentClaims(claims, groups, [made, ordinary])).toEqual({
    orderTerms: true,
    thirdPartySellerKeys: [...claims.thirdPartySellerKeys].sort(),
    madeToOrderProductIds: [made.id],
  });
  expect(validateCheckoutConsentClaims({ ...claims, thirdPartySellerKeys: [] }, groups, [made, ordinary])).toBeNull();
  expect(validateCheckoutConsentClaims({ ...claims, madeToOrderProductIds: [made.id, 'extra'] }, groups, [made, ordinary])).toBeNull();

  const records = buildConsentRecords(groups, [made, ordinary], {
    agreedAt: '2026-09-06T12:00:00.000Z',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    hash: (content) => `hash:${content.length}`,
  });
  expect(records.map((record) => record.type)).toEqual([
    'order_terms',
    'third_party_provision',
    'third_party_provision',
    'made_to_order',
  ]);
  expect(records.every((record) => record.contentSnapshot && record.contentHash && record.agreedAt)).toBe(true);
  expect(isMadeToOrderProduct(made)).toBe(true);
  expect(madeToOrderConsentContent(made)).toContain('배송완료 후 30일');
});

test('DB 마이그레이션은 주문·재고·동의·판매자 수락을 한 트랜잭션에 묶고 종결상태를 동기화한다', () => {
  const atomic = source('supabase', 'migrations', '0153_order_seller_acceptances.sql');
  const terminal = source('supabase', 'migrations', '0154_sync_terminal_order_seller_acceptances.sql');
  const guards = source('supabase', 'migrations', '0155_compliance_write_guards.sql');
  const sellerFulfillment = source('supabase', 'migrations', '0156_seller_fulfillment_policy.sql');
  const consentStorage = source('supabase', 'migrations', '0149_sellers_order_compliance_and_customer_requests.sql');

  expect(atomic).toContain('perform public.decrement_stock_for_order(p_items)');
  expect(atomic).toContain('insert into public.orders');
  expect(atomic).toContain('insert into public.order_seller_acceptances');
  expect(consentStorage).toContain('prevent_order_compliance_snapshot_update');
  expect(consentStorage).toContain('revoke all on public.customer_service_requests from anon, authenticated');
  expect(terminal).toContain("new.payment_status in ('결제취소', '환불완료')");
  expect(terminal).toContain("set status = 'cancelled'");
  expect(guards).toContain('CUSTOMER_REQUEST_NOT_ALLOWED');
  expect(guards).toContain('TERMINAL_ORDER_ACCEPTANCE_LOCKED');
  expect(sellerFulfillment).toContain('shipping_fee int not null');
  expect(sellerFulfillment).toContain('free_shipping_threshold int');
});
