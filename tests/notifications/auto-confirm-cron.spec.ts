import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import * as shipmentDerive from '@/lib/shipments/derive';

// 자동 구매확정 크론 → 구매확정 알림톡 배선 계약. 실제 라우트를 transpile-and-stub으로 로드해(DB·네트워크 없음)
// 확정된 행마다 정확히 한 번 알림을 예약하는지, 0179 RPC 미배포 시 폴백하는지, 알림 오류가 크론을
// 깨뜨리지 않는지 고정한다. 로드 방식은 tests/notifications/alimtalk-wiring.spec.ts와 같다.

const root = path.resolve(__dirname, '..', '..');

function loadWithStubs(relativePath: string, dependencies: Record<string, unknown>): Record<string, unknown> {
  const file = path.join(root, relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const loaded = { exports: {} as Record<string, unknown> };
  new Function('require', 'module', 'exports', outputText)(
    (name: string) => {
      if (!Object.hasOwn(dependencies, name)) throw new Error(`Unstubbed dependency: ${name}`);
      return dependencies[name];
    },
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

class RpcMissing extends Error {}

interface Options {
  rows?: Array<{ orderId: string; brandId: string; confirmedAt: string }>;
  rowsError?: Error;
  countResult?: number;
  notifyThrowsFor?: string;
}

function load(options: Options) {
  const triggers: Array<Record<string, unknown>> = [];
  const logs: string[] = [];
  let countCalls = 0;
  const mod = loadWithStubs('src/app/api/cron/auto-confirm-shipments/route.ts', {
    'next/server': { NextResponse: { json: (body: unknown, init?: { status?: number }) => Response.json(body, init) } },
    '@/lib/shipments/repo': {
      AutoConfirmRowsRpcMissingError: RpcMissing,
      autoConfirmDeliveredBeforeWithRows: async () => {
        if (options.rowsError) throw options.rowsError;
        return options.rows ?? [];
      },
      autoConfirmDeliveredBefore: async () => {
        countCalls++;
        return options.countResult ?? 0;
      },
    },
    '@/lib/shipments/derive': shipmentDerive,
    '@/lib/logServerError': { logServerError: (message: string) => void logs.push(message) },
    '@/lib/notifications/alimtalkNotify': {
      notifyAlimtalkAfter: (trigger: { orderId: string }) => {
        if (options.notifyThrowsFor === trigger.orderId) throw new Error('boom');
        triggers.push(trigger as Record<string, unknown>);
      },
    },
  }) as { GET: (request: Request) => Promise<Response> };
  return { GET: mod.GET, triggers, logs, countCalls: () => countCalls };
}

function cronRequest(): Request {
  return new Request('http://localhost/api/cron/auto-confirm-shipments', {
    headers: { authorization: 'Bearer test-secret' },
  });
}

test.describe('자동 구매확정 크론 알림톡 — auto-confirm-shipments', () => {
  test.beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret';
  });

  test('확정된 행마다 purchaseConfirmed 알림을 한 건씩 예약한다', async () => {
    const rows = [
      { orderId: 'o1', brandId: 'b1', confirmedAt: '2026-10-14T00:00:00.000Z' },
      { orderId: 'o1', brandId: 'b2', confirmedAt: '2026-10-14T00:00:00.000Z' },
      { orderId: 'o2', brandId: 'b1', confirmedAt: '2026-10-14T00:00:00.000Z' },
    ];
    const { GET, triggers, countCalls } = load({ rows });
    const response = await GET(cronRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, confirmed: 3, notified: 3 });
    expect(triggers).toEqual(rows.map((row) => ({ event: 'purchaseConfirmed', ...row })));
    expect(countCalls()).toBe(0);
  });

  test('확정 0건이면 알림이 없다', async () => {
    const { GET, triggers } = load({ rows: [] });
    expect(await (await GET(cronRequest())).json()).toEqual({ ok: true, confirmed: 0, notified: 0 });
    expect(triggers).toEqual([]);
  });

  test('0179 RPC 미배포(RpcMissing)면 count 판으로 폴백하고 알림은 없으며 confirmed는 유지된다', async () => {
    const { GET, triggers, logs, countCalls } = load({ rowsError: new RpcMissing('PGRST202'), countResult: 4 });
    const response = await GET(cronRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, confirmed: 4, notified: 0 });
    expect(triggers).toEqual([]);
    expect(countCalls()).toBe(1);
    expect(logs.some((message) => message.includes('폴백'))).toBe(true);
  });

  test('RPC 미배포가 아닌 오류는 500이며 폴백하지 않는다', async () => {
    const { GET, countCalls } = load({ rowsError: new Error('db down') });
    expect((await GET(cronRequest())).status).toBe(500);
    expect(countCalls()).toBe(0);
  });

  test('한 건의 알림 예약 오류가 다른 건과 크론 응답을 막지 않는다', async () => {
    const rows = [
      { orderId: 'o1', brandId: 'b1', confirmedAt: '2026-10-14T00:00:00.000Z' },
      { orderId: 'o2', brandId: 'b1', confirmedAt: '2026-10-14T00:00:00.000Z' },
      { orderId: 'o3', brandId: 'b1', confirmedAt: '2026-10-14T00:00:00.000Z' },
    ];
    const { GET, triggers } = load({ rows, notifyThrowsFor: 'o2' });
    const response = await GET(cronRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, confirmed: 3, notified: 2 });
    expect(triggers.map((trigger) => trigger.orderId)).toEqual(['o1', 'o3']);
  });

  test('인증이 없으면 401이고 아무것도 확정하지 않는다', async () => {
    const { GET, triggers, countCalls } = load({ rows: [{ orderId: 'o1', brandId: 'b1', confirmedAt: 'x' }] });
    expect((await GET(new Request('http://localhost/x'))).status).toBe(401);
    expect(triggers).toEqual([]);
    expect(countCalls()).toBe(0);
  });
});