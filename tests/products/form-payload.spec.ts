import { test, expect } from '@playwright/test';
import {
  buildProductUpdatePayload,
  buildProductCreatePayload,
  normalizeOptions,
  PRODUCT_FORM_FIELDS,
  type ProductFormState,
  type ProductOptionFormState,
} from '@/lib/products/formPayload';

// 상품 폼 payload 회귀 스펙 — 순수 함수, 브라우저·DB 불필요.
// 현재 공개 화면이 읽는 필드만 담고, 공개 화면과 끊긴 과거 필드는 재전송하지 않는지 잠근다.
// 특히 detailBlocks(다른 화면 소유)를 절대 재전송하지 않는다.

/** 편집 가능한 전체 필드가 채워진 폼 상태. */
function form(over: Partial<ProductFormState> = {}): ProductFormState {
  return {
    name: '알러지 케어 사료',
    brandId: 'b1',
    category: '사료',
    lifestyleCategory: '건강관리',
    petType: 'dog',
    summary: '한 줄 설명',
    description: '간단 상세',
    price: 32000,
    salePrice: 0,
    stock: 10,
    image: '/products/p1.webp',
    images: ['/products/p1.webp', '/products/p1-2.webp'],
    options: [
      { id: 'opt-a', name: '2kg', price: '32000', stock: '10' },
      { id: 'opt-b', name: '5kg', price: '68000', stock: '5' },
    ],
    concernTags: ['skin', 'digestion'],
    recommendedFor: ['veterinary'],
    shippingFee: 3000,
    deliveryEstimate: '2~3일 내 출고',
    shippingNotice: '제주/도서 추가비',
    returnNotice: '단순 변심 7일 내',
    sellerName: '백조오브제',
    ...over,
  };
}

/* ── 화이트리스트: detailBlocks·rating 등 폼 밖 필드는 절대 담기지 않는다 ── */

test('update payload 키는 전부 PRODUCT_FORM_FIELDS 화이트리스트 안에만 있다', () => {
  const allowed = new Set<string>(PRODUCT_FORM_FIELDS);
  const payload = buildProductUpdatePayload(form(), '지위픽');
  for (const key of Object.keys(payload)) {
    expect(allowed.has(key), `예상 밖 키: ${key}`).toBe(true);
  }
});

test('detailBlocks 를 절대 재전송하지 않는다(ProductDetailEditor 소유 — 덮어쓰기 방지)', () => {
  const payload = buildProductUpdatePayload(form(), '지위픽') as Record<string, unknown>;
  expect('detailBlocks' in payload).toBe(false);
});

test('rating·reviewCount 는 폼이 담지 않는다(집계 소유)', () => {
  const payload = buildProductUpdatePayload(form(), '지위픽') as Record<string, unknown>;
  expect('rating' in payload).toBe(false);
  expect('reviewCount' in payload).toBe(false);
});

test('수정 payload 는 노출·추천·베스트·진열 순서를 담지 않는다(상품 진열 단일 소유)', () => {
  const payload = buildProductUpdatePayload(form(), '지위픽') as Record<string, unknown>;
  expect('isVisible' in payload).toBe(false);
  expect('isBest' in payload).toBe(false);
  expect('isRecommended' in payload).toBe(false);
  expect('homeFeaturedOrder' in payload).toBe(false);
  expect('shopFeaturedOrder' in payload).toBe(false);
  expect('catalogOrder' in payload).toBe(false);
});

/* ── 봉인 해제 필드가 실제로 담긴다 ── */

test('공개 화면 연결 필드(images·options·concernTags·recommendedFor·배송·판매자)가 payload 에 담긴다', () => {
  const payload = buildProductUpdatePayload(form(), '지위픽');
  expect(payload.images).toEqual(['/products/p1.webp', '/products/p1-2.webp']);
  expect(payload.options).toHaveLength(2);
  expect(payload.concernTags).toEqual(['skin', 'digestion']);
  expect(payload.recommendedFor).toEqual(['veterinary']);
  expect(payload.shippingFee).toBe(3000);
  expect(payload.deliveryEstimate).toBe('2~3일 내 출고');
  expect(payload.shippingNotice).toBe('제주/도서 추가비');
  expect(payload.returnNotice).toBe('단순 변심 7일 내');
  expect(payload.sellerName).toBe('백조오브제');
  expect(payload.brandName).toBe('지위픽');
});

/* ── 배열은 새 배열로 복사(입력 참조 안 함) + 공백 제거 ── */

test('공개 연결 배열은 입력을 그대로 참조하지 않고 새 배열로 복사한다', () => {
  const src = form();
  const payload = buildProductUpdatePayload(src, '지위픽');
  expect(payload.images).not.toBe(src.images);
  expect(payload.concernTags).not.toBe(src.concernTags);
  expect(payload.recommendedFor).not.toBe(src.recommendedFor);
});

test('images·concernTags·recommendedFor 의 공백 항목은 제거된다', () => {
  const payload = buildProductUpdatePayload(
    form({
      images: ['/products/p1.webp', '   ', ''],
      concernTags: ['skin', '  '],
      recommendedFor: ['유효', '  '],
    }),
    '지위픽',
  );
  expect(payload.images).toEqual(['/products/p1.webp']);
  expect(payload.concernTags).toEqual(['skin']);
  expect(payload.recommendedFor).toEqual(['유효']);
});

test('배열이 비면 빈 배열을 담는다(전체 삭제 반영)', () => {
  const payload = buildProductUpdatePayload(
    form({ images: [], concernTags: [], recommendedFor: [] }),
    '지위픽',
  );
  expect(payload.images).toEqual([]);
  expect(payload.concernTags).toEqual([]);
  expect(payload.recommendedFor).toEqual([]);
});

