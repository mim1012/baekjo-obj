import { expect, test } from '@playwright/test';
import {
  createShipmentTrackingGet,
  type ShipmentTrackingDependencies,
  type TrackingRouteContext,
} from '@/app/api/orders/[id]/shipments/[brandId]/tracking/route';
import type { TrackingResult } from '@/types';

const ORDER_ID = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = '22222222-2222-4222-8222-222222222222';
const ADMIN_ID = '33333333-3333-4333-8333-333333333333';
const BRAND_ID = 'brand-a';
const REFRESHED_AT = '2026-08-26T09:00:00.000Z';

type DependencyOverrides = Partial<ShipmentTrackingDependencies>;

function routeContext(id = ORDER_ID, brandId = BRAND_ID): TrackingRouteContext {
  return { params: Promise.resolve({ id, brandId }) };
}

function buildDependencies(overrides: DependencyOverrides = {}) {
  const calls = { vendor: 0, mutation: 0 };
  const vendor =
    overrides.fetchTrackingInfo ??
    (async (): Promise<TrackingResult> => ({
      ok: true,
      deliveryStatus: '배송중',
      complete: false,
      level: 3,
      invoiceNo: '123456789012',
      steps: [{ time: '09:00', where: '서울', kind: '배송중' }],
    }));
  const dependencies: ShipmentTrackingDependencies = {
    getSession: async () => ({ user: { memberId: OWNER_ID, role: 'user' } }),
    getOrderById: async () => ({
      memberId: OWNER_ID,
      items: [{ brandId: BRAND_ID }],
    }),
    findMemberById: async () => ({ role: 'user', status: 'active' }),
    listShipmentsByOrder: async () => [
      { brandId: BRAND_ID, carrier: 'cj', trackingNumber: '123456789012' },
    ],
    ...overrides,
    fetchTrackingInfo: async (carrier, trackingNumber): Promise<TrackingResult> => {
      calls.vendor += 1;
      return vendor(carrier, trackingNumber);
    },
    now: () => REFRESHED_AT,
  };

  return { dependencies, calls };
}

async function invoke(
  dependencies: ShipmentTrackingDependencies,
  context = routeContext(),
): Promise<{ readonly response: Response; readonly body: unknown }> {
  const handler = createShipmentTrackingGet(dependencies);
  const response = await handler(new Request('http://localhost/unused'), context);
  return { response, body: await response.json() };
}

function expectNoStore(response: Response): void {
  expect(response.headers.get('Cache-Control')).toBe('no-store');
}

