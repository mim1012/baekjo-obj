import { test, expect } from '@playwright/test';
import { resolveOrderItem } from '@/lib/orders/resolveOrderItem';
import type { Product } from '@/types';

// 주문 항목 옵션 가격 계산 순수 함수 스펙 — DB/브라우저/네트워크 불필요(products 프로젝트).
//
// 회귀 배경(W1): 서버 주문 생성(POST /api/orders)이 optionId를 무시하고 기본가만 저장했다. 결과로
//  (a) 무통장입금 옵션 주문이 옵션가 누락으로 저가 저장되고,
//  (b) priceDiff>0 옵션의 카드결제가 서버 총액(옵션가 누락)과 화면 총액 불일치로 영구 차단됐다
//      (checkout/page.tsx: authoritativePrice !== finalPrice 가드).
// 이 스펙은 카탈로그 옵션가가 단가에 반영되고 optionName이 서버(카탈로그)에서 파생되는지 검증한다.

const BASE_PRICE = 10000;

function productWithOptions(): Product {
  return {
    id: 'p-opt',
    brandId: 'b-opt',
    name: '옵션 상품',
    price: BASE_PRICE,
    salePrice: null,
    rating: 0,
    reviewCount: 0,
    category: 'etc',
    lifestyleCategory: '실내',
    concernTags: [],
    petType: 'both',
    ageGroup: 'adult',
    image: '/products/p-opt.webp',
    stock: 10,
    description: '설명',
    isBest: false,
    isRecommended: false,
    options: [
      { id: 'opt-large', name: '대형', price: 0, priceDiff: 5000, stock: 5 },
      { id: 'opt-legacy', name: '레거시', price: 12000, stock: 5 }, // priceDiff 없음 → price를 가산분으로
    ],
  };
}

test('optionId가 오면 단가에 옵션 priceDiff가 더해진다 (핵심 회귀)', () => {
  const result = resolveOrderItem(
    { productId: 'p-opt', quantity: 2, optionId: 'opt-large' },
    productWithOptions(),
  );
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  // 기본가 10000 + 옵션 priceDiff 5000 = 15000. 옵션가를 무시하던 버그에서는 10000이 저장됐다.
  expect(result.item.price).toBe(BASE_PRICE + 5000);
  // optionName은 클라이언트가 아니라 카탈로그 옵션에서 파생한다.
  expect(result.item.optionName).toBe('대형');
  expect(result.item.optionId).toBe('opt-large');
});

test('priceDiff가 없는 옵션은 price를 가산분으로 쓴다', () => {
  const result = resolveOrderItem(
    { productId: 'p-opt', quantity: 1, optionId: 'opt-legacy' },
    productWithOptions(),
  );
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.item.price).toBe(BASE_PRICE + 12000);
});

test('카탈로그에 없는 optionId는 항목을 거부한다 (위조·구식 옵션 차단)', () => {
  const result = resolveOrderItem(
    { productId: 'p-opt', quantity: 1, optionId: 'opt-forged' },
    productWithOptions(),
  );
  expect(result.ok).toBe(false);
});

test('optionId가 없으면 기본가만 쓰고 optionName을 저장하지 않는다', () => {
  const result = resolveOrderItem(
    { productId: 'p-opt', quantity: 1 },
    productWithOptions(),
  );
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.item.price).toBe(BASE_PRICE);
  expect(result.item.optionName).toBeUndefined();
  expect(result.item.optionId).toBeUndefined();
});

test('가격 미확정(price: null) 상품은 거부한다', () => {
  const result = resolveOrderItem(
    { productId: 'p-opt', quantity: 1, optionId: 'opt-large' },
    { ...productWithOptions(), price: null },
  );
  expect(result.ok).toBe(false);
});
