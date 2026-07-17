import type { OrderItem, Shipment } from '@/types';

/**
 * 관리자 주문 상세의 업체별 묶음배송 카드용 순수 그룹핑 헬퍼.
 * 한 주문의 items 를 brandId 로 묶고, 이미 생성된 Shipment(있으면)와 짝지어 카드 데이터를 만든다.
 * 컴포넌트에서 분리해 순수 함수로 둔 이유는 브라우저·DB 없이 회귀 테스트하기 위함(tests/admin).
 */

export interface BrandBundle {
  brandId: string;
  /** 이 브랜드에 속한 주문 아이템(원 주문의 등장 순서 보존). */
  items: OrderItem[];
  /** 서버에 이미 존재하는 송장. 아직 없으면 undefined(카드는 '배송전' 기본값으로 렌더). */
  shipment?: Shipment;
}

export interface BundleGrouping {
  /**
   * 'per-brand' = 모든 아이템이 brandId 를 가져 업체별 카드를 그린다.
   * 'legacy'    = 하나라도 brandId 가 없는 레거시 주문 → 업체별 배송을 붙일 수 없으므로
   *               주문 단위 단일배송(OrderStatusPanel) 폴백을 쓴다.
   */
  mode: 'per-brand' | 'legacy';
  bundles: BrandBundle[];
}

/**
 * 업체별 배송 카드는 **모든 아이템에 brandId 스냅샷이 있을 때만** 그린다.
 * 하나라도 없으면(레거시 주문) 판매자 귀속이 불완전하므로 legacy 모드로 떨어져
 * 주문 단위 단일 택배사/운송장 필드를 계속 쓴다.
 */
export function groupItemsByBrand(
  items: OrderItem[],
  shipments: Shipment[],
): BundleGrouping {
  const everyItemHasBrand =
    items.length > 0 && items.every((item) => Boolean(item.brandId));

  if (!everyItemHasBrand) {
    return { mode: 'legacy', bundles: [] };
  }

  const shipmentByBrand = new Map<string, Shipment>();
  for (const shipment of shipments) {
    // 같은 brandId 가 여러 행이면 첫 행을 정본으로 둔다(서버는 (order,brand) 유니크).
    if (!shipmentByBrand.has(shipment.brandId)) {
      shipmentByBrand.set(shipment.brandId, shipment);
    }
  }

  const order: string[] = [];
  const itemsByBrand = new Map<string, OrderItem[]>();
  for (const item of items) {
    const brandId = item.brandId as string;
    if (!itemsByBrand.has(brandId)) {
      itemsByBrand.set(brandId, []);
      order.push(brandId);
    }
    itemsByBrand.get(brandId)!.push(item);
  }

  const bundles: BrandBundle[] = order.map((brandId) => ({
    brandId,
    items: itemsByBrand.get(brandId)!,
    shipment: shipmentByBrand.get(brandId),
  }));

  return { mode: 'per-brand', bundles };
}
