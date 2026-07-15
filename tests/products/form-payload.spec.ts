import { test, expect } from '@playwright/test';
import {
  buildProductUpdatePayload,
  buildProductCreatePayload,
  normalizeOptions,
  PRODUCT_FORM_FIELDS,
  type ProductFormState,
  type ProductOptionFormState,
} from '@/lib/products/formPayload';

// 상품 폼 "봉인 해제" payload 회귀 스펙 — 순수 함수, 브라우저·DB 불필요.
// 공개 상세가 렌더하는데 폼이 못 채우던 필드(options·images·ingredients·howToUse·recommendedFor·
// caution·배송/판매자 안내·isMembersOnlyPrice)를 폼이 담되, 암묵 스프레드가 아니라 명시
// 화이트리스트로만 담는지 잠근다. 특히 detailBlocks(다른 화면 소유)를 절대 재전송하지 않는지.

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
    ingredients: '닭고기, 현미',
    howToUse: '하루 2회 급여',
    recommendedFor: ['알러지가 있는 반려견'],
    caution: ['개봉 후 냉장 보관'],
    shippingFee: 3000,
    deliveryEstimate: '2~3일 내 출고',
    shippingNotice: '제주/도서 추가비',
    returnNotice: '단순 변심 7일 내',
    sellerName: '백조오브제',
    isMembersOnlyPrice: false,
    isVisible: true,
    isBest: false,
    isRecommended: true,
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

test('rating·reviewCount·concernTags 는 폼이 담지 않는다(집계·별도 소유)', () => {
  const payload = buildProductUpdatePayload(form(), '지위픽') as Record<string, unknown>;
  expect('rating' in payload).toBe(false);
  expect('reviewCount' in payload).toBe(false);
  expect('concernTags' in payload).toBe(false);
});

/* ── 봉인 해제 필드가 실제로 담긴다 ── */

test('봉인됐던 필드(images·options·ingredients·howToUse·recommendedFor·caution·배송·판매자)가 payload 에 담긴다', () => {
  const payload = buildProductUpdatePayload(form(), '지위픽');
  expect(payload.images).toEqual(['/products/p1.webp', '/products/p1-2.webp']);
  expect(payload.options).toHaveLength(2);
  expect(payload.ingredients).toBe('닭고기, 현미');
  expect(payload.howToUse).toBe('하루 2회 급여');
  expect(payload.recommendedFor).toEqual(['알러지가 있는 반려견']);
  expect(payload.caution).toEqual(['개봉 후 냉장 보관']);
  expect(payload.shippingFee).toBe(3000);
  expect(payload.deliveryEstimate).toBe('2~3일 내 출고');
  expect(payload.shippingNotice).toBe('제주/도서 추가비');
  expect(payload.returnNotice).toBe('단순 변심 7일 내');
  expect(payload.sellerName).toBe('백조오브제');
  expect(payload.brandName).toBe('지위픽');
});

/* ── 배열은 새 배열로 복사(입력 참조 안 함) + 공백 제거 ── */

test('배열은 입력을 그대로 참조하지 않고 새 배열로 복사한다', () => {
  const src = form();
  const payload = buildProductUpdatePayload(src, '지위픽');
  expect(payload.images).not.toBe(src.images);
  expect(payload.recommendedFor).not.toBe(src.recommendedFor);
  expect(payload.caution).not.toBe(src.caution);
});

test('images·recommendedFor·caution 의 공백 항목은 제거된다', () => {
  const payload = buildProductUpdatePayload(
    form({
      images: ['/products/p1.webp', '   ', ''],
      recommendedFor: ['유효', '  '],
      caution: ['', '주의'],
    }),
    '지위픽',
  );
  expect(payload.images).toEqual(['/products/p1.webp']);
  expect(payload.recommendedFor).toEqual(['유효']);
  expect(payload.caution).toEqual(['주의']);
});

test('배열이 비면 빈 배열을 담는다(전체 삭제 반영)', () => {
  const payload = buildProductUpdatePayload(
    form({ images: [], recommendedFor: [], caution: [] }),
    '지위픽',
  );
  expect(payload.images).toEqual([]);
  expect(payload.recommendedFor).toEqual([]);
  expect(payload.caution).toEqual([]);
});

/* ── 텍스트 지우기: 빈 문자열을 실어 기존 값을 지운다(officialUrl 과 동일) ── */

test('ingredients·howToUse·배송 안내는 빈 문자열을 실어 지우기를 지원한다', () => {
  const payload = buildProductUpdatePayload(
    form({ ingredients: '', howToUse: '   ', deliveryEstimate: '', returnNotice: '  ' }),
    '지위픽',
  );
  expect(payload.ingredients).toBe('');
  expect(payload.howToUse).toBe('');
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

/* ── isMembersOnlyPrice boolean 기본값 ── */

test('isMembersOnlyPrice 는 boolean 으로 항상 담고 미지정 시 false', () => {
  expect(buildProductUpdatePayload(form({ isMembersOnlyPrice: true }), 'x').isMembersOnlyPrice).toBe(true);
  expect(buildProductUpdatePayload(form({ isMembersOnlyPrice: undefined }), 'x').isMembersOnlyPrice).toBe(false);
});

/* ── normalizeOptions: 빈 행·유효하지 않은 행 제거, id 부여 ── */

test('normalizeOptions: name 이 빈 행은 버린다', () => {
  const rows: ProductOptionFormState[] = [
    { name: '2kg', price: '32000', stock: '10' },
    { name: '   ', price: '5000', stock: '3' },
  ];
  expect(normalizeOptions(rows)).toHaveLength(1);
});

test('normalizeOptions: price/stock 이 숫자가 아니거나 음수면 버린다', () => {
  const rows: ProductOptionFormState[] = [
    { name: '유효', price: '32000', stock: '10' },
    { name: '가격이상', price: 'abc', stock: '10' },
    { name: '음수', price: '-1', stock: '10' },
    { name: '소수재고', price: '1000', stock: '1.5' },
  ];
  const out = normalizeOptions(rows);
  expect(out).toHaveLength(1);
  expect(out[0].name).toBe('유효');
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

/* ── 생성 payload: ageGroup 기본값 + 봉인 해제 필드 동반 ── */

test('create payload 는 ageGroup 기본값을 포함하고 봉인 해제 필드도 담는다', () => {
  const payload = buildProductCreatePayload(form({ ageGroup: undefined }), '지위픽');
  expect(payload.ageGroup).toBe('all');
  expect(payload.images).toEqual(['/products/p1.webp', '/products/p1-2.webp']);
  expect(payload.options).toHaveLength(2);
  expect(payload.brandName).toBe('지위픽');
});
