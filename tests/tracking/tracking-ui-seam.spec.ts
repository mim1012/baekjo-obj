import { expect, test } from '@playwright/test';
import { getOrderShipmentTracking } from '@/lib/storage';
import {
  canApplyTrackingResponse,
  decideExplicitTrackingRequest,
  decideTrackingRequest,
  getLiveTrackingFailureMessage,
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

  test('Given level 0 success response, When requested, Then 배송준비 상태와 빈 이력을 보존한다', async () => {
    // Given
    const fetcher = async (): Promise<Response> =>
      Response.json({
        ok: true,
        source: 'sweettracker',
        deliveryStatus: '배송준비',
        complete: false,
        level: 0,
        invoiceNo: 'synthetic-invoice',
        steps: [],
        refreshedAt: '2026-08-26T03:00:00.000Z',
      });

    // When
    const result = await getOrderShipmentTracking('order', 'brand', fetcher);

    // Then
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.level).toBe(0);
      expect(result.deliveryStatus).toBe('배송준비');
      expect(result.steps).toEqual([]);
    }
  });
});

test.describe('tracking customer-safe failure copy', () => {
  test('Given provider contract failures, When rendered, Then raw provider/API-key text is never exposed', () => {
    // Given
    const unsafeTerms = [
      'synthetic-secret-key',
      't_key',
      'info.sweettracker.co.kr',
      '유효하지 않은 운송장 번호 혹은 택배사 코드 입력',
    ];
    const reasons = [
      'invalid-invoice-or-carrier',
      'unknown-api-key',
      'expired-api-key',
      'quota-exceeded',
      'same-invoice-daily-limit-exceeded',
      'invoice-query-error',
    ] as const;

    for (const reason of reasons) {
      // When
      const message = getLiveTrackingFailureMessage({
        ok: false,
        source: 'sweettracker',
        reason,
        refreshedAt: '2026-08-26T03:00:00.000Z',
      });

      // Then
      expect(message).not.toBe('');
      for (const unsafeTerm of unsafeTerms) {
        expect(message).not.toContain(unsafeTerm);
      }
    }
  });
});

test.describe('tracking explicit-click request gate', () => {
  test('Given one shipment, When the modal opens and reopens without an outer click intent, Then no request is made', () => {
    // Given
    const key = makeTrackingKey('order', 'brand', 'cj', '123456789012');
    expect(key).not.toBeNull();

    // When
    const firstOpen = decideExplicitTrackingRequest({
      requestId: null,
      consumedRequestId: null,
      trackingKey: key,
      inFlightTrackingKey: null,
    });
    const reopened = decideExplicitTrackingRequest({
      requestId: undefined,
      consumedRequestId: null,
      trackingKey: key,
      inFlightTrackingKey: null,
    });

    // Then
    expect(firstOpen).toBeNull();
    expect(reopened).toBeNull();
  });

  test('Given a shipment, When the visible outer delivery action is clicked, Then exactly one manual request decision is created', () => {
    // Given
    const key = makeTrackingKey('order', 'brand', 'cj', '123456789012');
    expect(key).not.toBeNull();

    // When
    const decision = decideExplicitTrackingRequest({
      requestId: 1,
      consumedRequestId: null,
      trackingKey: key,
      inFlightTrackingKey: null,
    });
    const duplicate = decideExplicitTrackingRequest({
      requestId: 1,
      consumedRequestId: decision?.requestId ?? null,
      trackingKey: key,
      inFlightTrackingKey: null,
    });

    // Then
    expect(decision).toEqual({ requestId: 1, trackingKey: key });
    expect(duplicate).toBeNull();
  });

  test('Given a shipment, When the refresh action is clicked after a result, Then a manual refresh decision is created', () => {
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
