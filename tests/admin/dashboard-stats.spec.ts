import { test, expect } from '@playwright/test';
import {
  buildBrandStats,
  buildBrandStatsMeta,
  countUnmatchedProducts,
  detectTruncation,
  isProductIncomplete,
  resolveBrandsOrSkip,
  settledOr,
} from '@/lib/admin/dashboardStats';
import { PAID_PAYMENT_STATUS, type Brand, type Order, type Product, type ProductInquiry } from '@/types';

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

/**
 * 기본 픽스처 = **결제 확정 주문**(카드 승인 완료). 결제 축을 반드시 명시적으로 준다 —
 * 실제 DB에 없는 값('완료' 등)을 쓰면 결제 필터를 통과해버려 HIGH-1 같은 결함을 못 잡는다.
 * 실값 근거: src/types/index.ts PAYMENT_STATUSES.
 */
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
    orderStatus: '주문접수',
    paymentStatus: PAID_PAYMENT_STATUS,
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
  order('o2', [{ productId: 'p1', price: 50_000, quantity: 1 }], {
    orderStatus: '취소완료',
    paymentStatus: '결제취소',
  }),
];
const inquiries: ProductInquiry[] = [
  inquiry('q1', 'p1', 'b1', 'waiting'),
  inquiry('q2', 'p1', 'b1', 'answered'),
  inquiry('q3', 'p3', 'b2', 'answered'),
];