/* ── 끊긴 과거 필드는 payload 에 없어 기존 저장값을 건드리지 않는다 ── */

test('공개 화면과 끊긴 과거 필드는 재전송하지 않고 배송 안내는 지우기를 지원한다', () => {
  const payload = buildProductUpdatePayload(form({ deliveryEstimate: '', returnNotice: '  ' }), '지위픽');
  for (const key of ['auditPoints', 'relatedConcernSlugs', 'tags', 'ingredients', 'howToUse', 'caution', 'pointsEnabled', 'pointsRate']) {
    expect(key in payload, `${key}가 payload에 남음`).toBe(false);
  }
  expect(payload.deliveryEstimate).toBe('');
  expect(payload.returnNotice).toBe('');
});

/* ── shippingFee: 숫자일 때만, null/undefined 는 키 제외 ── */

test('shippingFee 가 숫자면 담고, null/undefined(미입력)면 키를 담지 않는다', () => {
  expect(buildProductUpdatePayload(form({ shippingFee: 0 }), 'x').shippingFee).toBe(0);
  const noFee = buildProductUpdatePayload(form({ shippingFee: null }), 'x') as Record<string, unknown>;
  expect('shippingFee' in noFee).toBe(false);
  const undef = buildProductUpdatePayload(form({ shippingFee: undefined }), 'x') as Record<string, unknown>;
  expect('shippingFee' in undef).toBe(false);
});

/* ── salePrice 0 → null(할인 없음) ── */

test('salePrice 0 은 null 로 정규화한다(할인 없음)', () => {
  expect(buildProductUpdatePayload(form({ salePrice: 0 }), 'x').salePrice).toBeNull();
  expect(buildProductUpdatePayload(form({ salePrice: 25000 }), 'x').salePrice).toBe(25000);
});

/* ── normalizeOptions: 빈 행·유효하지 않은 행 제거, id 부여 ── */

test('normalizeOptions: name 이 빈 행은 버린다', () => {
  const rows: ProductOptionFormState[] = [
    { name: '2kg', price: '32000', stock: '10' },
    { name: '   ', price: '5000', stock: '3' },
  ];
  expect(normalizeOptions(rows)).toHaveLength(1);
});

test('normalizeOptions: price 가 숫자가 아니거나 음수면 버린다', () => {
  const rows: ProductOptionFormState[] = [
    { name: '유효', price: '32000', stock: '10' },
    { name: '가격이상', price: 'abc', stock: '10' },
    { name: '음수', price: '-1', stock: '10' },
  ];
  const out = normalizeOptions(rows);
  expect(out).toHaveLength(1);
  expect(out[0].name).toBe('유효');
});

test('normalizeOptions: stock 은 행을 버리지 않는다 — 유효하면 보존, 없거나 이상하면 0', () => {
  // 옵션 재고 입력 UI 제거(2026-07-18): 재고는 상품 단위 하나. 기존 저장값은 보존하되
  // 신규 행(stock 없음)·깨진 값은 0 으로 저장한다. 재고 때문에 옵션명·가격이 증발하면 안 된다.
  const rows: ProductOptionFormState[] = [
    { name: '기존값보존', price: '32000', stock: '10' },
    { name: '신규행', price: '1000' },
    { name: '깨진값', price: '1000', stock: '1.5' },
    { name: '음수재고', price: '1000', stock: '-3' },
  ];
  const out = normalizeOptions(rows);
  expect(out).toHaveLength(4);
  expect(out.map((o) => o.stock)).toEqual([10, 0, 0, 0]);
});

test('normalizeOptions: 기존 id 는 보존하고 없으면 안정적 id 를 부여한다', () => {
  const rows: ProductOptionFormState[] = [
    { id: 'opt-existing', name: '2kg', price: '32000', stock: '10' },
    { name: '5kg', price: '68000', stock: '5' },
  ];
  const out = normalizeOptions(rows);
  expect(out[0].id).toBe('opt-existing');
  expect(out[1].id.length).toBeGreaterThan(0);
});

test('normalizeOptions: price/stock 문자열을 숫자로 변환한다', () => {
  const out = normalizeOptions([{ name: '2kg', price: '32000', stock: '10' }]);
  expect(out[0].price).toBe(32000);
  expect(out[0].stock).toBe(10);
});

test('normalizeOptions: 신규 행 id 가 기존 보존 id 와 충돌하지 않는다(장바구니 오바인딩 방지)', () => {
  // opt-1 삭제 후 남은 opt-2 + 신규 빈 행 → 신규가 opt-2 로 재부여돼선 안 된다.
  const rows: ProductOptionFormState[] = [
    { id: 'opt-2', name: '5kg', price: '68000', stock: '5' },
    { name: '신규', price: '1000', stock: '1' },
  ];
  const out = normalizeOptions(rows);
  const ids = out.map((o) => o.id);
  expect(new Set(ids).size, `id 중복: ${ids.join(',')}`).toBe(out.length);
  expect(out[0].id).toBe('opt-2');
  expect(out[1].id).not.toBe('opt-2');
});

/* ── 생성 payload: ageGroup 기본값 + 공개 연결 필드 동반 ── */

test('create payload 는 ageGroup 기본값과 공개 연결 필드를 담는다', () => {
  const payload = buildProductCreatePayload(form({ ageGroup: undefined }), '지위픽');
  expect(payload.ageGroup).toBe('all');
  expect(payload.images).toEqual(['/products/p1.webp', '/products/p1-2.webp']);
  expect(payload.options).toHaveLength(2);
  expect(payload.concernTags).toEqual(['skin', 'digestion']);
  expect(payload.brandName).toBe('지위픽');
  expect(payload.isVisible).toBe(false);
  expect(payload.isBest).toBe(false);
  expect(payload.isRecommended).toBe(false);
});
