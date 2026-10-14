import { expect, test } from '@playwright/test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import * as alimtalkMessages from '@/lib/notifications/alimtalkMessages';
import {
  ALIMTALK_EVENTS,
  ALIMTALK_TEMPLATES,
  buildAlimtalkMessage,
  formatKrw,
  formatKstDate,
  formatProductName,
  madeToOrderItemNames,
  maskPhone,
  normalizeKoreanMobile,
  resolveAlimtalkMessages,
  type AlimtalkMessageData,
} from '@/lib/notifications/alimtalkMessages';
import type { Order } from '@/types';

// 알림톡 메시지 구성(순수) + 솔라피 발송 클라이언트(transport 주입) 스펙. 네트워크·DB 없음.
// alimtalk.ts는 'server-only'를 import하는 실제 서버 모듈이라 transpile-and-stub으로 로드한다
// (tests/admin/action-request-routes.spec.ts와 동일 패턴).

const root = path.resolve(__dirname, '..', '..');

interface AlimtalkModule {
  sendAlimtalk: (
    event: string,
    data: AlimtalkMessageData,
    phone: string | null | undefined,
    deps?: Record<string, unknown>,
  ) => Promise<{ status: string; reason?: string }>;
  isAlimtalkEnabled: (env?: Record<string, string | undefined>) => boolean;
}

function loadAlimtalk(): AlimtalkModule {
  const file = path.join(root, 'src/lib/notifications/alimtalk.ts');
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const dependencies: Record<string, unknown> = {
    'server-only': {},
    'node:crypto': crypto,
    '@/lib/notifications/alimtalkMessages': alimtalkMessages,
  };
  const loaded = { exports: {} as Record<string, unknown> };
  new Function('require', 'module', 'exports', outputText)(
    (name: string) => {
      if (!Object.hasOwn(dependencies, name)) throw new Error(`Unstubbed dependency: ${name}`);
      return dependencies[name];
    },
    loaded,
    loaded.exports,
  );
  return loaded.exports as unknown as AlimtalkModule;
}

const FULL_DATA: AlimtalkMessageData = {
  customerName: '홍길동',
  orderNumber: 'ORDER-0001',
  itemNames: ['강아지 방석'],
  amount: 39000,
  carrier: 'cj',
  trackingNumber: '123456789012',
  confirmedAt: '2026-10-14T03:00:00.000Z',
};

const ENV = {
  ALIMTALK_ENABLED: 'true',
  SOLAPI_API_KEY: 'KEY-abc',
  SOLAPI_API_SECRET: 'SECRET-xyz-very-secret',
  SOLAPI_PF_ID: 'PF-123',
  VERCEL_ENV: 'production',
};

function recorder() {
  const logs: string[] = [];
  const logger = {
    info: (message: string) => logs.push(message),
    warn: (message: string) => logs.push(message),
    error: (message: string) => logs.push(message),
  };
  const requests: Array<{ url: string; headers: Record<string, string>; body: Record<string, unknown> & { message: { to: string } } }> = [];
  const transport = async (request: { url: string; headers: Record<string, string>; body: unknown }) => {
    requests.push(request as (typeof requests)[number]);
    return { status: 200, body: { groupInfo: { count: { total: 1 } } } };
  };
  return { logs, logger, requests, transport };
}