test('브랜드별 상품·미완성·주문금액·미답변 문의를 집계한다', () => {
  const stats = buildBrandStats({ brands, products, orders, inquiries, since: SINCE });

  expect(stats.map((s) => s.brandId)).toEqual(['b1', 'b2']); // displayOrder 없으면 입력 순서 유지

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

/* ── 결제 축(HIGH-1) — "안 낸 돈"은 매출이 아니다 ─────────────────── */

function amountOf(list: Order[]): number {
  const stats = buildBrandStats({ brands, products, orders: list, inquiries: [], since: SINCE });
  return stats[0].orderAmount;
}

test('🔴 무통장 미입금(입금대기·주문접수)은 매출에 잡히지 않는다', () => {
  // 실주문 대부분이 이 상태다(TOSS 키 미등록). expiresAt 없이 생성돼 만료 cron도 안 건드린다 →
  // orderStatus만 보면 영원히 매출로 집계된다.
  const bankTransfer = order('ob', [{ productId: 'p1', price: 100_000, quantity: 1 }], {
    paymentMethod: '무통장입금',
    orderStatus: '주문접수',
    paymentStatus: '입금대기',
  });
  expect(amountOf([bankTransfer])).toBe(0);
});

test('카드 결제대기(주문접수)는 매출에 잡히지 않는다', () => {
  const pending = order('oc', [{ productId: 'p1', price: 30_000, quantity: 1 }], {
    orderStatus: '주문접수',
    paymentStatus: '결제대기',
  });
  expect(amountOf([pending])).toBe(0);
});

test('승인중(토스 승인 진행 중)은 매출에 잡히지 않는다', () => {
  const confirming = order('od', [{ productId: 'p1', price: 40_000, quantity: 1 }], {
    orderStatus: '주문접수',
    paymentStatus: '승인중',
  });
  expect(amountOf([confirming])).toBe(0);
});

test('결제완료 + 취소요청은 매출에 남는다(환불 전 — 환불완료로 바뀌면 빠진다)', () => {
  const cancelRequested = order('oe', [{ productId: 'p1', price: 12_000, quantity: 1 }], {
    orderStatus: '취소요청',
    paymentStatus: PAID_PAYMENT_STATUS,
  });
  expect(amountOf([cancelRequested])).toBe(12_000);
});

test('결제완료 + 취소완료/환불완료는 매출에서 빠진다', () => {
  const cancelled = order('of', [{ productId: 'p1', price: 50_000, quantity: 1 }], {
    orderStatus: '취소완료',
    paymentStatus: PAID_PAYMENT_STATUS,
  });
  expect(amountOf([cancelled])).toBe(0);

  const refunded = order('og', [{ productId: 'p1', price: 7_000, quantity: 1 }], {
    orderStatus: '주문접수',
    paymentStatus: PAID_PAYMENT_STATUS,
  });
  expect(amountOf([refunded])).toBe(0);
});

/* ── 숫자 가드(MEDIUM-3) ─────────────────────────────────────── */

test('price가 없는 아이템(jsonb 결손)이 있어도 합계가 NaN으로 오염되지 않는다', () => {
  const broken = order('oh', [], {
    // items는 jsonb 무검증 캐스트(orders/repo.ts parseItems) — price 누락 행이 실제로 가능하다.
    items: [
      { productId: 'p1', productName: 'p1', quantity: 2 } as unknown as Order['items'][number],
      { productId: 'p1', productName: 'p1', quantity: 1, price: 5_000 },
    ],
  });
  const skipped: Array<{ orderId: string; productId: string }> = [];
  const stats = buildBrandStats({
    brands,
    products,
    orders: [broken],
    inquiries: [],
    since: SINCE,
    onInvalidOrderItem: (info) => skipped.push(info),
  });
  expect(Number.isNaN(stats[0].orderAmount)).toBe(false);
  expect(stats[0].orderAmount).toBe(5_000); // 정상 아이템만 합산
  expect(skipped).toEqual([{ orderId: 'oh', productId: 'p1' }]);
});

/* ── 미완성 판정(MEDIUM-1) — 클라이언트(src/app/admin/page.tsx) 기준과 일치 ── */

test('품절(stock=0) 상품은 나머지가 다 채워져 있어도 미완성으로 센다(클라 isMissingInfo 기준)', () => {
  const soldOut = product('ps', 'b1', { stock: 0 });
  expect(isProductIncomplete(soldOut)).toBe(true);

  const stats = buildBrandStats({
    brands,
    products: [product('p1', 'b1'), soldOut],
    orders: [],
    inquiries: [],
    since: SINCE,
  });
  expect(stats[0].incompleteCount).toBe(1);
});

/* ── 문의 폴백(LOW-1) ─────────────────────────────────────── */

test("상품이 매칭돼도 상품의 brandId가 ''면 문의가 들고 있는 brandId로 폴백한다", () => {
  const orphanProduct = product('po', '', {}); // 브랜드 미배정 상품
  const stats = buildBrandStats({
    brands,
    products: [orphanProduct],
    orders: [],
    inquiries: [inquiry('q9', 'po', 'b1', 'waiting')],
    since: SINCE,
  });
  expect(stats[0].unansweredInquiryCount).toBe(1); // ?? 였다면 ''로 남아 조용히 누락
});

/* ── 응답 meta(MEDIUM-2) ─────────────────────────────────────── */

test('meta는 기간(since·windowDays)과 미매칭 상품 수를 값으로 내린다', () => {
  const meta = buildBrandStatsMeta({
    brands,
    products, // p9 = ghost 브랜드
    since: SINCE,
    windowDays: 30,
    truncated: false,
    partial: false,
  });
  expect(meta.since).toBe(SINCE);
  expect(meta.windowDays).toBe(30);
  expect(meta.unmatchedProductCount).toBe(1); // p9
  // 플래그는 참일 때만 실린다(기존 JSON 계약 유지).
  expect(meta.truncated).toBeUndefined();
  expect(meta.partial).toBeUndefined();
});

test('meta는 절삭·부분실패를 플래그로 알린다', () => {
  const meta = buildBrandStatsMeta({
    brands,
    products,
    since: SINCE,
    windowDays: 30,
    truncated: true,
    partial: true,
  });
  expect(meta.truncated).toBe(true);
  expect(meta.partial).toBe(true);
});

/* ── 정렬(§6-4) ─────────────────────────────────────── */

test('displayOrder 오름차순으로 정렬되고 미지정 브랜드는 뒤로 간다', () => {
  const ordered: Brand[] = [
    brand('bz', { displayOrder: 3 }),
    brand('bn'), // 미지정
    brand('ba', { displayOrder: 1 }),
  ];
  const stats = buildBrandStats({
    brands: ordered,
    products: [],
    orders: [],
    inquiries: [],
    since: SINCE,
  });
  expect(stats.map((s) => s.brandId)).toEqual(['ba', 'bz', 'bn']);
  expect(stats[0].displayOrder).toBe(1);
  expect(stats[2].displayOrder).toBeUndefined();
});

/* ── 라우트 레이어 순수 추출(LOW-4) — src/app/api/admin/dashboard/route.ts가 부르기만 하는 함수들.
 * 이전엔 이 로직이 라우트 안에만 있어 어떤 테스트도 잠그지 않았다. 특히 detectTruncation은
 * HIGH-2로 고친 절삭 판정 로직인데 미검증이었다. ─────────────────────────────────────── */

test('settledOr: fulfilled 결과는 데이터를 그대로 반환하고 failed=false', () => {
  const result = settledOr<Product>({ status: 'fulfilled', value: [product('p1', 'b1')] });
  expect(result.failed).toBe(false);
  expect(result.data).toEqual([product('p1', 'b1')]);
});

test('settledOr: rejected 결과는 빈 배열 + failed=true', () => {
  const result = settledOr<Product>({ status: 'rejected', reason: new Error('boom') });
  expect(result.failed).toBe(true);
  expect(result.data).toEqual([]);
});

test('resolveBrandsOrSkip: fulfilled면 브랜드 배열, rejected면 undefined(brandStats 전체 생략 신호)', () => {
  expect(resolveBrandsOrSkip({ status: 'fulfilled', value: brands })).toBe(brands);
  expect(resolveBrandsOrSkip({ status: 'rejected', reason: new Error('boom') })).toBeUndefined();
});

test('inquiries 소스 실패 시 settledOr가 빈 배열을 반환해 unansweredInquiryCount가 0이 된다(합성 검증)', () => {
  const inquiriesResult = settledOr<ProductInquiry>({ status: 'rejected', reason: new Error('boom') });
  expect(inquiriesResult.failed).toBe(true);
  const stats = buildBrandStats({ brands, products, orders, inquiries: inquiriesResult.data, since: SINCE });
  expect(stats[0].unansweredInquiryCount).toBe(0);
});

test('detectTruncation: 각 소스가 개별적으로 CAP에 도달하면 true', () => {
  const caps = { orders: 10, products: 10, inquiries: 10, brands: 10 };
  expect(detectTruncation({ orders: 10, products: 0, inquiries: 0, brands: 0 }, caps)).toBe(true);
  expect(detectTruncation({ orders: 0, products: 10, inquiries: 0, brands: 0 }, caps)).toBe(true);
  expect(detectTruncation({ orders: 0, products: 0, inquiries: 10, brands: 0 }, caps)).toBe(true);
  expect(detectTruncation({ orders: 0, products: 0, inquiries: 0, brands: 10 }, caps)).toBe(true);
});

test('detectTruncation: 하나도 CAP에 안 닿으면 false', () => {
  const caps = { orders: 10, products: 10, inquiries: 10, brands: 10 };
  expect(detectTruncation({ orders: 9, products: 9, inquiries: 9, brands: 9 }, caps)).toBe(false);
});

test('detectTruncation: 정확히 CAP-1이면 false(경계값)', () => {
  const caps = { orders: 100, products: 100, inquiries: 100, brands: 100 };
  expect(detectTruncation({ orders: 99, products: 99, inquiries: 99, brands: 99 }, caps)).toBe(false);
});

/* ── meta.failedSources(LOW-2) — partial 하나만으로는 어느 지표가 결손인지 구분 불가했다 ── */

test('meta는 partial=true일 때 failedSources를 값으로 내린다', () => {
  const meta = buildBrandStatsMeta({
    brands,
    products,
    since: SINCE,
    windowDays: 30,
    truncated: false,
    partial: true,
    failedSources: ['inquiries'],
  });
  expect(meta.failedSources).toEqual(['inquiries']);
});

test('meta는 failedSources가 없으면(빈 배열) 필드 자체를 생략한다(기존 JSON 계약 유지)', () => {
  const meta = buildBrandStatsMeta({
    brands,
    products,
    since: SINCE,
    windowDays: 30,
    truncated: false,
    partial: false,
    failedSources: [],
  });
  expect(meta.failedSources).toBeUndefined();
});