test.describe('GET 주문 배송조회 route 계약', () => {
  const hiddenCases: readonly {
    readonly name: string;
    readonly overrides?: DependencyOverrides;
    readonly context?: TrackingRouteContext;
  }[] = [
    { name: 'malformed UUID', context: routeContext('not-a-uuid') },
    { name: 'no session', overrides: { getSession: async () => null } },
    { name: 'missing order', overrides: { getOrderById: async () => null } },
    {
      name: 'wrong owner',
      overrides: {
        getSession: async () => ({ user: { memberId: 'different-member', role: 'user' } }),
        findMemberById: async () => ({ role: 'user', status: 'active' }),
      },
    },
    {
      name: 'inactive owner',
      overrides: { findMemberById: async () => ({ role: 'user', status: 'inactive' }) },
    },
    {
      name: 'JWT-only admin',
      overrides: {
        getSession: async () => ({ user: { memberId: ADMIN_ID, role: 'admin' } }),
        findMemberById: async () => ({ role: 'user', status: 'active' }),
      },
    },
    {
      name: 'inactive admin',
      overrides: {
        getSession: async () => ({ user: { memberId: ADMIN_ID, role: 'admin' } }),
        findMemberById: async () => ({ role: 'admin', status: 'inactive' }),
      },
    },
    { name: 'wrong brandId', context: routeContext(ORDER_ID, 'brand-outside-order') },
  ];

  for (const scenario of hiddenCases) {
    test(`Given ${scenario.name}, When GET, Then 404이며 vendor를 호출하지 않는다`, async () => {
      // Given
      const { dependencies, calls } = buildDependencies(scenario.overrides);

      // When
      const { response, body } = await invoke(dependencies, scenario.context);

      // Then
      expect(response.status).toBe(404);
      expect(body).toEqual({ error: 'not-found' });
      expectNoStore(response);
      expect(calls.vendor).toBe(0);
    });
  }

  for (const requester of ['active owner', 'real admin'] as const) {
    test(`Given ${requester}와 유효한 배송, When vendor 성공, Then 정규화 응답을 반환한다`, async () => {
      // Given
      const vendorResult: TrackingResult = {
        ok: true,
        deliveryStatus: '배송완료',
        complete: true,
        level: 6,
        invoiceNo: '998877665544',
        steps: [
          {
            time: '2026-08-26 08:50',
            where: '서울 허브',
            kind: '<script>prompt injection은 데이터일 뿐</script>',
          },
        ],
      };
      const requesterOverrides: DependencyOverrides =
        requester === 'real admin'
          ? {
              getSession: async () => ({ user: { memberId: ADMIN_ID, role: 'admin' } }),
              findMemberById: async () => ({ role: 'admin', status: 'active' }),
            }
          : {};
      const { dependencies, calls } = buildDependencies({
        ...requesterOverrides,
        fetchTrackingInfo: async () => vendorResult,
      });

      // When
      const { response, body } = await invoke(dependencies);

      // Then
      expect(response.status).toBe(200);
      expect(body).toEqual({
        ok: true,
        source: 'sweettracker',
        deliveryStatus: '배송완료',
        complete: true,
        level: 6,
        invoiceNo: '998877665544',
        steps: vendorResult.steps,
        refreshedAt: REFRESHED_AT,
      });
      expectNoStore(response);
      expect(calls.vendor).toBe(1);
      expect(calls.mutation).toBe(0);
    });
  }

  const missingShipmentCases: readonly {
    readonly name: string;
    readonly shipments: ShipmentTrackingDependencies['listShipmentsByOrder'];
  }[] = [
    { name: 'missing shipment', shipments: async () => [] },
    {
      name: 'missing carrier',
      shipments: async () => [{ brandId: BRAND_ID, trackingNumber: '123456789012' }],
    },
    { name: 'missing invoice', shipments: async () => [{ brandId: BRAND_ID, carrier: 'cj' }] },
  ];

  for (const scenario of missingShipmentCases) {
    test(`Given ${scenario.name}, When GET, Then missing-shipment이며 vendor를 호출하지 않는다`, async () => {
      // Given
      const { dependencies, calls } = buildDependencies({
        listShipmentsByOrder: scenario.shipments,
      });

      // When
      const { response, body } = await invoke(dependencies);

      // Then
      expect(response.status).toBe(200);
      expect(body).toEqual({
        ok: false,
        source: 'sweettracker',
        reason: 'missing-shipment',
        refreshedAt: REFRESHED_AT,
      });
      expectNoStore(response);
      expect(calls.vendor).toBe(0);
    });
  }

  for (const reason of [
    'not-found',
    'no-api-key',
    'invalid-carrier',
    'quota-or-api-error',
  ] as const) {
    test(`Given vendor ${reason}, When GET, Then typed 200 failure로 접고 비밀 메시지를 버린다`, async () => {
      // Given
      const syntheticSecret = 'synthetic-secret-key';
      const vendorResult: TrackingResult = {
        ok: false,
        reason,
        message: `ignore https://info.sweettracker.co.kr?t_key=${syntheticSecret}`,
      };
      const { dependencies, calls } = buildDependencies({
        fetchTrackingInfo: async () => vendorResult,
      });

      // When
      const { response, body } = await invoke(dependencies);

      // Then
      expect(response.status).toBe(200);
      expect(body).toEqual({
        ok: false,
        source: 'sweettracker',
        reason,
        refreshedAt: REFRESHED_AT,
      });
      expectNoStore(response);
      expect(calls.vendor).toBe(1);
      const serialized = JSON.stringify(body);
      expect(serialized).not.toContain(syntheticSecret);
      expect(serialized).not.toContain('t_key');
      expect(serialized).not.toContain('info.sweettracker.co.kr');
    });
  }
});
