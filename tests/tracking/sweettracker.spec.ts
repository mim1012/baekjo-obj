import { test, expect } from '@playwright/test';
import {
  fetchTrackingInfo,
  fetchKeyUsage,
  levelToDeliveryStatus,
} from '@/lib/tracking/sweettracker';

// 스마트택배(Sweet Tracker) 조회 클라이언트 순수 함수 스펙 — 브라우저/DB/실 네트워크 불필요.
// fetch를 stub해서 검증한다: FREE 플랜(100건/월)을 CI가 소진하면 안 되므로 라이브 호출 절대 금지.

type FetchStub = (url: string, init?: RequestInit) => Promise<Response>;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function installFetchStub(stub: FetchStub): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = stub as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

const ORIGINAL_ENV_KEY = process.env.SWEETTRACKER_API_KEY;

test.afterEach(() => {
  if (ORIGINAL_ENV_KEY === undefined) {
    delete process.env.SWEETTRACKER_API_KEY;
  } else {
    process.env.SWEETTRACKER_API_KEY = ORIGINAL_ENV_KEY;
  }
});

test.describe('levelToDeliveryStatus', () => {
  test('level 1 → 배송준비', () => {
    expect(levelToDeliveryStatus(1)).toBe('배송준비');
  });

  test('level 2(집화완료) → 배송중', () => {
    // 2는 "이미 판매자 손을 떠났다"는 뜻이라 배송준비로 두면 관리자가 오해한다 — 파일 상단
    // levelToDeliveryStatus 주석이 이 결정을 방어하고 있으므로 회귀 시 컴파일 없이 조용히
    // 배송준비로 되돌아가는 것을 이 테스트가 잡는다.
    expect(levelToDeliveryStatus(2)).toBe('배송중');
  });

  test('level 3 → 배송중', () => {
    expect(levelToDeliveryStatus(3)).toBe('배송중');
  });

  test('level 4 → 배송중', () => {
    expect(levelToDeliveryStatus(4)).toBe('배송중');
  });

  test('level 5(배송출발) → 배송중', () => {
    expect(levelToDeliveryStatus(5)).toBe('배송중');
  });

  test('level 6 → 배송완료', () => {
    expect(levelToDeliveryStatus(6)).toBe('배송완료');
  });

  test('범위 밖 값(0, 7, -1)은 보수적으로 배송준비/배송완료로 폴백한다', () => {
    expect(levelToDeliveryStatus(0)).toBe('배송준비');
    expect(levelToDeliveryStatus(-1)).toBe('배송준비');
    expect(levelToDeliveryStatus(7)).toBe('배송완료');
  });
});

