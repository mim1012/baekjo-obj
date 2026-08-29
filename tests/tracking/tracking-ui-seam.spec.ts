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

test.describe('tracking open-cycle request gate', () => {
  test('Given one shipment, When auto is reconsidered and the modal reopens, Then calls are one per cycle', () => {
    // Given
    const key = makeTrackingKey('order', 'brand', 'cj', '123456789012');
    expect(key).not.toBeNull();
    let lastAutoLoadedTrackingKey: string | null = null;
    let inFlightTrackingKey: string | null = null;
    let calls = 0;

    const auto = (openCycleId: number): void => {
      const decision = decideTrackingRequest({
        mode: 'auto',
        openCycleId,
        trackingKey: key,
        lastAutoLoadedTrackingKey,
        inFlightTrackingKey,
      });
      if (!decision) return;
      calls += 1;
      lastAutoLoadedTrackingKey = decision.autoTrackingKey;
      inFlightTrackingKey = decision.trackingKey;
      inFlightTrackingKey = null;
    };

    // When
    auto(1);
    auto(1); // StrictMode/effect re-run in the same open cycle
    const reopenedCycleId = 2;
    auto(reopenedCycleId);

    // Then
    expect(calls).toBe(2);
  });

  test('Given a shipment key changes in one open cycle, When auto is reconsidered, Then each key gets one request', () => {
    // Given
    const firstKey = makeTrackingKey('order', 'brand', 'cj', '123456789012');
    const replacementKey = makeTrackingKey('order', 'brand', 'hanjin', '987654321098');
    let lastAutoLoadedTrackingKey: string | null = null;
    let inFlightTrackingKey: string | null = null;
    const requestedKeys: string[] = [];

    const auto = (trackingKey: string | null): void => {
      const decision = decideTrackingRequest({
        mode: 'auto',
        openCycleId: 1,
        trackingKey,
        lastAutoLoadedTrackingKey,
        inFlightTrackingKey,
      });
      if (!decision) return;
      requestedKeys.push(decision.trackingKey);
      lastAutoLoadedTrackingKey = decision.autoTrackingKey;
      inFlightTrackingKey = decision.trackingKey;
      inFlightTrackingKey = null;
    };

    // When
    auto(firstKey);
    auto(firstKey);
    auto(replacementKey);
    auto(replacementKey);

    // Then
    expect(requestedKeys).toEqual([firstKey, replacementKey]);
  });

  test('Given legacy or incomplete shipment data, When auto is considered, Then no request key exists', () => {
    // Given / When
    const keys = [
      makeTrackingKey('order', null, 'cj', '123'),
      makeTrackingKey('order', 'brand', undefined, '123'),
      makeTrackingKey('order', 'brand', 'cj', undefined),
    ];

    // Then
    expect(keys).toEqual([null, null, null]);
  });

  test('Given a request in flight, When refresh is clicked repeatedly, Then it is blocked until completion', () => {
    // Given
    const key = makeTrackingKey('order', 'brand', 'cj', '123');
    expect(key).not.toBeNull();
    let inFlightTrackingKey = key;

    // When / Then
    expect(
      decideTrackingRequest({
        mode: 'refresh',
        openCycleId: 1,
        trackingKey: key,
        lastAutoLoadedTrackingKey: null,
        inFlightTrackingKey,
      }),
    ).toBeNull();

    inFlightTrackingKey = null;
    expect(
      decideTrackingRequest({
        mode: 'refresh',
        openCycleId: 1,
        trackingKey: key,
        lastAutoLoadedTrackingKey: null,
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
      }),
    ).toBe(false);
    expect(
      canApplyTrackingResponse({
        requestSequence: 2,
        currentRequestSequence: 2,
        requestOpenCycleId: 2,
        currentOpenCycleId: 2,
        isOpen: true,
      }),
    ).toBe(true);
  });
});
