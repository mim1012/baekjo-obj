import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { getOrderById, updateOrderStatus } from '@/lib/orders/repo';
import { listShipmentsByOrder, upsertShipment } from '@/lib/shipments/repo';
import {
  deriveOrderDeliveryStatus,
  orderBrandIds,
  resolveShipmentStamps,
  validateAdminShipmentPatch,
} from '@/lib/shipments/derive';
import { logServerError } from '@/lib/logServerError';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PATCH /api/admin/orders/[id]/shipments/[brandId] — 관리자 업체별 송장 생성/갱신.
 * proxy 1차 가드 + requireAdmin DB 재검증. carrier/trackingNumber/deliveryStatus만 반영한다.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; brandId: string }> },
) {
  const { id, brandId } = await context.params;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const patch = validateAdminShipmentPatch(body);
  if (!patch) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }

    // brand_id에는 FK가 없어(repo.ts:74-78) requireBrandScoped도 브랜드 존재를 확인하지 않는다 —
    // 그 주문의 items에 실제로 스냅샷된 브랜드인지는 이 라우트가 별도로 검증해야 한다. 아니면 존재하지
    // 않는 브랜드 ID로 유령 송장이 만들어진다.
    if (!order.items.some((it) => it.brandId === brandId)) {
      return NextResponse.json({ error: 'invalid-brand' }, { status: 400 });
    }

    const current = (await listShipmentsByOrder(id)).find((s) => s.brandId === brandId);
    const stamps = resolveShipmentStamps(current, patch.deliveryStatus, new Date().toISOString());
    await upsertShipment(id, brandId, { ...patch, ...stamps });

    // D-3 파생: 업체별 송장이 바뀌면 주문 단위 deliveryStatus를 다시 파생한다. 주문 단위는
    // deliveryStatus만 파생하며 orderStatus는 절대 동반 전이하지 않는다(120992a 입금확인 TOCTOU 회귀
    // 교훈 — 배송 전이가 결제/주문 상태를 건드리면 안 된다). brandId 누락 레거시 주문이면 파생을 건너뛴다.
    const bids = orderBrandIds(order.items);
    if (bids) {
      const fresh = await listShipmentsByOrder(id);
      const next = deriveOrderDeliveryStatus(bids, fresh);
      if (next !== order.deliveryStatus) {
        await updateOrderStatus(id, { deliveryStatus: next });
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[PATCH /api/admin/orders/[id]/shipments/[brandId]] 수정 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
