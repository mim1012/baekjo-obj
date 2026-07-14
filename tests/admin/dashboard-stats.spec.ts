import { test, expect } from '@playwright/test';
import { buildBrandStats, countUnmatchedProducts } from '@/lib/admin/dashboardStats';
import type { Brand, Order, Product, ProductInquiry } from '@/types';

// 대시보드 브랜드별 통계(§6-3) 단위 스펙 — 순수 함수, 브라우저·DB 불필요.

const SINCE = '2026-07-01T00:00:00.000Z';

function brand(id: string, over: Partial<Brand> = {}): Brand {
  return {
    id,
    name: `브랜드 ${id}`,
    logo: `/brands/${id}.webp`,
    description: '',
    philosophy: '',
    auditPoints: [],
    representativeProductIds: [],
    relatedConcernSlugs: [],
    isRecommended: false,
    isVisible: true,
    ...over,
  };
}

function product(id: string, brandId: string, over: Partial<Product> = {}): Product {
  return {
    id,
    brandId,
    name: `상품 ${id}`,
    price: 10_000,
    rating: 0,
    reviewCount: 0,
    category: 'food',
    lifestyleCategory: 'daily',
    concernTags: [],
    petType: 'dog',
    ageGroup: 'all',
    image: `/products/${id}.webp`,
    detailBlocks: [{ type: 'text', content: '상세' }],
    stock: 10,
    description: '설명',
    isVisible: true,
    isBest: false,
    isRecommended: false,
    ...over,
  };
}

function order(
  id: string,
  items: Array<{ productId: string; price: number; quantity: number }>,
  over: Partial<Order> = {},
): Order {
  return {
    id,
    customerName: '홍길동',
    phone: '010-0000-0000',
    address: '서울',
    items: items.map((item) => ({ ...item, productName: item.productId })),
    totalPrice: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    deliveryFee: 0,
    paymentMethod: 'card',
    orderStatus: '결제완료',
    paymentStatus: '완료',
    deliveryStatus: '준비',
    createdAt: '2026-07-10T00:00:00.000Z',
    ...over,
  };
}

function inquiry(id: string, productId: string, brandId: string, status: ProductInquiry['status']): ProductInquiry {
  return {
    id,
    userId: 'u1',
    productId,
    brandId,
    title: '문의',
    content: '내용',
    status,
    createdAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-10T00:00:00.000Z',
  };
}

// 브랜드 2개(b2는 숨김) · 상품 4개(p2 미완성, p3 숨김, p9 브랜드 없음) · 주문 2건(o2 취소) · 문의 3건(1건 미답변)
const brands: Brand[] = [brand('b1'), brand('b2', { isVisible: false })];
const products: Product[] = [
  product('p1', 'b1'),
  product('p2', 'b1', { price: null, detailBlocks: [], description: '' }), // 미완성(가격·상세)
  product('p3', 'b2', { isVisible: false }),
  product('p9', 'ghost'), // 존재하지 않는 브랜드
];
const orders: Order[] = [
  // 주문 1건이 두 브랜드(p1=b1, p3=b2) 상품을 포함 + 브랜드 없는 상품(p9)도 포함
  order('o1', [
    { productId: 'p1', price: 10_000, quantity: 2 },
    { productId: 'p3', price: 5_000, quantity: 3 },
    { productId: 'p9', price: 99_000, quantity: 1 },
  ]),
  order('o2', [{ productId: 'p1', price: 50_000, quantity: 1 }], { orderStatus: '취소완료' }),
];
const inquiries: ProductInquiry[] = [
  inquiry('q1', 'p1', 'b1', 'waiting'),
  inquiry('q2', 'p1', 'b1', 'answered'),
  inquiry('q3', 'p3', 'b2', 'answered'),
];

test('브랜드별 상품·미완성·주문금액·미답변 문의를 집계한다', () => {
  const stats = buildBrandStats({ brands, products, orders, inquiries, since: SINCE });

  expect(stats.map((s) => s.brandId)).toEqual(['b1', 'b2']); // 입력 순서 유지

  const b1 = stats[0];
  expect(b1.brandName).toBe('브랜드 b1');
  expect(b1.logo).toBe('/brands/b1.webp');
  expect(b1.productCount).toBe(2);
  expect(b1.visibleProductCount).toBe(2);
  expect(b1.incompleteCount).toBe(1); // p2
  expect(b1.unansweredInquiryCount).toBe(1); // q1

  const b2 = stats[1];
  expect(b2.productCount).toBe(1);
  expect(b2.visibleProductCount).toBe(0); // p3 숨김
  expect(b2.incompleteCount).toBe(0);
  expect(b2.unansweredInquiryCount).toBe(0);
});

test('숨김 브랜드도 결과에 포함된다(isVisible: false)', () => {
  const stats = buildBrandStats({ brands, products, orders, inquiries, since: SINCE });
  expect(stats[0].isVisible).toBe(true);
  expect(stats[1].isVisible).toBe(false);
});

test('주문 1건이 여러 브랜드를 포함하면 아이템 단위로 금액이 갈린다', () => {
  const stats = buildBrandStats({ brands, products, orders, inquiries, since: SINCE });
  expect(stats[0].orderAmount).toBe(20_000); // p1 10,000 × 2
  expect(stats[1].orderAmount).toBe(15_000); // p3 5,000 × 3
});

test('취소완료 주문은 금액에서 빠진다', () => {
  const onlyCancelled = buildBrandStats({
    brands,
    products,
    orders: [orders[1]],
    inquiries,
    since: SINCE,
  });
  expect(onlyCancelled[0].orderAmount).toBe(0);

  const refunded = buildBrandStats({
    brands,
    products,
    orders: [order('o3', [{ productId: 'p1', price: 7_000, quantity: 1 }], { orderStatus: '환불완료' })],
    inquiries,
    since: SINCE,
  });
  expect(refunded[0].orderAmount).toBe(0);
});

test('기간(since) 이전 주문은 금액에서 빠진다', () => {
  const stats = buildBrandStats({
    brands,
    products,
    orders: [
      order('o4', [{ productId: 'p1', price: 1_000, quantity: 1 }], {
        createdAt: '2026-06-01T00:00:00.000Z',
      }),
    ],
    inquiries: [],
    since: SINCE,
  });
  expect(stats[0].orderAmount).toBe(0);
});

test('브랜드 없는 상품은 어느 브랜드에도 합산되지 않고 별도로 셀 수 있다', () => {
  const stats = buildBrandStats({ brands, products, orders, inquiries, since: SINCE });
  const totalCounted = stats.reduce((sum, s) => sum + s.productCount, 0);
  expect(totalCounted).toBe(3); // p9 제외
  // p9(99,000원) 금액도 어느 브랜드에도 안 들어간다
  expect(stats.reduce((sum, s) => sum + s.orderAmount, 0)).toBe(35_000);
  expect(countUnmatchedProducts(brands, products)).toBe(1);
});

test('브랜드가 0개면 빈 배열을 반환한다', () => {
  expect(buildBrandStats({ brands: [], products, orders, inquiries, since: SINCE })).toEqual([]);
});
