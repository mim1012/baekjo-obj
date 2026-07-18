import type { OrderItem, Product } from '@/types';

// productName 길이 상한 — route.ts의 거대 페이로드 방어 상한과 동일(카탈로그 이름이 비정상적으로
// 길면 주문을 거부한다).
const MAX_PRODUCT_NAME = 200;

/**
 * 요청 본문에서 신뢰 가능한 주문 항목 필드만 담은 형상.
 * optionName·price는 서버가 카탈로그에서 파생하므로 여기 두지 않는다(클라이언트 값 미신뢰).
 */
export type OrderItemShape = {
  productId: string;
  quantity: number;
  optionId?: string;
};

export type ResolveOrderItemResult = { ok: true; item: OrderItem } | { ok: false };

/**
 * DB 상품(products 테이블)에서 실제 판매가를 찾는다. checkout/page.tsx의 getCheckoutItems()와 동일한
 * 규칙(salePrice 우선, 없으면 price)을 서버에서도 그대로 따라 화면과 결제 금액이 어긋나지 않게 한다.
 * 가격이 아직 정해지지 않은 상품(price: null)은 구매 불가로 취급한다(프론트 hasUnpricedItems 가드와 동일).
 */
export function resolveCatalogPrice(product: Product): number | null {
  if (product.price === null || product.price === undefined) return null;
  return product.salePrice || product.price || 0;
}

/**
 * 검증된 항목 형상 + 카탈로그 상품으로 신뢰 가능한 OrderItem을 만든다. 가격·상품명·옵션명은
 * 클라이언트 값을 신뢰하지 않고 전부 카탈로그에서 파생한다(가격 위조·상품/옵션 위장 차단).
 * - optionId가 있으면: 카탈로그 options에서 조회해 단가 = 기본가 + (priceDiff ?? price ?? 0)로 계산하고
 *   optionName도 그 옵션에서 파생한다(productName과 동일 정책 — 클라이언트가 보낸 optionName은 버린다).
 *   optionId가 카탈로그에 없으면(위조·구식 옵션) 항목을 거부한다.
 * - optionId가 없으면: 옵션 없는 구매로 간주해 기본가만 쓰고 optionName을 저장하지 않는다.
 *   상품에 옵션이 있어도 거부하지 않는다 — 옵션은 priceDiff 가산형 부가선택이고, 카트/체크아웃이
 *   옵션 없는 담기를 허용하며(CartItem.optionId optional), 데이터 모델에 '필수 옵션' 플래그가 없어
 *   필수 여부를 신뢰성 있게 강제할 수 없기 때문이다. 이 규칙이 기존 옵션 없는 주문 동작을 그대로 보존한다.
 */
export function resolveOrderItem(shape: OrderItemShape, product: Product): ResolveOrderItemResult {
  const basePrice = resolveCatalogPrice(product);
  if (basePrice === null) return { ok: false };
  if (
    typeof product.name !== 'string' ||
    product.name.length < 1 ||
    product.name.length > MAX_PRODUCT_NAME
  ) {
    return { ok: false };
  }

  let unitPrice = basePrice;
  let optionName: string | undefined;
  if (shape.optionId !== undefined) {
    const option = product.options?.find((candidate) => candidate.id === shape.optionId);
    if (!option) return { ok: false };
    unitPrice = basePrice + (option.priceDiff ?? option.price ?? 0);
    optionName = option.name;
  }

  return {
    ok: true,
    item: {
      productId: shape.productId,
      productName: product.name,
      quantity: shape.quantity,
      price: unitPrice,
      brandId: product.brandId,
      ...(shape.optionId !== undefined ? { optionId: shape.optionId } : {}),
      ...(optionName !== undefined ? { optionName } : {}),
    },
  };
}
