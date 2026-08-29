import type { Order } from '@/types';

/**
 * 주문 검색 매칭 판정. 스테이징에 items.productName이 undefined인 레거시/기형 주문이
 * 실재해(레거시 JSONB — lib/orders/repo.ts의 parseItems가 items 배열 형태만 확인하고
 * 개별 필드는 검증하지 않는다) 그냥 필드값에 .toLowerCase()를 걸면 검색창에 아무 문자나
 * 입력하는 순간 목록 전체가 렌더 크래시로 죽었다(wave-4 발견). 모든 접근을 nullish 가드로
 * 감싸 malformed 행이 있어도 "매칭 안 됨" 취급만 되고 절대 throw하지 않게 한다.
 */
export function matchesOrderSearch(order: Order, term: string): boolean {
  const id = (order.id ?? '').toLowerCase();
  const customerName = (order.customerName ?? '').toLowerCase();
  const phone = order.phone ?? '';
  const items = order.items ?? [];

  return (
    id.includes(term) ||
    customerName.includes(term) ||
    phone.includes(term) ||
    items.some((item) => (item?.productName ?? '').toLowerCase().includes(term))
  );
}