test.describe('buildAlimtalkMessage — 템플릿별 변수 완전성', () => {
  const expectedVariables: Record<string, string[]> = {
    orderPaid: ['고객명', '주문번호', '상품명', '결제금액'],
    shippingStarted: ['고객명', '주문번호', '상품명', '택배사', '운송장번호'],
    delivered: ['고객명', '주문번호', '상품명'],
    purchaseConfirmed: ['고객명', '주문번호', '상품명', '구매확정일'],
    cancelRequested: ['고객명', '주문번호', '상품명'],
    cancelCompleted: ['고객명', '주문번호', '상품명', '취소금액'],
    exchangeRequested: ['고객명', '주문번호', '상품명'],
    exchangeCompleted: ['고객명', '주문번호', '상품명'],
    returnRequested: ['고객명', '주문번호', '상품명'],
    returnCompleted: ['고객명', '주문번호', '상품명'],
    madeToOrderGuide: ['고객명', '주문번호', '상품명'],
  };

  for (const event of ALIMTALK_EVENTS) {
    test(`${event}(${ALIMTALK_TEMPLATES[event].name}) — 승인 템플릿의 모든 변수를 빠짐없이 채운다`, () => {
      const message = buildAlimtalkMessage(event, FULL_DATA);
      expect(Object.keys(message.variables).sort()).toEqual(expectedVariables[event].map((name) => `#{${name}}`).sort());
      expect(message.templateId).toBe(ALIMTALK_TEMPLATES[event].templateId);
      for (const value of Object.values(message.variables)) expect(value.length).toBeGreaterThan(0);
    });
  }

  test('템플릿 ID는 카카오 승인본 11개와 정확히 일치한다', () => {
    expect(Object.fromEntries(ALIMTALK_EVENTS.map((event) => [event, ALIMTALK_TEMPLATES[event].templateId]))).toEqual({
      orderPaid: 'KA01TP261004182611745ReuYudwj1j5',
      shippingStarted: 'KA01TP2610041843070259y73QWgIT0v',
      delivered: 'KA01TP2610041850158440QvoWWym0Rs',
      purchaseConfirmed: 'KA01TP261004193906384OeC4dRwDlM6',
      cancelRequested: 'KA01TP261004194105402MJCw7NSagIw',
      cancelCompleted: 'KA01TP261004194306136lwkwgLTOhuQ',
      exchangeRequested: 'KA01TP261004194536162QDkwhL6RanY',
      exchangeCompleted: 'KA01TP261004194716622TWzteENlxrJ',
      returnRequested: 'KA01TP261004194853591v4paSH984Fu',
      returnCompleted: 'KA01TP261004195150743cusTkx4ur3I',
      madeToOrderGuide: 'KA01TP261004195624501AfAI8SyvrJP',
    });
  });

  test('값이 그대로 들어간다 — 금액은 천단위 콤마(원은 템플릿이 붙임), 택배사는 한글 라벨, 구매확정일은 KST 날짜', () => {
    expect(buildAlimtalkMessage('orderPaid', FULL_DATA).variables['#{결제금액}']).toBe('39,000');
    expect(buildAlimtalkMessage('cancelCompleted', { ...FULL_DATA, amount: 1234567 }).variables['#{취소금액}']).toBe('1,234,567');
    const shipping = buildAlimtalkMessage('shippingStarted', FULL_DATA).variables;
    expect(shipping['#{택배사}']).toBe('CJ대한통운');
    expect(shipping['#{운송장번호}']).toBe('123456789012');
    expect(buildAlimtalkMessage('purchaseConfirmed', FULL_DATA).variables['#{구매확정일}']).toBe('2026-10-14');
  });

  test('구매확정일은 UTC 자정 직전이라도 KST 기준 다음 날로 계산한다', () => {
    expect(formatKstDate('2026-10-13T16:00:00.000Z')).toBe('2026-10-14');
    expect(formatKstDate('2026-10-13T14:59:59.000Z')).toBe('2026-10-13');
    expect(formatKstDate('not-a-date')).toBe('');
  });

  test('상품명은 첫 상품 + " 외 N건"', () => {
    expect(formatProductName(['A'])).toBe('A');
    expect(formatProductName(['A', 'B'])).toBe('A 외 1건');
    expect(formatProductName(['A', 'B', 'C', 'D'])).toBe('A 외 3건');
    expect(formatProductName([])).toBe('');
    expect(buildAlimtalkMessage('delivered', { ...FULL_DATA, itemNames: ['방석', '담요', '밥그릇'] }).variables['#{상품명}']).toBe(
      '방석 외 2건',
    );
  });

  test('금액 포맷', () => {
    expect(formatKrw(0)).toBe('0');
    expect(formatKrw(999)).toBe('999');
    expect(formatKrw(39000)).toBe('39,000');
  });

  test('필수 값이 비면(운송장·금액 등) 던진다 — Solapi가 변수 누락을 거절하기 때문', () => {
    expect(() => buildAlimtalkMessage('shippingStarted', { ...FULL_DATA, trackingNumber: '' })).toThrow(/missing-variable/);
    expect(() => buildAlimtalkMessage('orderPaid', { ...FULL_DATA, amount: undefined })).toThrow(/missing-variable/);
    expect(() => buildAlimtalkMessage('purchaseConfirmed', { ...FULL_DATA, confirmedAt: undefined })).toThrow(/missing-variable/);
  });

  test('고객명·상품명이 비면 안전한 기본 문구로 대체한다', () => {
    const variables = buildAlimtalkMessage('delivered', { ...FULL_DATA, customerName: ' ', itemNames: [] }).variables;
    expect(variables['#{고객명}']).toBe('고객');
    expect(variables['#{상품명}']).toBe('주문 상품');
  });
});