test.describe('fetchTrackingInfo', () => {
  test('알 수 없는 택배사 코드 → invalid-carrier (fetch 호출 없음)', async () => {
    process.env.SWEETTRACKER_API_KEY = 'test-key';
    let called = false;
    const restore = installFetchStub(async () => {
      called = true;
      return jsonResponse({});
    });
    try {
      const result = await fetchTrackingInfo('does-not-exist', '123456789012');
      expect(result).toEqual({ ok: false, reason: 'invalid-carrier' });
      expect(called).toBe(false);
    } finally {
      restore();
    }
  });

  test('API 키 미설정 → no-api-key, throw 하지 않음 (fetch 호출 없음)', async () => {
    delete process.env.SWEETTRACKER_API_KEY;
    let called = false;
    const restore = installFetchStub(async () => {
      called = true;
      return jsonResponse({});
    });
    try {
      const result = await fetchTrackingInfo('cj', '123456789012');
      expect(result).toEqual({ ok: false, reason: 'no-api-key' });
      expect(called).toBe(false);
    } finally {
      restore();
    }
  });

  test('HTTP 200 + result:"N" (미등록 송장 함정) → not-found', async () => {
    process.env.SWEETTRACKER_API_KEY = 'test-key';
    const restore = installFetchStub(async () =>
      jsonResponse({ result: 'N', trackingDetails: [] }),
    );
    try {
      const result = await fetchTrackingInfo('cj', '123456789012');
      expect(result).toEqual({ ok: false, reason: 'not-found' });
    } finally {
      restore();
    }
  });

  test('result:"Y" + level:1 + 빈 trackingDetails (등록 직후, 집화 전) → ok:true, steps:[]', async () => {
    // result:'N'만 미등록이다. 등록 직후(집화 전) 주문은 result:'Y' + level:1 + 빈
    // trackingDetails로 올 수 있어 이 상태를 not-found로 접으면 안 된다 — 정상적인 "배송준비" 상태다.
    process.env.SWEETTRACKER_API_KEY = 'test-key';
    const restore = installFetchStub(async () =>
      jsonResponse({
        result: 'Y',
        complete: false,
        completeYN: 'N',
        invoiceNo: '123456789012',
        level: 1,
        trackingDetails: [],
      }),
    );
    try {
      const result = await fetchTrackingInfo('cj', '123456789012');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.deliveryStatus).toBe('배송준비');
        expect(result.steps).toEqual([]);
      }
    } finally {
      restore();
    }
  });

  test('result:"Y" + level 누락 → quota-or-api-error (isValidLevel이 유일한 안전망)', async () => {
    // not-found 가드가 result==='N'으로 좁혀진 뒤에는 level 방어가 가장 큰 회귀 위험 표면이다.
    process.env.SWEETTRACKER_API_KEY = 'test-key';
    const restore = installFetchStub(async () =>
      jsonResponse({
        result: 'Y',
        complete: false,
        completeYN: 'N',
        invoiceNo: '123456789012',
        trackingDetails: [],
      }),
    );
    try {
      const result = await fetchTrackingInfo('cj', '123456789012');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('quota-or-api-error');
    } finally {
      restore();
    }
  });

  test('result:"Y" + level이 문자열("3") → quota-or-api-error', async () => {
    process.env.SWEETTRACKER_API_KEY = 'test-key';
    const restore = installFetchStub(async () =>
      jsonResponse({
        result: 'Y',
        complete: false,
        completeYN: 'N',
        invoiceNo: '123456789012',
        level: '3',
        trackingDetails: [],
      }),
    );
    try {
      const result = await fetchTrackingInfo('cj', '123456789012');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('quota-or-api-error');
    } finally {
      restore();
    }
  });

  test('result:"Y" + level:0 → quota-or-api-error (범위 밖)', async () => {
    process.env.SWEETTRACKER_API_KEY = 'test-key';
    const restore = installFetchStub(async () =>
      jsonResponse({
        result: 'Y',
        complete: false,
        completeYN: 'N',
        invoiceNo: '123456789012',
        level: 0,
        trackingDetails: [],
      }),
    );
    try {
      const result = await fetchTrackingInfo('cj', '123456789012');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('quota-or-api-error');
    } finally {
      restore();
    }
  });

  test('level 1 응답 → ok:true, deliveryStatus=배송준비', async () => {
    process.env.SWEETTRACKER_API_KEY = 'test-key';
    const restore = installFetchStub(async () =>
      jsonResponse({
        result: 'Y',
        complete: false,
        completeYN: 'N',
        invoiceNo: '123456789012',
        level: 1,
        trackingDetails: [
          { time: 1, timeString: '2026-07-16 09:00', where: '판매자', kind: '상품인수' },
        ],
      }),
    );
    try {
      const result = await fetchTrackingInfo('cj', '123456789012');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.level).toBe(1);
        expect(result.deliveryStatus).toBe('배송준비');
        expect(result.complete).toBe(false);
        expect(result.steps).toHaveLength(1);
      }
    } finally {
      restore();
    }
  });

  test('level 3 응답 → deliveryStatus=배송중', async () => {
    process.env.SWEETTRACKER_API_KEY = 'test-key';
    const restore = installFetchStub(async () =>
      jsonResponse({
        result: 'Y',
        complete: false,
        completeYN: 'N',
        invoiceNo: '123456789012',
        level: 3,
        trackingDetails: [{ time: 1, timeString: '2026-07-16 10:00', where: '지점', kind: '배송중' }],
      }),
    );
    try {
      const result = await fetchTrackingInfo('cj', '123456789012');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.deliveryStatus).toBe('배송중');
    } finally {
      restore();
    }
  });

  test('level 6 응답(completeYN=Y) → deliveryStatus=배송완료, complete=true', async () => {
    process.env.SWEETTRACKER_API_KEY = 'test-key';
    const restore = installFetchStub(async () =>
      jsonResponse({
        result: 'Y',
        complete: true,
        completeYN: 'Y',
        invoiceNo: '123456789012',
        level: 6,
        trackingDetails: [
          { time: 1, timeString: '2026-07-16 18:00', where: '수령지', kind: '배송완료' },
        ],
      }),
    );
    try {
      const result = await fetchTrackingInfo('cj', '123456789012');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.deliveryStatus).toBe('배송완료');
        expect(result.complete).toBe(true);
      }
    } finally {
      restore();
    }
  });

  test('non-200 응답 → quota-or-api-error, throw 하지 않음', async () => {
    process.env.SWEETTRACKER_API_KEY = 'test-key';
    const restore = installFetchStub(async () => jsonResponse({}, 500));
    try {
      const result = await fetchTrackingInfo('cj', '123456789012');
      expect(result).toEqual({ ok: false, reason: 'quota-or-api-error', message: 'HTTP 500' });
    } finally {
      restore();
    }
  });

  test('네트워크 예외(fetch가 throw) → quota-or-api-error, throw 하지 않음', async () => {
    process.env.SWEETTRACKER_API_KEY = 'test-key';
    const restore = installFetchStub(async () => {
      throw new Error('network down');
    });
    try {
      const result = await fetchTrackingInfo('cj', '123456789012');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('quota-or-api-error');
    } finally {
      restore();
    }
  });

  test('fetch 예외 메시지에 API 키가 섞여있어도 로그에는 키가 남지 않는다', async () => {
    // 방어적 케이스: 만약 fetch reject 에러의 message(혹은 cause/stack에서 파생된 문자열)에
    // 요청 URL(=t_key 쿼리스트링에 박힌 API 키)이 실려있더라도, logServerError로 넘어가는 값에는
    // 키 원문이 절대 남으면 안 된다.
    const secretKey = 'super-secret-sweettracker-key-12345';
    process.env.SWEETTRACKER_API_KEY = secretKey;
    const restore = installFetchStub(async () => {
      throw new Error(
        `fetch failed: https://info.sweettracker.co.kr/api/v1/trackingInfo?t_key=${secretKey}&t_code=04`,
      );
    });
    const consoleErrorSpy: unknown[][] = [];
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      consoleErrorSpy.push(args);
    };
    try {
      const result = await fetchTrackingInfo('cj', '123456789012');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('quota-or-api-error');

      expect(consoleErrorSpy.length).toBeGreaterThan(0);
      const serialized = JSON.stringify(consoleErrorSpy);
      expect(serialized).not.toContain(secretKey);
    } finally {
      console.error = originalConsoleError;
      restore();
    }
  });

  test('하이픈 섞인 송장번호는 숫자만 남겨 정규화된다', async () => {
    process.env.SWEETTRACKER_API_KEY = 'test-key';
    let capturedUrl = '';
    const restore = installFetchStub(async (url) => {
      capturedUrl = String(url);
      return jsonResponse({
        result: 'Y',
        complete: false,
        completeYN: 'N',
        invoiceNo: '123456789012',
        level: 2,
        trackingDetails: [{ time: 1, timeString: '2026-07-16 09:30', where: '집화', kind: '집화완료' }],
      });
    });
    try {
      await fetchTrackingInfo('cj', '1234-5678-9012');
      expect(capturedUrl).toContain('t_invoice=123456789012');
    } finally {
      restore();
    }
  });

  test('빈 송장번호(정규화 후 빈 문자열) → not-found, fetch 호출 없음', async () => {
    process.env.SWEETTRACKER_API_KEY = 'test-key';
    let called = false;
    const restore = installFetchStub(async () => {
      called = true;
      return jsonResponse({});
    });
    try {
      const result = await fetchTrackingInfo('cj', '----');
      expect(result).toEqual({ ok: false, reason: 'not-found' });
      expect(called).toBe(false);
    } finally {
      restore();
    }
  });

  test('cj의 t_code는 숫자 4가 아니라 문자열 "04"로 전송된다', async () => {
    process.env.SWEETTRACKER_API_KEY = 'test-key';
    let capturedUrl = '';
    const restore = installFetchStub(async (url) => {
      capturedUrl = String(url);
      return jsonResponse({
        result: 'Y',
        complete: false,
        completeYN: 'N',
        invoiceNo: '123456789012',
        level: 2,
        trackingDetails: [{ time: 1, timeString: '2026-07-16 09:30', where: '집화', kind: '집화완료' }],
      });
    });
    try {
      await fetchTrackingInfo('cj', '123456789012');
      expect(capturedUrl).toContain('t_code=04');
      expect(capturedUrl).not.toContain('t_code=4&');
    } finally {
      restore();
    }
  });
});

test.describe('fetchKeyUsage', () => {
  test('API 키 미설정 → null (fetch 호출 없음)', async () => {
    delete process.env.SWEETTRACKER_API_KEY;
    let called = false;
    const restore = installFetchStub(async () => {
      called = true;
      return jsonResponse({});
    });
    try {
      const result = await fetchKeyUsage();
      expect(result).toBeNull();
      expect(called).toBe(false);
    } finally {
      restore();
    }
  });

  test('정상 응답 → total/left 매핑', async () => {
    process.env.SWEETTRACKER_API_KEY = 'test-key';
    const restore = installFetchStub(async () => jsonResponse({ totalAmount: 100, leftAmount: 42 }));
    try {
      const result = await fetchKeyUsage();
      expect(result).toEqual({ total: 100, left: 42 });
    } finally {
      restore();
    }
  });

  test('non-200 응답 → null, throw 하지 않음', async () => {
    process.env.SWEETTRACKER_API_KEY = 'test-key';
    const restore = installFetchStub(async () => jsonResponse({}, 500));
    try {
      const result = await fetchKeyUsage();
      expect(result).toBeNull();
    } finally {
      restore();
    }
  });
});
