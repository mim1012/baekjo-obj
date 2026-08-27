import type { TrackingResult } from '@/types';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SessionSnapshot = {
  readonly user?: {
    readonly memberId?: string;
    readonly role?: string;
  };
};

type OrderSnapshot = {
  readonly memberId: string | null;
  readonly items: readonly { readonly brandId?: string }[];
};

type MemberSnapshot = {
  readonly role: string;
  readonly status?: string;
};

type ShipmentSnapshot = {
  readonly brandId: string;
  readonly carrier?: string;
  readonly trackingNumber?: string;
};

export type ShipmentTrackingDependencies = {
  readonly getSession: () => Promise<SessionSnapshot | null>;
  readonly getOrderById: (id: string) => Promise<OrderSnapshot | null>;
  readonly findMemberById: (id: string) => Promise<MemberSnapshot | null>;
  readonly listShipmentsByOrder: (orderId: string) => Promise<readonly ShipmentSnapshot[]>;
  readonly fetchTrackingInfo: (carrier: string, trackingNumber: string) => Promise<TrackingResult>;
  readonly now: () => string;
};

export type ShipmentTrackingResponse =
  | {
      readonly ok: true;
      readonly source: 'sweettracker';
      readonly deliveryStatus: Extract<TrackingResult, { readonly ok: true }>['deliveryStatus'];
      readonly complete: boolean;
      readonly level: Extract<TrackingResult, { readonly ok: true }>['level'];
      readonly invoiceNo: string;
      readonly steps: Extract<TrackingResult, { readonly ok: true }>['steps'];
      readonly refreshedAt: string;
    }
  | {
      readonly ok: false;
      readonly source: 'sweettracker';
      readonly reason:
        | 'missing-shipment'
        | Extract<TrackingResult, { readonly ok: false }>['reason'];
      readonly refreshedAt: string;
    };

export type TrackingRouteContext = {
  readonly params: Promise<{ readonly id: string; readonly brandId: string }>;
};

type TrackingRouteHandler = (
  request: Request,
  context: TrackingRouteContext,
) => Promise<Response>;

const productionDependencies: ShipmentTrackingDependencies = {
  getSession: async () => (await import('@/lib/auth')).auth(),
  getOrderById: async (id) => (await import('@/lib/orders/repo')).getOrderById(id),
  findMemberById: async (id) => (await import('@/lib/members/repo')).findMemberById(id),
  listShipmentsByOrder: async (orderId) =>
    (await import('@/lib/shipments/repo')).listShipmentsByOrder(orderId),
  fetchTrackingInfo: async (carrier, trackingNumber) =>
    (await import('@/lib/tracking/sweettracker')).fetchTrackingInfo(carrier, trackingNumber),
  now: () => new Date().toISOString(),
};

function json(body: ShipmentTrackingResponse | { readonly error: string }, status: number): Response {
  return Response.json(body, { status, headers: NO_STORE_HEADERS });
}

export function createShipmentTrackingGet(
  dependencies: ShipmentTrackingDependencies = productionDependencies,
): TrackingRouteHandler {
  return async (_request, context) => {
    const { id, brandId } = await context.params;
    if (!UUID_RE.test(id)) return json({ error: 'not-found' }, 404);

    try {
      const session = await dependencies.getSession();
      const memberId = session?.user?.memberId;
      if (!memberId) return json({ error: 'not-found' }, 404);

      const order = await dependencies.getOrderById(id);
      if (!order) return json({ error: 'not-found' }, 404);

      const requester = await dependencies.findMemberById(memberId);
      const isActive = requester?.status === 'active';
      const isOwner = order.memberId === memberId && isActive;
      const isAdmin =
        session?.user?.role === 'admin' && requester?.role === 'admin' && isActive;

      if (!isOwner && !isAdmin) return json({ error: 'not-found' }, 404);
      if (!order.items.some((item) => item.brandId === brandId)) {
        return json({ error: 'not-found' }, 404);
      }

      const shipment = (await dependencies.listShipmentsByOrder(id)).find(
        (candidate) => candidate.brandId === brandId,
      );
      const refreshedAt = dependencies.now();
      if (!shipment?.carrier || !shipment.trackingNumber) {
        const body: ShipmentTrackingResponse = {
          ok: false,
          source: 'sweettracker',
          reason: 'missing-shipment',
          refreshedAt,
        };
        return json(body, 200);
      }

      const result = await dependencies.fetchTrackingInfo(
        shipment.carrier,
        shipment.trackingNumber,
      );
      if (!result.ok) {
        const body: ShipmentTrackingResponse = {
          ok: false,
          source: 'sweettracker',
          reason: result.reason,
          refreshedAt,
        };
        return json(body, 200);
      }

      const body: ShipmentTrackingResponse = {
        ok: true,
        source: 'sweettracker',
        deliveryStatus: result.deliveryStatus,
        complete: result.complete,
        level: result.level,
        invoiceNo: result.invoiceNo,
        steps: result.steps,
        refreshedAt,
      };
      return json(body, 200);
    } catch {
      // HTTP 경계에서 DB/인증 예외를 일반 오류로 접되, 비밀·URL·PII는 로그나 응답에 싣지 않는다.
      return json({ error: 'server-error' }, 500);
    }
  };
}

export const GET = createShipmentTrackingGet();
