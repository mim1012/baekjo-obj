// shipments 테이블 접근 계층. 이 파일 밖에서는 Supabase를 직접 호출하지 않는다.
// 0034 마이그레이션 — 주문 1건이 여러 입점업체(브랜드) 상품을 포함할 수 있어(dashboardStats.ts:148),
// 업체마다 독립된 송장을 붙일 수 있게 (order_id, brand_id) 단위로 배송 정보를 분리한 테이블.
import { getSupabase } from '@/lib/supabase/server';
import type { Shipment } from '@/types';

interface ShipmentRow {
  id: string;
  order_id: string;
  brand_id: string;
  carrier: string | null;
  tracking_number: string | null;
  delivery_status: string;
  shipped_at: string | null;
  created_at: string;
}

const SELECT_COLUMNS =
  'id, order_id, brand_id, carrier, tracking_number, delivery_status, shipped_at, created_at';

function rowToRecord(row: ShipmentRow): Shipment {
  return {
    id: row.id,
    orderId: row.order_id,
    brandId: row.brand_id,
    carrier: row.carrier ?? undefined,
    trackingNumber: row.tracking_number ?? undefined,
    deliveryStatus: row.delivery_status,
    shippedAt: row.shipped_at ?? undefined,
    createdAt: row.created_at,
  };
}

/** 주문 상세(관리자·파트너)가 한 주문에 딸린 모든 업체별 배송 정보를 한 번에 읽는다. */
export async function listShipmentsByOrder(orderId: string): Promise<Shipment[]> {
  const { data, error } = await getSupabase()
    .from('shipments')
    .select(SELECT_COLUMNS)
    .eq('order_id', orderId);
  if (error) throw error;
  return (data as ShipmentRow[]).map(rowToRecord);
}

/** upsertShipment가 받는 갱신분. undefined인 필드는 기존 값을 건드리지 않는다(부분 갱신). */
export type ShipmentPatch = Partial<{
  carrier: string;
  trackingNumber: string;
  deliveryStatus: string;
}>;

/**
 * 업체별 송장 생성/갱신을 (order_id, brand_id) 유니크 키 위에서 원자적으로 수행한다.
 * ⚠️ select-then-insert 2단계 방식이 아니라 반드시 단일 upsert여야 한다 — 같은 업체가 동시에 두 요청을
 * 보내면(예: 파트너가 중복 클릭) select에서 둘 다 "없음"을 보고 둘 다 insert를 시도해 unique 제약
 * 위반 경합이 난다. onConflict: 'order_id,brand_id'로 PostgREST가 INSERT ... ON CONFLICT DO UPDATE를
 * 단일 SQL 문으로 실행해 경합을 원천 차단한다.
 * upsert의 병합은 payload에 담긴 컬럼만 UPDATE하므로(PostgREST merge-duplicates 기본 동작),
 * patch에서 생략한 필드는 기존 값을 그대로 둔다 — updateOrderStatus(orders/repo.ts)와 동일한 부분갱신 의미.
 *
 * orders/repo.ts:200-201과 동일한 해제 규칙을 따른다 — carrier/trackingNumber에 빈 문자열('')이 오면
 * "해제" 신호로 보고 NULL로 저장한다. 이 규칙이 갈리면 `tracking_number IS NULL` 같은 운영 조회
 * (미발송 업체 집계 등)가 조용히 어긋난다.
 *
 * ⚠️ markReclaimDead(orders/repo.ts:389)처럼 "0행 갱신을 성공으로 취급하지 않는" 가드는 여기선 불필요
 * 하다 — upsert는 정의상 매치되는 행이 없으면 INSERT하므로 항상 정확히 1행에 영향을 준다(RLS는 서버
 * secret key 호출이라 우회되어 행을 조용히 걸러내지 않는다). FK 위반(orderId/brandId가 실존하지 않음)
 * 등 실패는 error로 그대로 드러난다.
 */
export async function upsertShipment(
  orderId: string,
  brandId: string,
  patch: ShipmentPatch,
): Promise<void> {
  const row: Record<string, string | null> = {
    order_id: orderId,
    brand_id: brandId,
  };
  if (patch.carrier !== undefined) row.carrier = patch.carrier || null;
  if (patch.trackingNumber !== undefined) row.tracking_number = patch.trackingNumber || null;
  if (patch.deliveryStatus !== undefined) row.delivery_status = patch.deliveryStatus;

  const { error } = await getSupabase()
    .from('shipments')
    .upsert(row, { onConflict: 'order_id,brand_id' });
  if (error) throw error;
}
