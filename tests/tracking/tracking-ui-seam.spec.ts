import { expect, test } from '@playwright/test';
import { getOrderShipmentTracking } from '@/lib/storage';
import {
  canApplyTrackingResponse,
  decideTrackingRequest,
  makeTrackingKey,
} from '@/app/mypage/components/TrackingModal';

test.describe('tracking storage facade', () => {
  test('Given encoded ids and a valid response, When requested, Then only the local no-store route is used', async () => {
    // Given
    const calls: Array<{ readonly input: string; readonly init?: RequestInit }> = [];
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      calls.push({ input: String(input), init });
      return Response.json({
        ok: true,
        source: 'sweettracker',
        deliveryStatus: '배송중',
        complete: false,
        level: 3,
        invoiceNo: 'synthetic-invoice',
        steps: [{ time: '2026-08-26 12:00', where: '테스트 허브', kind: '<script>alert(1)</script>' }],
        refreshedAt: '2026-08-26T03:00:00.000Z',
      });
    };

    // When
    const result = await getOrderShipmentTracking('order/id', 'brand id', fetcher);

    // Then
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe('/api/orders/order%2Fid/shipments/brand%20id/tracking');
    expect(calls[0]?.init).toEqual({ cache: 'no-store' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.steps[0]?.kind).toBe('<script>alert(1)</script>');
  });

  test('Given an invalid route body, When requested, Then a redacted typed fallback is returned', async () => {
    // Given
    const fetcher = async (): Promise<Response> =>
      Response.json({ diagnostic: 'synthetic-secret', steps: [{ kind: 7 }] });

    // When
    const result = await getOrderShipmentTracking('order', 'brand', fetcher);

    // Then
    expect(result).toMatchObject({ ok: false, source: 'client', reason: 'request-failed' });
    expect(JSON.stringify(result)).not.toContain('synthetic-secret');
  });
});

test.describe('tracking manual-click request gate', () => {
  test('Given one shipment, When the modal opens and reopens without a manual click, Then no request is made', () => {
    // Given
    const key = makeTrackingKey('order', 'brand', 'cj', '123456789012');
    expect(key).not.toBeNull();
    let calls = 0;

    const requestFromVisibleAction = (inFlightTrackingKey: string | null): void => {
      const decision = decideTrackingRequest({
        trackingKey: key,
        inFlightTrackingKey,
      });
      if (!decision) return;
      calls += 1;
    };

    // When
    const firstOpenCycle = 1;
    const reopenedCycle = firstOpenCycle + 1;

    // Then
    expect(reopenedCycle).toBe(2);
    expect(calls).toBe(0);

    // When
    requestFromVisibleAction(null);

    // Then
    expect(calls).toBe(1);
  });

  test('Given a shipment, When the visible delivery action is clicked, Then exactly one manual request decision is created', () => {
    // Given
    const key = makeTrackingKey('order', 'brand', 'cj', '123456789012');
    expect(key).not.toBeNull();

    // When
    const decision = decideTrackingRequest({ trackingKey: key, inFlightTrackingKey: null });

    // Then
    expect(decision).toEqual({ trackingKey: key });
  });

  test('Given legacy or incomplete shipment data, When manual delivery lookup is available, Then no request key exists', () => {
    // Given / When
    const keys = [
      makeTrackingKey('order', null, 'cj', '123'),
      makeTrackingKey('order', 'brand', undefined, '123'),
      makeTrackingKey('order', 'brand', 'cj', undefined),
    ];

    // Then
    expect(keys).toEqual([null, null, null]);
  });

  test('Given a manual request in flight, When delivery lookup is clicked repeatedly, Then concurrent requests are blocked', () => {
    // Given
    const key = makeTrackingKey('order', 'brand', 'cj', '123');
    expect(key).not.toBeNull();
    let inFlightTrackingKey = key;

    // When / Then
    expect(
      decideTrackingRequest({
        trackingKey: key,
        inFlightTrackingKey,
      }),
    ).toBeNull();

    inFlightTrackingKey = null;
    expect(
      decideTrackingRequest({
        trackingKey: key,
        inFlightTrackingKey,
      }),
    ).not.toBeNull();
  });

  test('Given a response from a closed cycle, When a newer cycle is active, Then stale state cannot apply', () => {
    // Given / When / Then
    expect(
      canApplyTrackingResponse({
        requestSequence: 1,
        currentRequestSequence: 2,
        requestOpenCycleId: 1,
        currentOpenCycleId: 2,
        isOpen: true,
        requestTrackingKey: 'first-target',
        currentTrackingKey: 'second-target',
      }),
    ).toBe(false);
    expect(
      canApplyTrackingResponse({
        requestSequence: 2,
        currentRequestSequence: 2,
        requestOpenCycleId: 2,
        currentOpenCycleId: 2,
        isOpen: true,
        requestTrackingKey: 'current-target',
        currentTrackingKey: 'current-target',
      }),
    ).toBe(true);
  });

  test('Given a response for a replaced shipment target, When the modal remains open, Then stale state cannot apply', () => {
    // Given / When / Then
    expect(
      canApplyTrackingResponse({
        requestSequence: 1,
        currentRequestSequence: 1,
        requestOpenCycleId: 1,
        currentOpenCycleId: 1,
        isOpen: true,
        requestTrackingKey: 'cj|123456789012',
        currentTrackingKey: 'hanjin|987654321098',
      }),
    ).toBe(false);
  });
});
