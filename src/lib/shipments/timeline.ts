// 배송조회 모달(마이페이지 P6)이 쓰는 순수 표현 헬퍼. Supabase·fetch를 import하지 않는다 —
// 값 계산만 하므로 브라우저·테스트에서 그대로 구동된다(derive.ts와 같은 사상). 상태 서열은
// SHIPMENT_STATUS_RANK를 재사용해 상태기계와 모달이 어긋나지 않게 한다(§4: 어휘집 한 곳).
import {
  SHIPMENT_DELIVERY_STATUSES,
  type ShipmentDeliveryStatus,
  type OrderItem,
} from '@/types';
import { SHIPMENT_STATUS_RANK } from '@/lib/shipments/derive';

/**
 * 진행 타임라인의 5단계 — 배송전 → 배송준비 → 배송중 → 배송완료 → 구매확정.
 * SHIPMENT_DELIVERY_STATUSES를 그대로 재사용한다(로컬 리터럴 사본 금지 — 드리프트 원천).
 */
export const TIMELINE_STEPS = SHIPMENT_DELIVERY_STATUSES;

/**
 * 배송 상태의 진행 서열(0~4). 미지·레거시 문자열은 rank 0(배송전)으로 접는다 —
 * DB의 delivery_status가 자유 text라 어휘집 밖 값이 들어올 수 있고, 그런 값이 타임라인을
 * 조용히 끌어올리지 않게 한다.
 */
export function timelineRank(status: string | undefined): number {
  if (status === undefined) return 0;
  return SHIPMENT_STATUS_RANK[status as ShipmentDeliveryStatus] ?? 0;
}

/**
 * 현재 rank까지(포함) 채워진 단계 표시. 길이 5의 boolean 배열로, index ≤ rank 이면 true.
 * 미지·레거시 상태 → rank 0 → 첫 단계(배송전)만 채움.
 */
export function timelineFill(status: string | undefined): boolean[] {
  const rank = timelineRank(status);
  return TIMELINE_STEPS.map((_, i) => i <= rank);
}

/** 주문 아이템을 업체(브랜드) 번들로 묶은 결과. brandId가 없는 레거시 아이템은 null 번들로 접힌다. */
export interface OrderBundle {
  /** null = 레거시(brandId 스냅샷 이전 주문). 업체별 송장을 붙일 수 없어 주문 단위로만 조회한다. */
  brandId: string | null;
  items: OrderItem[];
}

/**
 * 주문 아이템을 브랜드별로 묶는다(첫 등장 순서 보존). brandId가 없는 아이템은 하나의 null 번들로 모은다 —
 * 레거시 주문도 최소 1개 번들을 갖게 해 "배송조회" 버튼이 항상 살아 있도록(버튼을 숨기면 CS 문의가 는다).
 */
export function groupOrderItemsByBundle(items: OrderItem[]): OrderBundle[] {
  const seen: (string | null)[] = [];
  const byKey = new Map<string | null, OrderItem[]>();
  for (const item of items) {
    const key = item.brandId ?? null;
    if (!byKey.has(key)) {
      byKey.set(key, []);
      seen.push(key);
    }
    byKey.get(key)!.push(item);
  }
  return seen.map((key) => ({ brandId: key, items: byKey.get(key)! }));
}