test.describe('전화번호 정규화·마스킹', () => {
  test('숫자만 남기고 +82는 0으로 바꾼다', () => {
    expect(normalizeKoreanMobile('010-1234-5678')).toBe('01012345678');
    expect(normalizeKoreanMobile('+82 10-1234-5678')).toBe('01012345678');
    expect(normalizeKoreanMobile('011 234 5678')).toBe('0112345678');
  });
  test('휴대전화 형식이 아니면 null', () => {
    expect(normalizeKoreanMobile('02-123-4567')).toBeNull();
    expect(normalizeKoreanMobile('1234')).toBeNull();
    expect(normalizeKoreanMobile('')).toBeNull();
    expect(normalizeKoreanMobile(undefined)).toBeNull();
  });
  test('마스킹은 010****5678 형태이고 짧은 입력은 원문을 남기지 않는다', () => {
    expect(maskPhone('01012345678')).toBe('010****5678');
    expect(maskPhone('010-1234-5678')).toBe('010****5678');
    expect(maskPhone('12')).toBe('****');
    expect(maskPhone(null)).toBe('****');
  });
});

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 'ORDER-0001',
    customerName: '홍길동',
    phone: '010-1234-5678',
    address: '서울',
    items: [
      { productId: 'p1', productName: '방석', quantity: 1, price: 20000, brandId: 'b1' },
      { productId: 'p2', productName: '담요', quantity: 1, price: 10000, brandId: 'b2' },
      { productId: 'p3', productName: '밥그릇', quantity: 1, price: 6000, brandId: 'b2' },
    ],
    totalPrice: 36000,
    deliveryFee: 3000,
    paymentMethod: 'card',
    orderStatus: '주문접수',
    paymentStatus: '결제완료',
    deliveryStatus: '배송전',
    createdAt: '2026-10-14T00:00:00.000Z',
    sellerGroups: [
      { key: 's1', productIds: ['p1'] },
      { key: 's2', productIds: ['p2', 'p3'] },
    ] as unknown as Order['sellerGroups'],
    ...overrides,
  };
}

test.describe('resolveAlimtalkMessages — 주문 → 보낼 알림', () => {
  test('결제완료: 결제금액은 상품+배송비, 주문제작 동의가 없으면 안내는 붙지 않는다', () => {
    const messages = resolveAlimtalkMessages(order(), { event: 'orderPaid', orderId: 'ORDER-0001' });
    expect(messages.map((m) => m.event)).toEqual(['orderPaid']);
    expect(messages[0].data.amount).toBe(39000);
    expect(messages[0].data.itemNames).toEqual(['방석', '담요', '밥그릇']);
    expect(messages[0].data.orderNumber).toBe('ORDER-0001');
  });

  test('결제완료 + 주문제작 상품이 있으면 주문제작상품안내가 그 상품명만 담아 뒤따른다', () => {
    const withConsent = order({
      consentRecords: [
        { type: 'order_terms', subjectKey: 'order', policyVersion: 'v', contentHash: 'h', contentSnapshot: 's', agreedAt: 't' },
        { type: 'made_to_order', subjectKey: 'p2', policyVersion: 'v', contentHash: 'h', contentSnapshot: 's', agreedAt: 't' },
      ],
    });
    expect(madeToOrderItemNames(withConsent)).toEqual(['담요']);
    const messages = resolveAlimtalkMessages(withConsent, { event: 'orderPaid', orderId: 'ORDER-0001' });
    expect(messages.map((m) => m.event)).toEqual(['orderPaid', 'madeToOrderGuide']);
    expect(messages[1].data.itemNames).toEqual(['담요']);
  });

  test('브랜드 단위 이벤트는 그 브랜드 상품만 상품명에 쓴다(배송출발)', () => {
    const [shipping] = resolveAlimtalkMessages(order(), {
      event: 'shippingStarted',
      orderId: 'ORDER-0001',
      brandId: 'b2',
      carrier: 'hanjin',
      trackingNumber: '999',
    });
    expect(shipping.data.itemNames).toEqual(['담요', '밥그릇']);
    expect(buildAlimtalkMessage(shipping.event, shipping.data).variables['#{택배사}']).toBe('한진택배');
  });

  test('운송장이 없으면 배송출발은 목록에서 빠진다', () => {
    expect(resolveAlimtalkMessages(order(), { event: 'shippingStarted', orderId: 'ORDER-0001', brandId: 'b1' })).toEqual([]);
  });

  test('교환·반품은 판매자 그룹 상품만, 알 수 없는 그룹이면 주문 전체로 폴백', () => {
    const [scoped] = resolveAlimtalkMessages(order(), { event: 'returnRequested', orderId: 'ORDER-0001', sellerKey: 's1' });
    expect(scoped.data.itemNames).toEqual(['방석']);
    const [fallback] = resolveAlimtalkMessages(order(), { event: 'returnRequested', orderId: 'ORDER-0001', sellerKey: 'zzz' });
    expect(fallback.data.itemNames).toHaveLength(3);
  });

  test('취소완료는 지정한 상품명·금액을 우선하고, 없으면 주문 총액', () => {
    const [explicit] = resolveAlimtalkMessages(order(), {
      event: 'cancelCompleted',
      orderId: 'ORDER-0001',
      itemNames: ['방석'],
      amount: 20000,
    });
    expect(explicit.data).toMatchObject({ itemNames: ['방석'], amount: 20000 });
    const [whole] = resolveAlimtalkMessages(order(), { event: 'cancelCompleted', orderId: 'ORDER-0001' });
    expect(whole.data.amount).toBe(39000);
  });

  test('구매확정은 전달된 확정 시각을 그대로 쓴다', () => {
    const [confirmed] = resolveAlimtalkMessages(order(), {
      event: 'purchaseConfirmed',
      orderId: 'ORDER-0001',
      brandId: 'b1',
      confirmedAt: '2026-10-14T05:00:00.000Z',
    });
    expect(buildAlimtalkMessage(confirmed.event, confirmed.data).variables['#{구매확정일}']).toBe('2026-10-14');
  });
});

