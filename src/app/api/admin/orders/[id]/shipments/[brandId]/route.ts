import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { getOrderById, updateOrderStatus } from '@/lib/orders/repo';
import { listShipmentsByOrder, updateShipmentUnlessConfirmed } from '@/lib/shipments/repo';
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
    // '구매확정'(confirmed_at 설정) 종결 행은 되돌릴 수 없다 — 관리자 PATCH는 DELIVERY_STATUSES만
    // 보내므로 확정된 행에 대한 어떤 쓰기도 후퇴다. 경합 안전은 repo의 confirmed_at IS NULL 조건부
    // 쓰기가 보증한다(사전 read 체크가 아니라 CAS). 종결 행이면 409로 거부하고 파생도 건너뛴다.
    const outcome = await updateShipmentUnlessConfirmed(id, brandId, { ...patch, ...stamps });
    if (outcome === 'confirmed-locked') {
      return NextResponse.json({ error: 'shipment-confirmed' }, { status: 409 });
    }

    // D-3 파생: 업체별 송장이 바뀌면 주문 단위 deliveryStatus를 다시 파생한다. 주문 단위는
    // deliveryStatus만 파생하며 orderStatus는 절대 동반 전이하지 않는다(120992a 입금확인 TOCTOU 회귀
    // 교훈 — 배송 전이가 결제/주문 상태를 건드리면 안 된다). brandId 누락 레거시 주문이면 파생을 건너뛴다.
    // 이 파생은 송장 PATCH 자체와 별개 실패 모드다 — 위 updateShipmentUnlessConfirmed는 이미
    // 커밋됐으므로, 파생 갱신만 실패했다고 클라이언트에 전체 저장 실패(500)로 보고하면 안 된다
    // (관리자가 "저장 실패" 보고 재시도하다 이미 반영된 송장을 놓고 헷갈리는 걸 방지).
    try {
      const bids = orderBrandIds(order.items);
      if (bids) {
        const fresh = await listShipmentsByOrder(id);
        const next = deriveOrderDeliveryStatus(bids, fresh);
        if (next !== order.deliveryStatus) {
          await updateOrderStatus(id, { deliveryStatus: next });
        }
      }
    } catch (deriveError) {
      logServerError(
        `[PATCH /api/admin/orders/[id]/shipments/[brandId]] 송장 저장은 성공했으나 주문 단위 ` +
          `deliveryStatus 파생 갱신 실패 orderId=${id} brandId=${brandId}`,
        deriveError,
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[PATCH /api/admin/orders/[id]/shipments/[brandId]] 수정 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
