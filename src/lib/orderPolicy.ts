/**
 * 배송비 정책 단일 소스(SSOT). 무료배송 기준 금액과 기본 배송비를
 * 클라이언트(cart/checkout)와 서버(POST /api/orders)가 모두 이 파일에서 읽는다.
 * 각 화면이 리터럴(50000/3000)을 따로 들고 있으면 값이 어긋날 수 있다(§4 drift 방지) —
 * 정책을 바꾸려면 이 파일만 고치면 전체 화면·서버가 함께 갱신된다.
 */
export const FREE_SHIPPING_THRESHOLD = 50000;
export const DELIVERY_FEE = 3000;

/** 상품 합계 금액 기준 배송비. 합계가 0원(빈 카트 등)이면 배송비도 0원. */
export function calcDeliveryFee(totalProductsPrice: number): number {
  return totalProductsPrice > 0 && totalProductsPrice < FREE_SHIPPING_THRESHOLD
    ? DELIVERY_FEE
    : 0;
}