test.describe('sendAlimtalk — 안전 스위치와 발송', () => {
  test('ALIMTALK_ENABLED가 "true"가 아니면 transport를 호출하지 않고 skipped (disabled) 로그만 남긴다', async () => {
    const { sendAlimtalk } = loadAlimtalk();
    for (const value of [undefined, '', 'false', 'TRUE', '1', 'yes']) {
      const rec = recorder();
      const result = await sendAlimtalk('orderPaid', FULL_DATA, '010-1234-5678', {
        env: { ...ENV, ALIMTALK_ENABLED: value },
        transport: rec.transport,
        logger: rec.logger,
      });
      expect(result).toEqual({ status: 'skipped', reason: 'disabled' });
      expect(rec.requests).toHaveLength(0);
      expect(rec.logs).toEqual(['[alimtalk] skipped (disabled)']);
    }
  });

  test('SOLAPI 자격증명이 하나라도 없으면 던지지 않고 건너뛴다', async () => {
    const { sendAlimtalk } = loadAlimtalk();
    for (const missing of ['SOLAPI_API_KEY', 'SOLAPI_API_SECRET', 'SOLAPI_PF_ID']) {
      const rec = recorder();
      const result = await sendAlimtalk('orderPaid', FULL_DATA, '01012345678', {
        env: { ...ENV, [missing]: undefined },
        transport: rec.transport,
        logger: rec.logger,
      });
      expect(result).toEqual({ status: 'skipped', reason: 'missing-credentials' });
      expect(rec.requests).toHaveLength(0);
    }
  });

  test('정상 발송 — Solapi v4 본문(type ATA, kakaoOptions, disableSms)과 HMAC 인증 헤더 형식', async () => {
    const { sendAlimtalk } = loadAlimtalk();
    const rec = recorder();
    const now = new Date('2026-10-14T01:02:03.000Z');
    const result = await sendAlimtalk('orderPaid', FULL_DATA, '010-1234-5678', {
      env: ENV,
      transport: rec.transport,
      logger: rec.logger,
      now: () => now,
    });
    expect(result).toEqual({ status: 'sent' });
    expect(rec.requests).toHaveLength(1);
    const request = rec.requests[0];
    expect(request.url).toBe('https://api.solapi.com/messages/v4/send');
    expect(request.body).toEqual({
      message: {
        to: '01012345678',
        type: 'ATA',
        kakaoOptions: {
          pfId: 'PF-123',
          templateId: 'KA01TP261004182611745ReuYudwj1j5',
          variables: {
            '#{고객명}': '홍길동',
            '#{주문번호}': 'ORDER-0001',
            '#{상품명}': '강아지 방석',
            '#{결제금액}': '39,000',
          },
          disableSms: true,
        },
      },
    });
    const match = /^HMAC-SHA256 apiKey=KEY-abc, date=(.+), salt=([0-9a-f]{32}), signature=([0-9a-f]{64})$/.exec(
      request.headers.Authorization,
    );
    expect(match).not.toBeNull();
    expect(match![1]).toBe(now.toISOString());
    const expected = crypto.createHmac('sha256', ENV.SOLAPI_API_SECRET).update(match![1] + match![2]).digest('hex');
    expect(match![3]).toBe(expected);
  });

  test('ALIMTALK_TEST_RECIPIENT가 있으면 고객 번호 대신 그 번호로만 보내고 리다이렉트를 로그한다', async () => {
    const { sendAlimtalk } = loadAlimtalk();
    const rec = recorder();
    const result = await sendAlimtalk('delivered', FULL_DATA, '010-9999-8888', {
      env: { ...ENV, ALIMTALK_TEST_RECIPIENT: '010-5555-6666' },
      transport: rec.transport,
      logger: rec.logger,
    });
    expect(result).toEqual({ status: 'sent' });
    expect(rec.requests[0].body.message.to).toBe('01055556666');
    expect(rec.logs.some((line) => line.includes('redirected to test recipient 010****6666'))).toBe(true);
    const all = rec.logs.join('\n');
    expect(all).not.toContain('01099998888');
    expect(all).not.toContain('01055556666');
  });

  test('테스트 수신번호가 있으면 고객 번호가 비어 있어도 발송된다(고객 번호는 쓰이지 않음)', async () => {
    const { sendAlimtalk } = loadAlimtalk();
    const rec = recorder();
    const result = await sendAlimtalk('delivered', FULL_DATA, null, {
      env: { ...ENV, ALIMTALK_TEST_RECIPIENT: '01055556666' },
      transport: rec.transport,
      logger: rec.logger,
    });
    expect(result.status).toBe('sent');
  });

  test('운영(VERCEL_ENV=production) 밖에서는 테스트 수신번호 없이 발송하지 않는다(fail-closed)', async () => {
    const { sendAlimtalk } = loadAlimtalk();
    for (const vercelEnv of [undefined, 'preview', 'development', '']) {
      const rec = recorder();
      const result = await sendAlimtalk('orderPaid', FULL_DATA, '01012345678', {
        env: { ...ENV, VERCEL_ENV: vercelEnv },
        transport: rec.transport,
        logger: rec.logger,
      });
      expect(result).toEqual({ status: 'skipped', reason: 'non-production' });
      expect(rec.requests).toHaveLength(0);
      expect(rec.logs).toEqual(['[alimtalk] skipped (non-production without ALIMTALK_TEST_RECIPIENT)']);
    }
  });

  test('운영 밖이어도 테스트 수신번호가 있으면 그 번호로만 발송된다', async () => {
    const { sendAlimtalk } = loadAlimtalk();
    const rec = recorder();
    const result = await sendAlimtalk('orderPaid', FULL_DATA, '01099998888', {
      env: { ...ENV, VERCEL_ENV: 'preview', ALIMTALK_TEST_RECIPIENT: '01055556666' },
      transport: rec.transport,
      logger: rec.logger,
    });
    expect(result.status).toBe('sent');
    expect(rec.requests[0].body.message.to).toBe('01055556666');
  });

  test('HTTP 200이라도 본문 statusCode가 "2000"이 아니면 실패, 2000이면 성공이며 messageId를 로그한다', async () => {
    const { sendAlimtalk } = loadAlimtalk();
    const bad = recorder();
    const badResult = await sendAlimtalk('orderPaid', FULL_DATA, '01012345678', {
      env: ENV,
      logger: bad.logger,
      transport: async () => ({ status: 200, body: { statusCode: '3022', statusMessage: 'template mismatch to 01012345678' } }),
    });
    expect(badResult.status).toBe('failed');
    const badLog = bad.logs.join('\n');
    expect(badLog).toContain('status-3022');
    expect(badLog).toContain('template mismatch');
    expect(badLog).not.toContain('01012345678');

    const good = recorder();
    const goodResult = await sendAlimtalk('orderPaid', FULL_DATA, '01012345678', {
      env: ENV,
      logger: good.logger,
      transport: async () => ({ status: 200, body: { statusCode: '2000', messageId: 'M4V20261014ABC' } }),
    });
    expect(goodResult).toEqual({ status: 'sent' });
    expect(good.logs.join('\n')).toContain('messageId=M4V20261014ABC');
  });

  test('전화번호가 형식에 맞지 않으면 발송하지 않고 건너뛴다(마스킹 로그)', async () => {
    const { sendAlimtalk } = loadAlimtalk();
    for (const phone of ['02-123-4567', '', null, undefined, 'abc']) {
      const rec = recorder();
      const result = await sendAlimtalk('orderPaid', FULL_DATA, phone, { env: ENV, transport: rec.transport, logger: rec.logger });
      expect(result).toEqual({ status: 'skipped', reason: 'invalid-phone' });
      expect(rec.requests).toHaveLength(0);
    }
  });

  test('메시지 변수가 비면(운송장 없음) 발송하지 않고 건너뛴다', async () => {
    const { sendAlimtalk } = loadAlimtalk();
    const rec = recorder();
    const result = await sendAlimtalk('shippingStarted', { ...FULL_DATA, trackingNumber: undefined }, '01012345678', {
      env: ENV,
      transport: rec.transport,
      logger: rec.logger,
    });
    expect(result).toEqual({ status: 'skipped', reason: 'invalid-message' });
    expect(rec.requests).toHaveLength(0);
  });

  test('transport가 던져도 sendAlimtalk는 던지지 않고 failed를 돌려주며 시크릿·전체 번호를 로그에 남기지 않는다', async () => {
    const { sendAlimtalk } = loadAlimtalk();
    const rec = recorder();
    const result = await sendAlimtalk('orderPaid', FULL_DATA, '010-1234-5678', {
      env: ENV,
      logger: rec.logger,
      transport: async () => {
        throw new Error('connect ECONNRESET for 01012345678 secret SECRET-xyz-very-secret');
      },
    });
    expect(result.status).toBe('failed');
    const all = rec.logs.join('\n');
    expect(all).toContain('send failed');
    expect(all).toContain('order=ORDER-0001');
    expect(all).not.toContain('01012345678');
    expect(all).not.toContain(ENV.SOLAPI_API_SECRET);
    expect(all).toContain('010****5678');
  });

  test('HTTP 4xx/5xx 응답은 failed(응답 코드만 로그), 200이어도 failedMessageList가 있으면 failed', async () => {
    const { sendAlimtalk } = loadAlimtalk();
    const rec401 = recorder();
    const r401 = await sendAlimtalk('orderPaid', FULL_DATA, '01012345678', {
      env: ENV,
      logger: rec401.logger,
      transport: async () => ({ status: 401, body: { errorCode: 'InvalidApiKey', errorMessage: 'bad key' } }),
    });
    expect(r401.status).toBe('failed');
    expect(rec401.logs.join('\n')).toContain('InvalidApiKey');

    const recPartial = recorder();
    const rPartial = await sendAlimtalk('orderPaid', FULL_DATA, '01012345678', {
      env: ENV,
      logger: recPartial.logger,
      transport: async () => ({
        status: 200,
        body: { failedMessageList: [{ to: '01012345678', statusCode: '3022', statusMessage: 'template mismatch' }] },
      }),
    });
    expect(rPartial.status).toBe('failed');
    expect(recPartial.logs.join('\n')).not.toContain('01012345678');
  });

  test('성공 로그에도 번호는 마스킹되어 있다', async () => {
    const { sendAlimtalk } = loadAlimtalk();
    const rec = recorder();
    await sendAlimtalk('orderPaid', FULL_DATA, '010-1234-5678', { env: ENV, transport: rec.transport, logger: rec.logger });
    const all = rec.logs.join('\n');
    expect(all).toContain('sent to 010****5678');
    expect(all).not.toContain('01012345678');
    expect(all).not.toContain(ENV.SOLAPI_API_SECRET);
  });

  test('isAlimtalkEnabled는 정확히 "true"일 때만 true', () => {
    const { isAlimtalkEnabled } = loadAlimtalk();
    expect(isAlimtalkEnabled({ ALIMTALK_ENABLED: 'true' })).toBe(true);
    expect(isAlimtalkEnabled({ ALIMTALK_ENABLED: 'True' })).toBe(false);
    expect(isAlimtalkEnabled({})).toBe(false);
  });
});
